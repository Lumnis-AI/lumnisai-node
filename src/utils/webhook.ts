import { Buffer } from 'node:buffer'
// Webhook signature verification utility
import crypto from 'node:crypto'

/**
 * Verify webhook signature using HMAC SHA-256
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from x-webhook-signature header
 * @param secret - Shared secret key (must match backend's FRONTEND_WEBHOOK_SECRET)
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyWebhookSignature(
 *   requestBody,
 *   request.headers.get('x-webhook-signature') || '',
 *   process.env.MESSAGING_WEBHOOK_SECRET!
 * )
 *
 * if (!isValid) {
 *   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
 * }
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  )
}
