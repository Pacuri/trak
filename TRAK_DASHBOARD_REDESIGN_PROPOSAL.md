# TRAK Dashboard Redesign Proposal
## January 2026

---

# EXECUTIVE SUMMARY

The current dashboard shows basic CRM metrics but doesn't reflect the core business of a travel agency: managing trips, tracking capacity, and knowing what needs attention TODAY.

**Goal:** Create a dashboard that answers the question: "What do I need to do right now?"

---

# 1. USER NEEDS ANALYSIS

## Primary Users

| User | Morning Question | Key Needs |
|------|------------------|-----------|
| **Owner (Sandra)** | "How's business?" | Revenue, capacity, conversion trends |
| **Agent** | "What do I do today?" | Calls to make, departures to prep, urgent items |

## What Travel Agents Actually Do Daily

1. ☎️ Call back new inquiries (within 24h is critical)
2. 📋 Prepare departures (vouchers, rooming lists, info packets)
3. 💰 Chase payments (deposits, final payments)
4. 🔥 Manage urgent capacity (last seats, expiring reservations)
5. 📊 Track performance (monthly targets)

---

# 2. PROPOSED LAYOUT

## Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Dobrodošli, Sandra! 👋                          📅 Sreda, 15. januar 2026.     │
│  Evo šta vas čeka danas                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 📞 5     │ │ 📋 4     │ │ 🛫 3     │ │ 💰 €48k  │ │ 🔥 12    │               │
│  │ Za poziv │ │ Upiti    │ │ Polazaka │ │ Mesečno  │ │ Hitno    │               │
│  │  ↓2     │ │ čekaju   │ │ 16 put.  │ │  ↑12%   │ │          │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                                 │
├────────────────────────────────┬───────────────────────┬────────────────────────┤
│                                │                       │                        │
│  📞 Pozovi danas         (5)   │  📋 Upiti čekaju (4)  │  ⚠️ Zahteva pažnju (12)│
│  ──────────────────────────    │  ─────────────────    │  ──────────────────────│
│                                │  Na upit ponude       │                        │
│  ┌──────────────────────────┐  │                       │  💳 Kasne uplate   (3) │
│  │ 🔴 Jelena M.    pre 2d   │  │  ┌─────────────────┐  │  → Petrović €450       │
│  │    Grčka • 2+1 • €2,100  │  │  │ 🟡 Ana M. pre 2h│  │  → Jovanović €890      │
│  │    [📞] [💬]             │  │  │   Maldivi • 2   │  │                        │
│  ├──────────────────────────┤  │  │   [Odgovori]    │  │  ⏰ Rez. ističu    (2) │
│  │ 🟡 Marko P.     pre 1d   │  │  ├─────────────────┤  │  → Ilić - 12h          │
│  │    Turska • 2 • €1,800   │  │  │ 🟢 Petar J.5h   │  │  → Stanić - 24h        │
│  │    [📞] [💬]             │  │  │   Tajland • 2+1 │  │                        │
│  ├──────────────────────────┤  │  │   [Odgovori]    │  │  🔥 Poslednja mesta(3) │
│  │ 🟢 Ana N.       pre 5h   │  │  ├─────────────────┤  │  → Halkidiki 15.7      │
│  │    Egipat • 4 • €3,200   │  │  │ 🟢 Ivana S. 8h  │  │  → Santorini 22.7      │
│  │    [📞] [💬]             │  │  │   Zanzibar • 2  │  │  → Bodrum 01.8         │
│  └──────────────────────────┘  │  │   [Odgovori]    │  │                        │
│                                │  └─────────────────┘  │  📋 Upiti bez odg. (4) │
│  [Vidi sve →]                  │  [Vidi sve →]         │  → Marković - Maldivi  │
│                                │                       │  → Jović - Tajland     │
├────────────────────────────────┴───────────────────────┼────────────────────────┤
│                                                        │                        │
│  🛫 Današnji polasci (3)             [Vlastite ponude] │  📊 Popunjenost        │
│  ──────────────────────────────────────────────────    │  [Vlastite ponude]     │
│                                                        │  ──────────────────────│
│  ┌─────────────────────────────────────────────────┐   │                        │
│  │ 08:00  Halkidiki - Aegean Blue ★★★★             │   │  📦 Halkidiki-Aegean   │
│  │        8 putnika • 🚌 Autobus • BAS Beograd     │   │  Jun-Avg • Sub • 40m   │
│  │        [📋 Rooming] [📄 Voucher] [📱 Info]      │   │  ████████████████░ 92% │
│  ├─────────────────────────────────────────────────┤   │  478/520 • 🔥 2 mesta! │
│  │ 10:30  Antalija - Sunrise Resort ★★★★★          │   │                        │
│  │        4 putnika • ✈️ Avion • Aerodrom BEG      │   │  📦 Antalija-Sunrise   │
│  │        [📋 Rooming] [📄 Voucher] [📱 Info]      │   │  Jun-Sep • Sre • 50m   │
│  ├─────────────────────────────────────────────────┤   │  █████████████░░░ 78%  │
│  │ 14:00  Santorini - Astra Suites ★★★★            │   │  507/650 • 11 mesta    │
│  │        4 putnika • ✈️ Avion • Aerodrom BEG      │   │                        │
│  │        [📋 Rooming] [📄 Voucher] [📱 Info]      │   │  📦 Santorini-Astra    │
│  └─────────────────────────────────────────────────┘   │  Jul-Avg • Pet • 20m   │
│                                                        │  ██████████░░░░░░ 65%  │
│  🛬 Povratci (2)                                       │  117/180 • 8 mesta     │
│  → Krf (6 putnika) - 18:00                             │                        │
│  → Bodrum (4 putnika) - 21:30                          │  [Vidi sve pakete →]   │
│                                                        │                        │
└────────────────────────────────────────────────────────┴────────────────────────┘
```

## Mobile Layout

```
┌─────────────────────────────┐
│  Dobrodošli, Sandra! 👋     │
│  15. januar 2026            │
├─────────────────────────────┤
│  ┌─────────┐ ┌─────────┐    │
│  │ 📞 5    │ │ 🛫 3    │    │
│  │Za poziv │ │Polazaka │    │
│  └─────────┘ └─────────┘    │
│  ┌─────────┐ ┌─────────┐    │
│  │ 💰€48k  │ │ 🔥 2    │    │
│  │Mesečno  │ │Ističu   │    │
│  └─────────┘ └─────────┘    │
├─────────────────────────────┤
│                             │
│  ⚠️ Zahteva pažnju    (8)   │
│  ───────────────────────    │
│  → 3 kasne uplate           │
│  → 2 rezervacije ističu     │
│  → 3 poslednja mesta        │
│  [Vidi sve →]               │
│                             │
├─────────────────────────────┤
│                             │
│  📞 Pozovi danas      (5)   │
│  ───────────────────────    │
│  🔴 Jelena M.    pre 2 dana │
│     Grčka • Jul • €2,100    │
│     [📞] [💬]               │
│  ───────────────────────    │
│  🟡 Marko P.     pre 1 dan  │
│     Turska • Avg • €1,800   │
│     [📞] [💬]               │
│  [Vidi sve →]               │
│                             │
├─────────────────────────────┤
│                             │
│  🛫 Danas polazi      (3)   │
│  ───────────────────────    │
│  08:00 Halkidiki (8 put.)   │
│  10:30 Antalija (4 put.)    │
│  [Vidi sve →]               │
│                             │
└─────────────────────────────┘
```

---

# 3. COMPONENT BREAKDOWN

## 3.1 Header

```tsx
interface DashboardHeaderProps {
  userName: string;
  currentDate: Date;
}
```

**Display:**
- "Dobrodošli, {firstName}! 👋"
- "Evo šta vas čeka danas"
- Current date formatted: "15. januar 2026"

---

## 3.2 Stat Cards (5 cards)

| Card | Metric | Source | Color |
|------|--------|--------|-------|
| 📞 Za poziv | Leads waiting >24h without contact | `leads` WHERE contacted_at IS NULL AND created_at < NOW() - 24h | Blue |
| 📋 Upiti | Na upit inquiries awaiting agent response | `custom_inquiries` WHERE status = 'pending' | Purple |
| 🛫 Polazaka | Departures today (vlastite only) | `departures` WHERE departure_date = TODAY | Teal |
| 💰 Mesečno | Revenue this month | SUM(`payments`.amount) WHERE month = current | Green |
| 🔥 Hitno | Combined urgent items count | Late payments + expiring reservations + last seats + unanswered inquiries | Orange/Red |

**Each card shows:**
- Icon
- Number (large)
- Label
- Trend (optional, vs last period)

**Note:** "Upiti" card only appears if agency has na upit inquiries. Dashboard adapts based on agency's business model.

---

## 3.3 "Pozovi danas" Section

**Purpose:** Show leads that need immediate callback, prioritized by wait time.

**Data Source:**
```sql
SELECT * FROM leads 
WHERE stage NOT IN ('closed_won', 'closed_lost')
  AND (contacted_at IS NULL OR last_contact_at < NOW() - INTERVAL '48 hours')
