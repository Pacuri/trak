import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RoomTypeFormSchema } from '@/lib/packages/validators'

// GET /api/packages/[id]/room-types - List room types for a package
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

    // Get room types with their prices
    const { data: roomTypes, error } = await supabase
      .from('room_types')
      .select(`
        *,
        hotel_prices (
          id,
          interval_id,
          price_nd,
          price_bb,
          price_hb,
          price_fb,
          price_ai
        )
      `)
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching room types:', error)
      return NextResponse.json({ error: 'Failed to fetch room types' }, { status: 500 })
    }

    return NextResponse.json({ room_types: roomTypes || [] })
  } catch (error) {
    console.error('Room types GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/packages/[id]/room-types - Create or bulk update room types
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

    // Verify package belongs to organization and is NA_UPIT type
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (pkg.package_type !== 'na_upit') {
      return NextResponse.json({ error: 'Room types are only for NA_UPIT packages' }, { status: 400 })
    }

    const body = await request.json()
    const { room_types } = body

    if (!Array.isArray(room_types)) {
      return NextResponse.json({ error: 'room_types must be an array' }, { status: 400 })
    }

    // Validate all room types
    const validatedRoomTypes = []
    for (const rt of room_types) {
      const result = RoomTypeFormSchema.safeParse(rt)
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }, { status: 400 })
      }
      validatedRoomTypes.push(result.data)
    }

    // Get existing room types
    const { data: existingRoomTypes } = await supabase
      .from('room_types')
      .select('id')
      .eq('package_id', packageId)

    const existingIds = new Set(existingRoomTypes?.map(rt => rt.id) || [])
    const newRoomTypeIds = new Set(validatedRoomTypes.filter(rt => rt.id).map(rt => rt.id))

    // Delete room types that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newRoomTypeIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('room_types')
        .delete()
        .in('id', toDelete)
    }

    // Upsert room types
    const upsertedRoomTypes = []
    for (let i = 0; i < validatedRoomTypes.length; i++) {
      const rt = validatedRoomTypes[i]

      const roomTypePayload = {
        ...rt,
        package_id: packageId,
        organization_id: userData.organization_id,
        sort_order: i,
      }

      if (rt.id && existingIds.has(rt.id)) {
        // Update existing
        const { data, error } = await supabase
          .from('room_types')
          .update(roomTypePayload)
          .eq('id', rt.id)
          .select()
          .single()

        if (error) throw error
        upsertedRoomTypes.push(data)
      } else {
        // Insert new
        const { id: _, ...insertPayload } = roomTypePayload
        const { data, error } = await supabase
          .from('room_types')
          .insert(insertPayload)
          .select()
          .single()

        if (error) throw error
        upsertedRoomTypes.push(data)
      }
    }

    return NextResponse.json({ room_types: upsertedRoomTypes })
  } catch (error) {
    console.error('Room types POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
