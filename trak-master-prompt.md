# TRAK CRM - Complete Build Instructions

## What is Trak?

Trak is a lead management CRM for small businesses (travel agencies, real estate, salons, etc.) in Serbia/Balkans. It helps businesses:
- Capture leads from multiple sources (Facebook, Website, WhatsApp, manual)
- Track leads through a sales pipeline
- Never forget to follow up (reminders)
- See analytics on conversion rates

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth, Database, Realtime)
- Tailwind CSS
- TypeScript
- Lucide React (icons)
- @hello-pangea/dnd (drag and drop for pipeline)
- React Hook Form + Zod (forms)

## Database Schema

The Supabase database has these tables:

### organizations
- id (uuid, primary key)
- name (varchar)
- slug (varchar, unique)
- industry (varchar) - 'travel', 'realestate', 'salon', etc.
- settings (jsonb)
- created_at, updated_at

### users
- id (uuid, primary key, references auth.users)
- organization_id (uuid, references organizations)
- email (varchar)
- full_name (varchar)
- role (varchar) - 'owner', 'admin', 'agent'
- is_active (boolean)
- created_at, updated_at

### pipeline_stages
- id (uuid, primary key)
- organization_id (uuid, references organizations)
- name (varchar) - 'Novi', 'Kontaktiran', 'Poslata ponuda', 'Pregovori', 'Zatvoreno', 'Izgubljeno'
- slug (varchar)
- color (varchar)
- position (integer)
- is_default (boolean)
- is_won (boolean)
- is_lost (boolean)

### lead_sources
- id (uuid, primary key)
- organization_id (uuid, references organizations)
- type (varchar) - 'facebook', 'instagram', 'website', 'whatsapp', 'phone', 'manual'
- name (varchar)
- is_active (boolean)

### leads
- id (uuid, primary key)
- organization_id (uuid, references organizations)
- name (varchar)
- email (varchar)
- phone (varchar)
- source_id (uuid, references lead_sources)
- source_type (varchar)
- stage_id (uuid, references pipeline_stages)
- assigned_to (uuid, references users)
- destination (varchar)
- travel_date (varchar)
- guests (integer)
- budget (decimal)
- currency (varchar, default 'EUR')
- value (decimal)
- original_message (text)
- notes (text)
- tags (text[])
- last_contact_at (timestamptz)
- next_followup_at (timestamptz)
- closed_at (timestamptz)
- created_at, updated_at

### lead_activities
- id (uuid, primary key)
- lead_id (uuid, references leads)
- user_id (uuid, references users)
- type (varchar) - 'created', 'stage_changed', 'assigned', 'note', 'call', 'email', 'message'
- description (text)
- metadata (jsonb)
- created_at

### reminders
- id (uuid, primary key)
- lead_id (uuid, references leads)
- user_id (uuid, references users)
- organization_id (uuid, references organizations)
- title (varchar)
- description (text)
- due_at (timestamptz)
- is_completed (boolean)
- is_automatic (boolean)
- created_at

### notifications
- id (uuid, primary key)
- user_id (uuid, references users)
- organization_id (uuid, references organizations)
- type (varchar)
- title (varchar)
- body (text)
- lead_id (uuid, references leads)
- is_read (boolean)
- created_at

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page (public)
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                # Centered card layout
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   └── (dashboard)/
│       ├── layout.tsx                # Dashboard layout with sidebar
│       └── dashboard/
│           ├── page.tsx              # Dashboard home
│           ├── leads/
│           │   ├── page.tsx          # Lead list
│           │   ├── new/page.tsx      # New lead form
│           │   └── [id]/page.tsx     # Lead detail
│           ├── pipeline/page.tsx     # Kanban board
│           ├── analytics/page.tsx    # Reports
│           └── settings/
│               ├── page.tsx          # General settings
│               └── team/page.tsx     # Team management
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── leads/
│   │   ├── LeadCard.tsx
│   │   ├── LeadList.tsx
│   │   ├── LeadForm.tsx
│   │   └── LeadTimeline.tsx
│   ├── pipeline/
│   │   ├── PipelineBoard.tsx
│   │   ├── PipelineColumn.tsx
│   │   └── PipelineCard.tsx
│   └── dashboard/
│       ├── StatsCards.tsx
│       ├── RecentLeads.tsx
│       └── NeedsAttention.tsx
│
├── lib/
│   └── supabase/
│       ├── client.ts                 # Browser client
│       ├── server.ts                 # Server client
│       └── middleware.ts             # Auth middleware
│
├── hooks/
│   ├── useLeads.ts
│   ├── usePipeline.ts
│   ├── useUser.ts
│   └── useOrganization.ts
│
└── types/
    └── index.ts                      # TypeScript types
