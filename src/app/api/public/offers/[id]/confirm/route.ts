import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Get current offer status
    const { data: offer, error: fetchError } = await supabase
      .from('offer_quotes')
      .select('id, status, lead_id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !offer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    // Check if can be confirmed
    if (offer.status !== 'sent' && offer.status !== 'viewed') {
      return NextResponse.json({ error: 'Ponuda ne može biti potvrđena' }, { status: 400 })
    }

    // Update offer status to confirmed
    const { error: updateError } = await supabase
      .from('offer_quotes')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error confirming offer:', updateError)
      return NextResponse.json({ error: 'Greška pri potvrdi' }, { status: 500 })
    }

    // Update lead stage to "Pregovori" or similar if lead exists
    if (offer.lead_id) {
      // Get pipeline stages
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('organization_id', offer.organization_id)
        .eq('is_won', false)
        .eq('is_lost', false)
        .order('position', { ascending: true })

      // Find "Pregovori" stage or use 4th stage
      const pregovoriStage = stages?.find((s: { id: string; name: string }) =>
        s.name.toLowerCase().includes('pregovor') ||
        s.name.toLowerCase().includes('negotiat')
      ) || stages?.[3] || stages?.[2]

      if (pregovoriStage) {
        await supabase
          .from('leads')
          .update({ stage_id: pregovoriStage.id })
          .eq('id', offer.lead_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error confirming offer:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
