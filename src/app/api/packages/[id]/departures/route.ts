import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { DepartureFormData, GenerateWeeklyDeparturesParams } from '@/types/packages'

// GET /api/packages/[id]/departures
// List departures for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
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
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    let query = supabase
      .from('departures')
      .select('*')
      .eq('package_id', packageId)
      .eq('organization_id', userData.organization_id)
      .order('departure_date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('departure_date', fromDate)
    }

    if (toDate) {
      query = query.lte('departure_date', toDate)
    }

    const { data: departures, error } = await query

    if (error) {
      console.error('Error fetching departures:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju polazaka' }, { status: 500 })
    }

    return NextResponse.json({ departures: departures || [] })
  } catch (error) {
    console.error('Error in departures GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju polazaka' }, { status: 500 })
  }
}

// POST /api/packages/[id]/departures
// Add a single departure or generate weekly departures
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
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

    // Verify package exists and belongs to user's org
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('id, package_type, default_capacity, default_duration, price_from')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'Paket nije pronađen' }, { status: 404 })
    }

    const body = await request.json()
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Generate weekly departures
    if (action === 'generate') {
      const { start_date, end_date, price, capacity } = body as GenerateWeeklyDeparturesParams

      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Nedostaju datumi' }, { status: 400 })
      }

      // Call the database function
      const { data, error } = await supabase.rpc('generate_weekly_departures', {
        p_package_id: packageId,
        p_start_date: start_date,
        p_end_date: end_date,
        p_price: price || null,
        p_capacity: capacity || null,
      })

      if (error) {
        console.error('Error generating departures:', error)
        return NextResponse.json({ error: error.message || 'Greška pri generisanju polazaka' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        count: data,
        message: `Kreirano ${data} polazaka`
      })
    }

    // Add single departure
    const departure: DepartureFormData = body

    if (!departure.departure_date || !departure.return_date) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja' }, { status: 400 })
    }

    const { data: newDeparture, error: depError } = await supabase
      .from('departures')
      .insert({
        package_id: packageId,
        organization_id: userData.organization_id,
        departure_date: departure.departure_date,
        return_date: departure.return_date,
        departure_time: departure.departure_time || null,
        total_spots: pkg.package_type === 'fiksni' 
          ? (departure.total_spots || pkg.default_capacity || 40) 
          : null,
        available_spots: pkg.package_type === 'fiksni' 
          ? (departure.total_spots || pkg.default_capacity || 40) 
          : null,
        price_override: departure.price_override || null,
        original_price: departure.original_price || null,
        child_price: departure.child_price || null,
        status: 'active',
        is_visible: true,
      })
      .select()
      .single()

    if (depError) {
      console.error('Error creating departure:', depError)
      return NextResponse.json({ error: 'Greška pri kreiranju polaska' }, { status: 500 })
    }

    return NextResponse.json(newDeparture, { status: 201 })
  } catch (error) {
    console.error('Error in departures POST:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju polaska' }, { status: 500 })
  }
}
