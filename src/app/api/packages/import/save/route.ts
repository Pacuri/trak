import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { 
  SaveImportedPackagesRequest, 
  ImportPackageFormData,
  ImportTransportFormData,
  Currency,
  ParsedSupplement,
  ParsedMandatoryFee,
  ParsedDiscount,
  ParsedPolicies,
  ParsedImportantNote,
  ParsedRoomDetail,
} from '@/types/import'
import { EXCHANGE_RATES, convertToEur } from '@/types/import'

/**
 * POST /api/packages/import/save
 * Save imported packages to the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 })
    }

    const organizationId = userData.organization_id

    // Parse request body
    const body: SaveImportedPackagesRequest = await request.json()
    const { 
      import_id, 
      packages, 
      transport, 
      business_model, 
      margin_percent, 
      currency,
      // Enhanced fields
      supplements,
      mandatory_fees,
      discounts,
      policies,
      included_services,
      important_notes,
      tax_disclaimer,
    } = body
    
    // Default to EUR if not provided
    const documentCurrency = currency || 'EUR'

    // Filter only selected packages
    const selectedPackages = packages.filter(p => p.selected)
    if (selectedPackages.length === 0) {
      return NextResponse.json({ error: 'No packages selected' }, { status: 400 })
    }

    const createdPackages: string[] = []
    const errors: string[] = []
    let transportPriceListId: string | undefined

    // Create transport price list if provided
    if (transport && transport.prices.length > 0) {
      try {
        const { data: transportList, error: transportError } = await supabase
          .from('transport_price_lists')
          .insert({
            organization_id: organizationId,
            name: transport.name,
            supplier_name: transport.supplier_name,
            transport_type: transport.transport_type,
          })
          .select()
          .single()

        if (transportError) throw transportError

        transportPriceListId = transportList.id

        // Insert transport prices
        const transportPrices = transport.prices.map((p, index) => ({
          price_list_id: transportList.id,
          organization_id: organizationId,
          departure_city: p.city,
          departure_location: p.location,
          price_per_person: p.price,
          child_price: p.child_price,
          sort_order: index,
        }))

        await supabase
          .from('transport_prices')
          .insert(transportPrices)

      } catch (err) {
        console.error('Error creating transport price list:', err)
        errors.push('Failed to create transport price list')
      }
    }

    // Create each selected package
    for (const pkg of selectedPackages) {
      try {
        const packageId = await createPackageFromImport(
          supabase,
          organizationId,
          user.id,
          pkg,
          business_model,
          margin_percent,
          transportPriceListId,
          documentCurrency,
          included_services,
          tax_disclaimer
        )
        createdPackages.push(packageId)
        
        // Save enhanced data for each package
        await saveEnhancedPackageData(
          supabase,
          organizationId,
          packageId,
          pkg,
          supplements,
          mandatory_fees,
          discounts,
          policies,
          important_notes
        )
      } catch (err) {
        console.error('Error creating package:', err)
        errors.push(`Failed to create package: ${pkg.hotel_name}`)
      }
    }

    // Update import record
    if (import_id) {
      await supabase
        .from('document_imports')
        .update({ packages_imported: createdPackages.length })
        .eq('id', import_id)
    }

    return NextResponse.json({
      success: errors.length === 0,
      created_packages: createdPackages,
      transport_price_list_id: transportPriceListId,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Error saving imported packages:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * Create a single package from imported data
 */
