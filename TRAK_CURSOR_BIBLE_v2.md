# TRAK Cursor Implementation Bible
## Complete Implementation Guide v2.0
## January 13, 2026

This document defines exactly how to build the entire TRAK system. Follow these patterns precisely.

**Key v2.0 Additions:**
- Two inventory types (owned vs inquiry)
- Inquiry flow for on-request offers
- AI features (message parsing, OCR, scoring, matching)
- Abandoned cart recovery with email sequence
- Real-time notifications with SMS escalation

---

# TABLE OF CONTENTS

1. [Tech Stack & Conventions](#1-tech-stack--conventions)
2. [Design System](#2-design-system)
3. [Anti-Patterns](#3-anti-patterns)
4. [Qualification Flow](#4-qualification-flow)
5. [Lead Entry & Data Capture](#5-lead-entry--data-capture)
6. [Booking & Closing Flow](#6-booking--closing-flow)
7. [Offer Display (Client-Facing)](#7-offer-display-client-facing)
8. [Two Inventory Types](#8-two-inventory-types) ⭐ NEW
9. [Inquiry System](#9-inquiry-system) ⭐ NEW
10. [Reservation System](#10-reservation-system)
11. [Agent Dashboard](#11-agent-dashboard)
12. [Trip Management (Aranžmani)](#12-trip-management-aranžmani)
13. [Offer Management (Agent-Facing)](#13-offer-management-agent-facing)
14. [AI Features](#14-ai-features) ⭐ NEW
15. [Abandoned Cart Recovery](#15-abandoned-cart-recovery) ⭐ NEW
16. [Notifications System](#16-notifications-system)
17. [Reconciliation System](#17-reconciliation-system)
18. [Database Schema](#18-database-schema)
19. [API Patterns](#19-api-patterns)
20. [File Structure](#20-file-structure)

---

# 1. TECH STACK & CONVENTIONS

## 1.1 Stack

```
Framework: Next.js 14+ (App Router)
Language: TypeScript (strict mode)
Database: Supabase (PostgreSQL)
Auth: Supabase Auth
Styling: Tailwind CSS
Components: shadcn/ui
Icons: Lucide React (use sparingly)
Forms: React Hook Form + Zod
State: Zustand (when needed)
```

## 1.2 Language Rules

| Context | Language |
|---------|----------|
| Code (variables, functions, comments) | English |
| UI text (buttons, labels, messages) | Serbian |
| File names | English |
| Database columns | English (snake_case) |

```typescript
// ✅ CORRECT
const handleSave = () => { ... }
<Button>Sačuvaj</Button>
<span>Čeka uplatu</span>

// ❌ WRONG
const handleSacuvaj = () => { ... }
<Button>Save</Button>
```

## 1.3 Serbian UI Reference

| English | Serbian |
|---------|---------|
| Save | Sačuvaj |
| Cancel | Otkaži |
| Close | Zatvori |
| Search | Pretraži |
| Add | Dodaj |
| Edit | Izmeni |
| Delete | Obriši |
| Archive | Arhiviraj |
| Back | Nazad |
| Next | Dalje |
| Confirm | Potvrdi |
| Lead | Upit |
| Offer | Ponuda |
| Booking | Rezervacija |
| Payment | Uplata |
| Deposit | Avans |
| Customer | Klijent |
| Destination | Destinacija |
| Departure | Polazak |
| Return | Povratak |
| Adults | Odrasli |
| Children | Deca |
| Spots/Capacity | Mesta |
| All Inclusive | All Inclusive |
| Half Board | Polupansion |
| Breakfast | Doručak |
| Room Only | Samo noćenje |
| Flight | Avion |
| Bus | Autobus |
| Awaiting payment | Čeka uplatu |
| Paid | Plaćeno |
| Expired | Isteklo |
| Cancelled | Otkazano |
| All ready | Sve spremno |
| Show more | Prikaži još |
| Hide | Sakrij |
| Days until | dana do |
| Persons | osoba |
| Per person | po osobi |
| Total | Ukupno |

---

# 2. DESIGN SYSTEM

## 2.1 Core Principle: Color is Earned

Default state is neutral/gray. Color only appears when it carries meaning.

## 2.2 Semantic Color Palette

| Meaning | Border | Background | Text |
|---------|--------|------------|------|
| Neutral | `border-gray-200` | `bg-gray-50` | `text-gray-500` |
| OK/Success | `border-green-500` | `bg-green-50` | `text-green-700` |
| Warning | `border-amber-500` | `bg-amber-50` | `text-amber-700` |
| Error | `border-red-500` | `bg-red-50` | `text-red-700` |
| Info/Primary | `border-blue-500` | `bg-blue-50` | `text-blue-700` |
| Purple (New) | `border-purple-500` | `bg-purple-50` | `text-purple-700` |

## 2.3 Badge Variants

```tsx
// SUCCESS - Paid, Complete, Ready
<Badge className="bg-green-100 text-green-800">✓ Plaćeno</Badge>
<Badge className="bg-green-100 text-green-800">✓ Sve spremno</Badge>

// WARNING - Awaiting action
<Badge className="bg-amber-100 text-amber-800">Čeka uplatu</Badge>
<Badge className="bg-amber-100 text-amber-800">Čeka pasoš</Badge>

// ERROR - Expired, Cancelled
<Badge className="bg-red-100 text-red-800">Isteklo</Badge>
<Badge className="bg-red-100 text-red-800">Otkazano</Badge>

// INFO - Neutral state
<Badge className="bg-blue-100 text-blue-800">Novi</Badge>

// URGENCY LABELS (client-facing offers only)
<Badge className="bg-red-500 text-white">🔥 POSLEDNJA MESTA</Badge>
<Badge className="bg-orange-500 text-white">📈 POPUNJAVA SE</Badge>
<Badge className="bg-green-500 text-white">💰 -20% SNIŽENO</Badge>
<Badge className="bg-purple-500 text-white">🆕 NOVO</Badge>
<Badge className="bg-blue-500 text-white">⭐ POPULARNO</Badge>
```

## 2.4 Border System

```tsx
// TRIP COLUMN - Top border (4px)
className="border-t-4 border-t-blue-500"    // Default
className="border-t-4 border-t-amber-500"   // Has issues
className="border-t-4 border-t-green-500"   // Currently traveling

// CARDS - Left border (3px)
className="border-l-[3px] border-l-green-500"  // All OK
className="border-l-[3px] border-l-amber-500"  // Has issue
className="border-l-[3px] border-l-gray-200"   // Neutral/default
```

## 2.5 Typography Scale

```tsx
// Page title
<h1 className="text-2xl font-bold text-gray-900">

// Section title
<h2 className="text-lg font-semibold text-gray-900">

// Card title
<h3 className="font-bold text-gray-900">

// Card subtitle
<p className="text-sm text-gray-500">

// Body text
<p className="text-gray-700">

// Small/meta text
<span className="text-xs text-gray-500">

// Price (large)
<span className="text-xl font-bold text-gray-900">€549</span>

// Price (crossed out)
<span className="text-sm text-gray-400 line-through">€649</span>
```

## 2.6 Spacing System

```tsx
// Page padding
className="p-6"

// Section gaps
className="space-y-6"

// Card padding
className="p-4"

// Tight card padding (smaller cards)
className="p-3"

// Between elements in card
className="space-y-2" or className="gap-2"

// Stats bar gaps
className="gap-6"
```

---

# 3. ANTI-PATTERNS

## 3.1 NEVER Use Decorative Avatars

```tsx
// ❌ NEVER
<div className="w-10 h-10 rounded-full bg-blue-500">
  <span>MN</span>
</div>

// ✅ INSTEAD - Just name and contact info
<div>
  <p className="font-semibold">Milan Nikolić</p>
  <p className="text-sm text-gray-500">+381 64 123 4567</p>
</div>
```

## 3.2 NEVER Use Emojis in Agent Dashboard Data

```tsx
// ❌ NEVER in agent views
<h3>🏖️ Hotel Azul</h3>
<span>👥 10 putnika</span>
<span>💰 €14,200</span>

// ✅ INSTEAD - Plain text
<h3>Hotel Azul ★★★★</h3>
<span>10 putnika</span>
<span>€14,200</span>

// ⚠️ EXCEPTION: Emojis ARE allowed in client-facing urgency labels
<Badge>🔥 POSLEDNJA MESTA</Badge>  // ✅ OK for client view
```

## 3.3 NEVER Use Colorful Icon Soup

```tsx
// ❌ NEVER - every icon different color
<div className="text-blue-500"><Users /></div>
<div className="text-green-500"><Euro /></div>
<div className="text-orange-500"><Clock /></div>

// ✅ INSTEAD - neutral icons, colored backgrounds
<div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
  <Users className="w-5 h-5" />
</div>
```

## 3.4 NEVER Use Links for Expand/Collapse

```tsx
// ❌ NEVER
<a href="#" onClick={toggle}>+ još 7 putnika</a>

// ✅ INSTEAD - Use button
<Button variant="ghost" onClick={toggle}>
  <ChevronDown className="w-4 h-4 mr-2" />
  Prikaži još {count} putnika
</Button>
```

## 3.5 NEVER Show Duplicate Information

```tsx
// ❌ NEVER - urgency badge AND countdown
<Badge>🔥 Za 5 dana</Badge>
<span>5 dana do polaska</span>

// ✅ INSTEAD - One source of truth
<div className="text-right">
  <p className="font-bold">5 dana</p>
  <p className="text-xs text-gray-500">do polaska</p>
</div>
```

---

# 4. QUALIFICATION FLOW

Multi-step tap-based form for customers. Target: ~20 seconds, all taps, no typing until final step.

## 4.1 Step Structure

```typescript
type QualificationStep = 
  | 'destination'     // Country → City
  | 'guests'          // Adults → Children → Ages
  | 'dates'           // Month → Duration → Flexibility
  | 'accommodation'   // Type + Board + Transport
  | 'budget'          // Price range

interface QualificationData {
  destination: {
    country: string
    city: string | null  // null = "Svejedno"
  }
  guests: {
    adults: number
    children: number
    childAges: number[]
  }
  dates: {
    month: string | null
    exactStart: Date | null
    exactEnd: Date | null
    duration: number
    flexible: boolean
  }
  accommodation: {
    type: 'hotel' | 'apartment' | 'villa' | 'any'
    board: 'all_inclusive' | 'half_board' | 'breakfast' | 'room_only' | 'any'
    transport: 'flight' | 'bus' | 'own'
  }
  budget: {
    min: number | null
    max: number | null
    perPerson: boolean
  }
}
```

## 4.2 Chip Selector Component

Used throughout qualification for tap-based selection:

```tsx
interface ChipSelectorProps {
  options: { value: string; label: string; icon?: string }[]
  selected: string | string[]
  onChange: (value: string) => void
  multiple?: boolean
}

function ChipSelector({ options, selected, onChange, multiple }: ChipSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const isSelected = multiple 
          ? (selected as string[]).includes(option.value)
          : selected === option.value
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-4 py-3 rounded-xl border-2 transition-all
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {option.icon && <span className="mr-2">{option.icon}</span>}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

## 4.3 Progress Summary Component

Shows completed steps at top of each screen:

```tsx
function QualificationProgress({ data }: { data: Partial<QualificationData> }) {
  const items = []
  
  if (data.destination?.country) {
    items.push(`✓ ${data.destination.country}${data.destination.city ? `, ${data.destination.city}` : ''}`)
  }
  if (data.guests?.adults) {
    const guestStr = data.guests.children > 0 
      ? `${data.guests.adults} + ${data.guests.children} dece`
      : `${data.guests.adults} odraslih`
    items.push(`✓ ${guestStr}`)
  }
  // ... continue for other steps
  
  if (items.length === 0) return null
  
  return (
    <div className="space-y-1 mb-6">
      {items.map((item, i) => (
        <p key={i} className="text-sm text-gray-600">{item}</p>
      ))}
    </div>
  )
}
```

## 4.4 Destination Step

```tsx
const POPULAR_COUNTRIES = [
  { value: 'greece', label: 'Grčka', icon: '🇬🇷' },
  { value: 'turkey', label: 'Turska', icon: '🇹🇷' },
  { value: 'egypt', label: 'Egipat', icon: '🇪🇬' },
  { value: 'montenegro', label: 'Crna Gora', icon: '🇲🇪' },
  { value: 'spain', label: 'Španija', icon: '🇪🇸' },
  { value: 'tunisia', label: 'Tunis', icon: '🇹🇳' },
  { value: 'croatia', label: 'Hrvatska', icon: '🇭🇷' },
  { value: 'albania', label: 'Albanija', icon: '🇦🇱' },
]

const CITIES_BY_COUNTRY = {
  greece: ['Halkidiki', 'Krf', 'Santorini', 'Lefkada', 'Tasos', 'Zakintos'],
  turkey: ['Antalija', 'Bodrum', 'Marmaris', 'Alanja', 'Side', 'Kemer'],
  egypt: ['Hurgada', 'Šarm el Šeik', 'Marsa Alam'],
  // ... etc
}
```

## 4.5 Guest Step

```tsx
function GuestsStep({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-gray-700 mb-3">Koliko odraslih putuje?</label>
        <ChipSelector
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' },
            { value: '6+', label: '6+' },
          ]}
          selected={String(value.adults)}
          onChange={(v) => onChange({ ...value, adults: parseInt(v) })}
        />
      </div>
      
      <div>
        <label className="block text-gray-700 mb-3">Ima li dece?</label>
        <ChipSelector
          options={[
            { value: '0', label: 'Nema' },
            { value: '1', label: '1 dete' },
            { value: '2', label: '2 dece' },
            { value: '3+', label: '3+ dece' },
          ]}
          selected={String(value.children)}
          onChange={(v) => onChange({ ...value, children: parseInt(v) })}
        />
      </div>
      
      {value.children > 0 && (
        <ChildAgesSelector 
          count={value.children} 
          ages={value.childAges}
          onChange={(ages) => onChange({ ...value, childAges: ages })}
        />
      )}
    </div>
  )
}

function ChildAgesSelector({ count, ages, onChange }) {
  const ageRanges = [
    { value: '0-2', label: '0-2' },
    { value: '3-6', label: '3-6' },
    { value: '7-12', label: '7-12' },
    { value: '13-17', label: '13-17' },
  ]
  
  return (
    <div className="space-y-4">
      <label className="block text-gray-700">Koliko godina imaju deca?</label>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <span className="text-sm text-gray-500 mb-2 block">Dete {i + 1}:</span>
          <ChipSelector
            options={ageRanges}
            selected={ages[i] || ''}
            onChange={(v) => {
              const newAges = [...ages]
              newAges[i] = v
              onChange(newAges)
            }}
          />
        </div>
      ))}
    </div>
  )
}
```

---

# 5. LEAD ENTRY & DATA CAPTURE

## 5.1 Entry Channels

| Channel | Method | Agent Effort |
|---------|--------|--------------|
| Trak Qualification | Auto-create | None |
| Facebook/IG Ads | Webhook | None |
| FB/IG DMs | Click → AI extract → Save | 1 click |
| Email (forwarded) | Auto AI parse | Forward email |
| Viber/WhatsApp | Paste → AI extract | Copy-paste |
| Phone call | Quick tap form | 10-15 sec |

## 5.2 AI Message Parser ("Brzi unos")

```tsx
function QuickEntryModal({ open, onClose }) {
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedLead | null>(null)
  
  const handleParse = async () => {
    setParsing(true)
    const result = await parseLeadMessage(rawText)
    setParsed(result)
    setParsing(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Brzi unos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Nalepi tekst poruke ili screenshot..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
          />
          
          <Button onClick={handleParse} disabled={!rawText || parsing}>
            {parsing ? 'Analiziram...' : '🤖 Izvuci podatke'}
          </Button>
          
          {parsed && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">AI je prepoznao:</p>
                
                <ParsedField label="Ime" value={parsed.name} />
                <ParsedField label="Telefon" value={parsed.phone} />
                <ParsedField label="Destinacija" value={parsed.destination} />
                <ParsedField label="Gosti" value={`${parsed.guests} osobe`} />
                <ParsedField label="Datum" value={parsed.date} />
                <ParsedField label="Budžet" value={parsed.budget ? `~€${parsed.budget}/os` : null} />
                
                <Select defaultValue="viber">
                  <SelectTrigger>
                    <SelectValue placeholder="Izvor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viber">Viber</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="other">Drugo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button disabled={!parsed} onClick={handleSave}>
            Sačuvaj upit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ParsedField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}:</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <Check className="w-4 h-4 text-green-500" />
      </div>
    </div>
  )
}
```

## 5.3 Quick Manual Entry (Phone Calls)

All taps except phone number - designed for during/after calls:

```tsx
function QuickLeadForm() {
  const [form, setForm] = useState({
    phone: '',
    name: '',
    destination: '',
    adults: 2,
    children: 0,
    month: '',
    budget: '',
    source: 'phone',
    notes: '',
  })
  
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-semibold">Novi upit (brzi unos)</h2>
      
      {/* Phone - ONLY text input */}
      <div>
        <Label>Telefon *</Label>
        <Input 
          type="tel"
          placeholder="064..."
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      
      {/* Name - Optional text input */}
      <div>
        <Label>Ime (opciono)</Label>
        <Input 
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      
      {/* Destination - Tap chips */}
      <div>
        <Label>Destinacija</Label>
        <ChipSelector
          options={[
            { value: 'greece', label: 'Grčka' },
            { value: 'turkey', label: 'Turska' },
            { value: 'egypt', label: 'Egipat' },
            { value: 'montenegro', label: 'Crna G.' },
            { value: 'other', label: 'Drugo...' },
          ]}
          selected={form.destination}
          onChange={(v) => setForm({ ...form, destination: v })}
        />
      </div>
      
      {/* Guests - Tap chips */}
      <div className="flex gap-4">
        <div>
          <Label>Odrasli</Label>
          <ChipSelector
            options={['1','2','3','4','5+'].map(n => ({ value: n, label: n }))}
            selected={String(form.adults)}
            onChange={(v) => setForm({ ...form, adults: parseInt(v) })}
          />
        </div>
        <div>
          <Label>Deca</Label>
          <ChipSelector
            options={['0','1','2','3+'].map(n => ({ value: n, label: n }))}
            selected={String(form.children)}
            onChange={(v) => setForm({ ...form, children: parseInt(v) })}
          />
        </div>
      </div>
      
      {/* Month - Tap chips */}
      <div>
        <Label>Datum</Label>
        <ChipSelector
          options={[
            { value: 'jun', label: 'Jun' },
            { value: 'jul', label: 'Jul' },
            { value: 'avg', label: 'Avg' },
            { value: 'sep', label: 'Sep' },
            { value: 'flex', label: 'Fleks.' },
          ]}
          selected={form.month}
          onChange={(v) => setForm({ ...form, month: v })}
        />
      </div>
      
      {/* Budget - Tap chips */}
      <div>
        <Label>Budžet</Label>
        <ChipSelector
          options={[
            { value: '0-300', label: '<€300' },
            { value: '300-500', label: '€300-500' },
            { value: '500-700', label: '€500-700' },
            { value: '700+', label: '€700+' },
            { value: 'unknown', label: '?' },
          ]}
          selected={form.budget}
          onChange={(v) => setForm({ ...form, budget: v })}
        />
      </div>
      
      {/* Source - Tap chips */}
      <div>
        <Label>Izvor</Label>
        <ChipSelector
          options={[
            { value: 'phone', label: '📞 Poziv' },
            { value: 'viber', label: 'Viber' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'facebook', label: 'FB' },
            { value: 'instagram', label: 'IG' },
            { value: 'other', label: 'Drugo' },
          ]}
          selected={form.source}
          onChange={(v) => setForm({ ...form, source: v })}
        />
      </div>
      
      {/* Notes - Optional */}
      <div>
        <Label>Beleška (opciono)</Label>
        <Textarea 
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
        />
      </div>
      
      <div className="flex gap-3">
        <Button className="flex-1">Sačuvaj</Button>
        <Button variant="outline" className="flex-1">
          <Phone className="w-4 h-4 mr-2" />
          Sačuvaj i pozovi
        </Button>
      </div>
    </div>
  )
}
```

---

# 6. BOOKING & CLOSING FLOW

## 6.1 Quick Close Modal (Lead Exists)

When agent closes a lead as won:

```tsx
function QuickCloseModal({ lead, open, onClose }) {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const [guests, setGuests] = useState(lead.guests || 2)
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'deposit' | 'unpaid'>('unpaid')
  const [depositAmount, setDepositAmount] = useState('')
  
  // Fetch matching offers based on lead preferences
  const { data: suggestedOffers } = useQuery(
    ['suggested-offers', lead.id],
    () => getSuggestedOffers(lead)
  )
  
  const selectedOfferData = suggestedOffers?.find(o => o.id === selectedOffer)
  const totalPrice = selectedOfferData 
    ? selectedOfferData.price_per_person * guests 
    : 0
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zaključi rezervaciju</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Lead summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-semibold">{lead.name}</p>
            <p className="text-sm text-gray-500">{lead.phone}</p>
            <p className="text-sm text-gray-500">
              {lead.destination}, {lead.guests} osobe, {lead.month}
            </p>
          </div>
          
          <Separator />
          
          {/* Offer selection */}
          <div>
            <Label className="mb-3 block">Koji aranžman je rezervisan?</Label>
            
            {suggestedOffers?.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs text-gray-500 uppercase">Predlozi:</p>
                {suggestedOffers.map(offer => (
                  <OfferSelectCard
                    key={offer.id}
                    offer={offer}
                    selected={selectedOffer === offer.id}
                    onSelect={() => setSelectedOffer(offer.id)}
                  />
                ))}
              </div>
            )}
            
            <Button variant="outline" className="w-full" onClick={openOfferSearch}>
              <Search className="w-4 h-4 mr-2" />
              Pretraži ponude...
            </Button>
            
            <button 
              className={`
                w-full mt-2 p-3 rounded-lg border-2 text-left
                ${selectedOffer === 'external' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              `}
              onClick={() => setSelectedOffer('external')}
            >
              Nije u sistemu (eksterni aranžman)
            </button>
          </div>
          
          <Separator />
          
          {/* Guest count */}
          <div className="flex items-center justify-between">
            <Label>Broj osoba:</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setGuests(g => Math.max(1, g-1))}>-</Button>
              <span className="w-8 text-center font-medium">{guests}</span>
              <Button variant="outline" size="sm" onClick={() => setGuests(g => g+1)}>+</Button>
            </div>
          </div>
          
          {/* Total */}
          {selectedOfferData && (
            <div className="flex items-center justify-between">
              <Label>Ukupna vrednost:</Label>
              <span className="text-lg font-bold">€{totalPrice.toLocaleString()}</span>
            </div>
          )}
          
          <Separator />
          
          {/* Payment status */}
          <div>
            <Label className="mb-3 block">Status uplate:</Label>
            <RadioGroup value={paymentStatus} onValueChange={setPaymentStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <label htmlFor="paid">Plaćeno u celosti</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deposit" id="deposit" />
                <label htmlFor="deposit">Plaćen avans</label>
                {paymentStatus === 'deposit' && (
                  <Input 
                    className="w-24 ml-2"
                    placeholder="€"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unpaid" id="unpaid" />
                <label htmlFor="unpaid">Nije plaćeno</label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Payment method */}
          <div>
            <Label className="mb-3 block">Način plaćanja:</Label>
            <ChipSelector
              options={[
                { value: 'card', label: '💳 Kartica' },
                { value: 'bank', label: '🏦 Banka' },
                { value: 'cash', label: '💵 Keš' },
                { value: 'mixed', label: '🔄 Kombinovano' },
              ]}
              selected={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button onClick={handleClose} disabled={!selectedOffer}>
            ✓ Zaključi prodaju
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OfferSelectCard({ offer, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-3 rounded-lg border-2 text-left
        ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full border-2 ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{offer.name} {'★'.repeat(offer.star_rating)}</p>
          <p className="text-sm text-gray-500">
            {offer.city} • {format(offer.departure_date, 'd-d. MMM')} • €{offer.price_per_person}/os
          </p>
          <p className="text-xs text-gray-400">Preostalo: {offer.available_spots} mesta</p>
        </div>
      </div>
    </button>
  )
}
```

## 6.2 Lost Lead Modal

```tsx
function LostLeadModal({ lead, open, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  
  const LOSS_REASONS = [
    { value: 'competitor', label: 'Rezervisao kod konkurencije' },
    { value: 'expensive', label: 'Preskupo' },
    { value: 'changed_plans', label: 'Promenio planove' },
    { value: 'no_response', label: 'Nije odgovarao na poruke' },
    { value: 'dates', label: 'Datumi nisu odgovarali' },
    { value: 'other', label: 'Drugo' },
  ]
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zašto je upit izgubljen?</DialogTitle>
        </DialogHeader>
        
        <RadioGroup value={reason} onValueChange={setReason}>
          {LOSS_REASONS.map(r => (
            <div key={r.value} className="flex items-center space-x-2">
              <RadioGroupItem value={r.value} id={r.value} />
              <label htmlFor={r.value}>{r.label}</label>
            </div>
          ))}
        </RadioGroup>
        
        {reason === 'other' && (
          <Input 
            placeholder="Navedi razlog..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button onClick={handleLost} disabled={!reason}>Zatvori upit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 6.3 Pipeline Drag Close

When lead is dragged to "Zatvoreno" column:

```tsx
function CloseTypeSelector({ onSelect }) {
  return (
    <div className="flex gap-2 p-4">
      <Button 
        className="flex-1 bg-green-500 hover:bg-green-600"
        onClick={() => onSelect('won')}
      >
        ✓ Prodato
      </Button>
      <Button 
        variant="destructive"
        className="flex-1"
        onClick={() => onSelect('lost')}
      >
        ✗ Izgubljeno
      </Button>
      <Button 
        variant="outline"
        className="flex-1"
        onClick={() => onSelect('deferred')}
      >
        ⏸ Odloženo
      </Button>
    </div>
  )
}
```

---

# 7. OFFER DISPLAY (Client-Facing)

Public-facing offer cards shown after qualification. **Emojis ARE allowed here.**

## 7.1 Urgency Label System

Labels are assigned automatically. Only ONE label per offer, highest priority wins:

```typescript
type UrgencyLabel = {
  type: string
  text: string
  color: 'red' | 'orange' | 'green' | 'purple' | 'blue'
  icon: string
}

function getOfferLabel(offer: Offer): UrgencyLabel | null {
  const today = new Date()
  const daysUntilDeparture = differenceInDays(offer.departure_date, today)
  const bookedPercentage = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  const daysSinceCreated = differenceInDays(today, offer.created_at)
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const discountPercent = hasDiscount 
    ? Math.round((1 - offer.price_per_person / offer.original_price) * 100) 
    : 0

  // Priority 1: Last spots (≤2)
  if (offer.available_spots <= 2 && offer.available_spots > 0) {
    return { 
      type: 'POSLEDNJA_MESTA', 
      text: `Još samo ${offer.available_spots}!`,
      color: 'red',
      icon: '🔥'
    }
  }

  // Priority 2: Departing soon (≤7 days)
  if (daysUntilDeparture <= 7 && daysUntilDeparture > 0) {
    return { 
      type: 'ISTICE_USKORO', 
      text: daysUntilDeparture <= 3 ? 'Polazak za par dana!' : 'Uskoro polazak',
      color: 'red',
      icon: '⏰'
    }
  }

  // Priority 3: Filling up (≥70%)
  if (bookedPercentage >= 70 && offer.available_spots > 2) {
    return { 
      type: 'POPUNJAVA_SE', 
      text: 'Popunjava se',
      color: 'orange',
      icon: '📈'
    }
  }

  // Priority 4: Discount (≥10%)
  if (hasDiscount && discountPercent >= 10) {
    return { 
      type: 'SNIZENO', 
      text: `-${discountPercent}%`,
      color: 'green',
      icon: '💰'
    }
  }

  // Priority 5: New (≤7 days)
  if (daysSinceCreated <= 7) {
    return { 
      type: 'NOVO', 
      text: 'Novo',
      color: 'purple',
      icon: '🆕'
    }
  }

  // Priority 6: Popular (≥10 views/24h)
  if (offer.views_last_24h >= 10) {
    return { 
      type: 'POPULARNO', 
      text: 'Popularno',
      color: 'blue',
      icon: '⭐'
    }
  }

  // Priority 7: Recommended (manual)
  if (offer.is_recommended) {
    return { 
      type: 'PREPORUCUJEMO', 
      text: 'Preporučujemo',
      color: 'blue',
      icon: '👍'
    }
  }

  return null
}
```

## 7.2 Client Offer Card

```tsx
function ClientOfferCard({ offer, guestCount }: { offer: Offer; guestCount: number }) {
  const label = getOfferLabel(offer)
  const totalPrice = offer.price_per_person * guestCount
  const bookedPercentage = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  
  const labelColors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  }
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Label */}
      {label && (
        <div className={`${labelColors[label.color]} text-white px-4 py-2 font-semibold`}>
          {label.icon} {label.text}
        </div>
      )}
      
      {/* Image */}
      <div className="aspect-video bg-gray-200 relative">
        {offer.images?.[0] && (
          <Image src={offer.images[0]} alt={offer.name} fill className="object-cover" />
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{offer.name} {'★'.repeat(offer.star_rating)}</h3>
          <p className="text-gray-500">{offer.city}, {offer.country}</p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>📅 {format(offer.departure_date, 'd')} - {format(offer.return_date, 'd. MMM yyyy')} • {differenceInDays(offer.return_date, offer.departure_date)} noći</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>🍽️ {getBoardLabel(offer.board_type)}</span>
          <span>✈️ {getTransportLabel(offer.transport_type)}</span>
        </div>
        
        {/* Capacity bar */}
        {bookedPercentage >= 50 && (
          <div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${bookedPercentage >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${bookedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {bookedPercentage >= 80 ? 'Skoro popunjeno' : `${offer.available_spots}/${offer.total_spots} mesta`}
            </p>
          </div>
        )}
        
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            {offer.original_price && (
              <span className="text-sm text-gray-400 line-through mr-2">
                €{offer.original_price}
              </span>
            )}
            <span className="text-xl font-bold">€{offer.price_per_person}</span>
            <span className="text-sm text-gray-500">/os</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Ukupno: </span>
            <span className="font-bold">€{totalPrice.toLocaleString()}</span>
          </div>
        </div>
        
        {/* CTA */}
        <Button className="w-full" size="lg">
          Rezerviši →
        </Button>
      </div>
    </div>
  )
}
```

## 7.3 Label Distribution Target

When displaying 8 offers, aim for:
- 1-2 with red urgency (🔥 or ⏰)
- 1-2 with orange/green (📈 or 💰)
- 0-1 with soft signals (🆕 or ⭐)
- 3-4 with no label

**Result: ~50% with labels, ~50% without. If everything is urgent, nothing is.**

---

# 8. TWO INVENTORY TYPES ⭐ NEW

Serbian agencies have two distinct types of offers that require different flows.

## 8.1 Types Overview

| Type | Code | Serbian | Flow | Capacity Display |
|------|------|---------|------|------------------|
| **Owned** | `owned` | Sopstveni kapacitet | Instant booking | ✅ Show bar |
| **On-Request** | `inquiry` | Na upit | Inquiry → Agent checks | ❌ Hidden |

## 8.2 Database Field

```typescript
// In offers table
inventory_type: 'owned' | 'inquiry'
```

## 8.3 Results Page - Two Sections

After qualification, results split into two sections:

```tsx
function ResultsPage({ offers, qualification }: Props) {
  const ownedOffers = offers.filter(o => o.inventory_type === 'owned')
  const inquiryOffers = offers.filter(o => o.inventory_type === 'inquiry')
  
  return (
    <div className="space-y-8">
      {/* Section 1: Instant Booking */}
      {ownedOffers.length > 0 && (
        <ResultsSection
          title="⚡ REZERVIŠITE ODMAH"
          subtitle="Garantovana dostupnost • Cena zaključana 72h"
          offers={ownedOffers}
          cardType="instant"
          qualification={qualification}
        />
      )}
      
      {/* Section 2: On-Request */}
      {inquiryOffers.length > 0 && (
        <ResultsSection
          title="📋 NA UPIT"
          subtitle={<ResponseTimeDisplay />}
          offers={inquiryOffers}
          cardType="inquiry"
          qualification={qualification}
        />
      )}
      
      {/* No results */}
      {offers.length === 0 && (
        <NoResultsSection qualification={qualification} />
      )}
    </div>
  )
}

function ResultsSection({ title, subtitle, offers, cardType, qualification }: Props) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-gray-500">{subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map(offer => (
          cardType === 'instant' 
            ? <InstantOfferCard key={offer.id} offer={offer} qualification={qualification} />
            : <InquiryOfferCard key={offer.id} offer={offer} qualification={qualification} />
        ))}
      </div>
    </section>
  )
}
```

## 8.4 Instant Offer Card (Owned)

Shows capacity bar, "Rezerviši" button:

```tsx
function InstantOfferCard({ offer, qualification }: Props) {
  const label = getOfferLabel(offer)
  const totalPrice = offer.price_per_person * qualification.guestCount
  const bookedPercent = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Urgency Label */}
      {label && (
        <div className={`${getLabelBgColor(label)} text-white px-4 py-2 font-semibold`}>
          {label.icon} {label.text}
        </div>
      )}
      
      {/* Image */}
      <div className="aspect-video bg-gray-200 relative">
        <Image src={offer.images?.[0]} alt={offer.name} fill className="object-cover" />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{offer.name} {'★'.repeat(offer.star_rating)}</h3>
          <p className="text-sm text-gray-500">{offer.city}, {offer.country}</p>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>📅 {formatDateRange(offer.departure_date, offer.return_date)}</p>
          <p>🍽️ {getBoardLabel(offer.board_type)} • ✈️ {getTransportLabel(offer.transport_type)}</p>
        </div>
        
        {/* Capacity Bar - ONLY for owned */}
        {bookedPercent >= 50 && (
          <div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${bookedPercent >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${bookedPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {offer.available_spots}/{offer.total_spots} mesta
            </p>
          </div>
        )}
        
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            {offer.original_price && (
              <span className="text-sm text-gray-400 line-through mr-2">€{offer.original_price}</span>
            )}
            <span className="text-xl font-bold">€{offer.price_per_person}</span>
            <span className="text-gray-500">/os</span>
          </div>
          <span className="text-gray-500">Ukupno: €{totalPrice}</span>
        </div>
        
        {/* CTA */}
        <Button className="w-full" asChild>
          <Link href={`/a/${slug}/reserve/${offer.id}`}>
            Rezerviši →
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

## 8.5 Inquiry Offer Card (On-Request)

NO capacity bar, shows response time, "Pošalji upit" button:

```tsx
function InquiryOfferCard({ offer, qualification }: Props) {
  const label = getOfferLabel(offer)
  const totalPrice = offer.price_per_person * qualification.guestCount
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Urgency Label - still applies */}
      {label && (
        <div className={`${getLabelBgColor(label)} text-white px-4 py-2 font-semibold`}>
          {label.icon} {label.text}
        </div>
      )}
      
      {/* Image */}
      <div className="aspect-video bg-gray-200 relative">
        <Image src={offer.images?.[0]} alt={offer.name} fill className="object-cover" />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{offer.name} {'★'.repeat(offer.star_rating)}</h3>
          <p className="text-sm text-gray-500">{offer.city}, {offer.country}</p>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>📅 {formatDateRange(offer.departure_date, offer.return_date)}</p>
          <p>🍽️ {getBoardLabel(offer.board_type)} • ✈️ {getTransportLabel(offer.transport_type)}</p>
        </div>
        
        {/* Response Time - instead of capacity */}
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Clock className="w-4 h-4" />
          <ResponseTimeDisplay compact />
        </div>
        
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            {offer.original_price && (
              <span className="text-sm text-gray-400 line-through mr-2">€{offer.original_price}</span>
            )}
            <span className="text-xl font-bold">€{offer.price_per_person}</span>
            <span className="text-gray-500">/os</span>
          </div>
          <span className="text-gray-500">Ukupno: €{totalPrice}</span>
        </div>
        
        {/* CTA - Different text */}
        <Button className="w-full" variant="outline" asChild>
          <Link href={`/a/${slug}/inquiry/${offer.id}`}>
            Pošalji upit →
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

## 8.6 Response Time Display

Dynamic based on agency working hours:

```tsx
function ResponseTimeDisplay({ compact = false }: { compact?: boolean }) {
  const { data: settings } = useAgencySettings()
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    const now = new Date()
    const hours = settings?.working_hours
    
    if (!hours) {
      setMessage('Odgovaramo u najkraćem roku')
      return
    }
    
    if (isWithinWorkingHours(now, hours)) {
      setMessage(`⚡ Odgovor u roku od ${hours.response_time_working} min`)
    } else {
      const nextOpen = getNextOpenTime(now, hours)
      setMessage(`🌙 Odgovaramo ${formatNextOpen(nextOpen)}`)
    }
  }, [settings])
  
  if (compact) {
    return <span>{message}</span>
  }
  
  return (
    <div className="text-sm text-gray-500">
      {message}
    </div>
  )
}

function isWithinWorkingHours(date: Date, hours: WorkingHours): boolean {
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const dayName = dayNames[date.getDay()]
  const daySchedule = hours.schedule[dayName]
  
  if (!daySchedule.enabled) return false
  
  const currentTime = format(date, 'HH:mm')
  return currentTime >= daySchedule.start && currentTime <= daySchedule.end
}

function getNextOpenTime(date: Date, hours: WorkingHours): Date {
  // ... logic to find next opening time
}
```

---

# 9. INQUIRY SYSTEM ⭐ NEW

For on-request offers, customers submit inquiries that agents must respond to.

## 9.1 Inquiry Form (Customer-Facing)

```tsx
function InquiryForm({ offer, qualification, agencySlug }: Props) {
  const [form, setForm] = useState({
    name: '',
    phone: '+381',
    email: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    const { data, error } = await supabase
      .from('offer_inquiries')
      .insert({
        offer_id: offer.id,
        organization_id: offer.organization_id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email,
        customer_message: form.message,
        qualification_data: qualification,
        status: 'pending',
      })
      .select()
      .single()
    
    if (!error) {
      // Redirect to confirmation
      router.push(`/a/${agencySlug}/inquiry/sent?id=${data.id}`)
    }
    
    setIsSubmitting(false)
  }
  
  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Pošaljite upit za {offer.name}</h1>
      
      {/* Offer Summary */}
      <div className="bg-gray-50 rounded-lg p-4 flex gap-4">
        <Image 
          src={offer.images?.[0]} 
          alt={offer.name} 
          width={80} 
          height={60} 
          className="rounded object-cover"
        />
        <div>
          <p className="font-semibold">{offer.name} {'★'.repeat(offer.star_rating)}</p>
          <p className="text-sm text-gray-500">{offer.city}, {offer.country}</p>
          <p className="text-sm text-gray-500">
            {formatDateRange(offer.departure_date, offer.return_date)} • €{offer.price_per_person}/os
          </p>
        </div>
      </div>
      
      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <Label>Ime i prezime *</Label>
          <Input 
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Marko Petrović"
          />
        </div>
        
        <div>
          <Label>Telefon *</Label>
          <Input 
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Email</Label>
          <Input 
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Poruka (opciono)</Label>
          <Textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Interesuje me soba sa pogledom na more..."
            rows={3}
          />
        </div>
      </div>
      
      {/* Qualification Summary */}
      <div className="text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
        ℹ️ Vaši podaci o putovanju su sačuvani: {qualification.adults} odraslih
        {qualification.children > 0 && ` + ${qualification.children} dece`}, 
        {qualification.month}, {getBoardLabel(qualification.board)}
      </div>
      
      {/* Submit */}
      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={!form.name || !form.phone || isSubmitting}
      >
        {isSubmitting ? 'Šaljem...' : '📋 POŠALJI UPIT'}
      </Button>
    </div>
  )
}
```

## 9.2 Inquiry Confirmation Page

After submission, show alternatives:

```tsx
function InquiryConfirmationPage({ inquiryId, agencySlug }: Props) {
  const { data: inquiry } = useInquiry(inquiryId)
  const { data: alternatives } = useAlternativeOffers(inquiry?.qualification_data)
  
  // Filter to only instant-booking offers
  const instantOffers = alternatives?.filter(o => o.inventory_type === 'owned') || []
  
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      {/* Success Message */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Upit uspešno poslat!</h1>
        <p className="text-gray-500">
          Očekujte odgovor u roku od <ResponseTimeDisplay compact />.
        </p>
        <p className="text-gray-500">
          Kontaktiraćemo vas na: {inquiry?.customer_phone}
        </p>
      </div>
      
      {/* Instant Alternatives */}
      {instantOffers.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">⚡ Dok čekate, možda vas interesuje:</h2>
            <p className="text-sm text-gray-500">Ove opcije možete rezervisati odmah bez čekanja!</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instantOffers.slice(0, 2).map(offer => (
              <InstantOfferCard 
                key={offer.id} 
                offer={offer} 
                qualification={inquiry?.qualification_data}
                compact
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Back Button */}
      <div className="text-center">
        <Button variant="outline" asChild>
          <Link href={`/a/${agencySlug}`}>← Nazad na sve ponude</Link>
        </Button>
      </div>
    </div>
  )
}
```

## 9.3 Agent Inquiry Dashboard

```tsx
function InquiryDashboard() {
  const { data: inquiries } = useInquiries()
  
  const pending = inquiries?.filter(i => i.status === 'pending') || []
  const checking = inquiries?.filter(i => i.status === 'checking') || []
  const responded = inquiries?.filter(i => ['available','unavailable','alternative'].includes(i.status)) || []
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📋 Upiti za ponude</h1>
      
      {/* Tab Counts */}
      <div className="flex gap-4">
        <TabButton active count={pending.length} color="red">
          🔴 Čeka odgovor
        </TabButton>
        <TabButton count={checking.length} color="amber">
          🟡 Proveravam
        </TabButton>
        <TabButton count={responded.length} color="green">
          🟢 Odgovoreno
        </TabButton>
      </div>
      
      {/* Inquiry Cards */}
      <div className="space-y-3">
        {pending.map(inquiry => (
          <InquiryCard key={inquiry.id} inquiry={inquiry} />
        ))}
      </div>
    </div>
  )
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const timeSince = formatDistanceToNow(new Date(inquiry.created_at), { locale: sr })
  const isUrgent = Date.now() - new Date(inquiry.created_at).getTime() > 10 * 60 * 1000 // 10 min
  
  return (
    <div className={`
      bg-white rounded-lg border p-4
      ${inquiry.status === 'pending' ? 'border-l-4 border-l-red-500' : ''}
      ${inquiry.status === 'checking' ? 'border-l-4 border-l-amber-500' : ''}
    `}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{inquiry.customer_name}</span>
            {isUrgent && inquiry.status === 'pending' && (
              <Badge className="bg-red-100 text-red-800">⚠️ 10+ min</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{inquiry.customer_phone}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{inquiry.offer?.name}</p>
          <p className="text-sm text-gray-500">pre {timeSince}</p>
        </div>
      </div>
      
      {inquiry.customer_message && (
        <p className="text-sm text-gray-600 mt-2 italic">
          "{inquiry.customer_message}"
        </p>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline">
          <Phone className="w-4 h-4 mr-1" /> Pozovi
        </Button>
        <Button size="sm" variant="outline">
          <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="bg-green-500 hover:bg-green-600">
          ✅ Dostupno
        </Button>
        <Button size="sm" variant="destructive">
          ❌ Nije dost.
        </Button>
      </div>
    </div>
  )
}
```

## 9.4 "Dostupno" Flow

When agent marks inquiry as available:

```tsx
function MarkAvailableDialog({ inquiry, open, onClose }: Props) {
  const [sendEmail, setSendEmail] = useState(true)
  const [callCustomer, setCallCustomer] = useState(true)
  
  const handleConfirm = async () => {
    // 1. Create reservation
    const reservation = await createReservation({
      offer_id: inquiry.offer_id,
      customer_name: inquiry.customer_name,
      customer_phone: inquiry.customer_phone,
      customer_email: inquiry.customer_email,
      adults: inquiry.qualification_data.adults,
      children: inquiry.qualification_data.children,
    })
    
    // 2. Update inquiry status
    await updateInquiry(inquiry.id, {
      status: 'available',
      reservation_id: reservation.id,
      responded_at: new Date(),
    })
    
    // 3. Send email with reservation link
    if (sendEmail && inquiry.customer_email) {
      await sendReservationEmail(reservation, inquiry.customer_email)
    }
    
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>✅ Potvrdi dostupnost</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium">{inquiry.offer?.name}</p>
            <p className="text-sm text-gray-500">
              {inquiry.customer_name} • {inquiry.qualification_data?.adults} osoba
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <Checkbox checked={sendEmail} onCheckedChange={setSendEmail} />
              <span>Pošalji email sa linkom za rezervaciju</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={callCustomer} onCheckedChange={setCallCustomer} />
              <span>Pozovi klijenta</span>
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button onClick={handleConfirm} className="bg-green-500 hover:bg-green-600">
            ✅ Kreiraj rezervaciju
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 9.5 "Nije dostupno" Flow

When agent marks inquiry as unavailable:

```tsx
function MarkUnavailableDialog({ inquiry, open, onClose }: Props) {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState(true)
  
  const { data: alternatives } = useAlternativeOffers(inquiry?.qualification_data)
  
  // Prefer instant-booking offers as alternatives
  const sortedAlternatives = alternatives?.sort((a, b) => {
    if (a.inventory_type === 'owned' && b.inventory_type !== 'owned') return -1
    if (a.inventory_type !== 'owned' && b.inventory_type === 'owned') return 1
    return 0
  })
  
  const handleConfirm = async () => {
    await updateInquiry(inquiry.id, {
      status: selectedAlternative ? 'alternative' : 'unavailable',
      alternative_offer_id: selectedAlternative,
      responded_at: new Date(),
    })
    
    if (sendEmail && inquiry.customer_email) {
      await sendAlternativesEmail(inquiry, selectedAlternative)
    }
    
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>❌ Ponuda nije dostupna</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-500">Predloži alternativu:</p>
          
          <RadioGroup value={selectedAlternative} onValueChange={setSelectedAlternative}>
            {sortedAlternatives?.slice(0, 3).map(offer => (
              <div key={offer.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <RadioGroupItem value={offer.id} />
                <div className="flex-1">
                  <p className="font-medium">
                    {offer.name} - €{offer.price_per_person}/os
                    {offer.inventory_type === 'owned' && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">⚡ Odmah</Badge>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{offer.city}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          
          <label className="flex items-center gap-2">
            <Checkbox checked={sendEmail} onCheckedChange={setSendEmail} />
            <span>Pošalji email sa alternativama</span>
          </label>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori bez alternative</Button>
          <Button onClick={handleConfirm}>Pošalji alternativu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

# 10. RESERVATION SYSTEM

## 8.1 Reservation Form

Triggered when customer clicks "Rezerviši":

```tsx
function ReservationForm({ offer, qualification }: Props) {
  const [form, setForm] = useState({
    name: '',
    phone: '+381',
    email: '',
    paymentOption: 'contact', // 'deposit' | 'full' | 'agency' | 'contact'
  })
  
  const totalPrice = offer.price_per_person * (qualification.guests.adults + qualification.guests.children)
  const depositAmount = totalPrice * 0.2
  
  // 24h countdown for price validity
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60)
  
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [])
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="max-w-lg mx-auto p-4">
      <Button variant="ghost" className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Nazad
      </Button>
      
      {/* Offer summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden">
            {offer.images?.[0] && <Image src={offer.images[0]} alt="" fill />}
          </div>
          <div>
            <h3 className="font-bold">{offer.name} {'★'.repeat(offer.star_rating)}</h3>
            <p className="text-sm text-gray-500">
              {format(offer.departure_date, 'd')} - {format(offer.return_date, 'd. MMM yyyy')} • {differenceInDays(offer.return_date, offer.departure_date)} noći
            </p>
            <p className="text-sm text-gray-500">{getBoardLabel(offer.board_type)} • {getTransportLabel(offer.transport_type)}</p>
          </div>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* Guest & Price summary */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>👥 {qualification.guests.adults} odraslih + {qualification.guests.children} dece</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>💰 Ukupna cena:</span>
          <span>€{totalPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-amber-600">
          <span>⏰ Ova cena važi još:</span>
          <span className="font-mono">{formatTime(timeLeft)}</span>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* Contact form */}
      <div className="space-y-4">
        <h4 className="font-semibold">Vaši podaci</h4>
        
        <div>
          <Label>Ime i prezime *</Label>
          <Input 
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Telefon *</Label>
          <Input 
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Email *</Label>
          <Input 
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* Payment options */}
      <div className="space-y-3">
        <h4 className="font-semibold">Kako želite da nastavite?</h4>
        
        <RadioGroup value={form.paymentOption} onValueChange={(v) => setForm({ ...form, paymentOption: v })}>
          <div className="p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="deposit" id="deposit" />
              <label htmlFor="deposit" className="flex-1">
                <span className="font-medium">💳 Plaćam avans €{Math.round(depositAmount)} (20%)</span>
                <span className="block text-sm text-gray-500">Garantujem cenu</span>
              </label>
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <label htmlFor="full" className="flex-1">
                <span className="font-medium">💳 Plaćam ukupan iznos €{totalPrice.toLocaleString()}</span>
              </label>
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="agency" id="agency" />
              <label htmlFor="agency" className="flex-1">
                <span className="font-medium">🏢 Plaćam u agenciji</span>
              </label>
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="contact" id="contact" />
              <label htmlFor="contact" className="flex-1">
                <span className="font-medium">📞 Kontaktirajte me za dogovor</span>
              </label>
            </div>
          </div>
        </RadioGroup>
      </div>
      
      <Separator className="my-4" />
      
      {/* Submit */}
      <Button className="w-full" size="lg">
        🔒 POTVRDI REZERVACIJU
      </Button>
      
      <p className="text-center text-sm text-gray-500 mt-3">
        Rezervacija je besplatna. Bez obaveze kupovine.
      </p>
      
      <p className="text-center text-xs text-gray-400 mt-2">
        🔒 Vaši podaci su sigurni i koriste se samo za ovu rezervaciju.
      </p>
    </div>
  )
}
```

## 8.2 Reservation Hold System

```typescript
// Reservation expires after 72 hours
const HOLD_HOURS = 72

// Reminder schedule
const REMINDERS = [
  { hours: 24, message: 'Podsećamo vas da rezervacija ističe za 48h' },
  { hours: 48, message: 'Poslednji dan da potvrdite rezervaciju!' },
]

// Cron job: Check expiring reservations
async function checkExpiringReservations() {
  const now = new Date()
  
  // Send 24h reminder
  const reminder24h = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'pending')
    .eq('reminder_24h_sent', false)
    .lt('expires_at', addHours(now, 48))
    .gt('expires_at', addHours(now, 24))
  
  for (const res of reminder24h.data || []) {
    await sendReminderEmail(res, '24h')
    await supabase
      .from('reservations')
      .update({ reminder_24h_sent: true })
      .eq('id', res.id)
  }
  
  // Send 48h reminder
  // ... similar logic
  
  // Expire old reservations
  const expired = await supabase
    .from('reservations')
    .update({ status: 'expired', expired_at: now })
    .eq('status', 'pending')
    .lt('expires_at', now)
  
  // Restore capacity for expired reservations
  // ... (handled by database trigger)
}
```

---

# 11. AGENT DASHBOARD

## 9.1 Dashboard Layout

```tsx
function AgentDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="ml-[220px]">
        <Header />
        
        <div className="p-6">
          {/* Stats Row */}
          <StatsBar stats={dashboardStats} />
          
          {/* Quick Actions */}
          <div className="flex gap-3 my-6">
            <Button onClick={openQuickEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Brzi unos
            </Button>
            <Button variant="outline" onClick={openNewLead}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novi upit
            </Button>
          </div>
          
          {/* Main Content Area */}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

## 9.2 Sidebar Navigation

```tsx
function Sidebar() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Početna' },
    { href: '/leads', icon: Users, label: 'Upiti', badge: 12 },
    { href: '/pipeline', icon: Kanban, label: 'Pipeline' },
    { href: '/offers', icon: Package, label: 'Ponude' },
    { href: '/trips', icon: Globe, label: 'Aranžmani', badge: 3, badgeColor: 'amber' },
    { href: '/reservations', icon: Calendar, label: 'Rezervacije' },
    { href: '/inbox', icon: MessageSquare, label: 'Inbox', badge: 5 },
  ]
  
  return (
    <nav className="fixed left-0 top-0 w-[220px] h-screen bg-gradient-to-b from-slate-800 to-slate-900 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
          T
        </div>
        <span className="text-white text-xl font-bold">Trak</span>
      </div>
      
      {/* Nav Items */}
      <div className="space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${pathname === item.href 
                ? 'bg-blue-500/20 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-semibold text-white
                ${item.badgeColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'}
              `}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
      
      {/* Settings at bottom */}
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <Settings className="w-5 h-5" />
          <span>Podešavanja</span>
        </Link>
      </div>
    </nav>
  )
}
```

## 9.3 Reservation Management View

```tsx
function ReservationsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'expired'>('all')
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rezervacije</h1>
        <Button>+ Nova ručno</Button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <TabNavigation
          tabs={[
            { id: 'all', label: 'Sve' },
            { id: 'pending', label: 'Čeka uplatu', count: 5 },
            { id: 'paid', label: 'Plaćeno', count: 12 },
            { id: 'expired', label: 'Isteklo' },
          ]}
          activeTab={filter}
          onChange={setFilter}
        />
        
        <div className="ml-auto">
          <Input placeholder="🔍 Pretraži..." className="w-64" />
        </div>
      </div>
      
      {/* Reservation Cards */}
      <div className="space-y-3">
        {reservations.map(res => (
          <ReservationCard key={res.id} reservation={res} />
        ))}
      </div>
    </div>
  )
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const isPending = reservation.status === 'pending'
  const isPaid = reservation.status === 'paid'
  const isExpired = reservation.status === 'expired'
  
  const timeLeft = isPending 
    ? formatDistanceToNow(reservation.expires_at, { addSuffix: true })
    : null
  
  return (
    <div className={`
      bg-white rounded-xl border p-4
      ${isPending ? 'border-l-4 border-l-amber-500' : ''}
      ${isPaid ? 'border-l-4 border-l-green-500' : ''}
      ${isExpired ? 'border-l-4 border-l-gray-300 opacity-60' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            {isPending && (
              <Badge className="bg-amber-100 text-amber-800">
                🟡 ČEKA UPLATU
              </Badge>
            )}
            {isPaid && (
              <Badge className="bg-green-100 text-green-800">
                🟢 PLAĆENO
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-gray-100 text-gray-600">
                ISTEKLO
              </Badge>
            )}
            
            {timeLeft && (
              <span className="text-sm text-amber-600 font-medium">
                Ističe {timeLeft}
              </span>
            )}
          </div>
          
          {/* Customer info */}
          <h3 className="font-semibold">{reservation.customer_name}</h3>
          <p className="text-sm text-gray-500">
            📞 {reservation.customer_phone}
          </p>
          {reservation.customer_email && (
            <p className="text-sm text-gray-500">
              📧 {reservation.customer_email}
            </p>
          )}
          
          {/* Offer info */}
          <p className="text-sm text-gray-600 mt-2">
            {reservation.offer?.name} {'★'.repeat(reservation.offer?.star_rating || 0)} • 
            {format(reservation.offer?.departure_date, 'd-d. MMM')} • 
            {reservation.adults}+{reservation.children}
          </p>
          
          {/* Payment info */}
          <p className="text-sm font-medium mt-1">
            €{reservation.total_price.toLocaleString()} ukupno • 
            €{reservation.amount_paid.toLocaleString()} uplaćeno
            {isPaid && ' ✓'}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

# 12. TRIP MANAGEMENT (ARANŽMANI)

## 10.1 Layout: Kanban/Vertical

Trips are **columns** (horizontal scroll), travelers are **cards** stacked vertically.

**Sorting:** Nearest departure first.

**Default Tab:** "Svi" - color coding makes priorities clear.

## 10.2 Trip Column Component

```tsx
interface TripColumnProps {
  trip: Trip
}

function TripColumn({ trip }: TripColumnProps) {
  const [expanded, setExpanded] = useState(false)
  
  const hasIssues = trip.travelers.some(t => !t.paymentComplete || !t.documentsComplete)
  const daysUntil = differenceInDays(trip.departure_date, new Date())
  const isTraveling = trip.status === 'traveling'
  
  const borderColor = isTraveling 
    ? 'border-t-green-500'
    : hasIssues 
      ? 'border-t-amber-500' 
      : 'border-t-blue-500'
  
  const visibleTravelers = expanded 
    ? trip.travelers 
    : trip.travelers.slice(0, 3)
  
  const hiddenCount = trip.travelers.length - 3
  const showExpand = trip.travelers.length > 4

  return (
    <div className={`
      min-w-[320px] max-w-[320px] 
      bg-white rounded-xl border border-gray-200 
      border-t-4 ${borderColor}
      flex flex-col
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-bold text-gray-900">
              {trip.destination.toUpperCase()} {format(trip.departure_date, 'd')}-{format(trip.return_date, 'd. MMM')}
            </h3>
            {isTraveling && (
              <Badge className="bg-green-100 text-green-800 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Na putu
              </Badge>
            )}
          </div>
          <div className="text-right">
            {isTraveling ? (
              <>
                <p className="font-bold text-gray-900">Dan {getCurrentDay(trip)}/{getTotalDays(trip)}</p>
                <p className="text-xs text-gray-500">Povratak za {daysUntilReturn(trip)} dana</p>
              </>
            ) : (
              <>
                <p className={`font-bold ${daysUntil <= 7 && hasIssues ? 'text-amber-600' : 'text-gray-900'}`}>
                  {daysUntil} dana
                </p>
                <p className="text-xs text-gray-500">do polaska</p>
              </>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-3">
          {trip.hotel} {'★'.repeat(trip.hotel_stars)} • {trip.board} • {trip.transport}
        </p>
        
        {!isTraveling && (
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj putnika
          </Button>
        )}
      </div>
      
      {/* Stats */}
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-sm">
        <span><strong>{trip.travelers.length}</strong> putnika</span>
        <span>
          <strong>€{trip.paid_amount.toLocaleString()}</strong>
          {!isTraveling && ` / €${trip.total_amount.toLocaleString()}`}
        </span>
      </div>
      
      {/* Issues Banner */}
      <IssuesBanner travelers={trip.travelers} />
      
      {/* Travelers List */}
      <div className="p-3 flex flex-col gap-2 flex-1 overflow-y-auto max-h-[400px]">
        {visibleTravelers.map(traveler => (
          <TravelerCard key={traveler.id} traveler={traveler} />
        ))}
        
        {showExpand && (
          <Button 
            variant="ghost" 
            className="w-full mt-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Sakrij
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Prikaži još {hiddenCount} putnika
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-100 flex gap-2">
        {isTraveling ? (
          <>
            <Button variant="outline" size="sm" className="flex-1">
              <Phone className="w-4 h-4 mr-1" />
              Kontakti
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Building className="w-4 h-4 mr-1" />
              Hotel
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="flex-1">
              <FileText className="w-4 h-4 mr-1" />
              Voucheri
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Mail className="w-4 h-4 mr-1" />
              Info
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <ClipboardList className="w-4 h-4 mr-1" />
              Lista
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
```

## 10.3 Traveler Card Component

```tsx
function TravelerCard({ traveler }: { traveler: Traveler }) {
  const hasIssue = !traveler.paymentComplete || !traveler.documentsComplete
  const allComplete = traveler.paymentComplete && traveler.documentsComplete && traveler.voucherSent
  
  const borderColor = allComplete 
    ? 'border-l-green-500' 
    : hasIssue 
      ? 'border-l-amber-500' 
      : 'border-l-gray-200'
  
  const statusBadge = !traveler.paymentComplete 
    ? { text: 'Čeka uplatu', className: 'bg-amber-100 text-amber-800' }
    : !traveler.documentsComplete
      ? { text: 'Čeka pasoš', className: 'bg-amber-100 text-amber-800' }
      : { text: '✓ Plaćeno', className: 'bg-green-100 text-green-800' }

  const guestLabel = traveler.children > 0
    ? `${traveler.adults}+${traveler.children} (dete ${traveler.childAges?.join('g, ')}g)`
    : `${traveler.adults} odraslih`

  return (
    <div className={`
      bg-white rounded-lg border border-gray-200 
      border-l-[3px] ${borderColor}
      p-3 cursor-pointer hover:shadow-sm transition-shadow
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{traveler.name}</p>
          <p className="text-xs text-gray-500">{traveler.phone}</p>
        </div>
        <Badge className={`text-xs ${statusBadge.className}`}>
          {statusBadge.text}
        </Badge>
      </div>
      
      {/* Meta */}
      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
        <span>{guestLabel}</span>
        <span className="font-semibold text-gray-900">€{traveler.totalPrice.toLocaleString()}</span>
      </div>
      
      {/* Checklist */}
      <div className="flex gap-3 text-xs">
        <ChecklistItem 
          done={traveler.paymentComplete} 
          issue={!traveler.paymentComplete}
          label={traveler.paymentComplete ? 'Uplata' : `€${traveler.totalPrice - traveler.paidAmount} preostalo`}
        />
        <ChecklistItem 
          done={traveler.documentsComplete} 
          issue={!traveler.documentsComplete}
          label="Dokumenta"
        />
        <ChecklistItem 
          done={traveler.voucherSent}
          label="Voucher"
        />
      </div>
    </div>
  )
}

function ChecklistItem({ done, issue, label }: { done: boolean; issue?: boolean; label: string }) {
  const icon = done ? '✓' : issue ? '!' : '○'
  const bgColor = done ? 'bg-green-100 text-green-600' : issue ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
  
  return (
    <div className="flex items-center gap-1">
      <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${bgColor}`}>
        {icon}
      </span>
      <span className={done ? 'text-gray-600' : issue ? 'text-amber-700' : 'text-gray-400'}>
        {label}
      </span>
    </div>
  )
}

function IssuesBanner({ travelers }: { travelers: Traveler[] }) {
  const awaitingPayment = travelers.filter(t => !t.paymentComplete).length
  const awaitingDocs = travelers.filter(t => !t.documentsComplete).length
  
  const hasIssues = awaitingPayment > 0 || awaitingDocs > 0

  if (!hasIssues) {
    return (
      <div className="px-4 py-2 bg-green-50 text-green-800 flex items-center gap-2 text-sm">
        <Check className="w-4 h-4" />
        <span>Sve spremno</span>
      </div>
    )
  }

  const issues = []
  if (awaitingPayment > 0) issues.push(`${awaitingPayment} čeka uplatu`)
  if (awaitingDocs > 0) issues.push(`${awaitingDocs} čeka pasoš`)

  return (
    <div className="px-4 py-2 bg-amber-50 text-amber-800 flex items-center gap-2 text-sm">
      <AlertTriangle className="w-4 h-4" />
      <span>{issues.join(', ')}</span>
    </div>
  )
}
```

---

# 13. OFFER MANAGEMENT (Agent-Facing)

## 11.1 Offers Table View

Agent-facing offer management is a TABLE, not cards:

```tsx
function OffersPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'sold_out' | 'archived'>('active')
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ponude</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={openImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={openNewOffer}>
            <Plus className="w-4 h-4 mr-2" />
            Nova ponuda
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <TabNavigation
          tabs={[
            { id: 'all', label: 'Sve' },
            { id: 'active', label: 'Aktivne', count: 47 },
            { id: 'sold_out', label: 'Rasprodato', count: 3 },
            { id: 'archived', label: 'Arhivirane' },
          ]}
          activeTab={filter}
          onChange={setFilter}
        />
        
        <Input placeholder="🔍 Pretraži..." className="w-64 ml-auto" />
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ponuda</TableHead>
              <TableHead>Destinacija</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Cena</TableHead>
              <TableHead>Kapacitet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map(offer => (
              <OfferTableRow key={offer.id} offer={offer} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function OfferTableRow({ offer }: { offer: Offer }) {
  const bookedPercent = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  const label = getOfferLabel(offer)
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-12 h-8 bg-gray-100 rounded overflow-hidden">
            {offer.images?.[0] && <Image src={offer.images[0]} alt="" fill />}
          </div>
          <div>
            <p className="font-medium">{offer.name} {'★'.repeat(offer.star_rating)}</p>
            <p className="text-xs text-gray-500">{offer.board_type} • {offer.transport_type}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <p>{offer.city}</p>
        <p className="text-xs text-gray-500">{offer.country}</p>
      </TableCell>
      <TableCell>
        <p>{format(offer.departure_date, 'd. MMM')} - {format(offer.return_date, 'd. MMM')}</p>
        <p className="text-xs text-gray-500">{differenceInDays(offer.return_date, offer.departure_date)} noći</p>
      </TableCell>
      <TableCell>
        <p className="font-medium">€{offer.price_per_person}/os</p>
        {offer.original_price && (
          <p className="text-xs text-gray-400 line-through">€{offer.original_price}</p>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${offer.available_spots <= 2 ? 'text-red-600' : ''}`}>
            {offer.available_spots}/{offer.total_spots}
          </span>
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${bookedPercent >= 80 ? 'bg-red-500' : bookedPercent >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${bookedPercent}%` }}
            />
          </div>
        </div>
        {label && (
          <Badge className={`text-xs mt-1 ${getLabelBadgeClass(label.type)}`}>
            {label.icon} {label.text}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge className={offer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
          {offer.status === 'active' ? 'Aktivna' : offer.status === 'sold_out' ? 'Rasprodato' : 'Arhivirana'}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="w-4 h-4 mr-2" />
              Izmeni
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="w-4 h-4 mr-2" />
              Dupliraj
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Archive className="w-4 h-4 mr-2" />
              Arhiviraj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
```

## 11.2 Quick Capacity Update

Inline capacity editing without opening full form:

```tsx
function QuickCapacityEditor({ offer }: { offer: Offer }) {
  const [spots, setSpots] = useState(offer.available_spots)
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    setSaving(true)
    await updateOfferCapacity(offer.id, spots)
    setSaving(false)
  }
  
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setSpots(s => Math.max(0, s - 1))}
      >
        -
      </Button>
      <span className="w-8 text-center font-medium">{spots}</span>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setSpots(s => Math.min(offer.total_spots, s + 1))}
      >
        +
      </Button>
      <Button 
        size="sm"
        variant="outline"
        onClick={() => setSpots(0)}
        className="text-red-600"
      >
        Rasprodato
      </Button>
      {spots !== offer.available_spots && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Čuvam...' : 'Sačuvaj'}
        </Button>
      )}
    </div>
  )
}
```

## 11.3 CSV Import

```tsx
function CSVImportModal({ open, onClose }) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedOffer[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFile(file)
    const result = await parseOffersCSV(file)
    setParsed(result.offers)
    setErrors(result.errors)
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import ponuda</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Prevucite CSV fajl ovde</p>
            <p className="text-sm text-gray-400">ili kliknite da izaberete</p>
            <input 
              id="csv-upload"
              type="file" 
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          
          <Button variant="link" className="text-sm">
            📥 Preuzmi template
          </Button>
          
          {parsed && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-green-600">
                  ✅ Učitano {parsed.length} ponuda
                </p>
                {errors.length > 0 && (
                  <p className="text-amber-600">
                    ⚠️ {errors.length} ponude imaju greške
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button disabled={!parsed || parsed.length === 0}>
            Uvezi {parsed?.length || 0} ponuda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

# 14. AI FEATURES ⭐ NEW

All AI features use Claude Haiku or GPT-4o-mini for cost efficiency (~€9/month total per agency).

## 14.1 Message Parsing

Agent pastes Viber/WhatsApp message, AI extracts structured data:

```typescript
// lib/ai/parse-message.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface ParsedLead {
  name: string | null
  phone: string | null
  destination: string | null
  guests: number | null
  date: string | null
  budget: string | null
  confidence: number
}

export async function parseMessage(message: string): Promise<ParsedLead> {
  // 1. Try regex first (instant, free)
  const regexResult = extractWithRegex(message)
  
  // 2. If we got phone + destination, good enough
  if (regexResult.phone && regexResult.destination) {
    return { ...regexResult, confidence: 0.8 }
  }
  
  // 3. Use AI for complex messages
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Extract travel inquiry data from this Serbian message.
Return JSON only, no markdown: {"name":string|null,"phone":string|null,"destination":string|null,"guests":number|null,"date":string|null,"budget":string|null}

Message: "${message}"`
      }]
    })
    
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)
    return { ...parsed, confidence: 0.95 }
  } catch (error) {
    // Return regex result with flag for manual review
    return { ...regexResult, confidence: 0.5, needsReview: true }
  }
}

function extractWithRegex(message: string): Partial<ParsedLead> {
  return {
    phone: message.match(/(\+?381|0)[0-9\s-]{8,}/)?.[0]?.replace(/[\s-]/g, '') || null,
    guests: parseInt(message.match(/(\d+)\s*(osob|odrasl)/i)?.[1] || '') || null,
    destination: ['Grčka','Turska','Egipat','Crna Gora','Španija']
      .find(d => message.toLowerCase().includes(d.toLowerCase())) || null,
    name: null, // Hard to extract reliably
    date: null,
    budget: null,
  }
}
```

### API Endpoint

```typescript
// app/api/ai/parse-message/route.ts
import { parseMessage } from '@/lib/ai/parse-message'

export async function POST(req: Request) {
  const { message } = await req.json()
  
  if (!message) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }
  
  const result = await parseMessage(message)
  return Response.json(result)
}
```

### UI Component

```tsx
function QuickParseDialog({ open, onClose, onSave }: Props) {
  const [message, setMessage] = useState('')
  const [parsed, setParsed] = useState<ParsedLead | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleParse = async () => {
    setIsLoading(true)
    const res = await fetch('/api/ai/parse-message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    const data = await res.json()
    setParsed(data)
    setIsLoading(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>+ Brzi unos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="📋 Nalepi tekst poruke iz Viber/WhatsApp..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          
          <Button onClick={handleParse} disabled={!message || isLoading}>
            {isLoading ? 'Analiziram...' : '🤖 Izvuci podatke'}
          </Button>
          
          {parsed && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-500">AI je prepoznao:</p>
              {parsed.name && <ParsedField label="Ime" value={parsed.name} />}
              {parsed.phone && <ParsedField label="Telefon" value={parsed.phone} />}
              {parsed.destination && <ParsedField label="Destinacija" value={parsed.destination} />}
              {parsed.guests && <ParsedField label="Gosti" value={`${parsed.guests} osoba`} />}
              {parsed.date && <ParsedField label="Datum" value={parsed.date} />}
              {parsed.budget && <ParsedField label="Budžet" value={parsed.budget} />}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkaži</Button>
          <Button onClick={() => onSave(parsed)} disabled={!parsed}>
            Sačuvaj upit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 14.2 Screenshot OCR

```typescript
// lib/ai/parse-screenshot.ts
export async function parseScreenshot(imageBase64: string): Promise<ParsedLead> {
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
        },
        {
          type: 'text',
          text: `This is a screenshot of a Serbian travel inquiry chat.
Extract: {"name":string|null,"phone":string|null,"destination":string|null,"guests":number|null,"date":string|null,"budget":string|null}
Return JSON only.`
        }
      ]
    }]
  })
  
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text)
}
```

## 14.3 Lead Scoring

```typescript
// lib/ai/score-lead.ts
interface LeadScore {
  score: number           // 0-100
  probability: number     // 0.0-1.0
  signals: {
    positive: string[]
    negative: string[]
  }
  action: string          // Recommended action
}

export function scoreLead(lead: Lead): LeadScore {
  let score = 50 // Base score
  const positive: string[] = []
  const negative: string[] = []
  
  // Source quality
  if (lead.source === 'facebook_ad') { score += 15; positive.push('Facebook Ad izvor') }
  if (lead.source === 'referral') { score += 20; positive.push('Preporuka') }
  if (lead.source === 'organic') { score += 10; positive.push('Organski') }
  
  // Budget clarity
  if (lead.budget && lead.budget !== 'unknown') { score += 10; positive.push('Jasan budžet') }
  else { score -= 5; negative.push('Nejasan budžet') }
  
  // Date specificity
  if (lead.exact_dates) { score += 15; positive.push('Tačan datum') }
  else if (lead.month) { score += 5; positive.push('Približan datum') }
  else { score -= 10; negative.push('Bez datuma') }
  
  // Repeat customer
  if (lead.is_repeat_customer) { score += 20; positive.push('Povratni kupac') }
  
  // Response speed (if they responded to our outreach)
  if (lead.response_time_minutes && lead.response_time_minutes < 60) {
    score += 10; positive.push('Brzo odgovara')
  }
  
  // Guest count (larger groups = higher value but more complex)
  if (lead.guests >= 4) { score += 5; positive.push('Veća grupa') }
  
  score = Math.max(0, Math.min(100, score))
  const probability = score / 100
  
  let action = 'Standardni prioritet'
  if (score >= 80) action = 'Visok prioritet - pozovi odmah'
  else if (score >= 60) action = 'Pozovi u roku od 1 sata'
  else if (score < 40) action = 'Nizak prioritet - može čekati'
  
  return { score, probability, signals: { positive, negative }, action }
}
```

### Display in Pipeline

```tsx
function LeadCard({ lead }: { lead: Lead }) {
  const score = scoreLead(lead)
  
  const scoreColor = score.score >= 70 ? 'text-green-600' : 
                     score.score >= 40 ? 'text-amber-600' : 'text-gray-400'
  
  return (
    <div className="bg-white rounded-lg border p-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{lead.name || 'Bez imena'}</p>
          <p className="text-sm text-gray-500">{lead.phone}</p>
        </div>
        <span className={`font-bold ${scoreColor}`}>{score.score}</span>
      </div>
      
      <p className="text-sm text-gray-600 mt-2">
        {lead.destination} • {lead.guests} osoba
      </p>
      
      {score.action && score.score >= 60 && (
        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          {score.action}
        </p>
      )}
    </div>
  )
}
```

## 14.4 Smart Offer Matching

```typescript
// lib/ai/match-offers.ts
interface MatchedOffer {
  offer_id: string
  match_score: number
  reasons: string[]
}

export async function matchOffers(
  qualification: QualificationData,
  offers: Offer[]
): Promise<MatchedOffer[]> {
  const scored = offers.map(offer => {
    let score = 0
    const reasons: string[] = []
    
    // Destination match (40%)
    if (offer.country === qualification.destination.country) {
      score += 30
      reasons.push('Tačna destinacija')
      if (offer.city === qualification.destination.city) {
        score += 10
        reasons.push('Tačan grad')
      }
    }
    
    // Date match (20%)
    const offerMonth = new Date(offer.departure_date).getMonth()
    const wantedMonth = getMonthNumber(qualification.dates.month)
    if (offerMonth === wantedMonth) {
      score += 20
      reasons.push('Odgovara termin')
    } else if (Math.abs(offerMonth - wantedMonth) === 1) {
      score += 10
      reasons.push('Blizak termin')
    }
    
    // Budget match (15%)
    if (qualification.budget.max && offer.price_per_person <= qualification.budget.max) {
      score += 15
      reasons.push('U okviru budžeta')
    } else if (qualification.budget.max && offer.price_per_person <= qualification.budget.max * 1.1) {
      score += 8
      reasons.push('Blizu budžeta')
    }
    
    // Accommodation type (10%)
    if (qualification.accommodation.type === 'any' || 
        offer.accommodation_type === qualification.accommodation.type) {
      score += 10
      reasons.push('Tip smeštaja')
    }
    
    // Board type (10%)
    if (qualification.accommodation.board === 'any' ||
        offer.board_type === qualification.accommodation.board) {
      score += 10
      reasons.push('Ishrana')
    }
    
    // Urgency bonus (5%)
    if (offer.available_spots <= 3) {
      score += 5
      reasons.push('Poslednja mesta')
    }
    
    return { offer_id: offer.id, match_score: score, reasons }
  })
  
  return scored.sort((a, b) => b.match_score - a.match_score)
}
```

---

# 15. ABANDONED CART RECOVERY ⭐ NEW

Captures emails from customers who browse but don't book, then sends personalized follow-ups.

## 15.1 Email Capture Popup

Appears 10 seconds after results load:

```tsx
function EmailCapturePopup({ 
  qualification, 
  offersViewed,
  agencySlug 
}: Props) {
  const [email, setEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Show after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't show if already captured or dismissed
      if (!localStorage.getItem(`email_captured_${agencySlug}`)) {
        setIsOpen(true)
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [])
  
  const handleSubmit = async () => {
    const discountCode = generateDiscountCode()
    
    await fetch('/api/public/email-capture', {
      method: 'POST',
      body: JSON.stringify({
        email,
        qualification_data: qualification,
        offers_shown: offersViewed.map(o => o.id),
        discount_code: discountCode,
        agency_slug: agencySlug,
      }),
    })
    
    localStorage.setItem(`email_captured_${agencySlug}`, 'true')
    setIsSubmitted(true)
  }
  
  const handleDismiss = () => {
    localStorage.setItem(`email_captured_${agencySlug}`, 'dismissed')
    setIsOpen(false)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        {!isSubmitted ? (
          <>
            <h2 className="text-xl font-bold text-center">💌 Želite 5% popusta?</h2>
            
            <p className="text-gray-600 text-center">
              Ostavite email i dobićete:
            </p>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                5% popusta na prvu rezervaciju
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Obaveštenje ako cena padne
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Info kad se oslobode mesta
              </li>
            </ul>
            
            <Input
              type="email"
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                onClick={handleSubmit}
                disabled={!email.includes('@')}
              >
                Želim popust →
              </Button>
              <Button variant="ghost" onClick={handleDismiss}>
                Ne hvala
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold">Kod je poslan!</h3>
            <p className="text-gray-500">Proverite inbox za vaš kod za 5% popusta.</p>
            <Button onClick={() => setIsOpen(false)}>Nastavi →</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LETO'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
```

## 15.2 Email Capture API

```typescript
// app/api/public/email-capture/route.ts
export async function POST(req: Request) {
  const { 
    email, 
    qualification_data, 
    offers_shown,
    discount_code,
    agency_slug 
  } = await req.json()
  
  // Get agency settings
  const { data: agency } = await supabase
    .from('agency_booking_settings')
    .select('*, organizations(*)')
    .eq('slug', agency_slug)
    .single()
  
  if (!agency?.abandoned_cart_enabled) {
    return Response.json({ success: true }) // Silently succeed but don't create
  }
  
  // Create abandoned cart record
  const { data: cart, error } = await supabase
    .from('abandoned_carts')
    .insert({
      organization_id: agency.organization_id,
      email,
      qualification_data,
      offers_shown,
      discount_code,
      discount_percent: agency.abandoned_cart_discount_percent || 5,
      discount_expires_at: new Date(Date.now() + (agency.abandoned_cart_discount_hours || 72) * 60 * 60 * 1000),
    })
    .select()
    .single()
  
  // Send immediate welcome email with code
  if (cart) {
    await sendDiscountWelcomeEmail(email, discount_code, agency)
  }
  
  return Response.json({ success: true })
}
```

## 15.3 Email Sequence Cron Job

```typescript
// lib/cron/abandoned-cart-emails.ts
export async function processAbandonedCartEmails() {
  const now = new Date()
  
  // Get all non-converted carts
  const { data: carts } = await supabase
    .from('abandoned_carts')
    .select('*, organizations(*), agency_booking_settings(*)')
    .eq('converted', false)
    .lt('discount_expires_at', now.toISOString()) // Not expired
  
  for (const cart of carts || []) {
    const settings = cart.agency_booking_settings
    const createdAt = new Date(cart.created_at)
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    // Email 1: After 2 hours
    if (!cart.email_1_sent_at && hoursSinceCreated >= (settings?.abandoned_cart_email_1_hours || 2)) {
      await sendAbandonedCartEmail1(cart)
      await supabase
        .from('abandoned_carts')
        .update({ email_1_sent_at: now.toISOString() })
        .eq('id', cart.id)
    }
    
    // Email 2: After 24 hours (with urgency)
    if (!cart.email_2_sent_at && hoursSinceCreated >= (settings?.abandoned_cart_email_2_hours || 24)) {
      await sendAbandonedCartEmail2(cart)
      await supabase
        .from('abandoned_carts')
        .update({ email_2_sent_at: now.toISOString() })
        .eq('id', cart.id)
    }
    
    // Email 3: After 72 hours (last chance)
    if (!cart.email_3_sent_at && hoursSinceCreated >= (settings?.abandoned_cart_email_3_hours || 72)) {
      await sendAbandonedCartEmail3(cart)
      await supabase
        .from('abandoned_carts')
        .update({ email_3_sent_at: now.toISOString() })
        .eq('id', cart.id)
    }
  }
}
```

## 15.4 Email Templates

```typescript
// lib/email/abandoned-cart.ts
export async function sendAbandonedCartEmail1(cart: AbandonedCart) {
  const qualification = cart.qualification_data
  const offers = await getOffersByIds(cart.offers_shown)
  
  await sendEmail({
    to: cart.email,
    subject: `Vaše ponude za ${qualification.destination.country} vas čekaju ✈️`,
    html: `
      <h1>Zdravo!</h1>
      
      <p>Videli smo da ste tražili aranžman:</p>
      <ul>
        <li>📍 ${qualification.destination.country}, ${qualification.destination.city || 'bilo gde'}</li>
        <li>👥 ${qualification.guests.adults} odraslih${qualification.guests.children ? ` + ${qualification.guests.children} dece` : ''}</li>
        <li>📅 ${qualification.dates.month}, ${qualification.dates.duration} noći</li>
        <li>🍽️ ${getBoardLabel(qualification.accommodation.board)}</li>
      </ul>
      
      <p>Evo ponuda koje ste gledali:</p>
      ${offers.slice(0, 3).map(o => `
        <div style="border: 1px solid #eee; padding: 16px; margin: 8px 0;">
          <strong>${o.name} ${'★'.repeat(o.star_rating)}</strong><br>
          €${o.price_per_person}/os
        </div>
      `).join('')}
      
      <p>🎁 <strong>Vaš kod za 5% popusta: ${cart.discount_code}</strong></p>
      
      <a href="${getReservationUrl(cart)}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 8px;">
        Rezerviši sa popustom →
      </a>
    `
  })
}

export async function sendAbandonedCartEmail2(cart: AbandonedCart) {
  // Get offer with lowest availability
  const offers = await getOffersByIds(cart.offers_shown)
  const urgentOffer = offers.reduce((min, o) => 
    o.available_spots < min.available_spots ? o : min
  )
  
  await sendEmail({
    to: cart.email,
    subject: `⚠️ ${urgentOffer.name} - još samo ${urgentOffer.available_spots} mesta!`,
    html: `
      <h1>Zdravo!</h1>
      
      <p><strong>${urgentOffer.name}</strong> koji ste gledali se brzo puni:</p>
      
      <ul>
        <li>🔥 Preostalo: samo ${urgentOffer.available_spots} mesta</li>
        <li>💰 Vaša cena sa popustom: €${Math.round(urgentOffer.price_per_person * 0.95)}/os</li>
        <li>⏰ Popust ističe za 48h</li>
      </ul>
      
      <a href="${getReservationUrl(cart, urgentOffer.id)}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 8px;">
        Rezerviši odmah →
      </a>
    `
  })
}
```

## 15.5 Agency Settings UI

```tsx
function AbandonedCartSettings() {
  const { data: settings, mutate } = useAgencySettings()
  
  const handleSave = async (values: FormValues) => {
    await supabase
      .from('agency_booking_settings')
      .update({
        abandoned_cart_enabled: values.enabled,
        abandoned_cart_discount_percent: values.discountPercent,
        abandoned_cart_discount_hours: values.discountHours,
        abandoned_cart_email_1_hours: values.email1Hours,
        abandoned_cart_email_2_hours: values.email2Hours,
        abandoned_cart_email_3_hours: values.email3Hours,
      })
      .eq('organization_id', settings.organization_id)
    
    mutate()
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Napuštena korpa</h3>
          <p className="text-sm text-gray-500">
            Automatski šaljemo do 3 podsetnika kupcima koji ne završe rezervaciju
          </p>
        </div>
        <Switch 
          checked={settings?.abandoned_cart_enabled}
          onCheckedChange={(v) => handleSave({ ...settings, enabled: v })}
        />
      </div>
      
      {settings?.abandoned_cart_enabled && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Popust (%)</Label>
              <Input 
                type="number" 
                value={settings?.abandoned_cart_discount_percent || 5}
                onChange={(e) => handleSave({ 
                  ...settings, 
                  discountPercent: parseInt(e.target.value) 
                })}
              />
            </div>
            <div>
              <Label>Trajanje koda (sati)</Label>
              <Input 
                type="number" 
                value={settings?.abandoned_cart_discount_hours || 72}
                onChange={(e) => handleSave({ 
                  ...settings, 
                  discountHours: parseInt(e.target.value) 
                })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email tajming</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Prvi email</Label>
                <Input 
                  type="number" 
                  value={settings?.abandoned_cart_email_1_hours || 2}
                  onChange={(e) => handleSave({ 
                    ...settings, 
                    email1Hours: parseInt(e.target.value) 
                  })}
                />
                <span className="text-xs text-gray-500">sati</span>
              </div>
              <div>
                <Label className="text-xs">Drugi email</Label>
                <Input 
                  type="number" 
                  value={settings?.abandoned_cart_email_2_hours || 24}
                />
                <span className="text-xs text-gray-500">sati</span>
              </div>
              <div>
                <Label className="text-xs">Treći email</Label>
                <Input 
                  type="number" 
                  value={settings?.abandoned_cart_email_3_hours || 72}
                />
                <span className="text-xs text-gray-500">sati</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

# 16. NOTIFICATIONS SYSTEM

## 16.1 Notification Types

```typescript
type NotificationType = 
  | 'new_lead'            // New lead created
  | 'new_inquiry'         // NEW: Customer inquiry on on-request offer
  | 'inquiry_urgent'      // NEW: Inquiry waiting 10+ minutes
  | 'new_reservation'     // Customer made reservation
  | 'payment_received'    // Payment came in
  | 'reservation_expiring'// 24h, 12h, 1h before expiry
  | 'reservation_expired' // 72h passed, no payment
  | 'booking_cancelled'   // Customer cancelled
  | 'new_message'         // FB/IG message

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  referenceType: 'lead' | 'reservation' | 'booking' | 'message'
  referenceId: string
  read: boolean
  createdAt: Date
}
```

## 12.2 Notification Bell + Dropdown

```tsx
function NotificationBell() {
  const { data: notifications } = useNotifications()
  const unreadCount = notifications?.filter(n => !n.read).length || 0
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Obaveštenja</h3>
          <Button variant="ghost" size="sm">Sva ✓</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications?.map(notif => (
            <NotificationItem key={notif.id} notification={notif} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  const icons: Record<NotificationType, string> = {
    new_lead: '🆕',
    new_reservation: '✅',
    payment_received: '💳',
    reservation_expiring: '⏰',
    reservation_expired: '❌',
    booking_cancelled: '🚫',
    new_message: '💬',
  }
  
  return (
    <div className={`
      p-4 border-b hover:bg-gray-50 cursor-pointer
      ${!notification.read ? 'bg-blue-50' : ''}
    `}>
      <div className="flex gap-3">
        <span className="text-xl">{icons[notification.type]}</span>
        <div className="flex-1">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-gray-600">{notification.body}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

# 17. RECONCILIATION SYSTEM

Ensures agents record all bookings. If Viber/phone bookings aren't entered, capacity tracking breaks.

## 13.1 End of Day Reminder (17:00)

```tsx
function EndOfDayModal({ stats }: { stats: DayStats }) {
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⏰ Kraj radnog dana</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p>Pre nego što odeš:</p>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p>📞 Danas si imao/la <strong>{stats.calls}</strong> poziva</p>
            <p>📝 Uneo/la si <strong>{stats.leadsCreated}</strong> upita</p>
            <p>✅ Zatvorio/la <strong>{stats.bookingsClosed}</strong> prodaje</p>
          </div>
          
          <p className="text-amber-600 font-medium">
            ⚠️ Imaš li još nešto za uneti?
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={openQuickBooking}>
            + Dodaj rezervaciju
          </Button>
          <Button onClick={confirmComplete}>
            Sve je uneseno ✓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 13.2 Morning Blocker (Next Day)

**This is a BLOCKER** - agent cannot dismiss without confirming:

```tsx
function MorningReconciliationModal({ yesterdayStats }: { yesterdayStats: DayStats }) {
  const [hasMore, setHasMore] = useState(false)
  
  return (
    <Dialog open={true} onOpenChange={() => {}}> {/* Cannot close */}
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>☀️ Dobro jutro, {userName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p>Pre nego što počneš, brza provera od juče:</p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">📊 JUČE ({formatDate(yesterday)})</p>
            <p>Upiti: <strong>{yesterdayStats.leadsCreated}</strong> novih</p>
            <p>Prodaje: <strong>{yesterdayStats.bookingsClosed}</strong> zaključene (€{yesterdayStats.revenue.toLocaleString()})</p>
          </div>
          
          <Separator />
          
          <p className="font-medium">⚠️ Da li je ovo kompletno?</p>
          <p className="text-sm text-gray-600">
            Često se desi da prodaja preko telefona/Vibera ostane neunesena. 
            Imaš li nešto da dodaš?
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setHasMore(true)
              openQuickBooking()
            }}
          >
            Da, imam još prodaja
          </Button>
          <Button onClick={confirmYesterdayComplete}>
            Ne, sve je uneseno ✓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

# 18. DATABASE SCHEMA

## 14.1 Core Tables

```sql
-- Organizations (agencies)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users (agents)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'agent', -- agent, manager, admin
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Customer info
  name VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  phone_normalized VARCHAR(20), -- +381641234567
  email VARCHAR(255),
  
  -- Preferences
  destination_country VARCHAR(100),
  destination_city VARCHAR(100),
  adults INTEGER DEFAULT 2,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[],
  month VARCHAR(20),
  budget_min INTEGER,
  budget_max INTEGER,
  
  -- Source
  source_channel VARCHAR(50), -- trak_form, facebook_ad, viber, phone, etc.
  source_raw_text TEXT,
  
  -- Stage
  stage VARCHAR(50) DEFAULT 'new', -- new, contacted, offer_sent, negotiating, closed_won, closed_lost
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Offers
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  
  -- Destination
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  
  -- Dates
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Pricing
  price_per_person DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  
  -- Capacity
  total_spots INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  
  -- Details
  accommodation_type VARCHAR(50), -- hotel, apartment, villa
  board_type VARCHAR(50), -- all_inclusive, half_board, breakfast, room_only
  transport_type VARCHAR(50), -- flight, bus, none
  
  -- Labels
  is_recommended BOOLEAN DEFAULT false,
  
  -- Analytics
  views_total INTEGER DEFAULT 0,
  views_last_24h INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, sold_out, archived
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  offer_id UUID REFERENCES offers(id),
  lead_id UUID REFERENCES leads(id),
  
  code VARCHAR(50) UNIQUE NOT NULL, -- TRK-2026-001234
  
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  
  adults INTEGER NOT NULL,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[],
  
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, expired, cancelled
  payment_method VARCHAR(50), -- card_deposit, card_full, agency, contact
  
  expires_at TIMESTAMP NOT NULL,
  
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_48h_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  expired_at TIMESTAMP
);

-- Bookings (confirmed sales)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  lead_id UUID REFERENCES leads(id),
  offer_id UUID REFERENCES offers(id),
  reservation_id UUID REFERENCES reservations(id),
  closed_by UUID REFERENCES users(id),
  
  adults INTEGER NOT NULL,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[],
  
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50), -- paid, partial, unpaid
  
  -- External booking info
  external_destination VARCHAR(255),
  external_accommodation VARCHAR(255),
  external_dates VARCHAR(100),
  
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed
  
  booked_at TIMESTAMP DEFAULT NOW(),
  travel_date DATE
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID REFERENCES reservations(id),
  booking_id UUID REFERENCES bookings(id),
  
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50), -- wspay, stripe, cash, bank
  provider_transaction_id VARCHAR(255),
  
  status VARCHAR(50), -- pending, completed, failed, refunded
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  
  reference_type VARCHAR(50),
  reference_id UUID,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily reconciliations
CREATE TABLE daily_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  
  reconciliation_date DATE NOT NULL,
  
  leads_created INTEGER DEFAULT 0,
  bookings_closed INTEGER DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0,
  
  confirmed_complete BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP,
  
  UNIQUE(organization_id, user_id, reconciliation_date)
);
```

## 14.2 Capacity Triggers

```sql
-- Auto-decrement capacity on booking
CREATE OR REPLACE FUNCTION update_offer_capacity_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offer_id IS NOT NULL THEN
    UPDATE offers 
    SET available_spots = available_spots - (NEW.adults + NEW.children)
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_capacity_decrease
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_offer_capacity_on_booking();

-- Auto-increment capacity on cancellation
CREATE OR REPLACE FUNCTION restore_capacity_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND OLD.offer_id IS NOT NULL THEN
    UPDATE offers 
    SET available_spots = available_spots + (OLD.adults + OLD.children)
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
```

---

# 19. API PATTERNS

## 15.1 Public Endpoints (No Auth)

```typescript
// GET /api/public/agencies/[slug]
// Returns agency landing page data

// GET /api/public/agencies/[slug]/offers?filters
// Returns offers for qualification matching

// POST /api/public/qualify
// Submit qualification, get matching offers

// POST /api/public/reservations
// Create a reservation

// GET /api/public/offers/[id]
// Single offer details
```

## 15.2 Protected Endpoints

```typescript
// Leads
GET    /api/leads
POST   /api/leads
POST   /api/leads/quick          // AI parse
GET    /api/leads/[id]
PUT    /api/leads/[id]
POST   /api/leads/[id]/close

// Offers
GET    /api/offers
POST   /api/offers
GET    /api/offers/[id]
PUT    /api/offers/[id]
DELETE /api/offers/[id]
POST   /api/offers/import        // CSV
PATCH  /api/offers/[id]/capacity // Quick update

// Bookings
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/[id]
POST   /api/bookings/[id]/cancel

// Reservations
GET    /api/reservations
GET    /api/reservations/[id]
PATCH  /api/reservations/[id]/status
POST   /api/reservations/[id]/extend

// Notifications
GET    /api/notifications
PATCH  /api/notifications/[id]/read
POST   /api/notifications/read-all

// Reconciliation
GET    /api/reconciliation/status
POST   /api/reconciliation/confirm
```

## 15.3 Supabase Query Patterns

```typescript
// Fetch leads with filters
const { data: leads } = await supabase
  .from('leads')
  .select('*, assigned_to:users(name)')
  .eq('organization_id', orgId)
  .eq('stage', stage)
  .order('created_at', { ascending: false })

// Fetch offers with capacity info
const { data: offers } = await supabase
  .from('offers')
  .select('*, images:offer_images(url)')
  .eq('organization_id', orgId)
  .eq('status', 'active')
  .gte('departure_date', today)
  .order('departure_date', { ascending: true })

// Fetch trips with travelers
const { data: trips } = await supabase
  .from('trips')
  .select(`
    *,
    offer:offers(*),
    travelers:bookings(
      *,
      customer:leads(name, phone),
      payments(*)
    )
  `)
  .eq('organization_id', orgId)
  .in('status', ['preparation', 'ready', 'traveling'])
  .order('departure_date', { ascending: true })
```

---

# 20. FILE STRUCTURE

```
/app
  /(auth)
    /login
      page.tsx
    /register
      page.tsx
  /(dashboard)
    layout.tsx              # Dashboard layout with sidebar
    page.tsx                # Dashboard home
    /leads
      page.tsx              # Leads list
      /[id]
        page.tsx            # Lead detail
    /pipeline
      page.tsx              # Kanban pipeline
    /offers
      page.tsx              # Offers table
      /new
        page.tsx            # New offer form
      /[id]
        page.tsx            # Edit offer
    /trips
      page.tsx              # Trips kanban
    /reservations
      page.tsx              # Reservations list
    /inbox
      page.tsx              # FB/IG messages
    /settings
      page.tsx              # Settings
  /(public)
    /a/[slug]
      page.tsx              # Agency landing
      /qualify
        page.tsx            # Qualification flow
      /offers
        page.tsx            # Offer results
      /reserve/[offerId]
        page.tsx            # Reservation form
  /api
    /public
      /agencies/[slug]
        route.ts
      /qualify
        route.ts
      /reservations
        route.ts
    /leads
      route.ts
      /[id]
        route.ts
      /quick
        route.ts
    /offers
      route.ts
      /[id]
        route.ts
      /import
        route.ts
    /bookings
      route.ts
    /reservations
      route.ts
    /notifications
      route.ts
    /reconciliation
      route.ts
    /webhooks
      /wspay
        route.ts
      /stripe
        route.ts
      /facebook
        route.ts

/components
  /ui                       # shadcn components
  /layout
    Sidebar.tsx
    Header.tsx
    StatsBar.tsx
    TabNavigation.tsx
  /leads
    LeadCard.tsx
    LeadForm.tsx
    QuickEntryModal.tsx
    QuickCloseModal.tsx
    LostLeadModal.tsx
  /offers
    OfferTableRow.tsx
    OfferForm.tsx
    CSVImportModal.tsx
    QuickCapacityEditor.tsx
    ClientOfferCard.tsx     # Public-facing
  /trips
    TripColumn.tsx
    TravelerCard.tsx
    IssuesBanner.tsx
  /reservations
    ReservationCard.tsx
    ReservationForm.tsx     # Public-facing
  /qualification
    ChipSelector.tsx
    QualificationProgress.tsx
    DestinationStep.tsx
    GuestsStep.tsx
    DatesStep.tsx
    AccommodationStep.tsx
    BudgetStep.tsx
  /notifications
    NotificationBell.tsx
    NotificationItem.tsx
  /reconciliation
    EndOfDayModal.tsx
    MorningBlockerModal.tsx

/lib
  /supabase
    client.ts               # Browser client
    server.ts               # Server client
    admin.ts                # Service role client
  /utils
    dates.ts
    formatting.ts
    labels.ts               # Urgency label logic
    phone.ts                # Phone normalization
  /hooks
    useLeads.ts
    useOffers.ts
    useTrips.ts
    useNotifications.ts
    useReconciliation.ts

/types
  index.ts                  # All TypeScript types
```

---

# 17. CHECKLIST BEFORE SUBMITTING

Before submitting any component, verify:

## Design
- [ ] No avatars anywhere in agent views
- [ ] No emojis in data display (hotels, stats, names) in agent views
- [ ] Emojis only in client-facing urgency labels
- [ ] Colors only used semantically (green=OK, amber=warning, red=error)
- [ ] Left borders on cards (3px) with correct color
- [ ] Top borders on columns (4px) with correct color
- [ ] Expand button (not link) for 5+ items
- [ ] Stats icons have colored backgrounds, not colored icons

## Language
- [ ] Serbian text for all UI labels
- [ ] English for code/comments
- [ ] Correct Serbian terminology from reference table

## Functionality
- [ ] Sorting: nearest departure/newest first where applicable
- [ ] Actions appropriate for status
- [ ] Proper loading states
- [ ] Error handling with Serbian messages

## Consistency
- [ ] Matches existing component patterns
- [ ] Uses shadcn/ui components
- [ ] Follows Tailwind conventions
- [ ] Uses correct spacing scale

---

*End of TRAK Cursor Implementation Bible v2.0*
