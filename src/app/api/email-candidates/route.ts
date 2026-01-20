import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch pending email candidates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
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

    // Fetch pending candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from('email_candidates')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'pending')
      .order('email_date', { ascending: false })
      .limit(20)

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError)
      return NextResponse.json({ error: 'Greška pri učitavanju' }, { status: 500 })
    }

    // Get count
    const { count } = await supabase
      .from('email_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .eq('status', 'pending')

    return NextResponse.json({
      candidates: candidates || [],
      count: count || 0,
    })
  } catch (error: any) {
    console.error('Email candidates GET error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
