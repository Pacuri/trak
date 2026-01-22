// Script to populate pipeline with realistic travel agency data
// Run with: npx tsx scripts/populate-pipeline.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Get org ID for ewqewq@gmail.com
async function getOrgId() {
  const { data: user } = await supabase
    .from('users')
    .select('organization_id')
    .eq('email', 'ewqewq@gmail.com')
    .single()

  if (!user) throw new Error('User not found')
  return user.organization_id
}

// Get pipeline stages
async function getStages(orgId: string) {
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organization_id', orgId)
    .order('position')

  return stages || []
}

// Serbian names for realism
const serbianNames = [
  'Милица Јовановић', 'Никола Петровић', 'Ана Николић', 'Марко Ђорђевић',
  'Јелена Марковић', 'Стефан Илић', 'Ивана Павловић', 'Драган Стојановић',
  'Милан Томић', 'Сања Радић', 'Бојан Ковачевић', 'Тамара Симић',
  'Немања Живковић', 'Мина Поповић', 'Лука Васић', 'Маја Ристић'
]

const destinations = [
  { name: 'Maldivi', emoji: '🏝️', price: 5800 },
  { name: 'Turska - Rixos Premium', emoji: '🏖️', price: 2400 },
  { name: 'Egipat - Hurghada', emoji: '🏜️', price: 1200 },
  { name: 'Grčka - Santorini', emoji: '🏛️', price: 1800 },
  { name: 'Dubai', emoji: '🌆', price: 3200 },
  { name: 'Tajland - Phuket', emoji: '🛕', price: 2800 },
  { name: 'Španija - Barcelona', emoji: '🌞', price: 1500 },
  { name: 'Italija - Rim', emoji: '🍝', price: 1100 },
  { name: 'Švajcarska - Zermatt', emoji: '🏔️', price: 4200 },
  { name: 'Zanzibar', emoji: '🌴', price: 3500 }
]

const messages = {
  messenger: [
    'Zdravo! Zanima me putovanje na Maldive za dvoje, imate li nešto za medeni mesec?',
    'Hej, videla sam vašu ponudu za Tursku, je li još aktuelna?',
    'Pozdrav, tražim all inclusive aranžman za porodicu sa dvoje dece',
    'Interesuje me Egipat za Novu godinu, ima li mesta?'
  ],
  instagram: [
    'Hej! Videla sam vašu objavu za Bali, koje su cene za maj?',
    'Super vam je onaj hotel u Grčkoj! Koliko košta?',
    'Zanima me Santorini za leto, jel ima još slobodnih termina?'
  ],
  whatsapp: [
    'Dobar dan, interesuje me Turska za letovanje, jun mesec',
    'Pozdrav, molim vas za ponudu za Dubai, 5 noći, dvoje odraslih',
    'Zdravo, imam pitanje oko Tajlanda - da li je sigurno za decu?'
  ],
  email: [
    'Poštovani, molim vas za ponudu za Egipat, all inclusive, 7 noći, dvoje odraslih',
    'Zainteresovan sam za grupno putovanje u Italiju, molim detalje',
    'Tražim luksuzni hotel na Maldivima za godišnjicu braka'
  ],
  trak: [
    'Interesuje me ovaj paket za jun, da li je moguće produžiti na 10 noći?',
    'Zanima me ova ponuda, ali za 4 osobe umesto 2',
    'Da li je cena po osobi ili za sobu?'
  ],
  web: [
    'Kontakt forma sa sajta - zainteresovan za grupna putovanja',
    'Upit preko sajta: Letovanje Grčka 2024',
    'Želim informacije o all inclusive ponudama'
  ]
}

const mealPlans = ['all_inclusive', 'ultra_all_inclusive', 'half_board', 'breakfast']