async function createPackageFromImport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  userId: string,
  pkg: ImportPackageFormData,
  businessModel: string,
  marginPercent: number | undefined,
  transportPriceListId: string | undefined,
  currency: string,
  includedServices?: string[],
  taxDisclaimer?: string
): Promise<string> {
  // Determine available meal plans from price matrix
  const mealPlans = new Set<string>()
  if (pkg.price_matrix && typeof pkg.price_matrix === 'object') {
    for (const rooms of Object.values(pkg.price_matrix)) {
      if (rooms && typeof rooms === 'object') {
        for (const meals of Object.values(rooms)) {
          if (meals && typeof meals === 'object') {
            for (const mealPlan of Object.keys(meals)) {
              mealPlans.add(mealPlan)
            }
          }
        }
      }
    }
  }

  // Get exchange rate for currency conversion
  const exchangeRate = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1

  // Create package with enhanced fields
  // Use generated description as the package description, with fallback to extracted
  const packageDescription = pkg.generated_description || pkg.hotel_description || null

  // Build package data
  // Note: hotel_amenities, distance_from_beach, distance_from_center require migration 022
  // These fields are commented out until the migration is applied
  const packageData: Record<string, unknown> = {
    organization_id: organizationId,
    package_type: 'na_upit', // Imported packages are typically hotel packages
    name: pkg.hotel_name,
    description: packageDescription, // Use AI-generated or extracted description
    destination_country: pkg.destination_country,
    destination_city: pkg.destination_city,
    hotel_name: pkg.hotel_name,
    hotel_stars: pkg.stars,
    meal_plans: Array.from(mealPlans),
    original_currency: currency,
    exchange_rate: exchangeRate,
    prices_are_net: businessModel === 'vlastita_marza',
    margin_percent: marginPercent,
    transport_price_list_id: transportPriceListId,
    status: 'active',
    is_active: true,
    is_published: false,
    created_by: userId,
    // Enhanced fields
    price_type: pkg.price_type || 'per_person_per_stay',
    base_occupancy: pkg.base_occupancy || 2,
    occupancy_pricing: pkg.occupancy_pricing || null,
    included_services: includedServices || null,
    // Single occupancy surcharge (from occupancy_pricing)
    single_surcharge_percent: pkg.occupancy_pricing?.single_supplement_percent || null,
    // Tax disclaimer text
    tax_disclaimer: taxDisclaimer || null,
    // Hotel info fields (requires migration 022_package_hotel_description.sql)
    hotel_amenities: pkg.hotel_amenities || null,
    distance_from_beach: pkg.distance_from_beach || null,
    distance_from_center: pkg.distance_from_center || null,
  }

  const { data: newPackage, error: packageError } = await supabase
    .from('packages')
    .insert(packageData)
    .select()
    .single()

  if (packageError || !newPackage) {
    console.error('Package creation error:', packageError)
    console.error('Package data attempted:', JSON.stringify(packageData, null, 2))
    throw new Error(`Failed to create package: ${packageError?.message || 'Unknown error'} - ${packageError?.code || ''} - ${packageError?.details || ''}`)
  }

  // Create room types with enhanced details from room_details
  const roomTypeMap: Record<string, string> = {} // code -> id
  const roomTypes = pkg.room_types || []
  const roomDetailsMap = new Map(
    (pkg.room_details || []).map(rd => [rd.room_type_code, rd])
  )

  for (let i = 0; i < roomTypes.length; i++) {
    const rt = roomTypes[i]
    // Get enhanced details for this room type
    const details = roomDetailsMap.get(rt.code)

    const { data: roomType, error: rtError } = await supabase
      .from('room_types')
      .insert({
        package_id: newPackage.id,
        organization_id: organizationId,
        code: rt.code,
        name: rt.name,
        max_persons: details?.max_occupancy || rt.max_persons,
        description: details?.description || rt.description,
        sort_order: i,
        // Enhanced fields from room_details
        min_adults: details?.min_adults || null,
        min_occupancy: details?.min_adults || null, // Use min_adults as min_occupancy if not separate
        warnings: details?.warnings || null,
        distance_from_beach: details?.distance_from_beach || null,
        size_sqm: details?.size_sqm || null,
      })
      .select()
      .single()

    if (rtError || !roomType) {
      console.error('Error creating room type:', rtError)
      continue
    }
    roomTypeMap[rt.code] = roomType.id
  }

  // Create price intervals
  const intervalMap: Record<string, string> = {} // name -> id
  const priceIntervals = pkg.price_intervals || []
  for (let i = 0; i < priceIntervals.length; i++) {
    const interval = priceIntervals[i]
    const { data: priceInterval, error: piError } = await supabase
      .from('price_intervals')
      .insert({
        package_id: newPackage.id,
        organization_id: organizationId,
        name: interval.name,
        start_date: interval.start_date,
        end_date: interval.end_date,
        sort_order: i,
      })
      .select()
      .single()

    if (piError || !priceInterval) {
      console.error('Error creating price interval:', piError)
      continue
    }
    intervalMap[interval.name] = priceInterval.id
  }

  // Create hotel prices from price matrix
  // Store both original currency prices and EUR-converted prices
  const hotelPrices: Array<{
    package_id: string
    interval_id: string
    room_type_id: string
    organization_id: string
    price_nd?: number
    price_bb?: number
    price_hb?: number
    price_fb?: number
    price_ai?: number
    original_price_nd?: number
    original_price_bb?: number
    original_price_hb?: number
    original_price_fb?: number
    original_price_ai?: number
  }> = []

  for (const [intervalName, rooms] of Object.entries(pkg.price_matrix)) {
    const intervalId = intervalMap[intervalName]
    if (!intervalId) continue

    for (const [roomCode, meals] of Object.entries(rooms)) {
      const roomTypeId = roomTypeMap[roomCode]
      if (!roomTypeId) continue

      // Store original prices as-is, convert to EUR for main price fields
      const convertPrice = (price: number | undefined) => 
        price !== undefined ? convertToEur(price, currency as Currency) : undefined

      hotelPrices.push({
        package_id: newPackage.id,
        interval_id: intervalId,
        room_type_id: roomTypeId,
        organization_id: organizationId,
        // Main prices in EUR (for display and calculations)
        price_nd: convertPrice(meals['ND']),
        price_bb: convertPrice(meals['BB']),
        price_hb: convertPrice(meals['HB']),
        price_fb: convertPrice(meals['FB']),
        price_ai: convertPrice(meals['AI']),
        // Original prices in document currency (for reference)
        original_price_nd: meals['ND'],
        original_price_bb: meals['BB'],
        original_price_hb: meals['HB'],
        original_price_fb: meals['FB'],
        original_price_ai: meals['AI'],
      })
    }
  }

  if (hotelPrices.length > 0) {
    await supabase.from('hotel_prices').insert(hotelPrices)
  }

  // Create children policy rules
  const childrenPolicies = pkg.children_policies || []
  if (childrenPolicies.length > 0) {
    const policyRules = childrenPolicies.map((policy, i) => ({
      package_id: newPackage.id,
      organization_id: organizationId,
      rule_name: policy.rule_name,
      priority: childrenPolicies.length - i, // Higher index = lower priority
      min_adults: policy.min_adults,
      max_adults: policy.max_adults,
      child_position: policy.child_position,
      room_type_codes: policy.room_type_codes,
      bed_type: policy.bed_type,
      age_from: policy.age_from,
      age_to: policy.age_to,
      discount_type: policy.discount_type,
      discount_value: policy.discount_value,
      source_text: policy.source_text,
    }))

    await supabase.from('children_policy_rules').insert(policyRules)
  }

  // Create room details if provided
  if (pkg.room_details && pkg.room_details.length > 0) {
    const roomDetails = pkg.room_details.map((rd) => ({
      package_id: newPackage.id,
      organization_id: organizationId,
      room_type_code: rd.room_type_code,
      description: rd.description,
      size_sqm: rd.size_sqm,
      distance_from_beach: rd.distance_from_beach,
      bed_config: rd.bed_config,
      view: rd.view,
      max_occupancy: rd.max_occupancy,
      max_adults: rd.max_adults,
      max_children: rd.max_children,
      min_adults: rd.min_adults,
      amenities: rd.amenities,
      warnings: rd.warnings,
      source_text: rd.source_text,
    }))

    await supabase.from('package_room_details').insert(roomDetails)
  }

  // Set valid_from / valid_to from price_intervals (for na upit date availability)
  if (priceIntervals.length > 0) {
    const validFrom = priceIntervals.reduce((min, i) => {
      const d = i.start_date
      return !d ? min : !min || d < min ? d : min
    }, null as string | null)
    const validTo = priceIntervals.reduce((max, i) => {
      const d = i.end_date
      return !d ? max : !max || d > max ? d : max
    }, null as string | null)
    if (validFrom && validTo) {
      await supabase
        .from('packages')
        .update({ valid_from: validFrom, valid_to: validTo })
        .eq('id', newPackage.id)
    }
  }

  return newPackage.id
}

