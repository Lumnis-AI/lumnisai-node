// Webhook types for messaging and sequence events

/**
 * Webhook event types
 */
export type WebhookEvent =
  | 'message.sent'
  | 'message.received'
  | 'connection.accepted'
  | 'sequence.step_completed'
  | 'sequence.approval_needed'
  | 'sequence.execution_completed'
  | 'sequence.execution_failed'

/**
 * Base webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent
  data:
    | MessageSentData
    | MessageReceivedData
    | ConnectionAcceptedData
    | SequenceStepCompletedData
    | SequenceApprovalNeededData
    | SequenceExecutionCompletedData
    | SequenceExecutionFailedData
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

// ==================== Sequence Webhook Types ====================

/**
 * Data payload for sequence.step_completed event
 * Triggered when a sequence step finishes executing (sent, completed, or skipped)
 */
export interface SequenceStepCompletedData {
  executionId: string
  tenantId: string
  projectId: string | null
  prospectId: string
  prospectExternalId: string | null
  step: {
    key: string
    name: string
    channel: string
    action: string
    status: string
    completedAt: string
  }
  nextStep: {
    key: string
    scheduledAt: string
  } | null
}

/**
 * Data payload for sequence.approval_needed event
 * Triggered when a step requires human approval before sending
 */
export interface SequenceApprovalNeededData {
  executionId: string
  stepExecutionId: string
  tenantId: string
  projectId: string | null
  prospectId: string
  prospectExternalId: string | null
  step: {
    key: string
    name: string
    channel: string
    action: string
  }
  content: string | null
  aiPrecheck: {
    result: string
    reason: string | null
  } | null
  requestedAt: string
}

/**
 * Data payload for sequence.execution_completed event
 * Triggered when a sequence execution finishes (success or exit)
 */
export interface SequenceExecutionCompletedData {
  executionId: string
  tenantId: string
  projectId: string | null
  prospectId: string
  prospectExternalId: string | null
  template: {
    id: string
    name: string
  }
  status: string
  exitReason: string | null
  outcome: string | null
  summary: {
    stepsCompleted: number
    durationSeconds: number | null
  }
  startedAt: string | null
  completedAt: string
}

/**
 * Data payload for sequence.execution_failed event
 * Triggered when a sequence execution fails due to an error
 */
export interface SequenceExecutionFailedData {
  executionId: string
  tenantId: string
  projectId: string | null
  prospectId: string
  prospectExternalId: string | null
  template: {
    id: string
    name: string
  }
  failedStep: string | null
  error: {
    type: string
    message: string
  }
  failedAt: string
}
