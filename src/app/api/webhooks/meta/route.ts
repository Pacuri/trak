import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role (bypasses RLS)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Webhook verification (Meta sends this to verify your endpoint)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('[Meta Webhook] Verification request:', { mode, token, challenge })

  if (mode === 'subscribe') {
    // First check static env token (for initial setup before any user connects)
    const staticToken = process.env.META_WEBHOOK_VERIFY_TOKEN
    if (staticToken && token === staticToken) {
      console.log('[Meta Webhook] Verification successful (static token)')
      return new NextResponse(challenge, { status: 200 })
    }

    // Then check user-specific tokens in database
    const supabase = getSupabaseClient()
    const { data: integration } = await supabase
      .from('meta_integrations')
      .select('id')
      .eq('webhook_verify_token', token)
      .eq('is_active', true)
      .single()

    if (integration) {
      console.log('[Meta Webhook] Verification successful (db token)')
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.log('[Meta Webhook] Verification failed - invalid token')
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return new NextResponse('Bad Request', { status: 400 })
}

// POST - Receive messages and events from Meta
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()

  try {
    const body = await request.json()

    console.log('[Meta Webhook] Received event:', JSON.stringify(body, null, 2))

    // Meta sends events in this format:
    // {
    //   "object": "page" | "instagram" | "whatsapp_business_account",
    //   "entry": [{ "id": "PAGE_ID", "messaging": [...] }]
    // }

    const { object, entry } = body

    if (!entry || !Array.isArray(entry)) {
      console.log('[Meta Webhook] No entry array in payload')
      return NextResponse.json({ received: true })
    }

    for (const pageEntry of entry) {
      const pageId = pageEntry.id

      // Find the integration for this page
      const { data: integration, error: integrationError } = await supabase
        .from('meta_integrations')
        .select('*')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .single()

      if (integrationError || !integration) {
        // Try Instagram account ID
        const { data: igIntegration } = await supabase
          .from('meta_integrations')
          .select('*')
          .eq('instagram_account_id', pageId)
          .eq('is_active', true)
          .single()

        if (!igIntegration) {
          console.log(`[Meta Webhook] No integration found for page/account: ${pageId}`)
          continue
        }
      }

      const activeIntegration = integration || (await supabase
        .from('meta_integrations')
        .select('*')
        .eq('instagram_account_id', pageId)
        .eq('is_active', true)
        .single()).data

      if (!activeIntegration) continue

      // Update last webhook timestamp
      await supabase
        .from('meta_integrations')
        .update({ last_webhook_at: new Date().toISOString() })
        .eq('id', activeIntegration.id)

      // Process messaging events
      if (pageEntry.messaging) {
        for (const event of pageEntry.messaging) {
          await processMessagingEvent(supabase, activeIntegration, event, 'messenger')
        }
      }

      // Process Instagram messaging events
      if (pageEntry.messaging && object === 'instagram') {
        for (const event of pageEntry.messaging) {
          await processMessagingEvent(supabase, activeIntegration, event, 'instagram')
        }
      }

      // Process WhatsApp events (different structure)
      if (pageEntry.changes && object === 'whatsapp_business_account') {
        for (const change of pageEntry.changes) {
          if (change.field === 'messages' && change.value?.messages) {
            for (const message of change.value.messages) {
              await processWhatsAppMessage(supabase, activeIntegration, message, change.value)
            }
          }
        }
      }
    }

    // Always return 200 quickly to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Meta Webhook] Error:', error)
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true, error: error.message })
  }
}

