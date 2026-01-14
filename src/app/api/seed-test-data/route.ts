import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role for seeding (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

const TEST_NAMES = [
  'Marko Petrović', 'Ana Jovanović', 'Nikola Đorđević', 'Milica Nikolić', 
  'Stefan Ilić', 'Jovana Popović', 'Aleksandar Stojanović', 'Tijana Kostić',
  'Lazar Pavlović', 'Mina Todorović', 'Đorđe Stanković', 'Sara Živković',
  'Filip Marković', 'Katarina Janković', 'Nemanja Ristić', 'Teodora Milošević',
  'Vuk Obradović', 'Jelena Savić', 'Dušan Lazić', 'Ivana Tomić'
]

const TEST_PHONES = [
  '+381 60 123 4567', '+381 63 234 5678', '+381 64 345 6789', '+381 65 456 7890',
  '+381 66 567 8901', '+381 60 678 9012', '+381 63 789 0123', '+381 64 890 1234',
  '+381 65 901 2345', '+381 66 012 3456', '+381 60 111 2222', '+381 63 222 3333',
  '+381 64 333 4444', '+381 65 444 5555', '+381 66 555 6666', '+381 60 666 7777',
  '+381 63 777 8888', '+381 64 888 9999', '+381 65 999 0000', '+381 66 000 1111'
]

export async function POST(request: Request) {
  try {
    const { organizationId, userId } = await request.json()

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'organizationId and userId required' }, { status: 400 })
    }

    // Get some offers from this organization
    const { data: offers, error: offersError } = await supabaseAdmin
      .from('offers')
      .select('id, name, departure_date, return_date, price_per_person')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .limit(10)

    if (offersError || !offers?.length) {
      return NextResponse.json({ error: 'No offers found', details: offersError }, { status: 400 })
    }

    // Create 20 bookings spread across different dates
    const bookings = []
    const reservations = []
    
    // Get dates for current week and next few weeks
    const today = new Date()
    
    for (let i = 0; i < 20; i++) {
      const offer = offers[i % offers.length]
      const daysOffset = Math.floor(i / 3) - 2 // Spread across -2 to +5 days from today
      const travelDate = new Date(today)
      travelDate.setDate(travelDate.getDate() + daysOffset)
      
      const returnDate = new Date(travelDate)
      returnDate.setDate(returnDate.getDate() + 7)

      const adults = Math.floor(Math.random() * 3) + 1 // 1-3 adults
      const children = Math.floor(Math.random() * 3) // 0-2 children
      const totalAmount = (adults + children * 0.7) * parseFloat(String(offer.price_per_person))

      // Create booking (first 15)
      if (i < 15) {
        bookings.push({
          organization_id: organizationId,
          offer_id: offer.id,
          closed_by: userId,
          customer_name: TEST_NAMES[i],
          customer_phone: TEST_PHONES[i],
          customer_email: `${TEST_NAMES[i].toLowerCase().replace(' ', '.')}@test.com`,
          adults,
          children,
          total_amount: Math.round(totalAmount),
          amount_paid: Math.round(totalAmount),
          currency: 'EUR',
          payment_method: ['card', 'bank', 'cash'][i % 3] as 'card' | 'bank' | 'cash',
          payment_status: 'paid',
          status: 'confirmed',
          travel_date: travelDate.toISOString().split('T')[0],
          return_date: returnDate.toISOString().split('T')[0],
          booked_at: new Date().toISOString(),
        })
      } else {
        // Create reservations (last 5)
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 72)
        
        reservations.push({
          organization_id: organizationId,
          offer_id: offer.id,
          customer_name: TEST_NAMES[i],
          customer_phone: TEST_PHONES[i],
          customer_email: `${TEST_NAMES[i].toLowerCase().replace(' ', '.')}@test.com`,
          adults,
          children,
          total_price: Math.round(totalAmount),
          deposit_amount: Math.round(totalAmount * 0.3),
          amount_paid: i === 15 ? Math.round(totalAmount * 0.3) : 0, // One has deposit paid
          currency: 'EUR',
          payment_option: 'deposit',
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
      }
    }

    // Insert bookings
    const { data: insertedBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .insert(bookings)
      .select('id')

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to insert bookings', details: bookingsError }, { status: 500 })
    }

    // Insert reservations
    const { data: insertedReservations, error: reservationsError } = await supabaseAdmin
      .from('reservations')
      .insert(reservations)
      .select('id, code')

    if (reservationsError) {
      return NextResponse.json({ error: 'Failed to insert reservations', details: reservationsError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created: {
        bookings: insertedBookings?.length || 0,
        reservations: insertedReservations?.length || 0,
      }
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}
