import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Fetch offer with organization info
    const { data: offer, error } = await supabase
      .from('offer_quotes')
      .select(`
        *,
        organization:organizations(name, logo_url)
      `)
      .eq('id', id)
      .single()

    if (error || !offer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    return NextResponse.json(offer)
  } catch (error) {
    console.error('Error fetching offer:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
