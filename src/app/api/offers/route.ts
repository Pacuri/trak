import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Offer, OfferStatus, InventoryType, AccommodationType, BoardType, TransportType } from '@/types'

// GET /api/offers
// List offers for the authenticated user's organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as OfferStatus | null
    const inventoryType = searchParams.get('inventory_type') as InventoryType | null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('departure_date', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default: exclude archived
      query = query.neq('status', 'archived')
    }

    if (inventoryType) {
      query = query.eq('inventory_type', inventoryType)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,country.ilike.%${search}%,city.ilike.%${search}%`)
    }

    const { data: offers, error, count } = await query

    if (error) {
      console.error('Error fetching offers:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju ponuda' }, { status: 500 })
    }

    // Sort images by position
    const offersWithSortedImages = offers?.map(offer => ({
      ...offer,
      images: (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    })) || []

    return NextResponse.json({
      offers: offersWithSortedImages,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in offers GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju ponuda' }, { status: 500 })
  }
}

interface CreateOfferBody {
  name: string
  description?: string
  star_rating?: number
  country: string
  city?: string
  departure_date: string
  return_date: string
  price_per_person: number
  original_price?: number
  total_spots: number
  accommodation_type?: AccommodationType
  board_type?: BoardType
  transport_type?: TransportType
  inventory_type?: InventoryType
  is_recommended?: boolean
  images?: { url: string; alt_text?: string; is_primary?: boolean }[]
}

// POST /api/offers
// Create a new offer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    const body: CreateOfferBody = await request.json()

    // Validate required fields
    if (!body.name || !body.country || !body.departure_date || !body.return_date || 
        !body.price_per_person || !body.total_spots) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja' }, { status: 400 })
    }

    // Create offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        description: body.description || null,
        star_rating: body.star_rating || null,
        country: body.country,
        city: body.city || null,
        departure_date: body.departure_date,
        return_date: body.return_date,
        price_per_person: body.price_per_person,
        original_price: body.original_price || null,
        total_spots: body.total_spots,
        available_spots: body.total_spots, // Initially all spots available
        accommodation_type: body.accommodation_type || null,
        board_type: body.board_type || null,
        transport_type: body.transport_type || null,
        inventory_type: body.inventory_type || 'inquiry',
        is_recommended: body.is_recommended || false,
        status: 'active',
      })
      .select()
      .single()

    if (offerError) {
      console.error('Error creating offer:', offerError)
      return NextResponse.json({ error: 'Greška pri kreiranju ponude' }, { status: 500 })
    }

    // Add images if provided
    if (body.images && body.images.length > 0) {
      const imageInserts = body.images.map((img, index) => ({
        offer_id: offer.id,
        url: img.url,
        alt_text: img.alt_text || null,
        position: index,
        is_primary: img.is_primary || index === 0,
      }))

      await supabase.from('offer_images').insert(imageInserts)
    }

    // Fetch complete offer with images
    const { data: completeOffer } = await supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `)
      .eq('id', offer.id)
      .single()

    return NextResponse.json(completeOffer, { status: 201 })
  } catch (error) {
    console.error('Error in offers POST:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju ponude' }, { status: 500 })
  }
}