async function main() {
  console.log('🚀 Starting pipeline population...')

  const orgId = await getOrgId()
  console.log('✓ Found organization:', orgId)

  const stages = await getStages(orgId)
  console.log('✓ Found stages:', stages.map(s => s.name).join(', '))

  // Map stage names to IDs
  const stageMap: Record<string, string> = {}
  stages.forEach(s => {
    stageMap[s.name.toLowerCase()] = s.id
  })

  // Define leads to create with their stages
  const leadsToCreate = [
    // NOVI stage - 3 leads
    { name: 'Милица Јовановић', source: 'messenger', stage: 'novi', unread: true, waitingHours: 5 },
    { name: 'Марија Јовановић', source: 'instagram', stage: 'novi', unread: true, waitingHours: 3 },
    { name: 'Петар Николић', source: 'email', stage: 'novi', unread: true, waitingHours: 0.75 },
    { name: 'Ана Ђорђевић', source: 'whatsapp', stage: 'novi', unread: true, waitingHours: 0.33 },
    { name: 'Милан Стојановић', source: 'web', stage: 'novi', unread: false, waitingHours: 1 },

    // KONTAKTIRAN stage - 2 leads
    { name: 'Јелена Марковић', source: 'email', stage: 'kontaktiran', unread: false, waitingHours: 1, replied: true },
    { name: 'Драган Петровић', source: 'messenger', stage: 'kontaktiran', unread: false, waitingHours: 2, replied: true },

    // POSLATA PONUDA stage - 2 leads with offers
    { name: 'Стефан Илић', source: 'email', stage: 'poslata ponuda', unread: false, waitingHours: 48, offer: destinations[0] },
    { name: 'Ивана Томић', source: 'whatsapp', stage: 'poslata ponuda', unread: false, waitingHours: 4, offer: destinations[1] },

    // PREGOVORI stage - 1 lead with offer and partial payment
    { name: 'Милица Радовић', source: 'email', stage: 'pregovori', unread: false, waitingHours: 24, offer: destinations[8], paidPercent: 30 },

    // ZATVORENO stage - 2 leads fully paid
    { name: 'Милан Николић', source: 'email', stage: 'zatvoreno', unread: false, offer: destinations[0], paidPercent: 100 },
    { name: 'Јована Симић', source: 'whatsapp', stage: 'zatvoreno', unread: false, offer: destinations[2], paidPercent: 100 },
  ]

  // First, clean up any existing test leads
  console.log('🧹 Cleaning up existing test data...')
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('organization_id', orgId)

  if (deleteError) {
    console.error('Delete error:', deleteError)
  }

  console.log('📝 Creating leads...')

  for (const leadDef of leadsToCreate) {
    const stageName = leadDef.stage.toLowerCase()
    const stageId = stageMap[stageName] || stageMap['novi'] || stages[0]?.id

    if (!stageId) {
      console.error('No stage found for:', leadDef.stage)
      continue
    }

    // Random phone and email
    const phone = `+381 6${Math.floor(Math.random() * 10)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`
    const emailName = leadDef.name.toLowerCase().replace(/[^\w]/g, '').slice(0, 10)
    const email = `${emailName}${Math.floor(Math.random() * 100)}@gmail.com`

    // Get appropriate message
    const sourceMessages = messages[leadDef.source as keyof typeof messages] || messages.web
    const message = sourceMessages[Math.floor(Math.random() * sourceMessages.length)]

    // Calculate timestamps
    const now = new Date()
    const createdAt = new Date(now.getTime() - (leadDef.waitingHours || 0) * 60 * 60 * 1000)

    // Create the lead
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
      console.error('Error creating lead:', leadDef.name, leadError)
      continue
    }

    console.log(`  ✓ Created: ${leadDef.name} (${leadDef.stage})`)

    // Create message for unread indicator
    if (leadDef.unread || message) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
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

      if (msgError) {
        console.error('Error creating message:', msgError)
      }
    }

    // Create sent offer if applicable
    if (leadDef.offer) {
      const duration = 7 + Math.floor(Math.random() * 4) // 7-10 nights
      const adults = 2
      const children = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0
      const mealPlan = mealPlans[Math.floor(Math.random() * mealPlans.length)]

      const { error: offerError } = await supabase
        .from('lead_sent_offers')
        .insert({
          lead_id: lead.id,
          organization_id: orgId,
          destination: leadDef.offer.name,
          package_name: leadDef.offer.name,
          price_total: leadDef.offer.price,
          duration_nights: duration,
          meal_plan: mealPlan,
          guests_adults: adults,
          guests_children: children,
          sent_at: new Date(now.getTime() - (leadDef.waitingHours || 0) * 60 * 60 * 1000).toISOString(),
        })

      if (offerError) {
        console.error('Error creating sent offer:', offerError)
      } else {
        console.log(`    + Sent offer: ${leadDef.offer.name} - €${leadDef.offer.price}`)
      }
    }
  }

  console.log('\n✅ Pipeline population complete!')
  console.log(`   Created ${leadsToCreate.length} leads across ${stages.length} stages`)
}

main().catch(console.error)
