import { afterEach, describe, expect, it, vi } from 'vitest'
import { Http } from '../src/core/http'
import { EmailResource } from '../src/resources/email'

describe('automatic inbox eligibility over HTTP', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([false, true, undefined])('preserves the initial connect setting %s', async (allowed) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ redirect_url: 'https://auth.invalid' }))
    vi.stubGlobal('fetch', fetchMock)
    const email = new EmailResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    await email.connectInbox({
      userId: 'owner@example.com',
      redirectUrl: 'https://app.invalid',
      allowAutomaticOutreach: allowed,
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.allow_automatic_outreach).toBe(allowed)
    expect(Object.hasOwn(body, 'allow_automatic_outreach')).toBe(allowed !== undefined)
  })

  it.each([false, true])('writes and returns the explicit mailbox setting %s', async (allowed) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      mailbox_id: 'mailbox',
      allow_automatic_outreach: allowed,
    }))
    vi.stubGlobal('fetch', fetchMock)
    const email = new EmailResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    const result = await email.updateMailbox('org', 'mailbox', 'owner@example.com', { allowAutomaticOutreach: allowed })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ allow_automatic_outreach: allowed })
    expect(result.allowAutomaticOutreach).toBe(allowed)
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
  })

  it('retains false in discovered inboxes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      inboxes: [{ mailbox_id: 'mailbox', allow_automatic_outreach: false }],
      total: 1,
    })))
    const email = new EmailResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    expect((await email.listInboxes({ userId: 'owner@example.com', kind: 'all' })).inboxes[0].allowAutomaticOutreach).toBe(false)
  })
})
