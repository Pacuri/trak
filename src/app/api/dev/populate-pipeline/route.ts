// DEV ONLY: Populate pipeline with realistic travel agency data
// Access via: /api/dev/populate-pipeline

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const destinations = [
  { name: 'Maldivi - Cocoon Resort', price: 5800 },
  { name: 'Turska - Rixos Sungate', price: 2400 },
  { name: 'Egipat - Steigenberger', price: 1200 },
  { name: 'Grčka - Santorini', price: 1800 },
  { name: 'Dubai - Atlantis', price: 3200 },
  { name: 'Švajcarska - Zermatt', price: 4200 },
]

const messages: Record<string, string[]> = {
  messenger: [
    'Zdravo! Zanima me putovanje na Maldive za dvoje, imate li nešto za medeni mesec?',
    'Hej, videla sam vašu ponudu za Tursku, je li još aktuelna?',
    'Pozdrav, tražim all inclusive aranžman za porodicu sa dvoje dece',
  ],
  instagram: [
    'Hej! Videla sam vašu objavu za Bali, koje su cene za maj?',
    'Super vam je onaj hotel u Grčkoj! Koliko košta?',
  ],
  whatsapp: [
    'Dobar dan, interesuje me Turska za letovanje, jun mesec',
    'Pozdrav, molim vas za ponudu za Dubai, 5 noći, dvoje odraslih',
  ],
  email: [
    'Poštovani, molim vas za ponudu za Egipat, all inclusive, 7 noći, dvoje odraslih',
    'Zainteresovan sam za grupno putovanje u Italiju, molim detalje',
  ],
  trak: [
    'Interesuje me ovaj paket za jun, da li je moguće produžiti na 10 noći?',
    'Zanima me ova ponuda, ali za 4 osobe umesto 2',
  ],
  web: [
    'Kontakt forma sa sajta - zainteresovan za grupna putovanja',
    'Upit preko sajta: Letovanje Grčka 2024',
  ]
}

const mealPlans = ['all_inclusive', 'ultra_all_inclusive', 'half_board', 'breakfast']

