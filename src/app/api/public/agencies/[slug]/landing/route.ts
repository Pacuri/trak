import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOfferLabel } from '@/lib/labels'
import type { LandingPageData, FloatingOfferCard, AgencyLandingSettings, DEFAULT_LANDING_SETTINGS } from '@/types/landing'
import type { Offer } from '@/types'

// Default background image (beautiful beach)
const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80'

// Default landing settings
const DEFAULTS: Omit<AgencyLandingSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  logo_url: null,
  logo_initials: null,
  primary_color: '#0F766E',
  background_image_url: null,
  
  headline: 'Pronađite savršeno putovanje',
  subtitle: 'Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas, za manje od 60 sekundi.',
  cta_text: 'Započni pretragu',
  
  show_specialization: false,
  specialization_emoji: null,
  specialization_text: null,
  
  show_stats: false,
  stat_travelers: null,
  stat_years: null,
  stat_rating: null,
  stat_destinations: null,
  
  is_yuta_member: false,
  is_licensed: true,
  license_number: null,
  show_installments: false,
  show_secure_booking: true,
  
  legal_name: null,
  footer_text: null,
}

// GET /api/public/agencies/[slug]/landing
// Returns landing page data including settings and floating offers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Get agency by slug from agency_booking_settings
    const { data: agency, error: agencyError } = await supabase
      .from('agency_booking_settings')
      .select(`
        organization_id,
        slug,
        agency_name,
        agency_logo_url,
        allow_custom_inquiries,
        show_inquiry_with_results,
        inquiry_response_text,
        organization:organizations(name)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (agencyError || !agency) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    const organizationId = agency.organization_id
    const agencyName = agency.agency_name || (agency.organization as any)?.name || 'Turistička agencija'

    // Get landing settings (or use defaults)
    const { data: landingSettings } = await supabase
      .from('agency_landing_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    // Merge with defaults
    const settings: AgencyLandingSettings = {
      id: landingSettings?.id || '',
      organization_id: organizationId,
      created_at: landingSettings?.created_at || new Date().toISOString(),
      updated_at: landingSettings?.updated_at || new Date().toISOString(),
      ...DEFAULTS,
      ...(landingSettings || {}),
    }

    // Get 2 random active offers/departures for floating cards
    const today = new Date().toISOString().split('T')[0]
    let floatingOffers: FloatingOfferCard[] = []
    
    // Try packages/departures first (new system)
    const { data: departures } = await supabase
      .from('departures_with_package')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('is_visible', true)
      .gte('departure_date', today)
      .or('available_spots.gt.0,available_spots.is.null')
      .limit(10)
    
    if (departures && departures.length > 0) {
      // Shuffle and take 2 random departures
      const shuffledDepartures = departures.sort(() => Math.random() - 0.5).slice(0, 2)
      
      // Get images for packages
      const packageIds = [...new Set(shuffledDepartures.map(d => d.package_id))]
      const { data: images } = await supabase
        .from('package_images')
        .select('*')
        .in('package_id', packageIds)
        .eq('is_primary', true)
      
      const imageMap: Record<string, string> = {}
      images?.forEach(img => {
        imageMap[img.package_id] = img.url
      })
      
      floatingOffers = shuffledDepartures.map((dep: any, index: number) => {
        // Calculate urgency label
        let urgencyLabel: string | null = null
        if (dep.available_spots !== null && dep.available_spots <= 2) {
          urgencyLabel = '🔥 POSLEDNJA MESTA'
        } else if (dep.original_price && dep.original_price > (dep.effective_price || dep.price_override || 0)) {
          urgencyLabel = '💰 SNIŽENO'
        } else if (index === 0 && !urgencyLabel) {
          urgencyLabel = '✨ POPULARNO'
        }
        
        return {
          id: dep.id,
          name: dep.hotel_name || dep.package_name || 'Ponuda',
          city: dep.destination_city,
          country: dep.destination_country,
          price_per_person: dep.effective_price || dep.price_override || 0,
          currency: 'EUR',
          image_url: dep.primary_image_url || imageMap[dep.package_id] || null,
          urgency_label: urgencyLabel,
        }
      })
    } else {
      // Fallback to offers (legacy system)
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          id,
          name,
          city,
          country,
          price_per_person,
          currency,
          departure_date,
          total_spots,
          available_spots,
          original_price,
          created_at,
          views_last_24h,
          is_recommended,
          images:offer_images(url, is_primary)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gt('available_spots', 0)
        .gte('departure_date', today)
        .limit(10)

      // Shuffle and take 2 random offers
      const shuffled = (offers || []).sort(() => Math.random() - 0.5)
      const selectedOffers = shuffled.slice(0, 2)

      // Transform to FloatingOfferCard format
      floatingOffers = selectedOffers.map((offer: any, index: number) => {
        // Get primary image or first image
        const images = offer.images || []
        const primaryImage = images.find((img: any) => img.is_primary) || images[0]
        
        // Get urgency label using existing function
        const offerForLabel: Offer = {
          id: offer.id,
          organization_id: organizationId,
          name: offer.name,
          description: null,
          star_rating: null,
          country: offer.country,
          city: offer.city,
          departure_date: offer.departure_date,
          return_date: offer.departure_date,
          price_per_person: offer.price_per_person,
          original_price: offer.original_price,
          currency: offer.currency,
          total_spots: offer.total_spots,
          available_spots: offer.available_spots,
          accommodation_type: null,
          board_type: null,
          transport_type: null,
          inventory_type: 'owned',
          is_recommended: offer.is_recommended,
          views_total: 0,
          views_last_24h: offer.views_last_24h || 0,
          status: 'active',
          created_at: offer.created_at,
          updated_at: offer.created_at,
        }
        
        const urgencyLabel = getOfferLabel(offerForLabel, index, true)

        return {
          id: offer.id,
          name: offer.name,
          city: offer.city,
          country: offer.country,
          price_per_person: offer.price_per_person,
          currency: offer.currency,
          image_url: primaryImage?.url || null,
          urgency_label: urgencyLabel,
        }
      })
    }

    // Resolve background image
    let backgroundImageUrl = settings.background_image_url
    if (!backgroundImageUrl && floatingOffers.length > 0 && floatingOffers[0].image_url) {
      backgroundImageUrl = floatingOffers[0].image_url
    }
    if (!backgroundImageUrl) {
      backgroundImageUrl = DEFAULT_BACKGROUND
    }

    const response: LandingPageData = {
      agency: {
        name: agencyName,
        slug: agency.slug,
        organization_id: organizationId,
        logo_url: agency.agency_logo_url,
      },
      settings,
      background_image_url: backgroundImageUrl,
      floating_offers: floatingOffers,
      inquiry_settings: {
        allow_custom_inquiries: agency.allow_custom_inquiries ?? true,
        show_inquiry_with_results: agency.show_inquiry_with_results ?? true,
        inquiry_response_text: agency.inquiry_response_text || 'Javićemo vam se u roku od 24 sata',
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching landing data:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju podataka' },
      { status: 500 }
    )
  }
}