ORDER BY created_at ASC
LIMIT 5
```

**Priority Indicators:**
- 🔴 Red dot: Waiting >48h (urgent!)
- 🟡 Yellow dot: Waiting 24-48h
- 🟢 Green dot: Waiting <24h

**Card Content:**
- Name
- Destination + guests + month + estimated value
- Wait time ("pre 2 dana")
- Quick actions: [📞 Pozovi] [💬 Viber]

**Actions:**
- Click phone → Opens tel: link
- Click Viber → Opens viber://chat?number=...
- Click card → Opens lead detail

---

## 3.4 "Zahteva pažnju" Section

**Purpose:** Aggregated alert list of everything urgent.

**Categories:**

| Category | Icon | Query |
|----------|------|-------|
| Kasne uplate | 💳 | `reservations` WHERE payment_due_date < TODAY AND status != 'paid' |
| Rezervacije ističu | ⏰ | `reservations` WHERE hold_expires_at < NOW() + 24h AND status = 'pending' |
| Poslednja mesta | 🔥 | `departures` WHERE available_spots <= 3 AND departure_date > TODAY (vlastite only) |
| Upiti bez odgovora | 📋 | `custom_inquiries` WHERE status = 'pending' AND created_at < NOW() - 2h |

**Display:**
- Category header with count
- Top 3 items per category
- "Vidi sve →" link
- Color-coded counts (red for critical, purple for inquiries)

---

## 3.5 "Upiti čekaju odgovor" Section ⭐ NEW

**Purpose:** Show na upit inquiries that need agent response, separate from regular leads.

**Data Source:**
```sql
SELECT * FROM custom_inquiries
WHERE organization_id = org_id
  AND status = 'pending'
