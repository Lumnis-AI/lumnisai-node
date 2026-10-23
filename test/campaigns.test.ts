/**
 * Basic tests for Campaigns API
 *
 * These tests verify the SDK methods call the correct endpoints with proper
 * parameters. They use mocked HTTP responses.
 */

import type { CampaignActionType, CampaignFunnelStage, CampaignMetricsResponse, CampaignProspectState } from '../src'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { Http } from '../src/core/http'
import { CampaignsResource } from '../src/resources/campaigns'
import { toSnakeCase } from '../src/utils/case-conversion'

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

describe('historical funnel contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stages = [
    'all',
    'engaged',
    'connection_sent',
    'inmail_sent',
    'connected',
    'messaged',
    'replied',
    'meeting_booked',
    'intro_accepted',
    'completed',
    'stopped',
  ] satisfies CampaignFunnelStage[]

  it.each(stages)('forwards %s with state and pagination over HTTP', async (funnelStage) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]))
    vi.stubGlobal('fetch', fetchMock)
    const campaigns = new CampaignsResource(new Http({
      baseUrl: 'https://api.invalid',
      apiPrefix: '/v1',
      headers: { 'X-API-Key': 'test-key' },
      maxRetries: 0,
    }))

    await campaigns.listProspects('campaign/encoded', {
      funnelStage,
      state: 'completed',
      limit: 200,
      offset: 0,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    const request = new URL(url)
    expect(request.pathname).toBe('/v1/campaigns/campaign%2Fencoded/prospects')
    expect(Object.fromEntries(request.searchParams)).toEqual({
      state: 'completed',
      funnel_stage: funnelStage,
      limit: '200',
      offset: '0',
    })
    expect(init.headers['X-API-Key']).toBe('test-key')
  })

  it('keeps unfiltered and state-only requests compatible', async () => {
    const http = createMockHttp()
    const campaigns = new CampaignsResource(http)
    vi.mocked(http.get).mockResolvedValue([])
    await campaigns.listProspects('campaign')
    await campaigns.listProspects('campaign', { state: 'snoozed', limit: 50, offset: 0 })
    expect(http.get).toHaveBeenNthCalledWith(1, '/campaigns/campaign/prospects', { params: {} })
    expect(http.get).toHaveBeenNthCalledWith(2, '/campaigns/campaign/prospects', {
      params: { state: 'snoozed', limit: 50, offset: 0 },
    })
  })

  it('preserves completed lifecycle, completion actions and zero metrics through conversion', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(
      url.endsWith('/metrics')
        ? { total_prospects: 1, active_prospects: 0, completed: 0 }
        : {
            prospect: { id: 'prospect', state: 'completed', last_action_type: 'complete' },
            actions: [{ action_type: 'complete', status: 'executed' }],
            pending_action: null,
          },
    )))
    const campaigns = new CampaignsResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    const detail = await campaigns.getProspectDetail('campaign', 'prospect')
    const metrics = await campaigns.getMetrics('campaign')

    expect(detail.prospect.state).toBe('completed')
    expect(detail.prospect.lastActionType).toBe('complete')
    expect(detail.actions[0]!.actionType).toBe('complete')
    expect(detail.pendingAction).toBeNull()
    expect(metrics).toEqual({ totalProspects: 1, activeProspects: 0, completed: 0 })
    expectTypeOf<'completed'>().toMatchTypeOf<CampaignProspectState>()
    expectTypeOf<'complete'>().toMatchTypeOf<CampaignActionType>()
    expectTypeOf<CampaignMetricsResponse['completed']>().toEqualTypeOf<number | undefined>()
  })

  it('accepts older metrics responses without a completed field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ total_prospects: 0, active_prospects: 0 })))
    const campaigns = new CampaignsResource(new Http({ baseUrl: 'https://api.invalid', maxRetries: 0 }))
    const metrics = await campaigns.getMetrics('campaign')
    expect(metrics.completed).toBeUndefined()
    expect(metrics.activeProspects).toBe(0)
  })
})

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

  describe('campaign CRM context', () => {
    it('sends crm_user_id and crm_company_fields on create', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.post).mockResolvedValue({})

      await campaigns.createCampaign({
        userId: 'user-1',
        name: 'Q1 Outreach',
        playbookId: 'playbook-1',
        crmUserId: 'owner@example.com',
        crmCompanyFields: ['lifecyclestage', 'industry'],
      })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.post).mock.calls[0]![1],
      )
      expect(body.crm_user_id).toBe('owner@example.com')
      expect(body.crm_company_fields).toEqual(['lifecyclestage', 'industry'])
    })

    it('sends crm_company_fields on update', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.put).mockResolvedValue({})

      await campaigns.updateCampaign('campaign-1', {
        crmCompanyFields: ['industry'],
      })

      expect(http.put).toHaveBeenCalledWith('/campaigns/campaign-1', {
        crmCompanyFields: ['industry'],
      })
      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.put).mock.calls[0]![1],
      )
      expect(body).toEqual({ crm_company_fields: ['industry'] })
    })

    it('sends an empty list on update to clear the fields', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.put).mockResolvedValue({})

      await campaigns.updateCampaign('campaign-1', { crmCompanyFields: [] })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.put).mock.calls[0]![1],
      )
      expect(body).toEqual({ crm_company_fields: [] })
    })
  })

  describe('person intelligence guardrail', () => {
    it('sends person_intelligence on create', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.post).mockResolvedValue({})

      await campaigns.createCampaign({
        userId: 'user-1',
        name: 'Q1 Outreach',
        playbookId: 'playbook-1',
        guardrails: { personIntelligence: true },
      })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.post).mock.calls[0]![1],
      )
      expect(body.guardrails).toEqual({ person_intelligence: true })
    })

    it('sends person_intelligence on update', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.put).mockResolvedValue({})

      await campaigns.updateCampaign('campaign-1', {
        guardrails: { personIntelligence: false },
      })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.put).mock.calls[0]![1],
      )
      expect(body).toEqual({ guardrails: { person_intelligence: false } })
    })
  })

  describe('cc emails guardrail', () => {
    it('sends cc_emails on update with the addresses unchanged', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      vi.mocked(http.put).mockResolvedValue({})

      await campaigns.updateCampaign('campaign-1', {
        guardrails: { ccEmails: ['ae.owner@native.com', 'Sales_Lead@native.com'] },
      })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.put).mock.calls[0]![1],
      )
      expect(body).toEqual({
        guardrails: { cc_emails: ['ae.owner@native.com', 'Sales_Lead@native.com'] },
      })
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
    it('lists pending approvals for one campaign', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({ items: [] })

      await campaigns.listPendingApprovals({
        campaignId: 'c-1',
        limit: 500,
        offset: 0,
      })

      expect(http.get).toHaveBeenCalledWith(
        '/campaigns/approvals?campaign_id=c-1&limit=500&offset=0',
      )
    })

    it('lists pending approvals for several campaigns in one call', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({ items: [] })

      await campaigns.listPendingApprovals({
        campaignId: ['c-1', 'c-2'],
        limit: 500,
      })

      expect(http.get).toHaveBeenCalledWith(
        '/campaigns/approvals?campaign_id=c-1&campaign_id=c-2&limit=500',
      )
    })

    it('returns an email card\'s To and CC list', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({
        items: [{ id: 'a-1', recipientEmail: 'alex@acme.com', ccEmails: ['ae@native.com'] }],
      })

      const { items } = await campaigns.listPendingApprovals()

      expect(items[0]?.recipientEmail).toBe('alex@acme.com')
      expect(items[0]?.ccEmails).toEqual(['ae@native.com'])
    })

    it('lists every pending approval when no campaign is given', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({ items: [] })

      await campaigns.listPendingApprovals()

      expect(http.get).toHaveBeenCalledWith('/campaigns/approvals')
    })

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

    it('approves an email with a new To and CC list', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.post).mockResolvedValue({ success: true })

      await campaigns.approveAction('action-123', {
        userId: 'user-1',
        recipientEmail: 'alex.kim@acme.com',
        ccEmails: [],
      })

      const body = toSnakeCase<Record<string, unknown>>(
        vi.mocked(http.post).mock.calls[0]![1],
      )
      expect(body).toEqual({
        user_id: 'user-1',
        recipient_email: 'alex.kim@acme.com',
        cc_emails: [],
      })
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

  describe('actions', () => {
    it('filters actions by the call_phone action type', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)

      vi.mocked(http.get).mockResolvedValue({ actions: [], total: 0 })

      await campaigns.listActions('camp-1', { actionType: 'call_phone' })

      expect(http.get).toHaveBeenCalledWith('/campaigns/camp-1/actions', {
        params: { action_type: 'call_phone' },
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

    it('upserts campaign-owned assets and links them', async () => {
      const http = createMockHttp()
      const campaigns = new CampaignsResource(http)
      const request = {
        items: [{
          name: 'Calendly Link',
          key: 'booking_link',
          type: 'link' as const,
          value: 'https://calendly.com/jane/15min',
        }],
      }

      vi.mocked(http.post).mockResolvedValue({ items: [] })

      await campaigns.upsertCampaignAssets('c-123', request)

      expect(http.post).toHaveBeenCalledWith(
        '/campaigns/c-123/assets/upsert',
        request,
      )
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
