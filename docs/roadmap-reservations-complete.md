# Roadmap: Complete Reservations & Booking System

## Overview
This document outlines the full implementation plan for completing the reservations and booking system in trak. The system handles the flow from offer confirmation through to completed booking.

---

## Phase 1: Quick Win (Current Sprint) ✅
**Goal:** Close the loop on offer confirmation

### 1.1 Auto-create Reservation on Confirm
- When customer confirms offer → Create reservation with 72h hold
- Generate TRK-YYYY-XXXXXX reservation code
- Calculate 30% deposit amount
- Link to offer and lead

### 1.2 Confirmation Email
- Send email immediately after confirmation
- Include: reservation code, pricing, payment deadline
- Use existing Gmail API integration

**Files:** 
- `src/app/api/public/offers/[id]/confirm/route.ts`
- `src/app/api/email/send-confirmation/route.ts` (new)

---

## Phase 2: Offer Inquiry Management
**Goal:** Handle "na upit" package requests

### 2.1 Inquiries Dashboard Page
**Route:** `/dashboard/inquiries`

**Features:**
- List pending offer inquiries
- Filter by status: pending, checking, available, unavailable
- Urgency indicators (24h+ without response)
- Quick actions: respond, check availability

### 2.2 Inquiry Response Flow
```
Pending → Agent clicks "Odgovori"
       → Modal with options:
         ├─ "Dostupno" → Create reservation (72h hold)
         ├─ "Nedostupno" → Send unavailable email
         └─ "Alternativa" → Select different package
```

### 2.3 API Endpoints
- `GET /api/offer-inquiries` - List inquiries
- `PATCH /api/offer-inquiries/[id]` - Update status
- `POST /api/offer-inquiries/[id]/respond` - Send response + create reservation

**Files:**
- `src/app/(dashboard)/dashboard/inquiries/page.tsx` (new)
- `src/components/inquiries/InquiryCard.tsx` (new)
- `src/components/inquiries/InquiryResponseModal.tsx` (new)
- `src/app/api/offer-inquiries/route.ts` (new)

---

## Phase 3: Automated Reminders & Expiry
**Goal:** Automate reservation lifecycle

### 3.1 Background Jobs (Cron/Edge Functions)
- **48h reminder:** Email sent 48h before expiry
- **24h reminder:** Email sent 24h before expiry
- **Auto-expire:** Mark as 'expired' after 72h

### 3.2 Implementation Options
**Option A: Vercel Cron Jobs**
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reservation-reminders",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

**Option B: Supabase Edge Functions**
```sql
-- pg_cron extension
SELECT cron.schedule('expire-reservations', '0 * * * *', 
  $$UPDATE reservations SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW()$$
);
```

### 3.3 Email Templates
- `reminder-48h.ts` - "Vaša rezervacija ističe za 48 sati"
- `reminder-24h.ts` - "HITNO: Rezervacija ističe sutra"
- `expired.ts` - "Rezervacija je istekla"

**Files:**
- `src/app/api/cron/reservation-reminders/route.ts` (new)
- `src/lib/email-templates/reminder-48h.ts` (new)
- `src/lib/email-templates/reminder-24h.ts` (new)

---

## Phase 4: Bookings Dashboard
**Goal:** Track confirmed sales

### 4.1 Bookings Page
**Route:** `/dashboard/bookings`

**Features:**
- List all confirmed bookings
- Filter by: status, date range, payment status
- Stats: total revenue, pending payments, upcoming trips
- Quick actions: record payment, cancel, view details

### 4.2 Booking Detail View
- Customer info
- Package details
- Payment history
- Travel dates
- Documents (contracts, receipts)

### 4.3 Convert Reservation → Booking
When reservation is paid:
```
Reservation (paid) → Create Booking → Update capacity
```

**Files:**
- `src/app/(dashboard)/dashboard/bookings/page.tsx` (new)
- `src/components/bookings/BookingCard.tsx` (new)
- `src/components/bookings/BookingDetail.tsx` (new)
- `src/app/api/bookings/route.ts` (enhance)

