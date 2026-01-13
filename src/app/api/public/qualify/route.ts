import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { QualificationData, Offer } from '@/types'

// POST /api/public/qualify
// Submit qualification data, get matching offers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, qualification } = body as { 
      slug: string
      qualification: QualificationData 
    }

    if (!slug || !qualification) {
      return NextResponse.json(
        { error: 'Nedostaju podaci za pretragu' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get organization ID from slug
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, response_time_working, response_time_outside, working_hours')
      .eq('slug', slug)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Build query for matching offers
    let query = supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .gt('available_spots', 0)
      .order('departure_date', { ascending: true })

    // Apply filters from qualification data
    const { destination, guests, dates, accommodation, budget } = qualification

    // Destination filter
    if (destination.country) {
      query = query.ilike('country', `%${destination.country}%`)
    }
    if (destination.city) {
      query = query.ilike('city', `%${destination.city}%`)
    }

    // Date filter
    if (dates.month) {
      const monthNumber = getMonthNumber(dates.month)
      if (monthNumber) {
        const year = new Date().getFullYear()
        const startDate = new Date(year, monthNumber - 1, 1)
        const endDate = new Date(year, monthNumber, 0)
        query = query
          .gte('departure_date', startDate.toISOString().split('T')[0])
          .lte('departure_date', endDate.toISOString().split('T')[0])
      }
    } else if (dates.exactStart) {
      query = query.gte('departure_date', dates.exactStart)
      if (dates.exactEnd) {
        query = query.lte('departure_date', dates.exactEnd)
      }
    }

    // Budget filter
    if (budget.max) {
      query = query.lte('price_per_person', budget.max)
    }
    if (budget.min) {
      query = query.gte('price_per_person', budget.min)
    }

    // Accommodation filters
    if (accommodation.type && accommodation.type !== 'any') {
      query = query.eq('accommodation_type', accommodation.type)
    }
    if (accommodation.board && accommodation.board !== 'any') {
      query = query.eq('board_type', accommodation.board)
    }
    if (accommodation.transport && accommodation.transport !== 'own') {
      query = query.eq('transport_type', accommodation.transport)
    }

    // Capacity filter - need enough spots
    const totalGuests = guests.adults + guests.children
    query = query.gte('available_spots', totalGuests)

    const { data: offers, error } = await query

    if (error) {
      console.error('Error matching offers:', error)
      return NextResponse.json(
        { error: 'Greška pri pretrazi ponuda' },
        { status: 500 }
      )
    }

    // Score and sort offers by match quality
    const scoredOffers = (offers || []).map(offer => ({
      ...offer,
      images: (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
      match_score: calculateMatchScore(offer, qualification),
    })).sort((a, b) => b.match_score - a.match_score)

    // Split by inventory type
    const ownedOffers = scoredOffers.filter(o => o.inventory_type === 'owned')
    const inquiryOffers = scoredOffers.filter(o => o.inventory_type === 'inquiry')

    return NextResponse.json({
      owned: ownedOffers,
      inquiry: inquiryOffers,
      total: scoredOffers.length,
      qualification, // Echo back for client reference
      response_time: {
        working: settings.response_time_working,
        outside: settings.response_time_outside,
        working_hours: settings.working_hours,
      },
    })
  } catch (error) {
    console.error('Error in qualify:', error)
    return NextResponse.json(
      { error: 'Greška pri obradi upita' },
      { status: 500 }
    )
  }
}

function calculateMatchScore(offer: Offer, qualification: QualificationData): number {
  let score = 50

  // Destination match (30 points)
  if (qualification.destination.country && 
      offer.country.toLowerCase().includes(qualification.destination.country.toLowerCase())) {
    score += 20
    if (qualification.destination.city && offer.city && 
        offer.city.toLowerCase().includes(qualification.destination.city.toLowerCase())) {
      score += 10
    }
  }

  // Budget match (20 points)
  if (qualification.budget.max) {
    if (offer.price_per_person <= qualification.budget.max) {
      score += 20
    } else if (offer.price_per_person <= qualification.budget.max * 1.1) {
      score += 10
    }
  }

  // Board type match (10 points)
  if (qualification.accommodation.board === 'any' || 
      offer.board_type === qualification.accommodation.board) {
    score += 10
  }

  // Accommodation type match (10 points)
  if (qualification.accommodation.type === 'any' || 
      offer.accommodation_type === qualification.accommodation.type) {
    score += 10
  }

  // Urgency bonus (10 points)
  if (offer.available_spots <= 3) {
    score += 5
  }
  if (offer.original_price && offer.original_price > offer.price_per_person) {
    score += 5
  }

  return Math.min(100, score)
}

function getMonthNumber(month: string): number | null {
  const months: Record<string, number> = {
    'januar': 1, 'jan': 1,
    'februar': 2, 'feb': 2,
    'mart': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'maj': 5, 'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'avgust': 8, 'aug': 8,
    'septembar': 9, 'sep': 9, 'sept': 9,
    'oktobar': 10, 'okt': 10, 'oct': 10,
    'novembar': 11, 'nov': 11,
    'decembar': 12, 'dec': 12,
  }
  return months[month.toLowerCase()] || null
}
