import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DEV ONLY: Seed test custom inquiries for dashboard testing
 * Call: GET /api/dev/seed-inquiries
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user's organization
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 })
  }

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

  // Delete existing new inquiries first (to avoid duplicates)
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
    return NextResponse.json({ error: 'Failed to insert inquiries', details: error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Created ${data.length} test inquiries`,
    inquiries: data.map(i => ({
      id: i.id,
      name: i.customer_name,
      destination: i.qualification_data?.destination?.country,
      created_at: i.created_at,
    })),
  })
}
