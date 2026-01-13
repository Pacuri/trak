import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { InventoryType, AccommodationType, BoardType, TransportType } from '@/types'

interface CSVOffer {
  name: string
  description?: string
  star_rating?: number
  country: string
  city?: string
  departure_date: string
  return_date: string
  price_per_person: number
  original_price?: number
  total_spots: number
  accommodation_type?: string
  board_type?: string
  transport_type?: string
  inventory_type?: string
  image_url?: string
}

interface ImportResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

// POST /api/offers/import
// Import offers from CSV data
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    // Only admins and owners can import
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Nemate dozvolu za import' }, { status: 403 })
    }

    const body = await request.json()
    const { offers } = body as { offers: CSVOffer[] }

    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return NextResponse.json({ error: 'Nema ponuda za import' }, { status: 400 })
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    // Process each offer
    for (let i = 0; i < offers.length; i++) {
      const row = offers[i]
      const rowNumber = i + 1

      try {
        // Validate required fields
        if (!row.name || !row.country || !row.departure_date || !row.return_date || 
            !row.price_per_person || !row.total_spots) {
          result.failed++
          result.errors.push({ row: rowNumber, message: 'Nedostaju obavezna polja' })
          continue
        }

        // Validate dates
        const departureDate = new Date(row.departure_date)
        const returnDate = new Date(row.return_date)
        if (isNaN(departureDate.getTime()) || isNaN(returnDate.getTime())) {
          result.failed++
          result.errors.push({ row: rowNumber, message: 'Nevalidni datumi' })
          continue
        }

        if (returnDate <= departureDate) {
          result.failed++
          result.errors.push({ row: rowNumber, message: 'Datum povratka mora biti posle datuma polaska' })
          continue
        }

        // Normalize values
        const inventoryType = normalizeInventoryType(row.inventory_type)
        const accommodationType = normalizeAccommodationType(row.accommodation_type)
        const boardType = normalizeBoardType(row.board_type)
        const transportType = normalizeTransportType(row.transport_type)

        // Insert offer
        const { data: offer, error: insertError } = await supabase
          .from('offers')
          .insert({
            organization_id: userData.organization_id,
            name: row.name.trim(),
            description: row.description?.trim() || null,
            star_rating: row.star_rating ? Math.min(5, Math.max(1, row.star_rating)) : null,
            country: row.country.trim(),
            city: row.city?.trim() || null,
            departure_date: row.departure_date,
            return_date: row.return_date,
            price_per_person: row.price_per_person,
            original_price: row.original_price || null,
            total_spots: row.total_spots,
            available_spots: row.total_spots,
            accommodation_type: accommodationType,
            board_type: boardType,
            transport_type: transportType,
            inventory_type: inventoryType,
            status: 'active',
          })
          .select('id')
          .single()

        if (insertError) {
          result.failed++
          result.errors.push({ row: rowNumber, message: insertError.message })
          continue
        }

        // Add image if provided
        if (row.image_url && offer) {
          await supabase.from('offer_images').insert({
            offer_id: offer.id,
            url: row.image_url,
            position: 0,
            is_primary: true,
          })
        }

        result.success++
      } catch (err) {
        result.failed++
        result.errors.push({ row: rowNumber, message: 'Neočekivana greška' })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error importing offers:', error)
    return NextResponse.json({ error: 'Greška pri importu ponuda' }, { status: 500 })
  }
}

function normalizeInventoryType(value?: string): InventoryType {
  if (!value) return 'inquiry'
  const normalized = value.toLowerCase().trim()
  if (['owned', 'sopstveni', 'instant'].includes(normalized)) return 'owned'
  return 'inquiry'
}

function normalizeAccommodationType(value?: string): AccommodationType | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (['hotel'].includes(normalized)) return 'hotel'
  if (['apartment', 'apartman'].includes(normalized)) return 'apartment'
  if (['villa', 'vila'].includes(normalized)) return 'villa'
  return null
}

function normalizeBoardType(value?: string): BoardType | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (['all_inclusive', 'all inclusive', 'ai'].includes(normalized)) return 'all_inclusive'
  if (['half_board', 'half board', 'polupansion', 'hb'].includes(normalized)) return 'half_board'
  if (['breakfast', 'dorucak', 'bb'].includes(normalized)) return 'breakfast'
  if (['room_only', 'room only', 'samo nocenje', 'ro'].includes(normalized)) return 'room_only'
  return null
}

function normalizeTransportType(value?: string): TransportType | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (['flight', 'avion', 'let'].includes(normalized)) return 'flight'
  if (['bus', 'autobus'].includes(normalized)) return 'bus'
  if (['none', 'nema', 'own', 'sopstveni'].includes(normalized)) return 'none'
  return null
}
