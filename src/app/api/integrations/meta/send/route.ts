import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Send a message via Meta (Messenger, Instagram, or WhatsApp)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { conversation_id, message, lead_id } = body

    if (!conversation_id || !message) {
      return NextResponse.json({ error: 'conversation_id and message are required' }, { status: 400 })
    }

    // Get the conversation
    const { data: conversation, error: convError } = await supabase
      .from('meta_conversations')
      .select('*, meta_integration:meta_integrations(*)')
      .eq('id', conversation_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const integration = conversation.meta_integration
    if (!integration?.page_access_token) {
      return NextResponse.json({ error: 'Meta integration not configured' }, { status: 400 })
    }

    let apiUrl: string
    let payload: any
    let externalId: string | null = null

    if (conversation.platform === 'whatsapp') {
      // WhatsApp Cloud API
      apiUrl = `https://graph.facebook.com/v18.0/${integration.whatsapp_phone_number_id}/messages`
      payload = {
        messaging_product: 'whatsapp',
        to: conversation.participant_id,
        type: 'text',
        text: { body: message }
      }
    } else {
      // Messenger or Instagram
      apiUrl = `https://graph.facebook.com/v18.0/me/messages`
      payload = {
        recipient: { id: conversation.participant_id },
        message: { text: message },
        messaging_type: 'RESPONSE'
      }

      // For Instagram, need to use different endpoint
      if (conversation.platform === 'instagram') {
        payload.recipient = { id: conversation.participant_id }
      }
    }

    // Send message
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.page_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Meta send error:', result)
      return NextResponse.json({
        error: result.error?.message || 'Failed to send message'
      }, { status: 500 })
    }

    externalId = result.message_id || result.messages?.[0]?.id

    // Save message to database
    const now = new Date().toISOString()
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        lead_id: lead_id || conversation.lead_id,
        organization_id: userData.organization_id,
        direction: 'outbound',
        channel: conversation.platform,
        content: message,
        external_id: externalId,
        external_platform: conversation.platform,
        meta_conversation_id: conversation.id,
        status: 'sent',
        sent_at: now,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving message:', saveError)
    }

    // Update lead's awaiting_response to false
    if (lead_id || conversation.lead_id) {
      await supabase
        .from('leads')
        .update({
          awaiting_response: false,
          updated_at: now,
        })
        .eq('id', lead_id || conversation.lead_id)
    }

    // Update conversation timestamp
    await supabase
      .from('meta_conversations')
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', conversation.id)

    return NextResponse.json({
      success: true,
      message_id: externalId,
      saved_message: savedMessage,
    })
  } catch (error: any) {
    console.error('Meta send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
