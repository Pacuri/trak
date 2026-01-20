# AgTravelSoft - Complete Feature Reference

> **Document Purpose:** Internal reference for understanding the existing AgTravelSoft system that agencies currently use, to inform Trak development priorities and migration strategy.

---

## Product Information

| Property | Value |
|----------|-------|
| **Product Name** | AgTravelSoft |
| **Current Version** | Web-Edition Ver. 1.12 |
| **Developer** | Funtours D.O.O |
| **Location** | Novi Sad, Serbia |
| **Contact** | +381 64 2253320 |
| **Email** | funtours@sezampro.rs |
| **Website** | agtravelsoft.rs / funtours.rs |
| **Customer Base** | 70+ travel agencies in Serbia/region |
| **Years in Market** | 15+ years |

---

## System Architecture

### Technical Stack
- **Platform:** ASP.NET Web Forms (.aspx)
- **Likely Database:** Microsoft SQL Server
- **Deployment:** Cloud-hosted web application
- **Authentication:** Session-based login with annual license
- **License Model:** Annual subscription (license expires yearly)

### Access Model
- Multi-user system with organization accounts
- User roles and permissions
- Branded per-agency (e.g., "AgTravelSoftSrbija")

---

## Main Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ AgTravelSoft                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ Klijenti │ Ugovori │ Dokumenta │ Online rezervacije │ AgTravel      │
│          │         │           │ rezervacije        │ Izveštaji     │
│          │         │           │                    │ Grupe         │
│          │         │           │                    │ Parametri     │
│          │         │           │                    │ Booking       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Dashboard (Početna)

### Dashboard Widgets

The main dashboard displays three primary widgets:

#### 1.1 Ugovori (Contracts) Widget
Quick access buttons:
- **Aktivni** - Active contracts
- **Storno** - Cancelled contracts
- **Priprema** - Contracts in preparation
- **Novi** - Create new contract

#### 1.2 Dokumenta (Documents) Widget
Quick access buttons:
- **Fakture** - Invoices
- **Profakture** - Pro-forma invoices
- **Gotovinski** - Cash receipts
- **Avansi** - Advance payments

#### 1.3 Finansije (Finances) Widget
Quick access buttons:
- **Uplate** - Incoming payments
- **Plaćanja** - Outgoing payments
- **Dužnici** - Debtors list
- **Pazari** - Daily sales/markets

### Additional Dashboard Sections

#### Obaveštavanje putnika (Passenger Notifications)
- Send bulk notifications to travelers
- Cancel notifications
- Create new notifications

#### Specijalne ponude (Special Offers)
- View special offers shared by other AgTravelSoft users
- Share your offers with the network
- Example: "Specijalne ponude koje korisnici agtravelsoft-a mogu kroz sistem podeliti sa ostalim korisnicima"

---

## Module 2: Klijenti (Clients/Customers)

### 2.1 Kupci - Klijenti (Buyers/Customers)
Direct end customers who purchase travel services.

**Customer Record Fields:**
- Name/Company name
- City
- Phone number
- Mobile number
- Email address
- Address (expandable details)
- PIB (Tax ID number) - for business customers

**Features:**
- Customer list with search
- Expandable detail view
- Contact information management

### 2.2 Organizatori (Organizers/Tour Operators)
Tour operators and suppliers the agency works with.

**Purpose:** Manage relationships with tour operators whose packages you sell.

### 2.3 Subagenti (Sub-agents)
Network of sub-agents who sell on your behalf.

**Features:**
- Sub-agent registration
- Commission tracking
- Contract management

### 2.4 Black List (Crna lista)
**Status:** In preparation ("u pripremi")

**Purpose:** Track problematic customers to avoid future issues.

### 2.5 Ugovori o subagenturi (Sub-agent Contracts)
Manage contracts with your sub-agent network.

---

## Module 3: Ugovori (Contracts)

This is the **core module** of AgTravelSoft - every booking becomes a "contract" (ugovor).

### 3.1 Contract Types

