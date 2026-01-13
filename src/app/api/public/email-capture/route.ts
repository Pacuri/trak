import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { QualificationData } from '@/types'

interface EmailCaptureBody {
  slug: string
  email: string
  qualification_data?: QualificationData
  offers_shown?: string[]
}

// POST /api/public/email-capture
// Capture email for abandoned cart recovery
export async function POST(request: NextRequest) {
  try {
    const body: EmailCaptureBody = await request.json()

    const { slug, email, qualification_data, offers_shown } = body

    // Validate required fields
    if (!slug || !email) {
      return NextResponse.json(
        { error: 'Email je obavezan' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Nevažeća email adresa' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get agency settings
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select(`
        organization_id, 
        abandoned_cart_enabled,
        abandoned_cart_discount_percent,
        abandoned_cart_discount_hours
      `)
      .eq('slug', slug)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // If abandoned cart is disabled, silently succeed
    if (!settings.abandoned_cart_enabled) {
      return NextResponse.json({ success: true })
    }

    // Check if email already captured for this org
    const { data: existingCart } = await supabase
      .from('abandoned_carts')
      .select('id')
      .eq('organization_id', settings.organization_id)
      .eq('email', email.toLowerCase())
      .eq('converted', false)
      .single()

    if (existingCart) {
      // Update existing cart with new offers
      await supabase
        .from('abandoned_carts')
        .update({
          qualification_data: qualification_data || null,
          offers_shown: offers_shown || null,
        })
        .eq('id', existingCart.id)

      return NextResponse.json({ success: true, existing: true })
    }

    // Generate discount code
    const discountCode = generateDiscountCode()

    // Calculate discount expiry
    const discountExpiresAt = new Date()
    discountExpiresAt.setHours(discountExpiresAt.getHours() + settings.abandoned_cart_discount_hours)

    // Create abandoned cart record
    const { error: cartError } = await supabase
      .from('abandoned_carts')
      .insert({
        organization_id: settings.organization_id,
        email: email.toLowerCase(),
        qualification_data: qualification_data || null,
        offers_shown: offers_shown || null,
        discount_code: discountCode,
        discount_percent: settings.abandoned_cart_discount_percent,
        discount_expires_at: discountExpiresAt.toISOString(),
      })

    if (cartError) {
      console.error('Error creating abandoned cart:', cartError)
      return NextResponse.json(
        { error: 'Greška pri čuvanju podataka' },
        { status: 500 }
      )
    }

    // TODO: Send welcome email with discount code
    // await sendDiscountWelcomeEmail(email, discountCode, settings)

    return NextResponse.json({
      success: true,
      discount_code: discountCode,
      discount_percent: settings.abandoned_cart_discount_percent,
      expires_at: discountExpiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error in email capture:', error)
    return NextResponse.json(
      { error: 'Greška pri obradi zahteva' },
      { status: 500 }
    )
  }
}

function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LETO'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
