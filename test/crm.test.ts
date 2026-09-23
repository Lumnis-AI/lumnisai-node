/**
 * Tests for CRM Sync API resource.
 *
 * Verifies the SDK methods call the correct endpoints with the right
 * request bodies. Uses mocked HTTP responses; HTTP-layer
 * camelCase ↔ snake_case conversion is exercised end-to-end in the
 * core http tests.
 */

import type { Http } from '../src/core/http'
import type { CrmHubspotCompanySearchRequest } from '../src/types/crm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LumnisClient } from '../src/index'
import { CrmResource } from '../src/resources/crm'

function createMockHttp(): Http {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  } as unknown as Http
}

describe('crm', () => {
  describe('syncProspect', () => {
    it('posts to /crm/prospects/sync with the request body verbatim', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        action: 'created',
        crmRecordId: 'rec_123',
        crmUrl: 'https://app.attio.com/_/people/rec_123',
      })

      const result = await crm.syncProspect({
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
      })

      expect(http.post).toHaveBeenCalledWith('/crm/prospects/sync', {
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
      })
      expect(result.action).toBe('created')
      expect(result.crmRecordId).toBe('rec_123')
      expect(result.crmUrl).toContain('attio.com')
    })

    it('returns linked action when the prospect is already in the CRM', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        action: 'linked',
        crmRecordId: 'rec_existing',
        crmUrl: 'https://app.attio.com/_/people/rec_existing',
      })

      const result = await crm.syncProspect({
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
      })

      expect(result.action).toBe('linked')
    })

    it('passes contact attributes and custom CRM fields through', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        action: 'created',
        crmRecordId: 'rec_123',
        crmUrl: 'https://app.attio.com/_/people/rec_123',
      })

      await crm.syncProspect({
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
        contact: {
          fullName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          jobTitle: 'VP of Sales',
          company: 'Acme',
          location: 'New York, NY',
        },
        customFields: { lead_source: 'Lumnis' },
      })

      expect(http.post).toHaveBeenCalledWith('/crm/prospects/sync', {
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
        contact: {
          fullName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          jobTitle: 'VP of Sales',
          company: 'Acme',
          location: 'New York, NY',
        },
        customFields: { lead_source: 'Lumnis' },
      })
    })

    it('propagates upstream errors thrown by the http layer', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockRejectedValue(
        Object.assign(new Error('crm_not_connected'), { statusCode: 409 }),
      )

      await expect(
        crm.syncProspect({
          userId: 'user@example.com',
          provider: 'hubspot',
          linkedinUrl: 'https://linkedin.com/in/jane-doe',
        }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('matchBatch', () => {
    it('posts to /crm/prospects/match-batch with the URL list', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        matches: [
          {
            linkedinUrl: 'https://www.linkedin.com/in/a/',
            linked: true,
            crmRecordId: 'rec_a',
            crmUrl: 'https://app.attio.com/_/people/rec_a',
          },
          {
            linkedinUrl: 'https://www.linkedin.com/in/b/',
            linked: false,
          },
        ],
      })

      const result = await crm.matchBatch({
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrls: [
          'https://www.linkedin.com/in/a/',
          'https://www.linkedin.com/in/b/',
        ],
      })

      expect(http.post).toHaveBeenCalledWith('/crm/prospects/match-batch', {
        userId: 'user@example.com',
        provider: 'attio',
        linkedinUrls: [
          'https://www.linkedin.com/in/a/',
          'https://www.linkedin.com/in/b/',
        ],
      })
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0].linked).toBe(true)
      expect(result.matches[0].crmRecordId).toBe('rec_a')
      expect(result.matches[1].linked).toBe(false)
      expect(result.matches[1].crmRecordId).toBeUndefined()
    })

    it('preserves input ordering when echoing matches', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      const inputs = ['https://linkedin.com/in/x', 'https://linkedin.com/in/y']
      vi.mocked(http.post).mockResolvedValue({
        matches: inputs.map(url => ({ linkedinUrl: url, linked: false })),
      })

      const result = await crm.matchBatch({
        userId: 'user@example.com',
        provider: 'hubspot',
        linkedinUrls: inputs,
      })

      expect(result.matches.map(m => m.linkedinUrl)).toEqual(inputs)
    })
  })

  describe('accountContextBatch', () => {
    it('posts candidates to /crm/account-context/batch and returns account context', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        results: [{
          inputKey: 'candidate-123',
          salesState: 'active_pipeline',
          providers: [{
            provider: 'hubspot',
            personPresence: [],
            accountRef: 'hubspot:company-1',
            matchMethod: 'exact_domain',
            matchConfidence: 'high',
            salesState: 'active_pipeline',
            reasonCode: 'ACTIVE_ACCOUNT_DEAL',
            coverageStatus: 'complete',
          }],
        }],
        accounts: [{
          accountRef: 'hubspot:company-1',
          provider: 'hubspot',
          accountId: 'company-1',
          displayName: 'Acme',
          recordUrl: 'https://app.hubspot.com/contacts/1/company/company-1',
          domains: ['acme.example'],
          linkedinUrl: 'https://www.linkedin.com/company/acme/',
          website: 'https://acme.example',
          industry: 'Software',
          location: 'New York, NY',
          lifecycleStage: 'customer',
          contactCount: 1,
          contactPreview: [{
            personId: 'contact-1',
            displayName: 'Alex Buyer',
            recordUrl: 'https://app.hubspot.com/contacts/1/contact/contact-1',
          }],
          dealCount: 1,
          dealPreview: [{
            dealId: 'deal-1',
            displayName: 'Acme expansion',
            pipelineId: 'default',
            pipelineLabel: 'Sales Pipeline',
            stageId: 'appointmentscheduled',
            stageLabel: 'Appointment scheduled',
            stageClass: 'active',
            previousPipelineId: 'default',
            previousPipelineLabel: 'Sales Pipeline',
            previousStageId: 'qualifiedtobuy',
            previousStageLabel: 'Qualified to buy',
            stageChangedAt: '2026-08-23T11:30:00Z',
            stageChangeTimePrecision: 'provider_timestamp',
            associationKind: 'direct',
            associationConfidence: 'high',
            amount: '25000',
            closeDate: '2026-09-30T00:00:00Z',
            participantCount: 1,
            participantPreview: [{
              personId: 'contact-1',
              displayName: 'Alex Buyer',
            }],
          }],
        }],
        providerCoverage: [{
          provider: 'hubspot',
          accountSource: 'complete',
          personSource: 'complete',
          dealSource: 'complete',
          checkedAt: '2026-08-23T12:00:00Z',
          freshUntil: '2026-08-23T12:05:00Z',
          generation: 3,
        }],
      })

      const result = await crm.accountContextBatch({
        userId: 'owner@example.com',
        candidates: [{
          inputKey: 'candidate-123',
          linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
          companyName: 'Acme',
          companyDomain: 'acme.example',
          companyLinkedinUrl: 'https://www.linkedin.com/company/acme/',
        }],
      })

      expect(http.post).toHaveBeenCalledWith('/crm/account-context/batch', {
        userId: 'owner@example.com',
        candidates: [{
          inputKey: 'candidate-123',
          linkedinUrl: 'https://www.linkedin.com/in/jane-doe/',
          companyName: 'Acme',
          companyDomain: 'acme.example',
          companyLinkedinUrl: 'https://www.linkedin.com/company/acme/',
        }],
      })
      expect(result.results[0].salesState).toBe('active_pipeline')
      expect(result.accounts[0].domains).toEqual(['acme.example'])
      expect(result.accounts[0].lifecycleStage).toBe('customer')
      expect(result.accounts[0].dealPreview[0].stageClass).toBe('active')
      expect(result.accounts[0].dealPreview[0].previousStageId).toBe('qualifiedtobuy')
      expect(result.accounts[0].dealPreview[0].stageChangeTimePrecision).toBe('provider_timestamp')
      expect(result.accounts[0].dealPreview[0].amount).toBe('25000')
      expect(result.providerCoverage[0].generation).toBe(3)
    })
  })

  describe('syncContacts', () => {
    it('posts to /crm/contacts/sync', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        status: 'started',
        provider: 'hubspot',
      })

      const result = await crm.syncContacts({
        userId: 'owner@example.com',
        provider: 'hubspot',
      })

      expect(http.post).toHaveBeenCalledWith('/crm/contacts/sync', {
        userId: 'owner@example.com',
        provider: 'hubspot',
      })
      expect(result.status).toBe('started')
    })
  })

  describe('getContactsSyncStatus', () => {
    it('gets /crm/contacts/sync-status with query params', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.get).mockResolvedValue({
        provider: 'attio',
        connected: true,
        syncInProgress: false,
        syncedCount: 42,
      })

      const result = await crm.getContactsSyncStatus('owner@example.com', 'attio')

      expect(http.get).toHaveBeenCalledWith('/crm/contacts/sync-status', {
        params: { user_id: 'owner@example.com', provider: 'attio' },
      })
      expect(result.syncedCount).toBe(42)
    })
  })

  describe('exclusion grants', () => {
    it('posts grant to /crm/exclusion-grants', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        memberUserId: 'member-id',
        ownerUserId: 'owner-id',
        status: 'granted',
      })

      const result = await crm.grantExclusionGrant({
        memberUserId: 'member@example.com',
        ownerUserId: 'owner@example.com',
      })

      expect(http.post).toHaveBeenCalledWith('/crm/exclusion-grants', {
        memberUserId: 'member@example.com',
        ownerUserId: 'owner@example.com',
      })
      expect(result.status).toBe('granted')
    })

    it('deletes grant via /crm/exclusion-grants with body', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.delete).mockResolvedValue({
        memberUserId: 'member-id',
        ownerUserId: 'owner-id',
        status: 'revoked',
      })

      const result = await crm.revokeExclusionGrant({
        memberUserId: 'member@example.com',
        ownerUserId: 'owner@example.com',
      })

      expect(http.delete).toHaveBeenCalledWith('/crm/exclusion-grants', {
        body: {
          memberUserId: 'member@example.com',
          ownerUserId: 'owner@example.com',
        },
      })
      expect(result.status).toBe('revoked')
    })

    it('lists grants for a member', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.get).mockResolvedValue({
        memberUserId: 'member-id',
        ownerUserIds: ['owner-a', 'owner-b'],
      })

      const result = await crm.listExclusionGrants('member@example.com')

      expect(http.get).toHaveBeenCalledWith('/crm/exclusion-grants', {
        params: { member_user_id: 'member@example.com' },
      })
      expect(result.ownerUserIds).toHaveLength(2)
    })
  })

  describe('company reads', () => {
    it('gets /crm/companies/properties with snake_case query params', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.get).mockResolvedValue({
        provider: 'hubspot',
        properties: [],
        nextCursor: null,
      })

      await crm.getCompanyProperties({
        userId: 'member@example.com',
        provider: 'hubspot',
        propertyName: 'industry',
        crmUserId: 'owner@example.com',
      })

      expect(http.get).toHaveBeenCalledWith('/crm/companies/properties', {
        params: {
          user_id: 'member@example.com',
          provider: 'hubspot',
          property_name: 'industry',
          crm_user_id: 'owner@example.com',
        },
      })
    })

    it('omits the optional properties params when they are not supplied', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.get).mockResolvedValue({
        provider: 'attio',
        properties: [],
        nextCursor: null,
      })

      await crm.getCompanyProperties({ userId: 'owner@example.com', provider: 'attio' })

      expect(http.get).toHaveBeenCalledWith('/crm/companies/properties', {
        params: {
          user_id: 'owner@example.com',
          provider: 'attio',
          property_name: undefined,
          crm_user_id: undefined,
        },
      })
    })

    it('posts a native search and exempts filters/properties/owners from case conversion', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        provider: 'hubspot',
        companies: [],
        nextCursor: null,
        total: 0,
      })

      const request: CrmHubspotCompanySearchRequest = {
        userId: 'owner@example.com',
        provider: 'hubspot',
        filters: {
          filterGroups: [{
            filters: [
              { propertyName: 'domain', operator: 'CONTAINS_TOKEN', value: 'acme' },
              { propertyName: 'hs_lead_status', operator: 'IN', values: ['OPEN'] },
            ],
          }],
        },
        properties: ['numberofemployees'],
        limit: 50,
      }

      await crm.searchCompanies(request)

      expect(http.post).toHaveBeenCalledWith('/crm/companies/search', request, {
        passthroughKeys: ['filters', 'properties', 'owners'],
      })
    })

    it('returns an empty page as a result rather than an error', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      vi.mocked(http.post).mockResolvedValue({
        provider: 'attio',
        companies: [],
        nextCursor: null,
        total: null,
      })

      const page = await crm.searchCompanies({
        userId: 'owner@example.com',
        provider: 'attio',
        filters: { name: { $contains: 'Acme' } },
      })

      expect(page.companies).toEqual([])
      expect(page.nextCursor).toBeNull()
    })

    it('round-trips a cursor without changing the rest of the query', async () => {
      const http = createMockHttp()
      const crm = new CrmResource(http)

      const request: CrmHubspotCompanySearchRequest = {
        userId: 'owner@example.com',
        provider: 'hubspot',
        filters: { filterGroups: [] },
      }

      vi.mocked(http.post).mockResolvedValue({
        provider: 'hubspot',
        companies: [{ id: '7', name: 'Acme', domain: 'acme.com', properties: {} }],
        nextCursor: '7',
        total: 2,
      })
      const first = await crm.searchCompanies(request)

      vi.mocked(http.post).mockResolvedValue({
        provider: 'hubspot',
        companies: [{ id: '9', name: 'Acme EU', domain: 'acme.eu', properties: {} }],
        nextCursor: null,
        total: null,
      })
      const second = await crm.searchCompanies({ ...request, cursor: first.nextCursor })

      expect(vi.mocked(http.post).mock.calls[1][1]).toEqual({ ...request, cursor: '7' })
      expect(second.nextCursor).toBeNull()
    })
  })
})