export async function GET() {
  const supabase = await createClient()

  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const orgId = userData.organization_id

  // Get pipeline stages
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', orgId)
    .order('position')

  if (!stages || stages.length === 0) {
    return NextResponse.json({ error: 'No pipeline stages found' }, { status: 404 })
  }

  // Map stage names to IDs
  const stageMap: Record<string, string> = {}
  stages.forEach(s => {
    stageMap[s.name.toLowerCase()] = s.id
  })

  // Define leads to create
  const leadsToCreate = [
    // NOVI stage
    { name: 'Никола Поповић', source: 'messenger', stage: 'novi', unread: true, waitingHours: 5 },
    { name: 'Марија Јовановић', source: 'instagram', stage: 'novi', unread: true, waitingHours: 3 },
    { name: 'Петар Николић', source: 'email', stage: 'novi', unread: true, waitingHours: 0.75 },
    { name: 'Ана Ђорђевић', source: 'whatsapp', stage: 'novi', unread: true, waitingHours: 0.33 },
    { name: 'Милан Стојановић', source: 'trak', stage: 'novi', unread: false, waitingHours: 1 },

    // KONTAKTIRAN stage
    { name: 'Јелена Марковић', source: 'email', stage: 'kontaktiran', unread: false, waitingHours: 1, replied: true },
    { name: 'Драган Петровић', source: 'messenger', stage: 'kontaktiran', unread: false, waitingHours: 2, replied: true },

    // POSLATA PONUDA stage
    { name: 'Стефан Илић', source: 'email', stage: 'poslata ponuda', unread: false, waitingHours: 48, offer: destinations[0] },
    { name: 'Ивана Томић', source: 'whatsapp', stage: 'poslata ponuda', unread: false, waitingHours: 4, offer: destinations[1] },

    // PREGOVORI stage
    { name: 'Милица Радовић', source: 'email', stage: 'pregovori', unread: false, waitingHours: 24, offer: destinations[5] },

    // ZATVORENO stage
    { name: 'Милан Николић', source: 'email', stage: 'zatvoreno', unread: false, offer: destinations[0] },
    { name: 'Јована Симић', source: 'whatsapp', stage: 'zatvoreno', unread: false, offer: destinations[2] },
  ]

  // Clean up existing leads
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('organization_id', orgId)

  if (existingLeads && existingLeads.length > 0) {
    const leadIds = existingLeads.map(l => l.id)
    await supabase.from('lead_sent_offers').delete().in('lead_id', leadIds)
    await supabase.from('messages').delete().in('lead_id', leadIds)
    await supabase.from('lead_activities').delete().in('lead_id', leadIds)
    await supabase.from('leads').delete().eq('organization_id', orgId)
  }

  const results: string[] = []

  for (const leadDef of leadsToCreate) {
    const stageName = leadDef.stage.toLowerCase()
    let stageId = stageMap[stageName]

    // Try partial match
    if (!stageId) {
      for (const [name, id] of Object.entries(stageMap)) {
        if (name.includes(stageName) || stageName.includes(name)) {
          stageId = id
          break
        }
      }
    }

    if (!stageId && stages.length > 0) {
      stageId = stages[0].id
    }

    // Generate contact info
    const phone = `+381 6${Math.floor(Math.random() * 10)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`
    const emailName = leadDef.name.replace(/[^\w]/g, '').slice(0, 10).toLowerCase()
    const email = `${emailName}${Math.floor(Math.random() * 100)}@gmail.com`

    // Get message
    const sourceMessages = messages[leadDef.source] || messages.web
    const message = sourceMessages[Math.floor(Math.random() * sourceMessages.length)]

    // Calculate timestamps
    const now = new Date()
    const createdAt = new Date(now.getTime() - (leadDef.waitingHours || 0) * 60 * 60 * 1000)

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: orgId,
        name: leadDef.name,
        email: email,
        phone: phone,
        source_type: leadDef.source,
        stage_id: stageId,
        destination: leadDef.offer?.name || null,
        value: leadDef.offer?.price || null,
        original_message: message,
        created_at: createdAt.toISOString(),
        last_contact_at: leadDef.replied ? new Date(now.getTime() - (leadDef.waitingHours || 0) * 30 * 60 * 1000).toISOString() : null,
      })
      .select()
      .single()

    if (leadError) {
      results.push(`❌ ${leadDef.name}: ${leadError.message}`)
      continue
    }

    results.push(`✓ ${leadDef.name} (${leadDef.stage})`)

    // Create message
    await supabase.from('messages').insert({
      organization_id: orgId,
      lead_id: lead.id,
      content: message,
      channel: leadDef.source === 'messenger' ? 'messenger' :
               leadDef.source === 'instagram' ? 'instagram' :
               leadDef.source === 'whatsapp' ? 'whatsapp' : 'email',
      is_from_customer: true,
      is_read: !leadDef.unread,
      sent_at: createdAt.toISOString(),
    })

    // Create sent offer if applicable
    if (leadDef.offer) {
      const duration = 7 + Math.floor(Math.random() * 4)
      const adults = 2
      const children = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0
      const mealPlan = mealPlans[Math.floor(Math.random() * mealPlans.length)]

      const { error: offerError } = await supabase.from('lead_sent_offers').insert({
        lead_id: lead.id,
        organization_id: orgId,
        destination: leadDef.offer.name,
        package_name: leadDef.offer.name,
        price_total: leadDef.offer.price,
        duration_nights: duration,
        meal_plan: mealPlan,
        guests_adults: adults,
        guests_children: children > 0 ? children : null,
        sent_at: new Date(now.getTime() - (leadDef.waitingHours || 0) * 60 * 60 * 1000).toISOString(),
      })

      if (!offerError) {
        results.push(`  + Offer: ${leadDef.offer.name} €${leadDef.offer.price}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    stages: stages.map(s => s.name),
    created: results,
  })
}
