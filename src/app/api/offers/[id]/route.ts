import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AccommodationType, BoardType, TransportType, InventoryType, OfferStatus } from '@/types'

// GET /api/offers/[id]
// Get a single offer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Fetch offer
    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !offer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    // Sort images by position
    offer.images = (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)

    return NextResponse.json(offer)
  } catch (error) {
    console.error('Error fetching offer:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju ponude' }, { status: 500 })
  }
}

interface UpdateOfferBody {
  name?: string
  description?: string
  star_rating?: number | null
  country?: string
  city?: string | null
  departure_date?: string
  return_date?: string
  price_per_person?: number
  original_price?: number | null
  total_spots?: number
  available_spots?: number
  accommodation_type?: AccommodationType | null
  board_type?: BoardType | null
  transport_type?: TransportType | null
  inventory_type?: InventoryType
  is_recommended?: boolean
  status?: OfferStatus
  images?: { id?: string; url: string; alt_text?: string; is_primary?: boolean }[]
}

// PUT /api/offers/[id]
// Update an offer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify offer belongs to user's organization
    const { data: existingOffer, error: existingError } = await supabase
      .from('offers')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (existingError || !existingOffer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    const body: UpdateOfferBody = await request.json()
    const { images, ...offerData } = body

    // Update offer
    const { data: updatedOffer, error: updateError } = await supabase
      .from('offers')
      .update({
        ...offerData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating offer:', updateError)
      return NextResponse.json({ error: 'Greška pri ažuriranju ponude' }, { status: 500 })
    }

    // Update images if provided
    if (images !== undefined) {
      // Delete existing images
      await supabase.from('offer_images').delete().eq('offer_id', id)

      // Insert new images
      if (images.length > 0) {
        const imageInserts = images.map((img, index) => ({
          offer_id: id,
          url: img.url,
          alt_text: img.alt_text || null,
          position: index,
          is_primary: img.is_primary || index === 0,
        }))

        await supabase.from('offer_images').insert(imageInserts)
      }
    }

    // Fetch complete offer with images
    const { data: completeOffer } = await supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json(completeOffer)
  } catch (error) {
    console.error('Error updating offer:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju ponude' }, { status: 500 })
  }
}

// DELETE /api/offers/[id]
// Delete (archive) an offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check for active bookings/reservations before archiving
    const { data: activeReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('offer_id', id)
      .eq('status', 'pending')
      .limit(1)

    if (activeReservations && activeReservations.length > 0) {
      return NextResponse.json(
        { error: 'Ne možete arhivirati ponudu sa aktivnim rezervacijama' },
        { status: 400 }
      )
    }

    // Soft delete (archive) the offer
    const { error: deleteError } = await supabase
      .from('offers')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Error archiving offer:', deleteError)
      return NextResponse.json({ error: 'Greška pri arhiviranju ponude' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting offer:', error)
    return NextResponse.json({ error: 'Greška pri arhiviranju ponude' }, { status: 500 })
  }
}
