// Webhook types for messaging events

/**
 * Webhook event types
 */
export type WebhookEvent = 'message.sent' | 'message.received' | 'connection.accepted'

/**
 * Base webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent
  data: MessageSentData | MessageReceivedData | ConnectionAcceptedData
  timestamp: string
}

/**
 * Data payload for message.sent event
 * Sent when a queued message is actually sent by the queue processor
 */
export interface MessageSentData {
  conversationId: string
  prospectExternalId: string
  projectId?: string | null
  channel: string
  outreachMethod: string
  lastMessage: {
    id?: string | null
    content?: string | null
    senderType: 'user'
    sentAt: string
  }
}

/**
 * Data payload for message.received event
 * Sent when a prospect replies to a message
 */
export interface MessageReceivedData {
  conversationId: string
  prospectExternalId: string
  projectId?: string | null
  channel: string
  lastMessage: {
    id?: string | null
    content?: string | null
    senderType: 'prospect'
    senderName?: string | null
    sentAt: string
  }
}

/**
 * Data payload for connection.accepted event
 * Sent when a LinkedIn connection request is accepted
 */
export interface ConnectionAcceptedData {
  conversationId: string
  prospectExternalId: string
  projectId?: string | null
  prospectName?: string | null
  acceptedAt: string
}
