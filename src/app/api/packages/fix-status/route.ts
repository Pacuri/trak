import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/packages/fix-status
// One-time fix to ensure all packages have status='active' and is_active=true
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
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

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fix packages that are missing status or is_active
    const { data: fixedPackages, error: updateError } = await supabase
      .from('packages')
      .update({
        status: 'active',
        is_active: true
      })
      .eq('organization_id', userData.organization_id)
      .or('status.is.null,is_active.is.null,is_active.eq.false')
      .select('id, name')

    if (updateError) {
      console.error('Error fixing packages:', updateError)
      return NextResponse.json({ error: 'Failed to fix packages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fixed_count: fixedPackages?.length || 0,
      fixed_packages: fixedPackages || [],
    })
  } catch (error) {
    console.error('Error in fix-status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
