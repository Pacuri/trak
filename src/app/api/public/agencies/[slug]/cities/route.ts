import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Popular cities fallback list for each country (Serbian market)
const POPULAR_CITIES_BY_COUNTRY: Record<string, string[]> = {
  'Grčka': ['Halkidiki', 'Krf', 'Zakintos', 'Santorini', 'Mikonos', 'Paros', 'Kreta', 'Rodos', 'Tasos', 'Lefkada'],
  'Turska': ['Antalija', 'Alanya', 'Side', 'Belek', 'Kemer', 'Bodrum', 'Kusadasi', 'Marmaris', 'Fethiye', 'Cesme'],
  'Egipat': ['Hurghada', 'Šarm el Šeik', 'Marsa Alam', 'Kairo', 'Aleksandrija', 'Luxor', 'Aswan', 'Dahab', 'Taba', 'El Gouna'],
  'Crna Gora': ['Budva', 'Kotor', 'Herceg Novi', 'Tivat', 'Bar', 'Ulcinj', 'Petrovac', 'Sveti Stefan', 'Podgorica', 'Cetinje'],
  'Albanija': ['Durres', 'Vlora', 'Saranda', 'Tirana', 'Shkoder', 'Himara', 'Ksamil', 'Dhermi', 'Berat', 'Gjirokaster'],
  'Hrvatska': ['Dubrovnik', 'Split', 'Zadar', 'Pula', 'Rovinj', 'Makarska', 'Opatija', 'Hvar', 'Korčula', 'Šibenik'],
  'Španija': ['Barselona', 'Madrid', 'Valencia', 'Sevilla', 'Malaga', 'Granada', 'Ibiza', 'Mallorca', 'Tenerife', 'Marbella'],
  'Italija': ['Rim', 'Venecija', 'Firenca', 'Milano', 'Napulj', 'Sicilija', 'Sardinija', 'Amalfi', 'Cinque Terre', 'Capri'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain', 'Al Ain', 'Jebel Ali', 'Palm Jumeirah'],
  'Tajland': ['Bangkok', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui', 'Chiang Mai', 'Hua Hin', 'Koh Phi Phi', 'Ayutthaya', 'Railay'],
  'Maldivi': ['Male', 'Maafushi', 'Hulhumale', 'Thulusdhoo', 'Rasdhoo', 'Dhiffushi', 'Gulhi', 'Fulidhoo', 'Thoddoo', 'Himmafushi'],
  'Tunis': ['Tunis', 'Sousse', 'Hammamet', 'Monastir', 'Djerba', 'Mahdia', 'Tabarka', 'Bizerte', 'Kairouan', 'Zarzis'],
}

// GET /api/public/agencies/[slug]/cities
// Returns popular cities for a country, sorted by offer count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get('country')

    if (!country) {
      return NextResponse.json(
        { error: 'Country parameter is required' },
        { status: 400 }
      )
    }

    // Get organization ID from slug
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Get fallback cities for this country (normalize country name for matching)
    const normalizedCountry = country.trim()
    const fallbackCities = POPULAR_CITIES_BY_COUNTRY[normalizedCountry] || []

    // Fetch cities that have offers (for sorting priority, but don't filter)
    const { data: offers } = await supabase
      .from('offers')
      .select('city')
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .ilike('country', `%${country}%`)
      .not('city', 'is', null)
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .gt('available_spots', 0)

    // Track which cities have offers (for sorting, not display)
    const citiesWithOffers = new Set<string>()
    offers?.forEach((offer) => {
      if (offer.city) {
        citiesWithOffers.add(offer.city)
      }
    })

    // Always return the 10 fallback cities, prioritizing those with offers
    const cities = fallbackCities
      .map((city) => ({
        city,
        hasOffers: citiesWithOffers.has(city),
      }))
      .sort((a, b) => {
        // Cities with offers first
        if (a.hasOffers && !b.hasOffers) return -1
        if (!a.hasOffers && b.hasOffers) return 1
        // Then sort alphabetically
        return a.city.localeCompare(b.city, 'sr-Latn')
      })
      .slice(0, 10) // Top 10 cities per country

    // Mark the first city as popular (regardless of offers)
    const citiesWithPopular = cities.map((cityData, index) => ({
      city: cityData.city,
      isPopular: index === 0 && cities.length > 0,
    }))

    return NextResponse.json({
      cities: citiesWithPopular,
    })
  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju gradova' },
      { status: 500 }
    )
  }
}