---

## Phase 5: Payment Integration
**Goal:** Online payment processing

### 5.1 Stripe Integration
- Accept card payments for deposits
- Generate payment links
- Webhook for payment confirmation
- Automatic reservation → paid status

### 5.2 Payment Flow
```
Confirmation Email → "Plati online" button
                  → Stripe Checkout
                  → Webhook confirms payment
                  → Reservation status = 'paid'
                  → Convert to Booking
```

### 5.3 Bank Transfer Support
- Generate reference number
- Manual payment recording
- Bank statement import (future)

**Files:**
- `src/app/api/payments/create-checkout/route.ts` (new)
- `src/app/api/webhooks/stripe/route.ts` (new)
- `src/lib/stripe.ts` (new)

---

## Phase 6: Contract Generation
**Goal:** Automated contract PDFs

### 6.1 PDF Generation
- Use `@react-pdf/renderer` or `puppeteer`
- Template with customer & package details
- Terms and conditions
- Digital signature placeholder

### 6.2 Contract Workflow
```
Booking created → Generate contract PDF
              → Attach to confirmation email
              → Store in Supabase Storage
              → Link from booking detail
```

### 6.3 Contract Template
- Header with agency branding
- Customer details
- Package details (dates, guests, pricing)
- Payment terms
- Cancellation policy
- Terms & conditions
- Signature line

**Files:**
- `src/lib/pdf/contract-template.tsx` (new)
- `src/app/api/contracts/generate/route.ts` (new)

---

## Phase 7: Customer Portal
**Goal:** Self-service for customers

### 7.1 Reservation Lookup
**Route:** `/rezervacija/[code]`

**Features:**
- View reservation status
- See payment deadline
- Download contract
- Pay online (if unpaid)
- Contact agency

### 7.2 Booking Confirmation Page
**Route:** `/potvrda/[id]`

**Features:**
- "Hvala" message
- Booking summary
- What to expect next
- Agency contact info

**Files:**
- `src/app/rezervacija/[code]/page.tsx` (new)
- `src/app/potvrda/[id]/page.tsx` (new)

---

## Phase 8: Analytics & Reporting
**Goal:** Business insights

### 8.1 Conversion Funnel
```
Inquiries → Offers Sent → Viewed → Confirmed → Paid → Completed
```

### 8.2 Metrics Dashboard
- Conversion rates at each stage
- Average reservation value
- Time to conversion
- Expiry rate
- Revenue by period

### 8.3 Reports
- Monthly sales report
- Outstanding payments
- Upcoming departures
- Agent performance

**Files:**
- `src/app/(dashboard)/dashboard/analytics/page.tsx` (enhance)
- `src/lib/analytics/conversion-funnel.ts` (new)

---

## Database Schema Additions

### Already Exists ✅
- `reservations` - 72h holds
- `bookings` - Confirmed sales
- `offer_inquiries` - Na upit requests
- `offer_quotes` - Sent offers

### May Need
- `payment_transactions` - Payment history
- `contracts` - Generated PDFs
- `reservation_reminders` - Track sent reminders

---

## Priority Order

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| 1. Quick Win | 🔴 Critical | 1-2 days | High |
| 2. Inquiry Management | 🔴 Critical | 3-4 days | High |
| 3. Automated Reminders | 🟡 Important | 2-3 days | Medium |
| 4. Bookings Dashboard | 🟡 Important | 3-4 days | Medium |
| 5. Payment Integration | 🟢 Nice to have | 1 week | High |
| 6. Contract Generation | 🟢 Nice to have | 3-4 days | Medium |
| 7. Customer Portal | 🟢 Nice to have | 2-3 days | Low |
| 8. Analytics | 🟢 Nice to have | 1 week | Medium |

---

## Next Steps
1. ✅ Implement Quick Win (Phase 1)
2. Build Inquiry Management UI (Phase 2)
3. Set up Vercel Cron for reminders (Phase 3)
4. Iterate based on user feedback
