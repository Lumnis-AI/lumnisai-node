// Sequence content character limits by channel and action
// These limits are enforced during template validation

export interface ContentLimit {
  channel: string
  action: string
  maxCharacters: number
}

/**
 * Content character limits for each channel/action combination
 */
export const CONTENT_LIMITS: ContentLimit[] = [
  { channel: 'linkedin', action: 'connection_request', maxCharacters: 300 },
  { channel: 'linkedin', action: 'message', maxCharacters: 8000 },
  { channel: 'linkedin', action: 'inmail', maxCharacters: 1900 },
  { channel: 'linkedin', action: 'comment_post', maxCharacters: 1250 },
  { channel: 'email', action: 'send', maxCharacters: 50000 },
]

/**
 * Content limits as a lookup map for quick access
 */
export const CONTENT_LIMITS_MAP: Record<string, number> = {
  'linkedin:connection_request': 300,
  'linkedin:message': 8000,
  'linkedin:inmail': 1900,
  'linkedin:comment_post': 1250,
  'email:send': 50000,
}

/**
 * Get the character limit for a channel/action combination
 */
export function getContentLimit(channel: string, action: string): number | undefined {
  return CONTENT_LIMITS_MAP[`${channel}:${action}`]
}
