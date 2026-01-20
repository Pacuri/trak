import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    // Delete the email integration
    const { error: deleteError } = await supabase
      .from('email_integrations')
      .delete()
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Error disconnecting email integration:', deleteError)
      return NextResponse.json({ error: 'Greška pri prekidu veze' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Email veza je prekinuta' })
  } catch (error: any) {
    console.error('Gmail disconnect error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
