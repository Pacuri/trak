# TRAK Agency Customization & Custom Inquiries
## Implementation Bible v1.0
## January 14, 2026

---

# TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Agency Landing Page](#3-agency-landing-page)
4. [Custom Inquiry Flow](#4-custom-inquiry-flow)
5. [Admin Panel](#5-admin-panel)
6. [API Endpoints](#6-api-endpoints)
7. [Notifications](#7-notifications)
8. [File Structure](#8-file-structure)
9. [Implementation Priority](#9-implementation-priority)

---

# 1. OVERVIEW

## Problem Statement

1. **Generic landing pages** - All agencies look the same, losing brand differentiation
2. **Lost leads** - When no offers match, users hit a dead end
3. **No customization** - Agencies can't reflect their specialization, experience, or trust signals

## Solution

1. **Customizable landing pages** - Each agency can brand their public page
2. **Custom inquiry flow** - Users can submit requests when no offers match
3. **Admin panel** - Simple settings UI for agencies to configure both

---

# 2. DATABASE SCHEMA

## 2.1 New Table: `agency_landing_settings`

```sql
CREATE TABLE agency_landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Branding
  logo_url TEXT,
  logo_initials VARCHAR(2),
  primary_color VARCHAR(7) DEFAULT '#0F766E',
  background_image_url TEXT,
  
  -- Hero Section
  headline TEXT DEFAULT 'Pronađite savršeno putovanje',
  subtitle TEXT DEFAULT 'Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas — za manje od 60 sekundi.',
  cta_text VARCHAR(50) DEFAULT 'Započni pretragu',
  
  -- Specialization
  show_specialization BOOLEAN DEFAULT false,
  specialization_emoji VARCHAR(10),
  specialization_text VARCHAR(100),
  
  -- Stats
  show_stats BOOLEAN DEFAULT false,
  stat_travelers INTEGER,
  stat_years INTEGER,
  stat_rating DECIMAL(2,1),
  stat_destinations INTEGER,
  
  -- Trust Badges
  is_yuta_member BOOLEAN DEFAULT false,
  is_licensed BOOLEAN DEFAULT true,
  license_number VARCHAR(50),
  show_installments BOOLEAN DEFAULT false,
  show_secure_booking BOOLEAN DEFAULT true,
  
  -- Footer
  legal_name VARCHAR(100),
  footer_text VARCHAR(200),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_agency_landing_settings_org ON agency_landing_settings(organization_id);

-- RLS
ALTER TABLE agency_landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org landing settings"
  ON agency_landing_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can update own org landing settings"
  ON agency_landing_settings FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
  ));

CREATE POLICY "Public can view landing settings by org"
  ON agency_landing_settings FOR SELECT
  USING (true);
```

## 2.2 Extend: `agency_booking_settings`

Add these columns to existing table:

```sql
ALTER TABLE agency_booking_settings
ADD COLUMN allow_custom_inquiries BOOLEAN DEFAULT true,
ADD COLUMN show_inquiry_with_results BOOLEAN DEFAULT true,
ADD COLUMN inquiry_response_text VARCHAR(200) DEFAULT 'Javićemo vam se u roku od 24 sata',
ADD COLUMN inquiry_notification_email VARCHAR(100),
ADD COLUMN inquiry_notification_phone VARCHAR(20);
```

## 2.3 New Table: `custom_inquiries`

```sql
CREATE TABLE custom_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Contact Info
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(100),
  
  -- Qualification Data (JSON)
  qualification_data JSONB NOT NULL,
  
  -- Custom Note
  customer_note TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'new', -- new, contacted, converted, closed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'qualification_flow'
);

-- Indexes
CREATE INDEX idx_custom_inquiries_org ON custom_inquiries(organization_id);
CREATE INDEX idx_custom_inquiries_status ON custom_inquiries(status);
CREATE INDEX idx_custom_inquiries_created ON custom_inquiries(created_at DESC);

-- RLS
ALTER TABLE custom_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org inquiries"
  ON custom_inquiries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
  ));

CREATE POLICY "Public can insert inquiries"
  ON custom_inquiries FOR INSERT
  WITH CHECK (true);
```

---

# 3. AGENCY LANDING PAGE

## 3.1 Design Specifications

### Color Palette: Dusty Teal

```css
/* Background Overlay */
background: linear-gradient(
  180deg,
  rgba(55, 100, 100, 0.7) 0%,
  rgba(60, 110, 110, 0.45) 50%,
  rgba(50, 90, 95, 0.65) 100%
);

/* Primary (for logo, stats) */
--primary: #0F766E;
--primary-dark: #0D6560;

/* Accent (CTA button) */
--accent: #F59E0B;
--accent-hover: #FBBF24;
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Agency Name                    [Licencirana agencija]│ ← Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              [🇬🇷 Specijalizacija badge]                    │ ← Optional
│                                                             │
│              Pronađite savršen                              │
│              odmor u Grčkoj                                 │ ← Headline
│                                                             │
│              Subtitle text here...                          │
│                                                             │
│              [ Započni pretragu → ]                         │ ← CTA
│                                                             │
│              60 sekundi • Besplatno • Bez obaveze           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  12,000+      │      32        │     ⭐ 4.9       │    │ ← Stats card
│  │  Putnika      │    Godina      │     Ocena        │    │    (optional)
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  🔒 Sigurna rezervacija • 💳 Rate • ✓ YUTA garancija       │ ← Trust badges
├─────────────────────────────────────────────────────────────┤
│  Agency d.o.o. • Licencirana agencija • OTP 123/2024       │ ← Footer
└─────────────────────────────────────────────────────────────┘
```

### Background Image Logic

1. If `background_image_url` is set → Use that
2. Else if agency has offers → Use image from most popular destination
3. Else → Use default beach image

### Floating Offer Cards (Desktop Only)

On screens ≥1024px, show 2 floating offer cards on left and right sides of hero.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────┐                                    ┌──────────────┐   │
│  │ 🔥 -20%      │                                    │ ⏰ Još 3 mesta│   │
│  │ ┌──────────┐ │                                    │ ┌──────────┐ │   │
│  │ │  IMAGE   │ │          HERO CONTENT              │ │  IMAGE   │ │   │
│  │ └──────────┘ │                                    │ └──────────┘ │   │
│  │ Hotel Name   │                                    │ Hotel Name   │   │
│  │ Location     │                                    │ Location     │   │
│  │ od €459/os   │                                    │ od €549/os   │   │
│  └──────────────┘                                    └──────────────┘   │
│        ↑                                                    ↑           │
│    Animation:                                          Animation:       │
│    float up/down                                       float up/down    │
│    3s ease infinite                                    +1.5s delay      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data Source:** Pull 2 random active offers from agency's inventory with urgency labels.

**Card Structure:**
```typescript
interface FloatingOfferCard {
  id: string;
  hotel_name: string;
  destination_city: string;
  destination_country: string;
  price_per_person: number;
  image_url: string | null;
  urgency_label: string | null; // "🔥 -20%", "⏰ Još 3 mesta", etc.
}
```

**Styling:**
```css
.floating-offer {
  position: absolute;
  z-index: 10;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  max-width: 200px;
  animation: float 3s ease-in-out infinite;
}

.floating-offer.left {
  left: 5%;
  top: 30%;
}

.floating-offer.right {
  right: 5%;
  top: 40%;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Hide on mobile/tablet */
@media (max-width: 1024px) {
  .floating-offer {
    display: none;
  }
}
```

**Urgency Label Priority (same as offer cards):**
1. 🔥 POSLEDNJA MESTA (≤2 spots)
2. ⏰ ISTIČE USKORO (≤7 days)
3. 📈 POPUNJAVA SE (≥70% booked)
4. 💰 SNIŽENO -X% (≥10% discount)
5. 🆕 NOVO (≤7 days old)
6. ⭐ POPULARNO (≥10 views/24h)

**Fallback:** If agency has <2 offers, hide floating cards entirely.

**Image Fallback:** If offer has no image, use gradient placeholder:
```css
/* Gradient placeholders by index */
.offer-img-placeholder-1 { background: linear-gradient(135deg, #06B6D4, #0891B2); }
.offer-img-placeholder-2 { background: linear-gradient(135deg, #F59E0B, #D97706); }
```

### Default Values (No Customization)

```
Headline: "Pronađite savršeno putovanje"
Subtitle: "Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas."
CTA: "Započni pretragu"
Stats: Hidden
Specialization: Hidden
Trust badges: Only "Sigurna rezervacija"
```

## 3.2 Component Props

```typescript
interface AgencyLandingSettings {
  // Branding
  logo_url: string | null;
  logo_initials: string | null;
  primary_color: string;
  background_image_url: string | null;
  
  // Hero
  headline: string;
  subtitle: string;
  cta_text: string;
  
  // Specialization
  show_specialization: boolean;
  specialization_emoji: string | null;
  specialization_text: string | null;
  
  // Stats
  show_stats: boolean;
  stat_travelers: number | null;
  stat_years: number | null;
  stat_rating: number | null;
  stat_destinations: number | null;
  
  // Trust
  is_yuta_member: boolean;
  is_licensed: boolean;
  license_number: string | null;
  show_installments: boolean;
  show_secure_booking: boolean;
  
  // Footer
  legal_name: string | null;
  footer_text: string | null;
}
```

---

# 4. CUSTOM INQUIRY FLOW

## 4.1 When to Show

| Scenario | Action |
|----------|--------|
| No matching offers + `allow_custom_inquiries: true` | Show big "Pošalji upit" CTA |
| No matching offers + `allow_custom_inquiries: false` | Show "Nema ponuda" message only |
| Has offers + `show_inquiry_with_results: true` | Show small link at bottom |
| Has offers + `show_inquiry_with_results: false` | Hide inquiry option |

## 4.2 User Flow

```
Results Page (No Offers)
         │
         ▼
┌─────────────────────────┐
│   🔍 Nema ponuda        │
│                         │
│   [Pošalji upit agentu] │ ← Primary CTA
│                         │
│   ⏱ Javićemo vam se    │
│   u roku od 24 sata     │
└─────────────────────────┘
         │
         ▼ (click)
┌─────────────────────────┐
│   Vaši kriterijumi:     │
│   [Grčka] [2 os] [Jul]  │ ← From qualification
│   ─────────────────     │
│   Ime*: [___________]   │
│   Telefon*: [________]  │
│   Email: [___________]  │
│   Napomena: [________]  │
│                         │
│   [Pošalji upit]        │
└─────────────────────────┘
         │
         ▼ (submit)
┌─────────────────────────┐
│   ✓ Upit je poslat!     │
│                         │
│   Očekujte poziv u      │
│   roku od 24 sata       │
│                         │
│   [← Nazad na početnu]  │
└─────────────────────────┘
```

## 4.3 Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `customer_name` | text | Yes | Min 2 chars |
| `customer_phone` | tel | Yes | Serbian phone format |
| `customer_email` | email | No | Valid email |
| `customer_note` | textarea | No | Max 500 chars |

## 4.4 Qualification Data Structure

Stored in `qualification_data` JSONB:

```json
{
  "destination": {
    "country": "Grčka",
    "city": "Halkidiki"
  },
  "guests": {
    "adults": 2,
    "children": 1,
    "childAges": [5]
  },
  "dates": {
    "month": "jul",
    "duration": 7,
    "flexible": true,
    "exactStart": null
  },
  "accommodation": {
    "type": "hotel",
    "board": "all_inclusive",
    "transport": "bus"
  },
  "budget": {
    "min": 500,
    "max": 700,
    "perPerson": true
  }
}
```

## 4.5 On Submit: Create Lead

When inquiry is submitted:

```typescript
// 1. Create lead
const lead = await createLead({
  organization_id: agency.organization_id,
  name: formData.customer_name,
  phone: formData.customer_phone,
  email: formData.customer_email,
  destination: qualification.destination.country,
  destination_city: qualification.destination.city,
  adults: qualification.guests.adults,
  children: qualification.guests.children,
  travel_month: qualification.dates.month,
  budget_min: qualification.budget.min,
  budget_max: qualification.budget.max,
  source: 'Kvalifikacija - prilagođeni upit',
  notes: formData.customer_note,
  stage_id: 'novi_upit' // First pipeline stage
});

// 2. Create inquiry record
const inquiry = await createInquiry({
  organization_id: agency.organization_id,
  lead_id: lead.id,
  customer_name: formData.customer_name,
  customer_phone: formData.customer_phone,
  customer_email: formData.customer_email,
  qualification_data: qualification,
  customer_note: formData.customer_note
});

// 3. Send notification
await sendInquiryNotification(agency, inquiry);
```

---

# 5. ADMIN PANEL

## 5.1 Location

```
/dashboard/settings/landing → Landing page customization
/dashboard/settings/booking → Booking & inquiry settings (existing, extend)
```

Or combined:
```
/dashboard/settings/public-page → All public-facing settings
```

## 5.2 Landing Page Settings UI

### Section 1: Branding

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 Branding                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Logo                      Inicijali (ako nema logo)        │
│  ┌──────────────┐          ┌──────────────┐                 │
│  │  [Upload]    │          │  ST          │                 │
│  │  PNG, JPG    │          └──────────────┘                 │
│  └──────────────┘                                           │
│                                                             │
│  Primarna boja             Pozadinska slika                 │
│  [■] #0F766E               ┌──────────────┐                 │
│                            │  [Upload]    │                 │
│                            └──────────────┘                 │
│                            Ostavite prazno za auto          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 2: Hero

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Hero sekcija                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Naslov                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pronađite savršen odmor u Grčkoj                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Podnaslov                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Recite nam šta tražite...                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Tekst dugmeta                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Započni pretragu                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  [●] Prikaži specijalizaciju                                │
│      Badge iznad naslova (npr. "Specijalisti za Grčku")     │
│                                                             │
│      Emoji          Tekst                                   │
│      ┌────────┐     ┌──────────────────────────────────┐    │
│      │ 🇬🇷    │     │ Specijalisti za Grčku već 32g   │    │
│      └────────┘     └──────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 3: Statistike

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Statistike                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [●] Prikaži statistike                                     │
│      Bela kartica sa brojevima                              │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Putnika  │ │ Godina   │ │ Ocena    │ │Destinac. │       │
│  │ [12000]  │ │ [32]     │ │ [4.9]    │ │ [  ]     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  Ostavite prazno da sakrijete tu statistiku                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 4: Trust Badges

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Trust badges                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ ] YUTA član                                              │
│      Prikazuje "YUTA garancija putovanja"                   │
│                                                             │
│  [●] Sigurna rezervacija                                    │
│      Prikazuje badge za sigurnost                           │
│                                                             │
│  [ ] Plaćanje na rate                                       │
│      Prikazuje opciju plaćanja na rate                      │
│                                                             │
│  Broj licence (OTP)                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ OTP 123/2024                                        │    │
│  └─────────────────────────────────────────────────────┘    │
│  Prikazuje se u footeru                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 5: Prilagođeni upiti

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Prilagođeni upiti                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [●] Dozvoli prilagođene upite                              │
│      Klijenti mogu poslati upit ako nema ponuda             │
│                                                             │
│  [●] Prikaži i kada ima ponuda                              │
│      "Niste pronašli što tražite?" link                     │
│                                                             │
│  Poruka o vremenu odgovora                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Javićemo vam se u roku od 24 sata                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Email za notifikacije                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ info@sanitours.rs                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Telefon za SMS/Viber (opciono)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 065 123 4567                                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 5.3 Live Preview

Right side of admin panel shows mobile preview that updates as user types.

---

# 6. API ENDPOINTS

## 6.1 Landing Settings

```typescript
// GET /api/agencies/[org_id]/landing-settings
// Get landing settings for logged-in user's organization
Response: AgencyLandingSettings

// PUT /api/agencies/[org_id]/landing-settings
// Update landing settings
Body: Partial<AgencyLandingSettings>
Response: AgencyLandingSettings

// GET /api/public/agencies/[slug]/landing
// Public endpoint for rendering landing page
Response: {
  agency: { name, slug },
  settings: AgencyLandingSettings,
  background_image_url: string, // Resolved (custom or auto)
  floating_offers: FloatingOfferCard[] // 0-2 offers for desktop cards
}
```

## 6.2 Custom Inquiries

```typescript
// POST /api/public/agencies/[slug]/inquiries
// Submit custom inquiry (public, no auth)
Body: {
  customer_name: string,
  customer_phone: string,
  customer_email?: string,
  customer_note?: string,
  qualification_data: QualificationData
}
Response: { success: true, inquiry_id: string }

// GET /api/inquiries
// List inquiries for logged-in organization
Query: ?status=new&limit=20
Response: CustomInquiry[]

// PUT /api/inquiries/[id]/status
// Update inquiry status
Body: { status: 'contacted' | 'converted' | 'closed' }
Response: CustomInquiry
```

---

# 7. NOTIFICATIONS

## 7.1 Email Notification

When inquiry is submitted, send email to `inquiry_notification_email`:

```
Subject: 🔔 Nov upit - {customer_name}

Poštovani,

Primili ste nov upit za putovanje:

KONTAKT:
• Ime: Petar Petrović
• Telefon: 065 123 4567
• Email: petar@email.com

ZAHTEV:
• Destinacija: Grčka, Halkidiki
• Putnici: 2 odraslih, 1 dete (5 god)
• Termin: Jul, 7 noći (fleksibilan)
• Smeštaj: Hotel, All Inclusive
• Prevoz: Autobus
• Budžet: €500-700 po osobi

NAPOMENA KLIJENTA:
"Želimo hotel blizu plaže, sa bazenom i dečijim klubom"

---
Pogledajte upit u TRAK-u: https://trak.rs/dashboard/leads/{lead_id}
```

## 7.2 SMS/Viber (Optional)

If `inquiry_notification_phone` is set:

```
🔔 Nov upit: Petar Petrović (065 123 4567) traži Grčka/Halkidiki, jul, 2+1, €500-700/os
```

---

# 8. FILE STRUCTURE

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── public-page/
│   │           └── page.tsx          # Admin settings UI
│   ├── (public)/
│   │   └── a/
│   │       └── [slug]/
│   │           ├── page.tsx          # Landing page (update)
│   │           └── inquiry/
│   │               └── page.tsx      # Inquiry form page
│   └── api/
│       ├── agencies/
│       │   └── [org_id]/
│       │       └── landing-settings/
│       │           └── route.ts      # GET, PUT
│       ├── public/
│       │   └── agencies/
│       │       └── [slug]/
│       │           ├── landing/
│       │           │   └── route.ts  # Public landing data
│       │           └── inquiries/
│       │               └── route.ts  # POST inquiry
│       └── inquiries/
│           ├── route.ts              # GET list
│           └── [id]/
│               └── status/
│                   └── route.ts      # PUT status
├── components/
│   ├── landing/
│   │   ├── LandingHero.tsx
│   │   ├── LandingStats.tsx
│   │   ├── LandingTrustBadges.tsx
│   │   ├── LandingFooter.tsx
│   │   └── FloatingOfferCards.tsx   # Desktop floating previews
│   ├── inquiry/
│   │   ├── InquiryForm.tsx
│   │   ├── InquiryCriteriaSummary.tsx
│   │   └── InquirySuccess.tsx
│   └── admin/
│       ├── LandingSettingsForm.tsx
│       ├── LandingPreview.tsx
│       └── InquirySettingsForm.tsx
├── lib/
│   └── notifications/
│       ├── email.ts
│       └── sms.ts
└── types/
    ├── landing.ts
    └── inquiry.ts
```

---

# 9. IMPLEMENTATION PRIORITY

## Phase 1: Core (Before Tourism Fair)

1. ✅ Database migrations for new tables/columns
2. ✅ Public landing page with customization support
3. ✅ Default values working (no customization needed to look good)
4. ✅ Custom inquiry flow (form + submission + lead creation)
5. ✅ Email notification on inquiry

## Phase 2: Admin Panel

1. Landing settings admin UI
2. Live preview in admin
3. Image upload for logo/background
4. Inquiry settings in admin

## Phase 3: Polish

1. SMS/Viber notifications
2. Inquiry list view in dashboard
3. Background image auto-selection from offers
4. Color picker with preset palettes

---

# QUICK REFERENCE

## Serbian Labels

| English | Serbian |
|---------|---------|
| Landing page | Landing stranica |
| Customization | Prilagođavanje |
| Custom inquiry | Prilagođeni upit |
| Submit inquiry | Pošalji upit |
| Response time | Vreme odgovora |
| Trust badges | Trust badges |
| Specialization | Specijalizacija |
| Statistics | Statistike |
| Save changes | Sačuvaj izmene |
| Preview | Pregled |

## Default Copy

```
Headline: "Pronađite savršeno putovanje"
Subtitle: "Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas — za manje od 60 sekundi."
CTA: "Započni pretragu"
Response time: "Javićemo vam se u roku od 24 sata"
No results: "Trenutno nemamo ponude koje odgovaraju vašim kriterijumima, ali možemo da vam pronađemo nešto posebno!"
Success: "Upit je poslat! Hvala vam na interesovanju. Naš tim će pregledati vaš zahtev i javiti vam se u najkraćem roku."
```

---

## Mockup Files

- `trak-landing-v2.html` - Landing page with color switcher
- `trak-admin-landing-settings.html` - Admin panel UI
- `trak-custom-inquiry-flow.html` - Inquiry flow screens

---

*Last updated: January 14, 2026*
