/**
 * Basic tests for Campaigns API
 *
 * These tests verify the SDK methods call the correct endpoints with proper
 * parameters. They use mocked HTTP responses.
 */

import type { Http } from '../src/core/http'
import { describe, expect, it, vi } from 'vitest'
import { CampaignsResource } from '../src/resources/campaigns'

// Mock HTTP client
function createMockHttp(): Http {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as Http
}

describe('campaigns', () => {
  describe('playbooks', () => {
    it('creates playbook with correct endpoint and payload', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        id: 'playbook-123',
        name: 'Test Playbook',
        version: 1,
      })

      const result = await campaigns.createPlaybook({
        userId: 'user-1',
        name: 'Test Playbook',
        content: 'Be casual and ask questions',
      })

      expect(http.post).toHaveBeenCalledWith('/campaigns/playbooks', {
        userId: 'user-1',
        name: 'Test Playbook',
        content: 'Be casual and ask questions',
      })
      expect(result.id).toBe('playbook-123')
    })

    it('lists playbooks with active filter', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])

      await campaigns.listPlaybooks({ activeOnly: true })

      expect(http.get).toHaveBeenCalledWith('/campaigns/playbooks', {
        params: { active_only: true },
      })
    })

    it('archives playbook with proper URL encoding', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.delete).mockResolvedValue({
        success: true,
        playbook: { id: 'p-123' },
      })

      await campaigns.archivePlaybook('playbook-with-special-chars')

      expect(http.delete).toHaveBeenCalledWith(
        '/campaigns/playbooks/playbook-with-special-chars',
      )
    })
  })

  describe('campaigns', () => {
    it('creates campaign with all required fields', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        id: 'campaign-123',
        status: 'draft',
      })

      await campaigns.createCampaign({
        userId: 'user-1',
        name: 'Q1 Outreach',
        playbookId: 'playbook-1',
        guardrails: {
          maxActionsPerDay: 25,
          maxFollowUps: 1,
        },
      })

      expect(http.post).toHaveBeenCalledWith('/campaigns', {
        userId: 'user-1',
        name: 'Q1 Outreach',
        playbookId: 'playbook-1',
        guardrails: {
          maxActionsPerDay: 25,
          maxFollowUps: 1,
        },
      })
    })

    it('starts campaign with correct endpoint', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        id: 'c-123',
        status: 'active',
      })

      await campaigns.startCampaign('c-123')

      expect(http.post).toHaveBeenCalledWith('/campaigns/c-123/start')
    })

    it('pauses campaign with optional reason', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        id: 'c-123',
        status: 'paused',
      })

      await campaigns.pauseCampaign('c-123', 'End of week')

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/c-123/pause',
        undefined,
        { params: { reason: 'End of week' } },
      )
    })
  })

  describe('prospects', () => {
    it('adds prospects with deduplication', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        added: 2,
        skipped: 1,
        warnings: [
          {
            prospectId: 'p-3',
            warnings: ['previously_contacted', 'active_sequence'],
          },
        ],
      })

      const result = await campaigns.addProspects('c-123', {
        prospects: [
          { prospectId: 'p-1', prospectExternalId: 'linkedin.com/in/user1' },
          { prospectId: 'p-2', prospectExternalId: 'linkedin.com/in/user2' },
          { prospectId: 'p-3', prospectExternalId: 'linkedin.com/in/user3' },
        ],
      })

      expect(result.added).toBe(2)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].warnings).toContain('previously_contacted')
    })

    it('lists prospects with state filter', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue([
        { id: 'cp-1', state: 'replied' },
      ])

      await campaigns.listProspects('c-123', {
        state: 'replied',
        limit: 20,
        offset: 0,
      })

      expect(http.get).toHaveBeenCalledWith('/campaigns/c-123/prospects', {
        params: { state: 'replied', limit: 20, offset: 0 },
      })
    })

    it('transfers selected prospects to another campaign', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        transferred: 1,
        skipped: [
          { prospectId: 'cp-2', reason: 'duplicate_in_target' },
        ],
      })

      const result = await campaigns.transferProspects('c-123', {
        targetCampaignId: 'c-456',
        prospectIds: ['cp-1', 'cp-2'],
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/c-123/prospects/transfer',
        { targetCampaignId: 'c-456', prospectIds: ['cp-1', 'cp-2'] },
      )
      expect(result.transferred).toBe(1)
      expect(result.skipped[0].reason).toBe('duplicate_in_target')
    })

    it('transfers the whole campaign when prospectIds is omitted', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ transferred: 5, skipped: [] })

      await campaigns.transferProspects('c-123', {
        targetCampaignId: 'c-456',
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/c-123/prospects/transfer',
        { targetCampaignId: 'c-456' },
      )
    })

    it('pauses prospects selected by state', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ affected: 149 })

      const result = await campaigns.pauseProspects('c-123', {
        states: ['not_connected'],
        reason: 'Hold connection requests',
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/c-123/prospects/pause',
        { states: ['not_connected'], reason: 'Hold connection requests' },
      )
      expect(result.affected).toBe(149)
    })

    it('resumes selected prospects or all paused prospects', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ affected: 2 })

      await campaigns.resumeProspects('c-123', {
        prospectIds: ['cp-1', 'cp-2'],
      })
      await campaigns.resumeProspects('c-123')

      expect(http.post).toHaveBeenNthCalledWith(
        1,
        '/campaigns/c-123/prospects/resume',
        { prospectIds: ['cp-1', 'cp-2'] },
      )
      expect(http.post).toHaveBeenNthCalledWith(
        2,
        '/campaigns/c-123/prospects/resume',
        {},
      )
    })
  })

  describe('approvals', () => {
    it('approves action with edit', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ success: true })

      await campaigns.approveAction('action-123', {
        userId: 'user-1',
        notes: 'Edited for clarity',
        modifiedContent: 'New version of the message',
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/actions/action-123/approve',
        {
          userId: 'user-1',
          notes: 'Edited for clarity',
          modifiedContent: 'New version of the message',
        },
      )
    })

    it('rejects action with reason', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ success: true })

      await campaigns.rejectAction('action-123', {
        userId: 'user-1',
        reason: 'Off-brand tone',
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/actions/action-123/reject',
        {
          userId: 'user-1',
          reason: 'Off-brand tone',
        },
      )
    })

    it('bulk approves multiple actions', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        results: [
          { actionId: 'a-1', success: true },
          { actionId: 'a-2', success: true },
        ],
      })

      await campaigns.bulkApprovals({
        userId: 'user-1',
        items: [
          { actionId: 'a-1', action: 'approve', notes: 'LGTM' },
          { actionId: 'a-2', action: 'skip', reason: 'Not relevant' },
        ],
      })

      expect(http.post).toHaveBeenCalledWith('/campaigns/approvals/bulk', {
        userId: 'user-1',
        items: [
          { actionId: 'a-1', action: 'approve', notes: 'LGTM' },
          { actionId: 'a-2', action: 'skip', reason: 'Not relevant' },
        ],
      })
    })
  })

  describe('assets', () => {
    it('creates asset with key validation', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        id: 'asset-123',
        key: 'booking_link',
      })

      await campaigns.createAsset({
        userId: 'user-1',
        name: 'Calendly Link',
        key: 'booking_link',
        type: 'link',
        value: 'https://calendly.com/jane/15min',
      })

      expect(http.post).toHaveBeenCalledWith('/assets', {
        userId: 'user-1',
        name: 'Calendly Link',
        key: 'booking_link',
        type: 'link',
        value: 'https://calendly.com/jane/15min',
      })
    })

    it('links assets to campaign', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ linked: 2 })

      await campaigns.linkAssets('c-123', {
        assetIds: ['asset-1', 'asset-2'],
      })

      expect(http.post).toHaveBeenCalledWith('/campaigns/c-123/assets', {
        assetIds: ['asset-1', 'asset-2'],
      })
    })
  })

  describe('metrics', () => {
    it('gets campaign metrics', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({
        totalProspects: 19,
        funnel: {
          engaged: { count: 15, rate: 0.7895 },
          connected: { count: 10, rate: 0.5263 },
          replied: { count: 3, rate: 0.1579 },
          meeting_booked: { count: 1, rate: 0.0526 },
        },
        stopped: {
          total: 2,
          byReason: { unresponsive: 1, manual: 1 },
        },
        pendingApproval: 3,
        actionSummary: {
          total_actions: 45,
          executed: 40,
          pending_approval: 3,
        },
        actionTypes: {},
      })

      const metrics = await campaigns.getMetrics('c-123')

      expect(http.get).toHaveBeenCalledWith('/campaigns/c-123/metrics')
      expect(metrics.totalProspects).toBe(19)
      expect(metrics.funnel.meeting_booked.rate).toBe(0.0526)
    })
  })

  describe('outcome recording', () => {
    it('records meeting booked outcome', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({
        success: true,
        outcome: { type: 'meeting_booked' },
      })

      await campaigns.recordOutcome('action-123', {
        userId: 'user-1',
        outcome: 'meeting_booked',
        notes: 'Meeting confirmed for Thursday 2pm',
      })

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/actions/action-123/record-outcome',
        {
          userId: 'user-1',
          outcome: 'meeting_booked',
          notes: 'Meeting confirmed for Thursday 2pm',
        },
      )
    })
  })
})
