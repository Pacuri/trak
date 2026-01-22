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
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !offer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    // Check if can be rejected
    if (offer.status !== 'sent' && offer.status !== 'viewed') {
      return NextResponse.json({ error: 'Ponuda ne može biti odbijena' }, { status: 400 })
    }

    // Update offer status to rejected
    const { error: updateError } = await supabase
      .from('offer_quotes')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error rejecting offer:', updateError)
      return NextResponse.json({ error: 'Greška pri odbijanju' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting offer:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
