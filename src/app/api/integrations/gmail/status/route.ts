import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organizacija nije pronađena' }, { status: 400 })
    }

    // Get email integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('id, email_address, display_name, provider, is_active, connected_at, last_used_at, last_error')
      .eq('organization_id', userData.organization_id)
      .single()

    if (integrationError && integrationError.code !== 'PGRST116') {
      console.error('Error fetching email integration:', integrationError)
      return NextResponse.json({ error: 'Greška pri učitavanju' }, { status: 500 })
    }

    return NextResponse.json({
      connected: !!integration,
      integration: integration || null,
    })
  } catch (error: any) {
    console.error('Gmail status error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
