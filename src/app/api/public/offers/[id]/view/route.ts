import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Update to viewed status
    const { error } = await supabase
      .from('offer_quotes')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'sent') // Only update if currently 'sent'

    if (error) {
      console.error('Error updating view status:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking offer viewed:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
