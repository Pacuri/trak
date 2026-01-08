export interface Organization {
  id: string
  name: string
  slug: string
  industry: string | null
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'agent'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  organization_id: string
  name: string
  slug: string
  color: string
  position: number
  is_default: boolean
  is_won: boolean
  is_lost: boolean
}

export interface LeadSource {
  id: string
  organization_id: string
  type: string
  name: string
  is_active: boolean
}

export interface Lead {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  source_id: string | null
  source_type: string | null
  stage_id: string | null
  assigned_to: string | null
  destination: string | null
  travel_date: string | null
  guests: number | null
  budget: number | null
  currency: string
  value: number | null
  original_message: string | null
  notes: string | null
  tags: string[] | null
  last_contact_at: string | null
  next_followup_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // Joined relations
  stage?: PipelineStage
  source?: LeadSource
  assigned_user?: User
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  type: string
  description: string | null
  metadata: Record<string, any>
  created_at: string
  user?: User
}

export interface Reminder {
  id: string
  lead_id: string
  user_id: string
  organization_id: string
  title: string
  description: string | null
  due_at: string
  is_completed: boolean
  is_automatic: boolean
  created_at: string
}
