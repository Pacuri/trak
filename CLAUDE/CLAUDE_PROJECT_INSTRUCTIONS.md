# TRAK - Claude Project Instructions

You are an AI assistant helping develop **TRAK**, a full-funnel automation platform for Serbian travel agencies. Think of it as "Shopify for Travel Agencies."

## Project Overview

TRAK handles the entire customer journey:
```
Ad → Qualification → Offer Matching → Reservation → Payment → Contract → Follow-up
```

**Core Value:** Agencies don't need a separate website, booking system, payment processor, or CRM. They just need TRAK.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + RLS), Edge Functions
- **AI:** Anthropic Claude (document parsing, smart matching)
- **Integrations:** Gmail, Facebook/Instagram Messenger, WhatsApp, WSpay/Stripe

## Key Architecture Decisions

1. **Multi-tenant with RLS:** Every table has `organization_id`. All queries are scoped by organization via Row Level Security.

2. **Two Package Types:**
   - `fiksni` (fixed inventory) - Pre-contracted apartments, priced per night
   - `na_upit` (on-request) - Hotel packages verified with suppliers, priced per person per night

3. **Two Inventory Types for Offers:**
   - `owned` - Instant booking with 72h hold, shows capacity bars
   - `inquiry` - On-request, agent must verify, shows response time

4. **Price Calculation:** Complex system with price_intervals (seasonal), room_types, meal_plans (ND/BB/HB/FB/AI), and children_policy_rules (conditional discounts).

## Database Structure (Key Tables)

```
Core: organizations, users, pipeline_stages, lead_sources, leads
Packages: packages, room_types, price_intervals, hotel_prices, children_policy_rules
Offers: offers, offer_images, offer_views, offer_inquiries
Booking: reservations, bookings, payments, abandoned_carts
Comms: messages, email_integrations, meta_integrations, custom_inquiries
Settings: agency_booking_settings, agency_landing_settings
```

## Implementation Status

**✅ Complete:** Packages (37), Room Types (122), Hotel Prices (1087), Document Import, Email/Meta Integration, Lead Pipeline, Custom Inquiries

**❌ Not Started:** Reservations, Bookings, Payments, Abandoned Cart Recovery

## Code Organization

```
src/
├── app/
│   ├── (auth)/          # Login/register
│   ├── (dashboard)/     # Main app
│   ├── (public)/        # Landing pages /a/[slug]
│   └── api/             # API routes
├── components/
│   ├── packages/        # 30+ package components
│   ├── qualification/   # Flow steps
│   ├── pipeline/        # Kanban board
│   └── public/          # Customer-facing
├── hooks/               # Custom React hooks
├── lib/
│   ├── packages/        # Price calculation
│   └── prompts/         # AI prompts
└── types/               # TypeScript definitions
```

## Language & Localization

Primary market is Serbia (`language_region: 'rs'`), with support for Bosnia ('ba') and Croatia ('hr'). UI text is in Serbian (Latin script). Currency is EUR.

## Key Business Logic

1. **Qualification Flow:** ~20 seconds, all taps (no typing until contact info). Steps: Destination → Guests → Dates → Accommodation → Budget → Contact.

2. **Urgency Labels:** 50% of offers show labels (POSLEDNJA MESTA, SNIŽENO, etc.) to create FOMO without fatigue.

3. **Dynamic Response Time:** Shows "10 min" during working hours, "sutra od 09:00" after hours.

4. **72h Reservation Hold:** Reservations expire after 72h with reminder emails at 24h and 48h.

## When Helping with TRAK

1. **Check existing code first** - Many components already exist in `/src/components/`
2. **Follow existing patterns** - Look at similar features for structure
3. **Maintain Serbian UI text** - All customer-facing text in Serbian
4. **Use existing hooks** - Check `/src/hooks/` before creating new data fetching
5. **Respect RLS** - All queries must be org-scoped via Supabase client
6. **TypeScript strict** - All new code should be fully typed

## Important Files to Reference

- `/src/types/index.ts` - Core type definitions
- `/src/types/packages.ts` - Package system types
- `/src/lib/packages/price-calculator.ts` - Pricing logic
- `/src/lib/prompts/document-parse-prompt.ts` - AI parsing prompt
- `/TRAK_PROJECT_BIBLE_v1.0.md` - Complete documentation

## Current Priorities

1. Implement reservation system with 72h holds
2. Add payment integration (WSpay for Serbia)
3. Build booking conversion flow
4. Create abandoned cart recovery

When asked about TRAK, always consider: the Serbian travel agency context, the two-inventory-type system (owned vs inquiry), the complex package pricing, and the multi-tenant architecture.
