/**
 * Seed test custom inquiries for dashboard testing
 * Run: npx tsx scripts/seed-test-inquiries.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function seedTestInquiries() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Find user by email
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('email', 'asd@gmail.com')
    .single()

  if (userError || !userData) {
    console.error('User not found:', userError)
    return
  }

  console.log('Found user:', userData)
  const organizationId = userData.organization_id

  // Test inquiries data
  const destinations = [
    { country: 'Grčka', city: 'Santorini' },
    { country: 'Hrvatska', city: 'Dubrovnik' },
    { country: 'Italija', city: 'Rim' },
    { country: 'Španija', city: 'Barcelona' },
    { country: 'Turska', city: 'Antalija' },
    { country: 'Egipat', city: 'Hurgada' },
    { country: 'Crna Gora', city: 'Budva' },
    { country: 'Maldivi', city: 'Male' },
    { country: 'Tajland', city: 'Phuket' },
    { country: 'Portugal', city: 'Lisabon' },
  ]

  const names = [
    'Marko Petrović',
    'Ana Jovanović',
    'Stefan Nikolić',
    'Milica Đorđević',
    'Nikola Stojanović',
    'Jelena Marković',
    'Aleksandar Popović',
    'Ivana Ilić',
    'Luka Todorović',
    'Teodora Pavlović',
  ]

  const phones = [
    '+381 63 123 4567',
    '+381 64 234 5678',
    '+381 65 345 6789',
    '+381 66 456 7890',
    '+381 60 567 8901',
    '+381 63 678 9012',
    '+381 64 789 0123',
    '+381 65 890 1234',
    '+381 66 901 2345',
    '+381 60 012 3456',
  ]

  const months = ['Jun', 'Jul', 'Avgust', 'Septembar']

  // Generate inquiries with varying ages (for priority testing)
  const now = new Date()
  const inquiries = names.map((name, i) => {
    const dest = destinations[i]
    const hoursAgo = [0.5, 1, 2, 3, 4, 5, 6, 12, 24, 48][i] // Different wait times
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

    return {
      organization_id: organizationId,
      customer_name: name,
      customer_phone: phones[i],
      customer_email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      customer_note: i % 3 === 0 ? 'Interesuje me all-inclusive opcija' : null,
      status: 'new',
      source: ['website', 'facebook', 'instagram', 'referral'][i % 4],
      qualification_data: {
        destination: {
          country: dest.country,
          city: dest.city,
        },
        dates: {
          month: months[i % months.length],
          flexible: i % 2 === 0,
        },
        guests: {
          adults: 2 + (i % 3),
          children: i % 2,
        },
        budget: {
          min: 500 + (i * 100),
          max: 1000 + (i * 200),
          currency: 'EUR',
        },
      },
      created_at: createdAt.toISOString(),
    }
  })

  // Delete existing test inquiries first (optional - to avoid duplicates)
  await supabase
    .from('custom_inquiries')
    .delete()
    .eq('organization_id', organizationId)
    .eq('status', 'new')

  // Insert test inquiries
  const { data, error } = await supabase
    .from('custom_inquiries')
    .insert(inquiries)
    .select()

  if (error) {
    console.error('Error inserting inquiries:', error)
    return
  }

  console.log(`Successfully created ${data.length} test inquiries!`)
  console.log('Inquiries:', data.map(i => ({ name: i.customer_name, created: i.created_at })))
}

seedTestInquiries().catch(console.error)
