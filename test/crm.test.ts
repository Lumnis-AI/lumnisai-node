/**
 * Tests for CRM Sync API resource.
 *
 * Verifies the SDK methods call the correct endpoints with the right
 * request bodies. Uses mocked HTTP responses; HTTP-layer
 * camelCase ↔ snake_case conversion is exercised end-to-end in the
 * core http tests.
 */

import type { Http } from '../src/core/http'
import { describe, expect, it, vi } from 'vitest'
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
        params: { userId: 'owner@example.com', provider: 'attio' },
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
        params: { memberUserId: 'member@example.com' },
      })
      expect(result.ownerUserIds).toHaveLength(2)
    })
  })
})