```

## What to Build

### 1. Types (src/types/index.ts)

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  settings: Record<string, any>;
  created_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'agent';
  is_active: boolean;
}

export interface PipelineStage {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  is_won: boolean;
  is_lost: boolean;
}

export interface LeadSource {
  id: string;
  organization_id: string;
  type: string;
  name: string;
  is_active: boolean;
}

export interface Lead {
  id: string;
  organization_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source_id: string | null;
  source_type: string | null;
  stage_id: string | null;
  assigned_to: string | null;
  destination: string | null;
  travel_date: string | null;
  guests: number | null;
  budget: number | null;
  currency: string;
  value: number | null;
  original_message: string | null;
  notes: string | null;
  tags: string[] | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  stage?: PipelineStage;
  source?: LeadSource;
  assigned_user?: User;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: User;
}

export interface Reminder {
  id: string;
  lead_id: string;
  user_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  due_at: string;
  is_completed: boolean;
  is_automatic: boolean;
}
```

### 2. Hooks

#### useUser.ts
- Get current authenticated user from Supabase
- Get user's organization_id
- Return { user, organizationId, loading, error }

#### useOrganization.ts  
- Fetch organization details
- Fetch pipeline_stages for this org
- Fetch lead_sources for this org
- Fetch team members (users) for this org
- Return { organization, stages, sources, teamMembers, loading }

#### useLeads.ts
- getLeads(filters?: { stageId?, sourceId?, assignedTo?, search? }) - fetch leads with relations
- getLead(id) - fetch single lead with activities
- createLead(data) - insert lead with organization_id
- updateLead(id, data) - update lead
- deleteLead(id) - delete lead
- addActivity(leadId, type, description) - add timeline activity
- All functions must include organization_id from useUser

#### usePipeline.ts
- Fetch stages and leads grouped by stage
- moveLeadToStage(leadId, newStageId) - update lead and log activity
- Return { stages, leadsByStage, moveLeadToStage, loading }

### 3. Pages

#### Auth Pages
- /login - Email/password login, redirect to /dashboard
- /register - Email, password, company name. Create auth user, organization, and user record. Redirect to /dashboard.
- Both use clean centered card layout

#### Dashboard Layout
- Sidebar with nav: Dashboard, Leads, Pipeline, Analytics, Settings
- Header with user avatar dropdown (profile, logout)
- Mobile responsive with hamburger menu
- Protect all routes - redirect to /login if not authenticated

#### Dashboard Home (/dashboard)
- Welcome message with user name
- 4 stat cards: Today's Leads, This Week, Conversion Rate, Total Pipeline Value
- "Needs Attention" - leads with no activity for 3+ days
- "Recent Leads" - last 5 leads
- Stats should be real, fetched from database

#### Leads List (/dashboard/leads)
- Header with "Add Lead" button
- Filter bar: stage dropdown, source dropdown, assigned dropdown, search input
- Table with columns: Name, Phone, Source, Stage (colored badge), Assigned To, Created
- Empty state when no leads
- Click row to go to detail page
- Pagination if > 20 leads

#### Lead Detail (/dashboard/leads/[id])
- Back button
- Lead info card: name, phone, email, source, destination, travel_date, guests, budget, value
- Editable fields (inline edit or modal)
- Stage dropdown to change status (logs activity)
- Assigned to dropdown
- Timeline showing all activities
- Add note form at bottom
- Delete lead button