/**
 * Save enhanced package data (supplements, fees, discounts, policies, notes)
 */
async function saveEnhancedPackageData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  packageId: string,
  pkg: ImportPackageFormData,
  supplements?: ParsedSupplement[],
  mandatoryFees?: ParsedMandatoryFee[],
  discounts?: ParsedDiscount[],
  policies?: ParsedPolicies,
  importantNotes?: ParsedImportantNote[]
): Promise<void> {
  // Save supplements
  if (supplements && supplements.length > 0) {
    const supplementsData = supplements.map(s => ({
      package_id: packageId,
      organization_id: organizationId,
      code: s.code,
      name: s.name,
      amount: s.amount,
      percent: s.percent,
      per: s.per,
      currency: s.currency || 'EUR',
      mandatory: s.mandatory,
      conditions: s.conditions,
      source_text: s.source_text,
    }))
    
    const { error } = await supabase.from('package_supplements').insert(supplementsData)
    if (error) console.error('Error saving supplements:', error)
  }

  // Save mandatory fees
  if (mandatoryFees && mandatoryFees.length > 0) {
    const feesData = mandatoryFees.map(f => ({
      package_id: packageId,
      organization_id: organizationId,
      code: f.code,
      name: f.name,
      rules: f.rules,
      currency: f.currency || 'BAM',
      per: f.per,
      source_text: f.source_text,
    }))
    
    const { error } = await supabase.from('package_fees').insert(feesData)
    if (error) console.error('Error saving fees:', error)
  }

  // Save discounts
  if (discounts && discounts.length > 0) {
    const discountsData = discounts.map(d => ({
      package_id: packageId,
      organization_id: organizationId,
      code: d.code,
      name: d.name,
      percent: d.percent,
      fixed_amount: d.fixed_amount,
      conditions: d.conditions,
      valid_from: d.valid_from,
      valid_to: d.valid_to,
      source_text: d.source_text,
    }))
    
    const { error } = await supabase.from('package_discounts').insert(discountsData)
    if (error) console.error('Error saving discounts:', error)
  }

  // Save policies
  if (policies) {
    const policyInserts: Array<Record<string, unknown>> = []

    if (policies.deposit) {
      policyInserts.push({
        package_id: packageId,
        organization_id: organizationId,
        policy_type: 'deposit',
        deposit_percent: policies.deposit.percent,
        deposit_due: policies.deposit.due,
        balance_due_days_before: policies.deposit.balance_due_days_before,
        source_text: policies.deposit.source_text,
      })
    }

    if (policies.cancellation) {
      policyInserts.push({
        package_id: packageId,
        organization_id: organizationId,
        policy_type: 'cancellation',
        cancellation_rules: policies.cancellation.rules,
        source_text: policies.cancellation.source_text,
      })
    }

    if (policies.restrictions) {
      policyInserts.push({
        package_id: packageId,
        organization_id: organizationId,
        policy_type: 'restriction',
        min_stay: policies.restrictions.min_stay,
        max_stay: policies.restrictions.max_stay,
        check_in_days: policies.restrictions.check_in_days,
        min_adults: policies.restrictions.min_adults,
        min_advance_booking_days: policies.restrictions.min_advance_booking_days,
        documents_required: policies.restrictions.documents_required,
        source_text: policies.restrictions.source_text,
      })
    }

    if (policies.payment_options) {
      policyInserts.push({
        package_id: packageId,
        organization_id: organizationId,
        policy_type: 'payment',
        source_text: policies.payment_options.source_text,
      })
    }

    if (policyInserts.length > 0) {
      const { error } = await supabase.from('package_policies').insert(policyInserts)
      if (error) console.error('Error saving policies:', error)
    }
  }

  // Save important notes
  if (importantNotes && importantNotes.length > 0) {
    const notesData = importantNotes.map(n => ({
      package_id: packageId,
      organization_id: organizationId,
      note_type: n.type,
      text: n.text,
      applies_to: n.applies_to,
      source_text: n.text,
    }))
    
    const { error } = await supabase.from('package_notes').insert(notesData)
    if (error) console.error('Error saving notes:', error)
  }
}