ORDER BY created_at ASC
LIMIT 5
```

**Priority Indicators:**
- 🔴 Red dot: Waiting >4h (urgent!)
- 🟡 Yellow dot: Waiting 2-4h
- 🟢 Green dot: Waiting <2h

**Card Content:**
- Name + "NA UPIT" badge (purple)
- Destination + guests + travel period + special request
- Wait time ("pre 2h")
- Action button: [Odgovori] (purple)

**Actions:**
- Click "Odgovori" → Opens inquiry detail/response modal
- Click card → Opens full inquiry

**Visual Distinction:**
- Cards have subtle purple gradient background
- "NA UPIT" badge to differentiate from regular leads

**When to Show:**
- Only if agency has na upit inquiries
- If agency only does vlastite, this section is hidden

---

## 3.6 "Zahteva pažnju" - Clickable Items ⭐ NEW

Every item in the attention section MUST be clickable for quick access.

| Category | Click Action | Destination |
|----------|--------------|-------------|
| Kasne uplate | Click row | `/dashboard/reservations/{id}?tab=payment` |
| Rezervacije ističu | Click row | `/dashboard/reservations/{id}` |
| Poslednja mesta | Click row | `/dashboard/packages/{id}/departures/{departure_id}` |
| Upiti bez odgovora | Click row | Opens `InquirySlideOver` component |

**Implementation:**
```tsx
<div 
  onClick={() => handleItemClick(item)}
  className="cursor-pointer hover:bg-gray-50 transition-colors"
