import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { InquiryStatus } from '@/types'

// GET /api/inquiries
// List offer inquiries for the authenticated user's organization
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
    const status = searchParams.get('status') as InquiryStatus | null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('offer_inquiries')
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city, price_per_person, inventory_type),
        responder:users!offer_inquiries_responded_by_fkey(id, full_name),
        alternative_offer:offers!offer_inquiries_alternative_offer_id_fkey(id, name, price_per_person)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }

    const { data: inquiries, error, count } = await query

    if (error) {
      console.error('Error fetching inquiries:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju upita' }, { status: 500 })
    }

    // Calculate summary stats
    const stats = {
      pending: 0,
      checking: 0,
      responded: 0,
      urgent: 0, // Pending > 10 minutes
    }

    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    inquiries?.forEach(inquiry => {
      if (inquiry.status === 'pending') {
        stats.pending++
        if (new Date(inquiry.created_at) <= tenMinutesAgo) {
          stats.urgent++
        }
      } else if (inquiry.status === 'checking') {
        stats.checking++
      } else if (['available', 'unavailable', 'alternative'].includes(inquiry.status)) {
        stats.responded++
      }
    })

    return NextResponse.json({
      inquiries: inquiries || [],
      total: count || 0,
      stats,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in inquiries GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju upita' }, { status: 500 })
  }
}
