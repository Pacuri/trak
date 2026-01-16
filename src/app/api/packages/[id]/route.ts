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

    // Get departures
    const { data: departures } = await supabase
      .from('departures')
      .select('*')
      .eq('package_id', id)
      .order('departure_date', { ascending: true })

    // Get images
    const { data: images } = await supabase
      .from('package_images')
      .select('*')
      .eq('package_id', id)
      .order('position', { ascending: true })

    return NextResponse.json({
      ...pkg,
      departures: departures || [],
      images: images || [],
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
