import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ShiftFormSchema, GenerateShiftsSchema } from '@/lib/packages/validators'

// GET /api/packages/[id]/shifts - List shifts for a package
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

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching shifts:', error)
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
    }

    // Add computed available_spots
    const shiftsWithAvailable = (shifts || []).map(shift => ({
      ...shift,
      available_spots: shift.capacity - shift.booked,
    }))

    return NextResponse.json({ shifts: shiftsWithAvailable })
  } catch (error) {
    console.error('Shifts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/packages/[id]/shifts - Create or bulk update shifts
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

    // Verify package belongs to organization and is FIKSNI with GRUPNO_SMENA mode
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type, sale_mode')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (pkg.package_type !== 'fiksni') {
      return NextResponse.json({ error: 'Shifts are only for FIKSNI packages' }, { status: 400 })
    }

    const body = await request.json()
    
    // Check if this is a generate request
    if (body.generate) {
      const generateResult = GenerateShiftsSchema.safeParse(body.generate)
      if (!generateResult.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: generateResult.error.flatten() 
        }, { status: 400 })
      }

      const { start_date, end_date, duration_nights, capacity, transport_price } = generateResult.data

      // Generate shifts
      const generatedShifts = []
      let currentStart = new Date(start_date)
      const endDate = new Date(end_date)
      let shiftNumber = 1

      while (currentStart < endDate) {
        const currentEnd = new Date(currentStart)
        currentEnd.setDate(currentEnd.getDate() + duration_nights)

        if (currentEnd > endDate) break

        generatedShifts.push({
          name: `Tura ${shiftNumber}`,
          start_date: currentStart.toISOString().split('T')[0],
          end_date: currentEnd.toISOString().split('T')[0],
          capacity,
          booked: 0,
          transport_price_per_person: transport_price,
          transport_included: true,
          status: 'active' as const,
          sort_order: shiftNumber - 1,
        })

        currentStart = currentEnd
        shiftNumber++
      }

      return NextResponse.json({ generated_shifts: generatedShifts })
    }

    // Regular shifts update
    const { shifts } = body

    if (!Array.isArray(shifts)) {
      return NextResponse.json({ error: 'shifts must be an array' }, { status: 400 })
    }

    // Validate all shifts
    const validatedShifts = []
    for (const shift of shifts) {
      const result = ShiftFormSchema.safeParse(shift)
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }, { status: 400 })
      }
      validatedShifts.push(result.data)
    }

    // Get existing shifts
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('package_id', packageId)

    const existingIds = new Set(existingShifts?.map(s => s.id) || [])
    const newShiftIds = new Set(validatedShifts.filter(s => s.id).map(s => s.id))

    // Delete shifts that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newShiftIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('shifts')
        .delete()
        .in('id', toDelete)
    }

    // Upsert shifts
    const upsertedShifts = []
    for (let i = 0; i < validatedShifts.length; i++) {
      const shift = validatedShifts[i]

      const shiftPayload = {
        ...shift,
        package_id: packageId,
        organization_id: userData.organization_id,
        sort_order: i,
      }

      if (shift.id && existingIds.has(shift.id)) {
        // Update existing
        const { data, error } = await supabase
          .from('shifts')
          .update(shiftPayload)
          .eq('id', shift.id)
          .select()
          .single()

        if (error) throw error
        upsertedShifts.push(data)
      } else {
        // Insert new
        const { id: _, ...insertPayload } = shiftPayload
        const { data, error } = await supabase
          .from('shifts')
          .insert(insertPayload)
          .select()
          .single()

        if (error) throw error
        upsertedShifts.push(data)
      }
    }

    return NextResponse.json({ shifts: upsertedShifts })
  } catch (error) {
    console.error('Shifts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
