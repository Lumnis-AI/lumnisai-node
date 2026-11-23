/**
 * Tests for adding and removing sending domains, removing one mailbox,
 * and moving a mailbox to another sender persona.
 */

import type { Http } from '../src/core/http'
import { describe, expect, it, vi } from 'vitest'
import { EmailResource } from '../src/resources/email'

const PARAMS = { params: { user_id: 'user@example.com' } }

function createEmail(): { http: Http, email: EmailResource } {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as Http
  return { http, email: new EmailResource(http) }
}

describe('email domains and mailboxes', () => {
  it('adds domains with a count', async () => {
    const { http, email } = createEmail()
    vi.mocked(http.post).mockResolvedValue({ message: 'ok' })

    await email.addDomains('org-123', 'user@example.com', { count: 3 })

    expect(http.post).toHaveBeenCalledWith(
      '/email/organizations/org-123/domains',
      { count: 3 },
      PARAMS,
    )
  })

  it('removes one domain by name', async () => {
    const { http, email } = createEmail()
    vi.mocked(http.post).mockResolvedValue({ message: 'ok' })

    await email.teardownDomain('org-123', 'acme-mail.com', 'user@example.com')

    expect(http.post).toHaveBeenCalledWith(
      '/email/organizations/org-123/domains/acme-mail.com/teardown',
      {},
      PARAMS,
    )
  })

  it('removes one mailbox', async () => {
    const { http, email } = createEmail()
    vi.mocked(http.post).mockResolvedValue({ message: 'ok' })

    await email.teardownMailbox('org-123', 'mb-1', 'user@example.com')

    expect(http.post).toHaveBeenCalledWith(
      '/email/organizations/org-123/mailboxes/mb-1/teardown',
      {},
      PARAMS,
    )
  })

  it('moves a mailbox to another persona', async () => {
    const { http, email } = createEmail()
    vi.mocked(http.post).mockResolvedValue({
      mailboxId: 'mb-1',
      personaId: 'persona-2',
      emailAddress: 'jane.doe@acme-mail.com',
    })

    const result = await email.moveMailbox('org-123', 'mb-1', 'user@example.com', {
      personaId: 'persona-2',
    })

    expect(http.post).toHaveBeenCalledWith(
      '/email/organizations/org-123/mailboxes/mb-1/move',
      { personaId: 'persona-2' },
      PARAMS,
    )
    expect(result.emailAddress).toBe('jane.doe@acme-mail.com')
  })
})