>
  <span>{item.label}</span>
  <span className="text-gray-400">{item.meta}</span>
</div>
```

---

## 3.7 Inquiry Response Flow (Slide-Over) ⭐ NEW

When agent clicks "Odgovori" on an inquiry, a slide-over panel opens from the right.

### Slide-Over Layout

```
┌──────────────────────────────────────┐
│  ← Upit #1234                 [X]    │
├──────────────────────────────────────┤
│                                      │
│  KONTAKT                             │
│  👤 Ana Marković                     │
│  📞 +381 64 123 4567  [Pozovi][Viber]│
│  ✉️ ana.markovic@gmail.com           │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  ZAHTEV                              │
│  📍 Destinacija: Maldivi             │
│  👥 Putnici: 2 odraslih              │
│  📅 Termin: Mart 2026                │
│  💬 "Medeni mesec, tražimo nešto     │
│      romantično sa privatnom plažom" │
│                                      │
│  ⏰ Primljeno: pre 2 sata            │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  VAŠ ODGOVOR                         │
│                                      │
│  Status:                             │
│  ◉ Možemo da organizujemo            │
│  ○ Ne možemo (nema dostupnosti)      │
│  ○ Potrebno više informacija         │
│                                      │
│  Poruka klijentu:                    │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Interna napomena (opciono):         │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ☐ Kreiraj upit u pipeline-u         │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  [      ✓ Pošalji odgovor      ]     │
│                                      │
└──────────────────────────────────────┘
```

### Response Status Options

| Status | Code | What Happens |
|--------|------|--------------|
| Možemo da organizujemo | `can_help` | Agent will send quote/proposal |
| Ne možemo | `cannot_help` | No availability, decline or suggest alternatives |
| Potrebno više informacija | `need_info` | Ask customer for clarification |

### After Response

1. Email/SMS sent to customer (based on agency settings)
2. Inquiry status updated to `responded`
3. If "Kreiraj upit" checked → creates Lead in pipeline
4. Slide-over closes, dashboard refreshes
5. Inquiry removed from "čekaju odgovor" list

### Database Schema Addition

```sql
-- Extend custom_inquiries table
ALTER TABLE custom_inquiries ADD COLUMN
  status VARCHAR(20) DEFAULT 'pending',
  -- Values: 'pending', 'responded', 'converted', 'closed'
  
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  response_type VARCHAR(30),
  -- Values: 'can_help', 'cannot_help', 'need_info'
  
  response_message TEXT,
  internal_notes TEXT,
  converted_to_lead_id UUID REFERENCES leads(id);

-- Index for dashboard queries
CREATE INDEX idx_custom_inquiries_pending 
ON custom_inquiries(organization_id, status) 
WHERE status = 'pending';
```

### Component Structure

```
/components/dashboard/
  InquirySlideOver.tsx      # Main slide-over component
  InquiryContactCard.tsx    # Customer info + quick actions
  InquiryRequestCard.tsx    # Request details display
  InquiryResponseForm.tsx   # Status + message form
```

---

## 3.8 "Današnji polasci/povratci" Section

**Purpose:** Show what's happening operationally TODAY.

**Data Source:**
```sql
-- Departures
SELECT * FROM trips 
WHERE departure_date = CURRENT_DATE
ORDER BY departure_time ASC

-- Returns  
SELECT * FROM trips
WHERE return_date = CURRENT_DATE
ORDER BY arrival_time ASC
```

**Card Content (Departure):**
- Time
- Destination + Hotel
- Passenger count + Transport type
- Quick actions: [📋 Rooming lista] [📄 Voucher]

**Card Content (Return):**
- Destination (passenger count) - arrival time
- Collapsed view (less prominent than departures)

---

## 3.7 "Popunjenost" Section ⭐ UPDATED

**Purpose:** Show capacity utilization by Package (not just destination). Only for vlastite ponude.

**Header:**
- Title: "📊 Popunjenost"
- Badge: "Vlastite ponude"
- Subtitle: "Sezona 2026 - Jun/Jul/Avg"

**Data Source:**
```sql
SELECT 
  p.id,
  p.name,
  p.hotel_name,
  p.hotel_stars,
  p.rental_period_start,
  p.rental_period_end,
  p.departure_day,
  p.default_capacity,
  SUM(d.total_spots) as total_spots,
  SUM(d.total_spots - d.available_spots) as booked_spots,
  ROUND((SUM(d.total_spots - d.available_spots)::float / SUM(d.total_spots)) * 100) as percentage,
  -- Next departure info
  (SELECT json_build_object(
    'date', departure_date,
    'available', available_spots
  ) FROM departures 
  WHERE package_id = p.id AND departure_date > CURRENT_DATE 
  ORDER BY departure_date LIMIT 1) as next_departure
