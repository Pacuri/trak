import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RespondBody {
  response_type: 'can_help' | 'cannot_help' | 'need_info'
  response_message?: string
  internal_notes?: string
  create_lead?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = userData.organization_id

    // Parse request body
    const body: RespondBody = await request.json()

    if (!body.response_type) {
      return NextResponse.json({ error: 'response_type is required' }, { status: 400 })
    }

    // Get the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('custom_inquiries')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Update the inquiry with response
    const { error: updateError } = await supabase
      .from('custom_inquiries')
      .update({
        status: 'contacted',
        responded_at: new Date().toISOString(),
        responded_by: authUser.id,
        response_type: body.response_type,
        response_message: body.response_message || null,
        internal_notes: body.internal_notes || null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating inquiry:', updateError)
      return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 })
    }

    let leadId: string | null = null

    // Create lead if requested
    if (body.create_lead) {
      // Get the default pipeline stage
      const { data: defaultStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .single()

      // Parse qualification data for lead info
      const qualification = inquiry.qualification_data as any

      // Create the lead with reference back to inquiry for rich data
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          organization_id: organizationId,
          name: inquiry.customer_name,
          phone: inquiry.customer_phone,
          email: inquiry.customer_email || null,
          destination: qualification?.destination?.country ||
            qualification?.destination?.city || null,
          guests: qualification?.guests?.adults || null,
          notes: inquiry.customer_note || null,
          stage_id: defaultStage?.id || null,
          assigned_to: authUser.id,
          source_type: 'website',
          source_inquiry_id: id, // Reference to original inquiry for rich data display
        })
        .select('id')
        .single()

      if (leadError) {
        console.error('Failed to create lead:', leadError)
        // Don't fail the whole operation if lead creation fails
      } else if (newLead) {
        leadId = newLead.id

        // Update inquiry with lead reference
        await supabase
          .from('custom_inquiries')
          .update({ converted_to_lead_id: newLead.id })
          .eq('id', id)

        // Log lead activity
        await supabase.from('lead_activities').insert({
          lead_id: newLead.id,
          user_id: authUser.id,
          type: 'created',
          description: 'Lead kreiran iz custom upita',
          metadata: { inquiry_id: id },
        })
      }
    }

    return NextResponse.json({
      success: true,
      inquiry_id: id,
      lead_id: leadId,
    })
  } catch (error) {
    console.error('Inquiry respond error:', error)
    return NextResponse.json(
      { error: 'Failed to respond to inquiry' },
      { status: 500 }
    )
  }
}
