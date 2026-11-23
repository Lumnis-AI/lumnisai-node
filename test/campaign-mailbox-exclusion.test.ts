/**
 * Tests that campaign create and update pass the excluded mailbox list
 * through to the right endpoint.
 */

import type { Http } from '../src/core/http'
import { describe, expect, it, vi } from 'vitest'
import { CampaignsResource } from '../src/resources/campaigns'

function createCampaigns(): { http: Http, campaigns: CampaignsResource } {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as Http
  return { http, campaigns: new CampaignsResource(http) }
}

describe('campaign mailbox exclusion', () => {
  it('sends the excluded mailboxes on create', async () => {
    const { http, campaigns } = createCampaigns()
    vi.mocked(http.post).mockResolvedValue({ id: 'campaign-1', excludedEmailMailboxIds: ['mb-1'] })
    const campaign = {
      userId: 'owner@example.com',
      name: 'Follow up',
      playbookId: 'playbook-1',
      excludedEmailMailboxIds: ['mb-1', 'mb-2'],
    }

    await campaigns.createCampaign(campaign)

    expect(http.post).toHaveBeenCalledWith('/campaigns', campaign)
  })

  it.each([[['mb-1']], [[]]])('sends the excluded mailboxes %j on update', async (ids) => {
    const { http, campaigns } = createCampaigns()
    vi.mocked(http.put).mockResolvedValue({ id: 'campaign-1', excludedEmailMailboxIds: ids })

    const result = await campaigns.updateCampaign('campaign-1', { excludedEmailMailboxIds: ids })

    expect(http.put).toHaveBeenCalledWith(
      '/campaigns/campaign-1',
      { excludedEmailMailboxIds: ids },
    )
    expect(result.excludedEmailMailboxIds).toEqual(ids)
  })
})
