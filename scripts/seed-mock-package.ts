// Run with: npx tsx scripts/seed-mock-package.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function seedMockPackage() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('email', 'ewqewq@gmail.com')
    .single()

  if (userError || !user) {
    console.error('User not found:', userError)
    return
  }

  console.log('Found user:', user)

  const organizationId = user.organization_id

  // Create the mock package
  const packageData = {
    organization_id: organizationId,
    name: 'Letovanje Halkidiki 2025 - Hotel Azure Bay',
    description: `Predivan hotel smešten na samoj obali Egejskog mora, sa privatnom plažom i panoramskim pogledom na zalazak sunca.

Hotel Azure Bay nudi luksuzan smeštaj sa modernim sobama, infinity bazenom, spa centrom i tri restorana sa lokalnom i međunarodnom kuhinjom.

Posebne pogodnosti:
• Privatna peščana plaža sa besplatnim ležaljkama
• Dečji klub sa animatorima (4-12 godina)
• Fitness centar i teniski tereni
• Besplatan WiFi u celom hotelu
• Parking za goste`,
    destination_country: 'Grčka',
    destination_city: 'Halkidiki',
    hotel_name: 'Hotel Azure Bay',
    hotel_stars: 4,
    board_type: 'HB',
    meal_plans: ['BB', 'HB', 'FB', 'AI'],
    transport_type: 'autobus',
    transport_types: ['autobus', 'sopstveni'],
    departure_location: 'Beograd',
    default_duration: 10,
    valid_from: '2025-06-01',
    valid_to: '2025-09-15',
    price_from: 459,
    package_type: 'accommodation',
    status: 'active',
    is_featured: true,
    is_active: true,
  }

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .insert(packageData)
    .select()
    .single()

  if (pkgError) {
    console.error('Error creating package:', pkgError)
    return
  }

  console.log('Created package:', pkg.id)

  // Create room types
  const roomTypes = [
    { package_id: pkg.id, code: 'STD', name: 'Standard soba', description: 'Komforna soba sa pogledom na baštu', max_persons: 2, sort_order: 1 },
    { package_id: pkg.id, code: 'SUP', name: 'Superior soba', description: 'Prostranija soba sa balkonom i pogledom na more', max_persons: 3, sort_order: 2 },
    { package_id: pkg.id, code: 'FAM', name: 'Porodična soba', description: 'Dve povezane sobe, idealno za porodice', max_persons: 4, sort_order: 3 },
    { package_id: pkg.id, code: 'SUI', name: 'Junior Suite', description: 'Luksuzni apartman sa dnevnim boravkom i terasom', max_persons: 2, sort_order: 4 },
  ]

  const { data: rooms, error: roomsError } = await supabase
    .from('room_types')
    .insert(roomTypes)
    .select()

  if (roomsError) {
    console.error('Error creating room types:', roomsError)
    return
  }

  console.log('Created room types:', rooms.length)

  // Create price intervals
  const priceIntervals = [
    { package_id: pkg.id, name: 'Rana sezona', start_date: '2025-06-01', end_date: '2025-06-30' },
    { package_id: pkg.id, name: 'Glavna sezona', start_date: '2025-07-01', end_date: '2025-08-20' },
    { package_id: pkg.id, name: 'Kasna sezona', start_date: '2025-08-21', end_date: '2025-09-15' },
  ]

  const { data: intervals, error: intervalsError } = await supabase
    .from('price_intervals')
    .insert(priceIntervals)
    .select()

  if (intervalsError) {
    console.error('Error creating price intervals:', intervalsError)
    return
  }

  console.log('Created price intervals:', intervals.length)

  // Create hotel prices (room x interval x meal plan)
  const hotelPrices: any[] = []

  const basePrices: Record<string, Record<string, number>> = {
    'Rana sezona': { STD: 459, SUP: 529, FAM: 649, SUI: 789 },
    'Glavna sezona': { STD: 589, SUP: 679, FAM: 829, SUI: 999 },
    'Kasna sezona': { STD: 489, SUP: 559, FAM: 689, SUI: 829 },
  }

  for (const interval of intervals) {
    for (const room of rooms) {
      const basePrice = basePrices[interval.name!]?.[room.code] || 500
      hotelPrices.push({
        package_id: pkg.id,
        interval_id: interval.id,
        room_type_id: room.id,
        price_bb: basePrice,
        price_hb: basePrice + 80,
        price_fb: basePrice + 140,
        price_ai: basePrice + 220,
      })
    }
  }

  const { error: pricesError } = await supabase
    .from('hotel_prices')
    .insert(hotelPrices)

  if (pricesError) {
    console.error('Error creating hotel prices:', pricesError)
    return
  }

  console.log('Created hotel prices:', hotelPrices.length)

  // Create children policies
  const childrenPolicies = [
    {
      package_id: pkg.id,
      rule_name: 'Beba gratis',
      age_from: 0,
      age_to: 2,
      discount_type: 'FREE',
      discount_value: 100,
      applies_to: 'per_child',
    },
    {
      package_id: pkg.id,
      rule_name: 'Dete do 7 godina - 50% popusta',
      age_from: 3,
      age_to: 7,
      discount_type: 'PERCENT',
      discount_value: 50,
      applies_to: 'per_child',
    },
    {
      package_id: pkg.id,
      rule_name: 'Dete 8-12 godina - 30% popusta',
      age_from: 8,
      age_to: 12,
      discount_type: 'PERCENT',
      discount_value: 30,
      applies_to: 'per_child',
    },
  ]

  const { error: policiesError } = await supabase
    .from('children_policies')
    .insert(childrenPolicies)

  if (policiesError) {
    console.error('Error creating children policies:', policiesError)
    return
  }

  console.log('Created children policies:', childrenPolicies.length)

  // Create departures
  const departures = [
    { package_id: pkg.id, departure_date: '2025-06-07', return_date: '2025-06-17', departure_location: 'Beograd', available_spots: 45, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-06-14', return_date: '2025-06-24', departure_location: 'Beograd', available_spots: 50, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-06-21', return_date: '2025-07-01', departure_location: 'Beograd', available_spots: 38, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-06-28', return_date: '2025-07-08', departure_location: 'Beograd', available_spots: 50, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-07-05', return_date: '2025-07-15', departure_location: 'Beograd', available_spots: 22, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-07-12', return_date: '2025-07-22', departure_location: 'Beograd', available_spots: 15, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-07-05', return_date: '2025-07-15', departure_location: 'Novi Sad', available_spots: 30, total_spots: 30 },
    { package_id: pkg.id, departure_date: '2025-07-19', return_date: '2025-07-29', departure_location: 'Beograd', available_spots: 8, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-07-26', return_date: '2025-08-05', departure_location: 'Beograd', available_spots: 50, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-08-02', return_date: '2025-08-12', departure_location: 'Beograd', available_spots: 35, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-08-09', return_date: '2025-08-19', departure_location: 'Beograd', available_spots: 42, total_spots: 50 },
    { package_id: pkg.id, departure_date: '2025-08-23', return_date: '2025-09-02', departure_location: 'Beograd', available_spots: 50, total_spots: 50 },
  ]

  const { error: departuresError } = await supabase
    .from('package_departures')
    .insert(departures)

  if (departuresError) {
    console.error('Error creating departures:', departuresError)
    return
  }

  console.log('Created departures:', departures.length)

  // Create some sample images (using placeholder URLs)
  const images = [
    { package_id: pkg.id, url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', position: 0, is_primary: true, alt_text: 'Hotel Azure Bay - Glavni pogled' },
    { package_id: pkg.id, url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', position: 1, is_primary: false, alt_text: 'Bazen sa pogledom na more' },
    { package_id: pkg.id, url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', position: 2, is_primary: false, alt_text: 'Luksuzna soba' },
    { package_id: pkg.id, url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800', position: 3, is_primary: false, alt_text: 'Privatna plaža' },
  ]

  const { error: imagesError } = await supabase
    .from('package_images')
    .insert(images)

  if (imagesError) {
    console.error('Error creating images:', imagesError)
    return
  }

  console.log('Created images:', images.length)

  console.log('\n✅ Mock package created successfully!')
  console.log(`Package ID: ${pkg.id}`)
  console.log(`Package Name: ${pkg.name}`)
}

seedMockPackage().catch(console.error)
