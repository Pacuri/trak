import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { PackageDepartureFormData } from '@/types/packages'

// GET /api/packages/[id]/departures
// List package_departures for a package (mapped to Departure-like shape for DeparturesTable)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

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
      .from('package_departures')
      .select('*')
      .eq('package_id', packageId)
      .eq('organization_id', userData.organization_id)
      .order('departure_date', { ascending: true })

    if (status) query = query.eq('status', status)
    if (fromDate) query = query.gte('departure_date', fromDate)
    if (toDate) query = query.lte('departure_date', toDate)

    const { data: rows, error } = await query

    if (error) {
      console.error('Error fetching package_departures:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju polazaka' }, { status: 500 })
    }

    // Get package price_from for effective_price
    const { data: pkg } = await supabase
      .from('packages')
      .select('price_from')
      .eq('id', packageId)
      .single()

    const basePrice = (pkg?.price_from as number) || 0

    const departures = (rows || []).map((r: Record<string, unknown>) => {
      let effective = basePrice
      const adjPct = r.price_adjustment_percent as number | null
      const adjType = r.price_adjustment_type as string | null
      if (adjPct != null && adjType) {
        if (adjType === 'increase') effective = basePrice * (1 + adjPct / 100)
        else if (adjType === 'decrease') effective = basePrice * (1 - adjPct / 100)
      }

      return {
        ...r,
        total_spots: (r.available_slots as number) + (r.booked_slots as number || 0),
        available_spots: r.available_slots,
        effective_price: effective,
        is_visible: true,
      }
    })

    return NextResponse.json({ departures })
  } catch (err) {
    console.error('Error in departures GET:', err)
    return NextResponse.json({ error: 'Greška pri učitavanju polazaka' }, { status: 500 })
  }
}

// POST /api/packages/[id]/departures
// Create a single package_departure (from DepartureModal) or bulk generate (?action=generate)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('id, default_duration, default_capacity, departure_location')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'Paket nije pronađen' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const action = request.nextUrl.searchParams.get('action')

    // ----- Bulk generate: date range + days of week
    if (action === 'generate') {
      const {
        start_date,
        end_date,
        days_of_week = [],
        capacity = (pkg.default_capacity as number) || 40,
        duration_nights = (pkg.default_duration as number) || 7,
      } = body as {
        start_date?: string
        end_date?: string
        days_of_week?: number[]
        capacity?: number
        duration_nights?: number
      }

      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Nedostaju datumi (od - do)' }, { status: 400 })
      }

      const start = new Date(start_date)
      const end = new Date(end_date)
      if (end < start) {
        return NextResponse.json({ error: 'Datum povratka mora biti poslije datuma polaska' }, { status: 400 })
      }

      const dowSet = new Set(days_of_week)
      const toInsert: Record<string, unknown>[] = []
      const cur = new Date(start)

      while (cur <= end) {
        const dow = cur.getDay()
        if (dowSet.size === 0 || dowSet.has(dow)) {
          const depDate = cur.toISOString().split('T')[0]
          const retDate = new Date(cur)
          retDate.setDate(retDate.getDate() + (duration_nights || 7))
          toInsert.push({
            package_id: packageId,
            organization_id: userData.organization_id,
            departure_date: depDate,
            return_date: retDate.toISOString().split('T')[0],
            duration_nights: duration_nights || 7,
            status: 'scheduled',
            available_slots: capacity || 40,
            booked_slots: 0,
            created_by: user.id,
          })
        }
        cur.setDate(cur.getDate() + 1)
      }

      if (toInsert.length === 0) {
        return NextResponse.json({ error: 'Nijedan datum ne odgovara odabranim danima u tjednu' }, { status: 400 })
      }

      const { data: inserted, error: insErr } = await supabase
        .from('package_departures')
        .insert(toInsert)
        .select('id')

      if (insErr) {
        console.error('Error generating package_departures:', insErr)
        return NextResponse.json({ error: insErr.message || 'Greška pri generisanju polazaka' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        count: inserted?.length ?? toInsert.length,
        message: `Kreirano ${inserted?.length ?? toInsert.length} polazaka`,
      })
    }

    // ----- Single create from DepartureModal
    const d = body as PackageDepartureFormData
    if (!d.departure_date || !d.return_date || (d.available_slots ?? 0) <= 0) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja: datum polaska, datum povratka, broj mesta' }, { status: 400 })
    }

    const duration = d.duration_nights ?? Math.round(
      (new Date(d.return_date).getTime() - new Date(d.departure_date).getTime()) / (24 * 60 * 60 * 1000)
    )

    const { data: newRow, error: insError } = await supabase
      .from('package_departures')
      .insert({
        package_id: packageId,
        organization_id: userData.organization_id,
        departure_date: d.departure_date,
        return_date: d.return_date,
        duration_nights: duration,
        status: d.status ?? 'scheduled',
        available_slots: d.available_slots,
        booked_slots: 0,
        min_travelers: d.min_travelers ?? null,
        booking_deadline: d.booking_deadline ?? null,
        departure_time: d.departure_time ?? null,
        departure_point: d.departure_point ?? null,
        return_time: d.return_time ?? null,
        transport_notes: d.transport_notes ?? null,
        price_adjustment_percent: d.price_adjustment_percent ?? null,
        price_adjustment_type: d.price_adjustment_type ?? null,
        internal_notes: d.internal_notes ?? null,
        supplier_confirmation: d.supplier_confirmation ?? null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insError) {
      console.error('Error creating package_departure:', insError)
      return NextResponse.json({ error: 'Greška pri kreiranju polaska' }, { status: 500 })
    }

    return NextResponse.json(newRow, { status: 201 })
  } catch (err) {
    console.error('Error in departures POST:', err)
    return NextResponse.json({ error: 'Greška pri kreiranju polaska' }, { status: 500 })
  }
}
