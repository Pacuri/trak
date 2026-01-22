import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Validate invitation token and get details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        organization:organizations(id, name, slug)
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        error: invitation.status === 'accepted'
          ? 'This invitation has already been used'
          : 'This invitation is no longer valid',
        status: invitation.status
      }, { status: 400 })
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'This invitation has expired',
        status: 'expired'
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expires_at: invitation.expires_at,
      }
    })
  } catch (error) {
    console.error('Validate invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Accept invitation (called after user registers or logs in)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to accept an invitation' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('id, email, role, organization_id, status, expires_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    }

    // Validate invitation status
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        error: 'This invitation is no longer valid',
        status: invitation.status
      }, { status: 400 })
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'This invitation has expired',
        status: 'expired'
      }, { status: 400 })
    }

    // Check if email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        error: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`
      }, { status: 400 })
    }

    // Check if user already belongs to an organization
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (existingUser?.organization_id) {
      // User already has an org - update to new org (or reject if you want)
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateUserError) {
        console.error('Error updating user organization:', updateUserError)
        return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
      }
    } else if (!existingUser) {
      // Create new user record
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          organization_id: invitation.organization_id,
          role: invitation.role,
          full_name: user.user_metadata?.full_name || null,
        })

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
      }
    } else {
      // User exists but has no org - update
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateUserError) {
        console.error('Error updating user:', updateUserError)
        return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
      }
    }

    // Mark invitation as accepted
    const { error: updateInviteError } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id)

    if (updateInviteError) {
      console.error('Error updating invitation status:', updateInviteError)
      // Non-critical error, user is already added
    }

    return NextResponse.json({
      success: true,
      message: 'You have successfully joined the organization',
      redirect: '/dashboard'
    })
  } catch (error) {
    console.error('Accept invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
