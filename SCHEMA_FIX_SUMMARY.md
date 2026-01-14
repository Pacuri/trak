# Schema Fix Summary - January 14, 2026

## Problem Identified

The application had **51 offers** but the **Aranzmani (Trips)** and **Rezervacije (Reservations)** pages showed empty data because:

1. **No bookings or reservations existed** - The offers weren't connected to any actual bookings or reservations
2. **Schema mismatches** - The database schema didn't match what the application code expected

## Changes Applied

### 1. Bookings Table Schema Fixes

**Migration**: `fix_bookings_schema`

**Added Columns**:
- `closed_by` (UUID) - References the user who closed the booking
- `payment_method` (VARCHAR) - 'card', 'bank', 'cash', 'mixed'
- `payment_status` (VARCHAR) - 'paid', 'partial', 'unpaid'
- `booked_at` (TIMESTAMP) - When the booking was created
- `completed_at` (TIMESTAMP) - When the booking was completed
- `external_destination`, `external_accommodation`, `external_dates`, `external_value` - For external bookings
- `refund_amount` (DECIMAL) - For cancelled bookings

**Renamed Columns**:
- `total_price` → `total_amount`
- `departure_date` → `travel_date`

**Indexes Added**:
- `idx_bookings_closed_by` on `closed_by`

### 2. Reservations Table Schema Fixes

**Migration**: `fix_reservations_schema`

**Renamed Columns**:
- `reservation_code` → `code`

**Added Columns**:
- `payment_option` (VARCHAR) - 'deposit', 'full', 'agency', 'contact'
- `paid_at` (TIMESTAMP)
- `expired_at` (TIMESTAMP)
- `cancelled_at` (TIMESTAMP)
- `qualification_data` (JSONB)
- `reminder_48h_sent` (BOOLEAN)

**Updated Constraints**:
- Status check constraint updated to match code expectations: 'pending', 'paid', 'expired', 'cancelled', 'converted'

**Indexes Updated**:
- Dropped `idx_reservations_reservation_code`
- Created `idx_reservations_code`

### 3. RPC Functions Added

**Migration**: `add_capacity_rpc_functions`

Created two RPC functions for manual capacity management:
- `decrement_offer_spots(p_offer_id UUID, p_spots INTEGER)` - Decreases available spots
- `increment_offer_spots(p_offer_id UUID, p_spots INTEGER)` - Increases available spots

These functions are used by the application when creating/cancelling bookings.

### 4. Trigger Function Fixed

**Migration**: `fix_reservation_code_trigger`

Updated `generate_reservation_code()` function to use the `code` column instead of `reservation_code`.

## Verification

All schema changes verified:

### Bookings Table
✅ `total_amount` column exists
✅ `travel_date` column exists
✅ `booked_at` column exists
✅ `closed_by` column exists
✅ `payment_method` column exists
✅ `payment_status` column exists

### Reservations Table
✅ `code` column exists
✅ `paid_at` column exists
✅ `expired_at` column exists
✅ `cancelled_at` column exists
✅ `payment_option` column exists
✅ `reminder_48h_sent` column exists

### RPC Functions
✅ `decrement_offer_spots` exists
✅ `increment_offer_spots` exists
✅ `generate_reservation_code` exists

## Application Code Status

### Hooks
- ✅ `use-bookings.ts` - Already using correct column names
- ✅ `use-reservations.ts` - Already using correct column names
- ✅ `use-offers.ts` - No changes needed

### TypeScript Types
- ✅ `Booking` interface - Matches database schema
- ✅ `Reservation` interface - Matches database schema

### Components
- ✅ `ReservationCard.tsx` - Using `reservation.code` correctly
- ✅ `TripColumn.tsx` - Should work with bookings once they exist

## Next Steps for User

The schema is now fixed and aligned. To see data in the Aranzmani and Rezervacije pages, you need to:

1. **Create Reservations**: 
   - Customers can make reservations through your public booking flow
   - Or you can manually create reservations from offers

2. **Convert Reservations to Bookings**:
   - When a reservation is paid, convert it to a booking
   - Or manually create bookings from the dashboard

3. **The Flow**:
   ```
   Offers (51 exist) 
     → Reservations (temporary holds, 72h expiry)
       → Bookings (confirmed sales with travel_date)
         → Shows in Aranzmani page
   ```

## Database State

Current counts:
- **Offers**: 51
- **Reservations**: 0
- **Bookings**: 0

Once you create bookings with `travel_date` values, they will appear in the Aranzmani (Trips) page organized by date.

## Testing Recommendations

1. Test creating a reservation from an offer
2. Test converting a reservation to a booking
3. Verify the booking appears in the Trips page
4. Test capacity management (spots should decrease/increase correctly)
5. Test reservation expiry and reminders
