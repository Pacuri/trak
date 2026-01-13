import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ReservationStatus } from '@/types'

// GET /api/reservations
// List reservations for the authenticated user's organization
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
    const status = searchParams.get('status') as ReservationStatus | null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('reservations')
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city, departure_date, return_date),
        lead:leads(id, name, phone)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,code.ilike.%${search}%`)
    }

    const { data: reservations, error, count } = await query

    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju rezervacija' }, { status: 500 })
    }

    // Calculate summary stats
    const stats = {
      pending: 0,
      paid: 0,
      expired: 0,
      expiring_soon: 0,
    }

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    reservations?.forEach(res => {
      if (res.status === 'pending') {
        stats.pending++
        if (new Date(res.expires_at) <= in24h) {
          stats.expiring_soon++
        }
      } else if (res.status === 'paid') {
        stats.paid++
      } else if (res.status === 'expired') {
        stats.expired++
      }
    })

    return NextResponse.json({
      reservations: reservations || [],
      total: count || 0,
      stats,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in reservations GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju rezervacija' }, { status: 500 })
  }
}
