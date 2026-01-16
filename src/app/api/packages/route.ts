import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Package, PackageFormData, PackageFilters } from '@/types/packages'

// GET /api/packages
// List packages for the authenticated user's organization
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
    const packageType = searchParams.get('package_type') as PackageFilters['package_type']
    const status = searchParams.get('status') as PackageFilters['status']
    const search = searchParams.get('search')
    const isFeatured = searchParams.get('is_featured')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query using the view for aggregated data
    let query = supabase
      .from('packages_with_next_departure')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (packageType) {
      query = query.eq('package_type', packageType)
    }

    if (status) {
      query = query.eq('status', status)
    } else {
      // Default: exclude archived
      query = query.neq('status', 'archived')
    }

    if (isFeatured === 'true') {
      query = query.eq('is_featured', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,destination_country.ilike.%${search}%,destination_city.ilike.%${search}%,hotel_name.ilike.%${search}%`)
    }

    const { data: packages, error, count } = await query

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju paketa' }, { status: 500 })
    }

    // Fetch images for all packages
    const packageIds = packages?.map(p => p.id) || []
    let imagesMap: Record<string, any[]> = {}
    
    if (packageIds.length > 0) {
      const { data: images } = await supabase
        .from('package_images')
        .select('*')
        .in('package_id', packageIds)
        .order('position', { ascending: true })
      
      if (images) {
        imagesMap = images.reduce((acc, img) => {
          if (!acc[img.package_id]) acc[img.package_id] = []
          acc[img.package_id].push(img)
          return acc
        }, {} as Record<string, any[]>)
      }
    }

    // Attach images to packages
    const packagesWithImages = packages?.map(pkg => ({
      ...pkg,
      images: imagesMap[pkg.id] || [],
    })) || []

    return NextResponse.json({
      packages: packagesWithImages,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in packages GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju paketa' }, { status: 500 })
  }
}

// POST /api/packages
// Create a new package with departures and images
export async function POST(request: NextRequest) {
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

    const body: PackageFormData = await request.json()

    // Validate required fields
    if (!body.name || !body.destination_country || !body.package_type) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja' }, { status: 400 })
    }

    // Create package
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .insert({
        organization_id: userData.organization_id,
        name: body.name,
        description: body.description || null,
        destination_country: body.destination_country,
        destination_city: body.destination_city || null,
        hotel_name: body.hotel_name || null,
        hotel_stars: body.hotel_stars || null,
        package_type: body.package_type,
        board_type: body.board_type || null,
        transport_type: body.transport_type || null,
        departure_location: body.departure_location || null,
        rental_period_start: body.rental_period_start || null,
        rental_period_end: body.rental_period_end || null,
        departure_pattern: body.departure_pattern || null,
        departure_day: body.departure_day ?? null,
        default_duration: body.default_duration || null,
        default_capacity: body.default_capacity || null,
        price_from: body.price_from || null,
        is_featured: body.is_featured || false,
        is_active: true,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()

    if (pkgError) {
      console.error('Error creating package:', pkgError)
      return NextResponse.json({ error: 'Greška pri kreiranju paketa' }, { status: 500 })
    }

    // Add departures if provided
    if (body.departures && body.departures.length > 0) {
      const departureInserts = body.departures.map(d => ({
        package_id: pkg.id,
        organization_id: userData.organization_id,
        departure_date: d.departure_date,
        return_date: d.return_date,
        departure_time: d.departure_time || null,
        total_spots: body.package_type === 'fiksni' ? (d.total_spots || body.default_capacity || 40) : null,
        available_spots: body.package_type === 'fiksni' ? (d.total_spots || body.default_capacity || 40) : null,
        price_override: d.price_override || null,
        original_price: d.original_price || null,
        child_price: d.child_price || null,
        status: 'active',
        is_visible: true,
      }))

      const { error: depError } = await supabase
        .from('departures')
        .insert(departureInserts)

      if (depError) {
        // Rollback: delete package
        await supabase.from('packages').delete().eq('id', pkg.id)
        console.error('Error creating departures:', depError)
        return NextResponse.json({ error: 'Greška pri kreiranju polazaka' }, { status: 500 })
      }
    }

    // Add images if provided
    if (body.images && body.images.length > 0) {
      const imageInserts = body.images.map((url, index) => ({
        package_id: pkg.id,
        url,
        position: index,
        is_primary: index === 0,
      }))

      await supabase.from('package_images').insert(imageInserts)
    }

    // Fetch complete package with relations
    const { data: completePackage } = await supabase
      .from('packages_with_next_departure')
      .select('*')
      .eq('id', pkg.id)
      .single()

    return NextResponse.json(completePackage, { status: 201 })
  } catch (error) {
    console.error('Error in packages POST:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju paketa' }, { status: 500 })
  }
}
