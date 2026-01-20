import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TransportPriceList } from '@/types/import'

/**
 * GET /api/transport-price-lists
 * List all transport price lists for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 })
    }

    // Fetch lists with prices
    const { data: lists, error } = await supabase
      .from('transport_price_lists')
      .select(`
        *,
        prices:transport_prices(*)
      `)
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transport lists:', error)
      return NextResponse.json({ error: 'Failed to fetch transport lists' }, { status: 500 })
    }

    return NextResponse.json({ lists: lists as TransportPriceList[] })

  } catch (error) {
    console.error('Error in transport-price-lists GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/transport-price-lists
 * Create a new transport price list
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, supplier_name, transport_type, valid_from, valid_to, prices } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create the list
    const { data: list, error: listError } = await supabase
      .from('transport_price_lists')
      .insert({
        organization_id: userData.organization_id,
        name,
        supplier_name,
        transport_type,
        valid_from,
        valid_to,
      })
      .select()
      .single()

    if (listError || !list) {
      console.error('Error creating transport list:', listError)
      return NextResponse.json({ error: 'Failed to create transport list' }, { status: 500 })
    }

    // Create prices if provided
    if (prices && Array.isArray(prices) && prices.length > 0) {
      const priceRecords = prices.map((p: any, index: number) => ({
        price_list_id: list.id,
        organization_id: userData.organization_id,
        departure_city: p.city,
        departure_location: p.location,
        price_per_person: p.price,
        child_price: p.child_price,
        sort_order: index,
      }))

      const { error: pricesError } = await supabase
        .from('transport_prices')
        .insert(priceRecords)

      if (pricesError) {
        console.error('Error creating transport prices:', pricesError)
        // Don't fail the whole request, just log the error
      }
    }

    // Fetch the complete list with prices
    const { data: completeList } = await supabase
      .from('transport_price_lists')
      .select(`
        *,
        prices:transport_prices(*)
      `)
      .eq('id', list.id)
      .single()

    return NextResponse.json({ 
      success: true, 
      list: completeList as TransportPriceList 
    })

  } catch (error) {
    console.error('Error in transport-price-lists POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
