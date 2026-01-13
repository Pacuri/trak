-- Capacity management triggers
-- Automatically update offer capacity on booking/cancellation

-- Decrease capacity when booking is created
CREATE OR REPLACE FUNCTION update_offer_capacity_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offer_id IS NOT NULL AND NEW.status = 'confirmed' THEN
    UPDATE offers 
    SET 
      available_spots = GREATEST(0, available_spots - (NEW.adults + NEW.children)),
      status = CASE 
        WHEN available_spots - (NEW.adults + NEW.children) <= 0 THEN 'sold_out'
        ELSE status
      END
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_capacity_decrease
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_capacity_on_booking();

-- Restore capacity when booking is cancelled
CREATE OR REPLACE FUNCTION restore_capacity_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND OLD.offer_id IS NOT NULL THEN
    UPDATE offers 
    SET 
      available_spots = LEAST(total_spots, available_spots + (OLD.adults + OLD.children)),
      status = CASE 
        WHEN status = 'sold_out' THEN 'active'
        ELSE status
      END
    WHERE id = OLD.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_capacity_restore
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION restore_capacity_on_cancel();

-- Decrease capacity on reservation (hold spots)
CREATE OR REPLACE FUNCTION hold_capacity_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offer_id IS NOT NULL AND NEW.status = 'pending' THEN
    UPDATE offers 
    SET available_spots = GREATEST(0, available_spots - (NEW.adults + NEW.children))
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_capacity_hold
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION hold_capacity_on_reservation();

-- Restore capacity when reservation expires or is cancelled
CREATE OR REPLACE FUNCTION restore_capacity_on_reservation_expire()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore if status changed from pending to expired/cancelled
  IF OLD.status = 'pending' AND NEW.status IN ('expired', 'cancelled') AND OLD.offer_id IS NOT NULL THEN
    UPDATE offers 
    SET 
      available_spots = LEAST(total_spots, available_spots + (OLD.adults + OLD.children)),
      status = CASE 
        WHEN status = 'sold_out' THEN 'active'
        ELSE status
      END
    WHERE id = OLD.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_capacity_restore
  AFTER UPDATE ON reservations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION restore_capacity_on_reservation_expire();

-- Update payment totals on reservation when payment is recorded
CREATE OR REPLACE FUNCTION update_reservation_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reservation_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE reservations 
    SET 
      amount_paid = amount_paid + NEW.amount,
      status = CASE 
        WHEN amount_paid + NEW.amount >= total_price THEN 'paid'
        ELSE status
      END,
      paid_at = CASE 
        WHEN amount_paid + NEW.amount >= total_price THEN NOW()
        ELSE paid_at
      END
    WHERE id = NEW.reservation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_reservation
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_payment();

-- Update payment totals on booking when payment is recorded
CREATE OR REPLACE FUNCTION update_booking_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE bookings 
    SET 
      amount_paid = amount_paid + NEW.amount,
      payment_status = CASE 
        WHEN amount_paid + NEW.amount >= total_amount THEN 'paid'
        WHEN amount_paid + NEW.amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END
    WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_booking
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_payment();
