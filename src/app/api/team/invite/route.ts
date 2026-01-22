import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to invite
    if (!['owner', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Only owners and admins can invite team members' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role = 'agent' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'agent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists in the organization
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', currentUser.organization_id)
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('organization_id', currentUser.organization_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 })
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: currentUser.organization_id,
        email,
        role,
        invited_by: user.id,
      })
      .select('id, token, email, role, expires_at')
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Generate invite URL
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl,
      },
    })
  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List invitations for the organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get invitations
    const { data: invitations, error: inviteError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        invited_by:users!invited_by(full_name, email)
      `)
      .eq('organization_id', currentUser.organization_id)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Get invitations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to revoke
    if (!['owner', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Only owners and admins can revoke invitations' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Update invitation status to revoked
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('organization_id', currentUser.organization_id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Error revoking invitation:', updateError)
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