// Process Facebook Messenger and Instagram DM events
async function processMessagingEvent(
  supabase: any,
  integration: any,
  event: any,
  platform: 'messenger' | 'instagram'
) {
  try {
    const senderId = event.sender?.id
    const recipientId = event.recipient?.id
    const timestamp = event.timestamp
    const message = event.message

    // Skip if this is an echo (message sent by us)
    if (message?.is_echo) {
      console.log(`[Meta Webhook] Skipping echo message`)
      return
    }

    // Skip if no message content
    if (!message?.text && !message?.attachments) {
      console.log(`[Meta Webhook] Skipping non-message event`)
      return
    }

    console.log(`[Meta Webhook] Processing ${platform} message from ${senderId}:`, message?.text?.substring(0, 50))

    // Find or create conversation
    const { data: existingConversation } = await supabase
      .from('meta_conversations')
      .select('*, lead:leads(id, name)')
      .eq('organization_id', integration.organization_id)
      .eq('platform', platform)
      .eq('participant_id', senderId)
      .single()

    if (existingConversation?.lead_id) {
      // Existing conversation with a lead - add message directly
      await addMessageToLead(supabase, integration, existingConversation, message, platform, timestamp)
    } else if (existingConversation) {
      // Conversation exists but not linked to lead yet - update it
      await supabase
        .from('meta_conversations')
        .update({
          last_message_at: new Date(timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConversation.id)

      // Could trigger notification for pending review
      console.log(`[Meta Webhook] Updated pending conversation ${existingConversation.id}`)
    } else {
      // New conversation - fetch user profile and create
      const profile = await fetchUserProfile(integration, senderId, platform)

      const { data: newConversation, error: createError } = await supabase
        .from('meta_conversations')
        .insert({
          organization_id: integration.organization_id,
          meta_integration_id: integration.id,
          platform,
          conversation_id: message?.mid || `${senderId}_${timestamp}`,
          participant_id: senderId,
          participant_name: profile?.name || 'Unknown',
          participant_profile_pic: profile?.profile_pic,
          status: 'pending',
          last_message_at: new Date(timestamp).toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error(`[Meta Webhook] Error creating conversation:`, createError)
      } else {
        console.log(`[Meta Webhook] Created new ${platform} conversation for ${profile?.name || senderId}`)
      }
    }
  } catch (error) {
    console.error(`[Meta Webhook] Error processing ${platform} event:`, error)
  }
}

// Process WhatsApp messages (slightly different structure)
async function processWhatsAppMessage(
  supabase: any,
  integration: any,
  message: any,
  value: any
) {
  try {
    const senderId = message.from // Phone number
    const timestamp = parseInt(message.timestamp) * 1000
    const messageType = message.type
    const text = message.text?.body || message.caption || ''

    console.log(`[Meta Webhook] Processing WhatsApp message from ${senderId}:`, text?.substring(0, 50))

    // Get contact info from the value object
    const contact = value.contacts?.find((c: any) => c.wa_id === senderId)
    const contactName = contact?.profile?.name || senderId

    // Find or create conversation
    const { data: existingConversation } = await supabase
      .from('meta_conversations')
      .select('*, lead:leads(id, name)')
      .eq('organization_id', integration.organization_id)
      .eq('platform', 'whatsapp')
      .eq('participant_id', senderId)
      .single()

    if (existingConversation?.lead_id) {
      // Add to existing lead
      await addMessageToLead(supabase, integration, existingConversation, { text }, 'whatsapp', timestamp)
    } else if (existingConversation) {
      // Update existing pending conversation
      await supabase
        .from('meta_conversations')
        .update({
          last_message_at: new Date(timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConversation.id)
    } else {
      // Create new conversation
      await supabase
        .from('meta_conversations')
        .insert({
          organization_id: integration.organization_id,
          meta_integration_id: integration.id,
          platform: 'whatsapp',
          conversation_id: message.id,
          participant_id: senderId,
          participant_name: contactName,
          status: 'pending',
          last_message_at: new Date(timestamp).toISOString(),
        })

      console.log(`[Meta Webhook] Created new WhatsApp conversation for ${contactName}`)
    }
  } catch (error) {
    console.error(`[Meta Webhook] Error processing WhatsApp message:`, error)
  }
}

// Add message to an existing lead
async function addMessageToLead(
  supabase: any,
  integration: any,
  conversation: any,
  message: any,
  platform: string,
  timestamp: number
) {
  const content = message.text || message.text?.body || ''
  const messageDate = new Date(timestamp).toISOString()

  // Insert message
  const { data: insertedMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      lead_id: conversation.lead_id,
      organization_id: integration.organization_id,
      direction: 'inbound',
      channel: platform,
      content: content,
      from_name: conversation.participant_name,
      external_id: message.mid || message.id,
      external_platform: platform,
      meta_conversation_id: conversation.id,
      status: 'sent',
      sent_at: messageDate,
    })
    .select()
    .single()

  if (insertError) {
    console.error(`[Meta Webhook] Error inserting message:`, insertError)
    return
  }

  console.log(`[Meta Webhook] Added message to lead ${conversation.lead_id}`)

  // Update lead's awaiting_response status
  await supabase
    .from('leads')
    .update({
      awaiting_response: true,
      last_customer_message_at: messageDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.lead_id)

  // Update conversation timestamp
  await supabase
    .from('meta_conversations')
    .update({
      last_message_at: messageDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)
}

// Fetch user profile from Meta API
async function fetchUserProfile(
  integration: any,
  userId: string,
  platform: 'messenger' | 'instagram'
): Promise<{ name?: string; profile_pic?: string } | null> {
  try {
    const fields = platform === 'instagram'
      ? 'name,username,profile_picture_url'
      : 'name,profile_pic'

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=${fields}&access_token=${integration.page_access_token}`
    )

    if (!response.ok) {
      console.error(`[Meta Webhook] Failed to fetch profile for ${userId}`)
      return null
    }

    const data = await response.json()
    return {
      name: data.name || data.username,
      profile_pic: data.profile_pic || data.profile_picture_url,
    }
  } catch (error) {
    console.error(`[Meta Webhook] Error fetching profile:`, error)
    return null
  }
}