| Status | Serbian | Description |
|--------|---------|-------------|
| Active | Aktivni | Current valid contracts |
| Preparation | U pripremi | Draft contracts not yet confirmed |
| Cancelled | Storno | Cancelled/voided contracts |
| New | Novi | Create new contract |

### 3.2 Contract List View (Aktivni Ugovori)

**Toolbar Actions:**
| Button | Serbian | Function |
|--------|---------|----------|
| Show | Prikaži | View contract details |
| Contract | Ugovor | Generate contract document (dropdown) |
| Announcement | Najava | Generate travel announcement |
| Confirmation | Potvrda | Generate booking confirmation |
| Send Document | Slanje dokumenta | Email documents to customer |
| Voucher | Voucher | Generate travel voucher |
| Charge/Discharge | Zaduženje/Razduženje | Financial adjustments |
| Financial Report | Fin.Izveštaj | Contract financial summary |
| New | Novi | Create new contract |
| Cancel | Storniraj | Cancel/void contract |

**Additional Features:**
- **Kopiraj ugovor** (Copy contract) - Duplicate an existing contract
- **Date range filter** - Filter by travel dates
- **Search** - Find specific contracts

### 3.3 New Contract Form (Novi Ugovor)

The contract form captures comprehensive booking information:

#### Section 1: Contract Basics
| Field | Serbian | Description |
|-------|---------|-------------|
| Contract Number | Broj | Auto-generated or manual (0 = auto) |
| Organizer | Organizator | Tour operator dropdown |
| Payment to Organizer | RokZaPlacanje (Prema Organizatoru) | Deadline to pay operator |
| Issue Date | Datum izdavanja | Contract creation date |
| Contract Holder | Nosilac | Primary customer/company |
| Customer Payment Deadline | Rok za uplatu (za nosioca) | Customer payment due date |

#### Section 2: Contract Classification
| Field | Serbian | Description |
|-------|---------|-------------|
| Group | Pripada grupi | Assign to a group booking |
| Organizer Confirmation | Potvrda-Organizator | Operator's confirmation number |
| Guarantee Number | Broj garancije | Bank guarantee reference |
| Guarantee Date | Datum garancije | Guarantee validity date |
| Contract Type | Vrsta ugovora | Own (Sopstveni) or Sub-agent |
| Status | Status ugovora | Active, Cancelled, etc. |

#### Section 3: Destination Details
| Field | Serbian | Description |
|-------|---------|-------------|
| Country | Država | Destination country (dropdown) |
| City | Grad | Destination city |
| Property | Objekat (hotel, vila...) | Hotel/villa name |
| Transport Type | Vrsta prevoza | AVIO, Bus, Own, etc. |
| Transport Line | Linija prevoza | Specific flight/bus route |

#### Section 4: Accommodation
| Field | Serbian | Description |
|-------|---------|-------------|
| Accommodation Type | Vrsta smeštaja | Room category |
| Accommodation Description | Vr.smestaja-opis | Detailed description |
| Accommodation Structure | Struktura smeštaja | Room configuration |
| Service Type | Vrsta usluge | Board basis (BB, HB, FB, AI) |
| Number of Units | Br. smešt. jedinica | Room count |

#### Section 5: Dates & Schedule
| Field | Serbian | Description |
|-------|---------|-------------|
| Check-in | Prijavljivanje | Arrival date |
| Check-out | Odjavljivanje | Departure date |
| Departure | Polazak | Outbound travel date |
| Nights | Broj noći | Duration in nights |
| Departure Notes | Napomena polazak | Pickup location, times, etc. |

#### Section 6: Notes
| Field | Serbian | Description |
|-------|---------|-------------|
| General Notes | Opšta napomena - Ugovor | Free text contract notes |

### 3.4 Contract Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Priprema   │────▶│   Aktivan    │────▶│   Storno     │
│ (Preparation)│     │   (Active)   │     │ (Cancelled)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       └────────────▶│  Documents   │
                     │  Generated   │
                     └──────────────┘