#### New Lead (/dashboard/leads/new)
- Form with fields: name, phone, email, source (dropdown), destination, travel_date, guests, budget, notes
- Validation with Zod
- On submit: create lead, redirect to detail page
- Cancel button goes back to list

#### Pipeline (/dashboard/pipeline)
- Kanban board with columns for each stage
- Column header: stage name, lead count, total value
- Lead cards showing: name, destination, value, days ago
- Drag and drop cards between columns
- On drop: update stage_id, log activity
- Click card to open lead detail (modal or navigate)
- Cards older than 3 days without activity show warning icon
- Mobile: horizontal scroll

#### Analytics (/dashboard/analytics)
- Date range picker (this week, this month, custom)
- Stats: total leads, won, lost, conversion rate, total revenue
- Chart: leads over time (line chart)
- Chart: leads by source (pie/bar chart)
- Table: agent performance (leads, won, conversion rate)

#### Settings (/dashboard/settings)
- Organization name (editable)
- Industry
- Team members list with invite button (can be placeholder for MVP)

### 4. Key Implementation Details

#### Supabase Client Setup
- Use @supabase/ssr for App Router
- Browser client for client components
- Server client for server components
- Middleware to refresh auth tokens

#### Data Fetching
- Server components for initial data fetch where possible
- Client components with hooks for interactive features
- Use Supabase realtime for pipeline updates (optional for MVP)

#### Organization Scoping
- EVERY database query must filter by organization_id
- Get organization_id from the current user's record
- Never expose data from other organizations

#### Activity Logging
- When stage changes: log 'stage_changed' activity
- When assigned changes: log 'assigned' activity
- When note added: log 'note' activity
- When lead created: log 'created' activity

#### Styling
- Tailwind CSS throughout
- Clean, professional look
- Color scheme: Blue primary, Gray secondary
- Mobile responsive everything
- Loading skeletons while fetching
- Toast notifications for actions

### 5. File Dependencies Order

Build in this order to avoid import errors:

1. src/types/index.ts
2. src/lib/supabase/client.ts
3. src/lib/supabase/server.ts
4. src/lib/supabase/middleware.ts
5. src/middleware.ts
6. src/hooks/useUser.ts
7. src/hooks/useOrganization.ts
8. src/hooks/useLeads.ts
9. src/hooks/usePipeline.ts
10. src/components/layout/* (Sidebar, Header, MobileNav)
11. src/app/(auth)/layout.tsx
12. src/app/(auth)/login/page.tsx
13. src/app/(auth)/register/page.tsx
14. src/app/(dashboard)/layout.tsx
15. src/components/dashboard/*
16. src/app/(dashboard)/dashboard/page.tsx
17. src/components/leads/*
18. src/app/(dashboard)/dashboard/leads/page.tsx
19. src/app/(dashboard)/dashboard/leads/new/page.tsx
20. src/app/(dashboard)/dashboard/leads/[id]/page.tsx
21. src/components/pipeline/*
22. src/app/(dashboard)/dashboard/pipeline/page.tsx
23. src/app/(dashboard)/dashboard/analytics/page.tsx
24. src/app/(dashboard)/dashboard/settings/page.tsx

### 6. Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. Packages to Install

```bash
npm install @supabase/supabase-js @supabase/ssr @hello-pangea/dnd lucide-react react-hook-form @hookform/resolvers zod date-fns recharts
```

## Important Notes

1. Always use the user's organization_id when querying/inserting data
2. Handle loading and error states in every component
3. Use TypeScript types everywhere - no 'any'
4. Make everything mobile responsive
5. Test each feature after building before moving on
6. The database has RLS enabled - queries will fail if organization_id doesn't match

## Start Building

Begin with the types file, then hooks, then work through the pages in order. Test auth first (login/register), then dashboard layout, then leads CRUD, then pipeline, then analytics.