FROM packages p
JOIN departures d ON d.package_id = p.id
WHERE p.organization_id = org_id
  AND p.package_type = 'vlastita'
  AND p.status = 'active'
  AND d.departure_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
GROUP BY p.id
ORDER BY percentage DESC
LIMIT 4
```

**Display per Package:**
- 📦 Icon + Package name (destination + hotel + stars)
- Period info: "Jun 1 - Avg 31 • Subotom • 40 mesta"
- Progress bar (color-coded: green <70%, yellow 70-90%, red >90%)
- Total capacity: "478 / 520 mesta"
- Percentage
- Next departure: "Sledeći: Sub 18.1. - 8 mesta" or "🔥 Sledeći: Sub 18.1. - samo 2 mesta!" if urgent

**Color Coding:**
- Green: <70% filled (healthy)
- Yellow: 70-90% filled (filling up)
- Red: >90% filled (almost full, push sales!)

**When to Show:**
- Only for agencies with vlastite packages
- Hidden if agency only does na upit

---

# 4. DATA REQUIREMENTS

## New Queries Needed

### Dashboard Stats Query
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'leads_to_call', (
      SELECT COUNT(*) FROM leads 
      WHERE organization_id = org_id 
        AND stage NOT IN ('closed_won', 'closed_lost')
        AND (contacted_at IS NULL OR contacted_at < NOW() - INTERVAL '24 hours')
    ),
    'departures_today', (
      SELECT COUNT(*) FROM bookings b
      JOIN offers o ON b.offer_id = o.id
      WHERE b.organization_id = org_id 
        AND o.departure_date = CURRENT_DATE
        AND b.status = 'confirmed'
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE organization_id = org_id
        AND created_at >= date_trunc('month', CURRENT_DATE)
        AND status = 'completed'
    ),
    'urgent_count', (
      SELECT COUNT(*) FROM (
        -- Expiring reservations
        SELECT id FROM reservations
        WHERE organization_id = org_id
          AND hold_expires_at < NOW() + INTERVAL '24 hours'
          AND status = 'pending'
        UNION ALL
        -- Last seats
        SELECT id FROM offers
        WHERE organization_id = org_id
          AND available_spots <= 3
          AND available_spots > 0
          AND departure_date > CURRENT_DATE
      ) urgent
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

# 5. COLOR SCHEME

Align with new dusty teal aesthetic:

```css
:root {
  /* Primary */
  --teal-600: #0F766E;
  --teal-500: #14B8A6;
  --teal-50: #F0FDFA;
  
  /* Accent */
  --amber-500: #F59E0B;
  --amber-50: #FFFBEB;
  
  /* Status */
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  
  /* Neutral */
  --gray-900: #1E293B;
  --gray-600: #475569;
  --gray-400: #94A3B8;
  --gray-100: #F1F5F9;
  --gray-50: #F8FAFC;
}
```

**Card Styles:**
- Background: white
- Border: 1px solid #E2E8F0
- Border-radius: 14px
- Shadow: subtle (0 1px 3px rgba(0,0,0,0.05))

---

# 6. INTERACTIONS

## Quick Actions

| Action | Trigger | Result |
|--------|---------|--------|
| Call lead | Click 📞 | Opens `tel:+381...` |
| Viber lead | Click 💬 | Opens `viber://chat?number=...` |
| View lead | Click card | Navigate to `/dashboard/leads/{id}` |
| View trip | Click departure | Navigate to `/dashboard/trips/{id}` |
| Download voucher | Click 📄 | Downloads PDF |
| View rooming list | Click 📋 | Opens modal or navigates |

