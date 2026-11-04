import type { CampaignCreate, CampaignResponse, CampaignUpdate } from '../src/types/campaigns'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { Http } from '../src/core/http'
import { CampaignsResource } from '../src/resources/campaigns'

describe('campaign inbox selection over HTTP', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['mailbox-1', null, undefined])('round trips the saved selection %s', async (selection) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      id: 'campaign-1',
      email_mailbox_id: selection ?? null,
    }))
    vi.stubGlobal('fetch', fetchMock)
    const campaigns = new CampaignsResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    const request: CampaignCreate = {
      userId: 'owner@example.com',
      name: 'Follow up',
      playbookId: 'playbook',
      emailPersonaId: 'persona',
      emailMailboxId: selection,
    }
    const result = await campaigns.createCampaign(request)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.email_persona_id).toBe('persona')
    expect(body.email_mailbox_id).toBe(selection)
    expect(Object.hasOwn(body, 'email_mailbox_id')).toBe(selection !== undefined)
    expect(result.emailMailboxId).toBe(selection ?? null)
    expectTypeOf<CampaignResponse['emailMailboxId']>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<'emailMailboxId' extends keyof CampaignUpdate ? true : false>().toEqualTypeOf<false>()
  })

  it('returns the persisted selection on individual and list reads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'campaign', email_mailbox_id: 'mailbox' }))
      .mockResolvedValueOnce(Response.json({ items: [{ id: 'campaign', email_mailbox_id: 'mailbox' }], total: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const campaigns = new CampaignsResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    expect((await campaigns.getCampaign('campaign')).emailMailboxId).toBe('mailbox')
    expect((await campaigns.listCampaigns()).items[0].emailMailboxId).toBe('mailbox')
  })
})
