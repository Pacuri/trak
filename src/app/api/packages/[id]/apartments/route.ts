import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApartmentFormSchema } from '@/lib/packages/validators'

// GET /api/packages/[id]/apartments - List apartments for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization
    const { data: pkg } = await supabase
      .from('packages')
      .select('id')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Get apartments with their prices
    const { data: apartments, error } = await supabase
      .from('apartments')
      .select(`
        *,
        apartment_prices (
          id,
          interval_id,
          price_per_night
        )
      `)
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching apartments:', error)
      return NextResponse.json({ error: 'Failed to fetch apartments' }, { status: 500 })
    }

    return NextResponse.json({ apartments: apartments || [] })
  } catch (error) {
    console.error('Apartments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/packages/[id]/apartments - Create or bulk update apartments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization and is FIKSNI type
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (pkg.package_type !== 'fiksni') {
      return NextResponse.json({ error: 'Apartments are only for FIKSNI packages' }, { status: 400 })
    }

    const body = await request.json()
    const { apartments } = body

    if (!Array.isArray(apartments)) {
      return NextResponse.json({ error: 'apartments must be an array' }, { status: 400 })
    }

    // Validate all apartments
    const validatedApartments = []
    for (const apt of apartments) {
      const result = ApartmentFormSchema.safeParse(apt)
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }, { status: 400 })
      }
      validatedApartments.push(result.data)
    }

    // Get existing apartments
    const { data: existingApartments } = await supabase
      .from('apartments')
      .select('id')
      .eq('package_id', packageId)

    const existingIds = new Set(existingApartments?.map(a => a.id) || [])
    const newApartmentIds = new Set(validatedApartments.filter(a => a.id).map(a => a.id))

    // Delete apartments that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newApartmentIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('apartments')
        .delete()
        .in('id', toDelete)
    }

    // Upsert apartments
    const upsertedApartments = []
    for (let i = 0; i < validatedApartments.length; i++) {
      const apt = validatedApartments[i]
      const { prices, ...apartmentData } = apt

      const apartmentPayload = {
        ...apartmentData,
        package_id: packageId,
        organization_id: userData.organization_id,
        sort_order: i,
      }

      let apartmentId: string

      if (apt.id && existingIds.has(apt.id)) {
        // Update existing
        const { data, error } = await supabase
          .from('apartments')
          .update(apartmentPayload)
          .eq('id', apt.id)
          .select()
          .single()

        if (error) throw error
        apartmentId = data.id
        upsertedApartments.push(data)
      } else {
        // Insert new
        const { id: _, ...insertPayload } = apartmentPayload
        const { data, error } = await supabase
          .from('apartments')
          .insert(insertPayload)
          .select()
          .single()

        if (error) throw error
        apartmentId = data.id
        upsertedApartments.push(data)
      }

      // Handle prices if provided
      if (prices && Object.keys(prices).length > 0) {
        // Delete existing prices for this apartment
        await supabase
          .from('apartment_prices')
          .delete()
          .eq('apartment_id', apartmentId)

        // Insert new prices
        const priceRecords = Object.entries(prices).map(([intervalId, pricePerNight]) => ({
          apartment_id: apartmentId,
          interval_id: intervalId,
          organization_id: userData.organization_id,
          price_per_night: pricePerNight,
        }))

        if (priceRecords.length > 0) {
          await supabase
            .from('apartment_prices')
            .insert(priceRecords)
        }
      }
    }

    return NextResponse.json({ apartments: upsertedApartments })
  } catch (error) {
    console.error('Apartments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