## Refresh

- Auto-refresh every 5 minutes
- Manual refresh button in header
- Real-time for critical items (reservations expiring)

---

# 7. EMPTY STATES

| Section | Empty State |
|---------|-------------|
| Pozovi danas | "✨ Sve je pod kontrolom! Nema upita koji čekaju." |
| Zahteva pažnju | "✅ Odlično! Nema hitnih stavki." |
| Današnji polasci | "🏖️ Danas nema polazaka." |
| Popunjenost | "📊 Dodajte ponude da vidite popunjenost." |

---

# 8. FILE STRUCTURE

```
/app/(dashboard)/dashboard/
  page.tsx                          # Main dashboard page (REDESIGN)

/components/dashboard/
  # Layout
  DashboardHeader.tsx               # Welcome header + date
  StatCards.tsx                     # 5 stat cards row
  
  # Left Column - Calls & Inquiries
  LeadsToCall.tsx                   # "Pozovi danas" section
  InquiriesWaiting.tsx              # "Upiti čekaju odgovor" section
  LeadQuickCard.tsx                 # Lead card with call/viber actions
  InquiryQuickCard.tsx              # Inquiry card with respond action
  
  # Left Column - Operations
  TodaysDepartures.tsx              # Departures + returns (vlastite only)
  DepartureCard.tsx                 # Individual departure card
  
  # Right Column
  AttentionRequired.tsx             # "Zahteva pažnju" section
  AttentionCategory.tsx             # Category with items
  AttentionItem.tsx                 # Clickable attention item
  CapacityOverview.tsx              # "Popunjenost" section (vlastite only)
  PackageCapacityCard.tsx           # Package capacity with bar
  CapacityBar.tsx                   # Progress bar component
  
  # Inquiry Response
  InquirySlideOver.tsx              # Main slide-over panel
  InquiryContactCard.tsx            # Customer info + quick actions
  InquiryRequestCard.tsx            # Request details display
  InquiryResponseForm.tsx           # Status + message form
  
  # Shared
  EmptyState.tsx                    # Empty state component
  PriorityDot.tsx                   # Red/yellow/green dot indicator
  QuickActionButtons.tsx            # Call/Viber/WhatsApp buttons

/lib/
  dashboard-queries.ts              # All dashboard data fetching
  dashboard-actions.ts              # Response actions (respond to inquiry, etc.)

/hooks/
  use-dashboard-data.ts             # Combined hook for all dashboard data
  use-inquiry-response.ts           # Hook for inquiry response flow

/types/
  dashboard.ts                      # Dashboard-specific types
```

---

# 9. IMPLEMENTATION PHASES

## Phase 0: Prerequisites (Before Dashboard)
- [ ] Package/Departure system (see Section 10.1)
- [ ] Quick Contact CTA (see Section 10.2)
- [ ] Extend custom_inquiries table with response fields

## Phase 1: Core Structure (Day 1)
- [ ] New page layout with CSS grid
- [ ] DashboardHeader component
- [ ] StatCards (5 cards) with mock data
- [ ] Basic responsive styling
- [ ] Color scheme implementation

## Phase 2: Leads & Inquiries Split (Day 2)
- [ ] LeadsToCall component
- [ ] InquiriesWaiting component
- [ ] LeadQuickCard with call/viber actions
- [ ] InquiryQuickCard with "Odgovori" button
- [ ] PriorityDot component (red/yellow/green)
- [ ] Real data integration

## Phase 3: Inquiry Response Flow (Day 2-3)
- [ ] InquirySlideOver component (Sheet from shadcn)
- [ ] InquiryContactCard with quick actions
- [ ] InquiryRequestCard with request details
- [ ] InquiryResponseForm (status + message)
- [ ] API endpoint for responding to inquiry
- [ ] Email notification to customer
- [ ] "Kreiraj upit u pipeline-u" functionality

## Phase 4: Attention Section (Day 3)
- [ ] AttentionRequired component
- [ ] AttentionCategory with collapsible items
- [ ] AttentionItem - clickable rows
- [ ] Category routing (payment tab, reservation detail, etc.)
- [ ] Inquiry items open slide-over