```

### 3.5 Related Contract Features

#### Obaveštavanje putnika (Passenger Notification)
Send travel information to all passengers on contracts.

#### Ugovori stavke vrste usluga (Contract Items by Service Type)
View contract items categorized by service type.

#### Ugovori Kartica-Pruzalac usluga (Service Provider Cards)
Manage service provider account statements.

---

## Module 4: Dokumenta (Documents)

Document generation is a key feature - all financial documents are created from contracts.

### 4.1 Document Types

| Document | Serbian | Purpose | Generated From |
|----------|---------|---------|----------------|
| Invoice | Faktura | Final billing | Contract |
| Pro-forma | Profaktura | Quote/pre-invoice | Contract |
| Cash Receipt | Gotovinski račun | Cash sale receipt | Contract |
| Advance Invoice | Avansni račun | Deposit/prepayment | Contract |
| Credit Note | Knjižno odobrenje | Refund/adjustment | Invoice |
| Payment Reminder | Opomena za plaćanje | Collection notice | Invoice |
| Supplier Invoice | UF | Record supplier invoices | Manual |

### 4.2 Fakture (Invoices)

**Invoice List Features:**
- Date range filter
- Search by customer/number
- Print/export options
- Status filtering

**Invoice Actions:**
- View details
- Print
- Email to customer
- Create credit note
- Record payment

### 4.3 Profakture (Pro-forma Invoices)

Pre-invoices sent to customers before final booking confirmation.

**Workflow:**
1. Create contract
2. Generate pro-forma
3. Send to customer
4. Customer pays deposit
5. Record payment
6. Convert to final invoice

### 4.4 Gotovinski račun (Cash Receipts)

For walk-in customers paying in cash.

**Features:**
- Immediate receipt generation
- Cash register integration
- Daily cash reconciliation

### 4.5 Avansni račun (Advance Invoices)

For deposit payments before travel.

**Common Use:**
- 30% deposit at booking
- 70% balance before departure

### 4.6 Blagajne (Cash Registers)

Manage physical cash:
- Daily opening/closing
- Cash in/out transactions
- Daily reconciliation

### 4.7 Kartice klijenata (Client Cards/Statements)

Customer account statements showing:
- All invoices
- All payments
- Current balance
- Transaction history

---

## Module 5: Online rezervacije (Online Reservations)

Integration with external booking systems.

### 5.1 Internal Booking Sistem

Internal availability and booking management.

### 5.2 Croatia & Montenegro

Integration with Croatian and Montenegrin hotel/property systems.

### 5.3 Grčka Hoteli (Greek Hotels)

Direct booking integration with Greek hotel suppliers.

### 5.4 Rent a Car

Car rental booking integration.

---

## Module 6: AgTravel rezervacije

### 6.1 City Ture (City Tours)

Booking system for city tour packages - likely their own tour product line.

---

## Module 7: Izveštaji (Reports)

### 7.1 Ugovori o Subagenturi (Sub-agent Contracts Report)

Report on all sub-agent agreements and their performance.

### 7.2 Izveštaji za period (Period Reports)

Time-based reports:
- Sales by period
- Revenue analysis
- Booking statistics

---

## Module 8: Grupe (Groups)

Group booking management for tours with multiple travelers.

### 8.1 Pregled i dodavanje (View and Add)

- Create new group bookings
- View existing groups
- Manage group participants

### 8.2 Template Ugovori lista (Contract Templates List)

Pre-configured contract templates for common tour packages.

### 8.3 Novi Template Ugovor (New Contract Template)

Create reusable contract templates:
- Pre-fill destination
- Pre-fill hotel
- Pre-fill pricing structure
- Speed up repetitive bookings

---

## Module 9: Parametri (Settings/Parameters)

System configuration and setup.

### 9.1 Matični podaci (Master Data)

Company information:
- Agency name
- Address
- Tax ID (PIB)
- Registration number
- Contact details
- Logo

### 9.2 Računi Banke (Bank Accounts)

Configure bank accounts for:
- Receiving customer payments
- Paying suppliers
- Multi-currency support

### 9.3 Instrukcije za plaćanje (Payment Instructions)

Payment instruction templates to include on invoices:
- Bank name
- Account number
- SWIFT/BIC
- Reference format

### 9.4 Korisnici (Users)

User management:
- Add/remove users
- Role assignment
- Permission levels

### 9.5 Promena šifre (Change Password)

User password management.

---

## Module 10: Booking

Comprehensive booking and operations management.

### 10.1 Bookiraj smeštaj (Book Accommodation)

Manual accommodation booking entry:
- Select property
- Choose dates
- Set room type
- Enter pricing

### 10.2 Pregled rezervacija (View Reservations)

Reservation list with:
- Status filters
- Date filters
- Property filters
- Customer search

### 10.3 Timeline booking

Visual calendar/timeline view of bookings:
- See occupancy at a glance
- Drag-and-drop management
- Gap identification

### 10.4 Podaci o smeštaju (Accommodation Data)

Property database:
- Hotel/property details
- Room types
- Pricing
- Availability rules

### 10.5 Booking Štampa (Booking Print)

Print booking confirmations and documents.

### 10.6 Autobuske linije (Bus Lines)

Bus route management:
- Route definitions
- Departure points
- Arrival points
- Schedule times

### 10.7 Busing Liste Štampa (Bus List Print)

Print passenger manifests for bus tours:
- Passenger names
- Pickup points
- Contact numbers

### 10.8 Busing Raspored sedenja (Bus Seating Arrangement)

**Visual seat assignment tool:**
- Bus layout diagram
- Assign passengers to specific seats
- Print seating chart
- Handle seat preferences

### 10.9 Vodiči podaci (Guide Data)

Tour guide database:
- Guide profiles
- Languages spoken
- Availability
- Assignment history

### 10.10 Polasci podaci (Departure Data)

Departure management:
- Scheduled departures
- Passenger counts
- Bus/flight assignments
- Guide assignments

### 10.11 Specijalne ponude (Special Offers)

Create and manage promotional offers:
- Discount packages
- Last-minute deals
- Share with AgTravelSoft network

---

## Document Generation Details

### Contract Document (Ugovor)
Legal travel contract between agency and customer:
- Agency details
- Customer details
- Travel details
- Payment terms
- Cancellation policy
- Signatures

### Najava (Travel Announcement)
Notification sent to tour operator:
- Passenger details
- Travel dates
- Accommodation requirements
- Special requests

### Potvrda (Confirmation)
Booking confirmation for customer:
- Booking reference
- Travel details
- Payment status
- Important information

### Voucher
Travel voucher for check-in:
- Customer name
- Hotel details
- Dates
- Room type
- Board basis
- Reference number

---

## Transport Types (Vrsta prevoza)

| Code | Serbian | English |
|------|---------|---------|
| AVIO | Avion | Airplane |
| BUS | Autobus | Bus |
| VOZ | Voz | Train |
| BROD | Brod | Ship/Ferry |
| SOPSTVENI | Sopstveni prevoz | Own transport |

---

## Board Types (Vrsta usluge)

| Code | Serbian | English |
|------|---------|---------|
| RO | Samo smeštaj | Room Only |
| BB | Noćenje sa doručkom | Bed & Breakfast |
| HB | Polupansion | Half Board |
| FB | Pun pansion | Full Board |
| AI | All Inclusive | All Inclusive |
| UAI | Ultra All Inclusive | Ultra All Inclusive |

---

## Contract Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTRACT LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │  NOVI   │───▶│PRIPREMA │───▶│ AKTIVAN │───▶│ZAVRŠEN  │      │
│  │  (New)  │    │ (Prep)  │    │(Active) │    │(Complete)│      │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│       │              │              │                           │
│       │              │              │                           │
│       ▼              ▼              ▼                           │
│  ┌─────────────────────────────────────┐                       │
│  │            STORNO (Cancelled)        │                       │
│  └─────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Financial Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      FINANCIAL WORKFLOW                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐                                                   │
│  │ CONTRACT  │                                                   │
│  └─────┬─────┘                                                   │
│        │                                                         │
│        ▼                                                         │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │ PROFAKTURA│────▶│  AVANS    │────▶│  FAKTURA  │             │
│  │(Pro-forma)│     │ (Deposit) │     │ (Invoice) │             │
│  └───────────┘     └───────────┘     └─────┬─────┘             │
│                                            │                     │
│                                            ▼                     │
│                    ┌───────────┐     ┌───────────┐             │
│                    │  UPLATA   │────▶│ ZATVORENO │             │
│                    │ (Payment) │     │ (Closed)  │             │
│                    └───────────┘     └───────────┘             │
│                                                                   │
│  Side flows:                                                     │
│  • KNJIŽNO ODOBRENJE (Credit Note) ← from Invoice               │
│  • OPOMENA (Payment Reminder) ← from unpaid Invoice             │
│  • GOTOVINSKI RAČUN (Cash Receipt) ← direct cash sale           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Terminology Glossary

| Serbian | English | Context |
|---------|---------|---------|
| Ugovor | Contract | Every booking is a contract |
| Nosilac | Holder/Lead traveler | Primary customer on contract |
| Organizator | Organizer | Tour operator/supplier |
| Putnik | Traveler/Passenger | Individual traveler |
| Polazak | Departure | Outbound journey |
| Povratak | Return | Return journey |
| Smeštaj | Accommodation | Hotel/lodging |
| Prevoz | Transport | Transportation |
| Noćenje | Overnight | Per night |
| Uplata | Payment in | Customer payment |
| Isplata | Payment out | Supplier payment |
| Dužnik | Debtor | Customer who owes money |
| Storno | Cancellation | Voided booking |
| Garancija | Guarantee | Bank guarantee |
| Avans | Advance/Deposit | Prepayment |
| Profaktura | Pro-forma | Quote invoice |
| Faktura | Invoice | Final invoice |
| Blagajna | Cash register | Cash management |
| Vodič | Guide | Tour guide |
| Pansion | Board | Meal plan |

---

## UI/UX Observations

### Strengths
1. **Comprehensive** - Covers entire agency workflow
2. **Serbian localization** - Native language throughout
3. **Document generation** - All legal documents built-in
4. **Financial integration** - Full accounting capability
5. **Group management** - Bus seating, manifests, etc.

### Weaknesses
1. **Dated design** - ~2010 era Bootstrap styling
2. **Desktop only** - Not responsive/mobile-friendly
3. **No CRM/Pipeline** - No lead tracking before contract
4. **Dense forms** - Many fields, overwhelming for new users
5. **Page refreshes** - Not a modern SPA experience
6. **Limited analytics** - Basic reporting only

---

## Feature Comparison: What Trak Needs

### Already in Trak ✅
- Lead/Inquiry pipeline
- Customer qualification
- Package management
- Modern responsive UI
- Real-time updates

### Needs Development 🔶
- Contract/Booking formalization
- Invoice generation
- Pro-forma invoices
- Payment tracking
- Voucher generation
- Financial reports
- Customer statements

### Consider Adding 🤔
- Bus seating charts
- Passenger manifests
- Tour guide management
- Departure operations
- Bank guarantee tracking

### Trak Advantages 🚀
- Modern React/Next.js stack
- Mobile-first design
- CRM before booking (lead pipeline)
- Customer qualification flow
- Real-time collaboration
- Better UX/UI

---

## Migration Considerations

When migrating agencies from AgTravelSoft to Trak:

### Data to Import
1. Customer database (Klijenti)
2. Historical contracts (for reference)
3. Tour operator relationships
4. Property database
5. Pricing templates

### Training Focus
1. Lead pipeline concept (new to them)
2. Qualification flow (new concept)
3. Modern UI navigation
4. Mobile access capabilities

### Feature Parity Priorities
1. **Critical:** Invoice generation
2. **Critical:** Contract/booking creation
3. **High:** Payment tracking
4. **High:** Voucher generation
5. **Medium:** Financial reports
6. **Medium:** Bus operations
7. **Lower:** Sub-agent management

---

*Document generated from live AgTravelSoft system analysis*
*Last updated: January 2026*
