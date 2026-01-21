import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to update tracking without auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params

  if (!trackingId) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    // Find the sent offer by tracking ID
    const { data: offer, error } = await supabaseAdmin
      .from('lead_sent_offers')
      .select('id, link_url, viewed_at')
      .eq('tracking_id', trackingId)
      .single()

    if (error || !offer) {
      console.error('[Tracking] Offer not found:', trackingId, error)
      // Redirect to home if tracking ID not found
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Update viewed_at if not already set (first view only)
    if (!offer.viewed_at) {
      await supabaseAdmin
        .from('lead_sent_offers')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', offer.id)

      console.log('[Tracking] First view recorded:', trackingId)
    }

    // Append tracking ID to destination URL for inquiry form to pick up
    const destinationUrl = new URL(offer.link_url)
    destinationUrl.searchParams.set('tid', trackingId)

    // Redirect to the actual offer page
    return NextResponse.redirect(destinationUrl)
  } catch (err) {
    console.error('[Tracking] Error:', err)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