## Phase 5: Operations (Day 3-4)
- [ ] TodaysDepartures component
- [ ] DepartureCard with quick actions
- [ ] Returns section (collapsed)
- [ ] "Vlastite ponude" badge
- [ ] Empty states for all sections

## Phase 6: Capacity Overview (Day 4)
- [ ] CapacityOverview component
- [ ] PackageCapacityCard with bar
- [ ] CapacityBar with color coding
- [ ] Package-based data aggregation query
- [ ] "Next departure" display
- [ ] Urgent indicators (🔥)

## Phase 7: Data Integration (Day 4-5)
- [ ] Dashboard stats query function
- [ ] Real-time refresh (5 min)
- [ ] Loading states
- [ ] Error handling
- [ ] Auto-refresh on inquiry response

## Phase 8: Polish & Mobile (Day 5)
- [ ] Mobile responsive layout
- [ ] Touch-friendly buttons
- [ ] Performance optimization
- [ ] Final styling pass
- [ ] Testing with real data

---

# 10. DEPENDENCIES

**Requires these features to exist:**
- ✅ Leads table (exists)
- ⚠️ Offers table (exists but needs capacity tracking)
- ⚠️ Bookings table (may need updates)
- ⚠️ Trips table (may need to create)
- ⚠️ Payments table (may need to create)
- ⚠️ Reservations table (may need updates)

**If tables don't exist yet:**
- Use mock data for demo
- Build components with interfaces
- Wire up real data when tables ready

---

# 10.1 PREREQUISITE: PACKAGE/DEPARTURE SYSTEM ⭐ CRITICAL

Before dashboard can show accurate capacity data, we need to rebuild offers as **Packages with Departures**.

## Why This Matters

Serbian agencies have two types of inventory:

| Type | Serbian | How It Works |
|------|---------|--------------|
| **Vlastite ponude** | Sopstveni kapacitet | Agency rents hotel allotment + bus for a season (Jun-Aug). Results in MULTIPLE departure dates from one contract. |
| **Na upit** | Na upit | No pre-bought inventory. Agent queries suppliers per request. |

## Current Problem

Our `offers` table treats each offer as a single thing. But a "vlastita ponuda" is actually:

```
Contract: Hotel Aegean Blue, Jun 1 - Aug 31
├── Departure: Jun 1 (40 seats)
├── Departure: Jun 8 (40 seats)
├── Departure: Jun 15 (40 seats)
├── ... every Saturday ...
└── Departure: Aug 24 (40 seats)
```

## New Schema Needed

```sql
-- Packages (the contract/product)
CREATE TABLE packages (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  
  -- Type
  package_type VARCHAR(20) NOT NULL, -- 'vlastita' | 'na_upit'
  
  -- Basic info
  name VARCHAR(200),
  destination_country VARCHAR(100),
  destination_city VARCHAR(100),
  hotel_name VARCHAR(200),
  hotel_stars INTEGER,
  board_type VARCHAR(50),
  transport_type VARCHAR(50),
  
  -- For vlastita only (rental period)
  rental_period_start DATE,
  rental_period_end DATE,
  departure_pattern VARCHAR(20), -- 'weekly' | 'custom'
  departure_day INTEGER, -- 0=Sun, 6=Sat
  default_duration INTEGER, -- nights
  default_capacity INTEGER, -- per departure
  
  -- Pricing
  price_from DECIMAL(10,2),
  
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departures (individual dates with capacity)
CREATE TABLE departures (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES packages(id),
  organization_id UUID REFERENCES organizations(id),
  
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  total_spots INTEGER,
  available_spots INTEGER,
  
  price_override DECIMAL(10,2), -- optional
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Package Creation Flow

```
Step 1: Tip paketa
┌─────────────────────────────────────────┐
│  ○ Vlastita ponuda (sopstveni kapacitet)│
│  ○ Na upit (bez unapred zakupljenog)    │
└─────────────────────────────────────────┘

