import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { PackageFormData } from '@/types/packages'

// GET /api/packages/[id]
// Get a single package with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get package with aggregated data
    const { data: pkg, error: pkgError } = await supabase
      .from('packages_with_next_departure')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'Paket nije pronađen' }, { status: 404 })
    }

    // Get departures from package_departures (mapped to Departure-like shape)
    const { data: pdRows } = await supabase
      .from('package_departures')
      .select('*')
      .eq('package_id', id)
      .eq('organization_id', userData.organization_id)
      .order('departure_date', { ascending: true })

    const basePrice = (pkg.price_from as number) || 0
    const departures = (pdRows || []).map((r: Record<string, unknown>) => {
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

    // Get images
    const { data: images } = await supabase
      .from('package_images')
      .select('*')
      .eq('package_id', id)
      .order('position', { ascending: true })

    // Get room types (for na_upit packages)
    const { data: roomTypes } = await supabase
      .from('room_types')
      .select('*')
      .eq('package_id', id)
      .order('sort_order', { ascending: true })

    // Get apartments (for fiksni packages)
    const { data: apartments } = await supabase
      .from('apartments')
      .select('*')
      .eq('package_id', id)
      .order('sort_order', { ascending: true })

    // Get price intervals with their prices
    const { data: priceIntervals } = await supabase
      .from('price_intervals')
      .select('*')
      .eq('package_id', id)
      .order('sort_order', { ascending: true })

    // Get hotel prices (for na_upit packages)
    const { data: hotelPrices } = await supabase
      .from('hotel_prices')
      .select('*')
      .eq('package_id', id)

    // Get apartment prices (for fiksni packages)
    const { data: apartmentPrices } = await supabase
      .from('apartment_prices')
      .select('*')
      .eq('package_id', id)

    // Get children policy rules
    const { data: childrenPolicies } = await supabase
      .from('children_policy_rules')
      .select('*')
      .eq('package_id', id)
      .order('priority', { ascending: false })

    // Get shifts (for fiksni GRUPNO_SMENA packages)
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('package_id', id)
      .order('start_date', { ascending: true })

    // Get transport price list if linked
    let transportPriceList = null
    if (pkg.transport_price_list_id) {
      const { data: tpl } = await supabase
        .from('transport_price_lists')
        .select('*, transport_prices(*)')
        .eq('id', pkg.transport_price_list_id)
        .single()
      transportPriceList = tpl
    }

    // Get enhanced package data (from document import)
    const { data: supplements } = await supabase
      .from('package_supplements')
      .select('*')
      .eq('package_id', id)

    const { data: fees } = await supabase
      .from('package_fees')
      .select('*')
      .eq('package_id', id)

    const { data: discounts } = await supabase
      .from('package_discounts')
      .select('*')
      .eq('package_id', id)

    const { data: packagePolicies } = await supabase
      .from('package_policies')
      .select('*')
      .eq('package_id', id)

    const { data: notes } = await supabase
      .from('package_notes')
      .select('*')
      .eq('package_id', id)

    return NextResponse.json({
      ...pkg,
      departures: departures || [],
      images: images || [],
      room_types: roomTypes || [],
      apartments: apartments || [],
      price_intervals: priceIntervals || [],
      hotel_prices: hotelPrices || [],
      apartment_prices: apartmentPrices || [],
      children_policies: childrenPolicies || [],
      shifts: shifts || [],
      transport_price_list: transportPriceList,
      supplements: supplements || [],
      fees: fees || [],
      discounts: discounts || [],
      package_policies: packagePolicies || [],
      notes: notes || [],
    })
  } catch (error) {
    console.error('Error in package GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju paketa' }, { status: 500 })
  }
}

// PUT /api/packages/[id]
// Update a package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body: Partial<PackageFormData> = await request.json()

    // Update package
    const { error: pkgError } = await supabase
      .from('packages')
      .update({
        name: body.name,
        description: body.description,
        destination_country: body.destination_country,
        destination_city: body.destination_city,
        hotel_name: body.hotel_name,
        hotel_stars: body.hotel_stars,
        package_type: body.package_type,
        board_type: body.board_type,
        transport_type: body.transport_type,
        departure_location: body.departure_location,
        rental_period_start: body.rental_period_start,
        rental_period_end: body.rental_period_end,
        departure_pattern: body.departure_pattern,
        departure_day: body.departure_day,
        default_duration: body.default_duration,
        default_capacity: body.default_capacity,
        price_from: body.price_from,
        is_featured: body.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (pkgError) {
      console.error('Error updating package:', pkgError)
      return NextResponse.json({ error: 'Greška pri ažuriranju paketa' }, { status: 500 })
    }

    // Handle departures if provided
    if (body.departures) {
      for (const dep of body.departures) {
        if (dep.id) {
          // Update existing departure
          await supabase
            .from('departures')
            .update({
              departure_date: dep.departure_date,
              return_date: dep.return_date,
              departure_time: dep.departure_time,
              price_override: dep.price_override,
              original_price: dep.original_price,
              child_price: dep.child_price,
              total_spots: dep.total_spots,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dep.id)
        } else {
          // Insert new departure
          await supabase
            .from('departures')
            .insert({
              package_id: id,
              organization_id: userData.organization_id,
              departure_date: dep.departure_date,
              return_date: dep.return_date,
              departure_time: dep.departure_time || null,
              total_spots: body.package_type === 'fiksni' ? (dep.total_spots || body.default_capacity || 40) : null,
              available_spots: body.package_type === 'fiksni' ? (dep.total_spots || body.default_capacity || 40) : null,
              price_override: dep.price_override || null,
              original_price: dep.original_price || null,
              child_price: dep.child_price || null,
              status: 'active',
              is_visible: true,
            })
        }
      }
    }

    // Handle images if provided
    if (body.images) {
      // Delete existing images
      await supabase
        .from('package_images')
        .delete()
        .eq('package_id', id)

      // Insert new images
      if (body.images.length > 0) {
        const imageInserts = body.images.map((url, index) => ({
          package_id: id,
          url,
          position: index,
          is_primary: index === 0,
        }))

        await supabase.from('package_images').insert(imageInserts)
      }
    }

    // Fetch updated package
    const { data: updatedPkg } = await supabase
      .from('packages_with_next_departure')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json(updatedPkg)
  } catch (error) {
    console.error('Error in package PUT:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju paketa' }, { status: 500 })
  }
}

// DELETE /api/packages/[id]
// Soft delete (archive) a package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Soft delete (archive)
    const { error } = await supabase
      .from('packages')
      .update({ 
        status: 'archived', 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      console.error('Error archiving package:', error)
      return NextResponse.json({ error: 'Greška pri arhiviranju paketa' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in package DELETE:', error)
    return NextResponse.json({ error: 'Greška pri arhiviranju paketa' }, { status: 500 })
  }
}
