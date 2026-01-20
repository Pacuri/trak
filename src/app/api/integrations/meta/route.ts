import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get Meta integration status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Get integration
    const { data: integration, error } = await supabase
      .from('meta_integrations')
      .select(`
        id,
        page_id,
        page_name,
        instagram_account_id,
        instagram_username,
        whatsapp_phone_number_id,
        messenger_enabled,
        instagram_enabled,
        whatsapp_enabled,
        is_active,
        last_webhook_at,
        connected_at
      `)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching Meta integration:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      connected: !!integration,
      integration,
    })
  } catch (error: any) {
    console.error('Meta status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Disconnect Meta integration
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Delete integration
    const { error } = await supabase
      .from('meta_integrations')
      .delete()
      .eq('organization_id', userData.organization_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Meta disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