Step 2 (if Vlastita): Period zakupa
┌─────────────────────────────────────────┐
│  Od: [01.06.2026]  Do: [31.08.2026]     │
│                                         │
│  Polasci:                               │
│  ○ Svake nedelje, dan: [Subota ▼]       │
│  ○ Određeni datumi [+ Dodaj]            │
│                                         │
│  Kapacitet po polasku: [40] mesta       │
│  Trajanje: [7] noći                     │
└─────────────────────────────────────────┘
→ Auto-generates all Saturday departures Jun-Aug
```

## Impact on Dashboard

With this system:
- "Popunjenost" shows real capacity by destination
- "Današnji polasci" pulls from `departures` table
- "Poslednja mesta" alerts when departure.available_spots ≤ 3

## Implementation Order

1. ⭐ Build Package/Departure system FIRST
2. Migrate existing offers → packages
3. Then build dashboard with real data

---

# 10.2 QUICK CONTACT CTA ⭐ NEW

## Problem

User goes through qualification but:
- Has a very specific/unusual request
- Wants a destination we don't have listed
- Just wants to talk to someone

Current flow shows "Nema ponuda" → custom inquiry form with ALL qualification data.

## Solution

Add a prominent **"Imate specifičan zahtev?"** CTA that's:
- Visible throughout the flow (not just at dead ends)
- Super simple: just name + phone + email
- No qualification data required

## Where to Show

```
Qualification Flow:
┌─────────────────────────────────────────┐
│                                         │
│  [Step 1: Destination]                  │
│  [Step 2: Dates]                        │
│  [Step 3: Guests]                       │
│  ...                                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💬 Imate specifičan zahtev?            │
│  Organizujemo i individualna putovanja  │
│  po vašoj meri.                         │
│                                         │
│  [Kontaktirajte nas →]                  │
│                                         │
└─────────────────────────────────────────┘
```

## Also on Results Page (No Matches)

```
┌─────────────────────────────────────────┐
│                                         │
│  🔍 Nema rezultata za vašu pretragu     │
│                                         │
│  Ali ne brinite! Organizujemo i         │
│  individualna putovanja po meri.        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  🌍 INDIVIDUALNA PUTOVANJA      │    │
│  │                                 │    │
│  │  Recite nam gde želite da       │    │
│  │  putujete, a mi ćemo vam        │    │
│  │  pronaći savršenu ponudu.       │    │
│  │                                 │    │
│  │  [Pošaljite nam zahtev]         │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Quick Contact Form (Minimal)

```
┌─────────────────────────────────────────┐
│                                         │
│  💬 Kontaktirajte nas                   │
│                                         │
│  Ime i prezime *                        │
│  [_____________________________]        │
│                                         │
│  Telefon *                              │
│  [_____________________________]        │
│  Pozvaćemo vas u roku od 24h            │
│                                         │
│  Email                                  │
│  [_____________________________]        │
│                                         │
│  Šta vas zanima? (opciono)              │
│  [_____________________________]        │
│  [_____________________________]        │
│                                         │
│  [Pošalji zahtev]                       │
│                                         │
└─────────────────────────────────────────┘
```

## Database

Uses existing `custom_inquiries` table with:
```sql
source = 'quick_contact'  -- vs 'qualification_flow'
qualification_data = NULL -- no qualification for quick contact
```

## Agency Setting

```sql
ALTER TABLE agency_booking_settings
ADD COLUMN show_quick_contact BOOLEAN DEFAULT true;
```

---

# 11. SUCCESS METRICS

After launch, measure:
- Time to first action (how fast do agents start calling?)
- Click-through rate on quick actions
- Reduction in missed callbacks
- User feedback

---

# APPENDIX: SERBIAN LABELS

| English | Serbian |
|---------|---------|
| Dashboard | Kontrolna tabla |
| Today | Danas |
| This month | Ovog meseca |
| Call | Pozovi |
| Departures | Polasci |
| Returns | Povratci |
| Requires attention | Zahteva pažnju |
| Late payments | Kasne uplate |
| Expiring | Ističe |
| Last seats | Poslednja mesta |
| Capacity | Popunjenost |
| View all | Vidi sve |
| No items | Nema stavki |
| passengers | putnika |
| seats | mesta |

---

*Proposal created: January 15, 2026*