/**
 * The company routes are the only place where request and response keys are
 * external names rather than Lumnis fields, so they go through the real http
 * layer here: a `filter_groups` on the wire is a 422 from the API, and a
 * `hsObjectId` coming back is a property the caller never asked for.
 */
describe('crm company reads over the wire', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  afterEach(() => {
    fetchMock.mockReset()
  })

  function client(): LumnisClient {
    return new LumnisClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      maxRetries: 0,
    })
  }

  function respondWith(payload: unknown): void {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => payload,
    } as Response)
  }

  function sentBody(): any {
    return JSON.parse(fetchMock.mock.calls[0][1].body)
  }

  it('sends HubSpot filter syntax verbatim and snake-cases Lumnis fields', async () => {
    respondWith({ provider: 'hubspot', companies: [], next_cursor: null, total: 0 })

    await client().crm.searchCompanies({
      userId: 'member@example.com',
      crmUserId: 'owner@example.com',
      provider: 'hubspot',
      filters: {
        filterGroups: [{
          filters: [
            { propertyName: 'numberofemployees', operator: 'BETWEEN', value: '10', highValue: '50' },
            { propertyName: 'hs_lead_status', operator: 'IN', values: ['OPEN', 'IN_PROGRESS'] },
          ],
        }],
      },
      properties: ['annualrevenue'],
      limit: 25,
    })

    expect(sentBody()).toEqual({
      user_id: 'member@example.com',
      crm_user_id: 'owner@example.com',
      provider: 'hubspot',
      filters: {
        filterGroups: [{
          filters: [
            { propertyName: 'numberofemployees', operator: 'BETWEEN', value: '10', highValue: '50' },
            { propertyName: 'hs_lead_status', operator: 'IN', values: ['OPEN', 'IN_PROGRESS'] },
          ],
        }],
      },
      properties: ['annualrevenue'],
      limit: 25,
    })
  })

  it('sends Attio operator keys and nested filter paths verbatim', async () => {
    respondWith({ provider: 'attio', companies: [], next_cursor: null, total: null })

    await client().crm.searchCompanies({
      userId: 'owner@example.com',
      provider: 'attio',
      filters: {
        $and: [
          { employee_range: { $gte: 25 } },
          { categories: { option: { $eq: 'opt_123' } } },
        ],
      },
    })

    expect(sentBody().filters).toEqual({
      $and: [
        { employee_range: { $gte: 25 } },
        { categories: { option: { $eq: 'opt_123' } } },
      ],
    })
  })

  it('camel-cases envelope fields but keeps CRM property names as returned', async () => {
    respondWith({
      provider: 'hubspot',
      companies: [{
        id: '7',
        name: 'Acme',
        domain: 'acme.com',
        properties: {
          hs_object_id: '7',
          annual_revenue_2024: '1000000',
          numberofemployees: '42',
        },
      }],
      next_cursor: '7',
      total: 12,
    })

    const page = await client().crm.searchCompanies({
      userId: 'owner@example.com',
      provider: 'hubspot',
    })

    expect(page.nextCursor).toBe('7')
    expect(page.total).toBe(12)
    expect(page.companies[0].properties).toEqual({
      hs_object_id: '7',
      annual_revenue_2024: '1000000',
      numberofemployees: '42',
    })
  })

  it('keeps owner field names as returned and resolves them per company', async () => {
    respondWith({
      provider: 'hubspot',
      companies: [
        {
          id: '7',
          name: 'Acme',
          domain: 'acme.com',
          properties: { hs_ideal_customer_profile: 'tier_1', hubspot_owner_id: '123' },
          owners: { hubspot_owner_id: { id: '123', name: 'Jane Doe', email: 'jane@x.com' } },
        },
        {
          id: '8',
          name: 'Globex',
          domain: 'globex.com',
          properties: { hs_ideal_customer_profile: 'tier_1', hubspot_owner_id: null },
          owners: { hubspot_owner_id: null },
        },
        {
          id: '9',
          name: 'Initech',
          domain: 'initech.com',
          properties: { hs_ideal_customer_profile: 'tier_1', hubspot_owner_id: '999' },
          owners: { hubspot_owner_id: { id: '999', name: null, email: null } },
        },
      ],
      next_cursor: null,
      total: 3,
    })

    const page = await client().crm.searchCompanies({
      userId: 'owner@example.com',
      provider: 'hubspot',
      properties: ['hs_ideal_customer_profile', 'hubspot_owner_id'],
    })

    expect(page.companies[0].properties.hubspot_owner_id).toBe('123')
    expect(page.companies[0].owners).toEqual({
      hubspot_owner_id: { id: '123', name: 'Jane Doe', email: 'jane@x.com' },
    })
    expect(page.companies[1].owners).toEqual({ hubspot_owner_id: null })
    // Archived owner: the id is known but not in the directory.
    expect(page.companies[2].owners?.hubspot_owner_id).toEqual({ id: '999', name: null, email: null })
  })

  it('returns an empty owners map when no requested field is owner-typed', async () => {
    respondWith({
      provider: 'attio',
      companies: [{
        id: 'rec_1',
        name: 'Acme',
        domain: 'acme.com',
        properties: { employee_range: [] },
        owners: {},
      }],
      next_cursor: null,
      total: null,
    })

    const page = await client().crm.searchCompanies({
      userId: 'owner@example.com',
      provider: 'attio',
      properties: ['employee_range'],
    })

    expect(page.companies[0].owners).toEqual({})
  })

  it('keeps Attio value entries in the provider spelling', async () => {
    respondWith({
      provider: 'attio',
      companies: [{
        id: 'rec_1',
        name: 'Acme',
        domain: 'acme.com',
        properties: {
          employee_range: [{ option: { title: '11-50' }, active_until: null }],
        },
      }],
      next_cursor: null,
      total: null,
    })

    const page = await client().crm.searchCompanies({
      userId: 'owner@example.com',
      provider: 'attio',
    })

    expect(page.companies[0].properties.employee_range[0]).toEqual({
      option: { title: '11-50' },
      active_until: null,
    })
  })

  it('camel-cases field metadata, whose keys are Lumnis fields', async () => {
    respondWith({
      provider: 'hubspot',
      properties: [{
        name: 'hs_lead_status',
        label: 'Lead status',
        type: 'enumeration',
        field_type: 'select',
        operators: ['EQ', 'IN'],
        options: [{ value: 'OPEN', label: 'Open', hidden: false }],
        options_complete: true,
        external_options: false,
        hidden: false,
        references: null,
      }],
      next_cursor: null,
    })

    const result = await client().crm.getCompanyProperties({
      userId: 'owner@example.com',
      provider: 'hubspot',
      propertyName: 'hs_lead_status',
    })

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/v1/crm/companies/properties')
    expect(url.searchParams.get('property_name')).toBe('hs_lead_status')
    expect(result.properties[0]).toEqual({
      name: 'hs_lead_status',
      label: 'Lead status',
      type: 'enumeration',
      fieldType: 'select',
      operators: ['EQ', 'IN'],
      options: [{ value: 'OPEN', label: 'Open', hidden: false }],
      optionsComplete: true,
      externalOptions: false,
      hidden: false,
      references: null,
    })
  })

  it('flags the field that identifies a CRM user with references: owner', async () => {
    respondWith({
      provider: 'attio',
      properties: [
        {
          name: 'account_owner',
          label: 'Owner',
          type: 'actor-reference',
          field_type: 'actor-reference',
          operators: [],
          filter_fields: [{ name: 'referenced_actor_id', operators: ['$eq'] }],
          options: null,
          references: 'owner',
        },
        {
          name: 'employee_range',
          label: 'Employees',
          type: 'select',
          field_type: 'select',
          operators: [],
          filter_fields: [{ name: 'option', operators: ['$eq'] }],
          options: null,
          references: null,
        },
      ],
      next_cursor: null,
    })

    const result = await client().crm.getCompanyProperties({
      userId: 'owner@example.com',
      provider: 'attio',
    })

    const ownerField = result.properties.find(p => p.references === 'owner')
    expect(ownerField?.name).toBe('account_owner')
    expect(result.properties[1].references).toBeNull()
  })
})
