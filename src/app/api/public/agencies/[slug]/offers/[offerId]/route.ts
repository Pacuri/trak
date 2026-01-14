import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/agencies/[slug]/offers/[offerId]
// Returns a single offer with images for public viewing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; offerId: string }> }
) {
  try {
    const { slug, offerId } = await params
    const supabase = await createClient()

    // Get organization ID from slug
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Fetch offer with images
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, position, is_primary)
      `)
      .eq('id', offerId)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Ponuda nije pronađena' },
        { status: 404 }
      )
    }

    // Sort images by position and mark primary
    const sortedImages = (offer.images || []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    )

    return NextResponse.json({
      ...offer,
      images: sortedImages,
    })
  } catch (error) {
    console.error('Error fetching offer:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju ponude' },
      { status: 500 }
    )
  }
}
