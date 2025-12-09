import { describe, expect, it } from 'vitest'
import { toCamelCase, toSnakeCase } from './case-conversion'

describe('case-conversion', () => {
  describe('toCamelCase', () => {
    it('converts snake_case keys to camelCase', () => {
      const input = { user_id: '123', first_name: 'John' }
      const result = toCamelCase<{ userId: string, firstName: string }>(input)
      expect(result).toEqual({ userId: '123', firstName: 'John' })
    })

    it('preserves UUID keys without corruption', () => {
      const uuid = 'c06f7ca9-4383-4ff1-851d-ba6c9aea5f4b'
      const input = {
        results: {
          [uuid]: { connected: true, provider_id: 'test' },
        },
      }
      const result = toCamelCase<any>(input)

      // The UUID key should be preserved exactly
      expect(Object.keys(result.results)).toContain(uuid)
      expect(result.results[uuid]).toEqual({ connected: true, providerId: 'test' })
    })

    it('handles multiple UUIDs as keys', () => {
      const uuid1 = 'c06f7ca9-4383-4ff1-851d-ba6c9aea5f4b'
      const uuid2 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const input = {
        results: {
          [uuid1]: { is_connected: true },
          [uuid2]: { is_connected: false },
        },
      }
      const result = toCamelCase<any>(input)

      expect(Object.keys(result.results).sort()).toEqual([uuid1, uuid2].sort())
      expect(result.results[uuid1]).toEqual({ isConnected: true })
      expect(result.results[uuid2]).toEqual({ isConnected: false })
    })

    it('handles nested objects with UUID keys', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const input = {
        outer_key: {
          inner_key: {
            [uuid]: { some_value: 'test' },
          },
        },
      }
      const result = toCamelCase<any>(input)

      expect(result.outerKey.innerKey[uuid]).toEqual({ someValue: 'test' })
    })
  })

  describe('toSnakeCase', () => {
    it('converts camelCase keys to snake_case', () => {
      const input = { userId: '123', firstName: 'John' }
      const result = toSnakeCase<{ user_id: string, first_name: string }>(input)
      expect(result).toEqual({ user_id: '123', first_name: 'John' })
    })

    it('preserves UUID keys without corruption', () => {
      const uuid = 'c06f7ca9-4383-4ff1-851d-ba6c9aea5f4b'
      const input = {
        prospects: [
          { prospectId: uuid, linkedinUrl: 'https://linkedin.com/in/test' },
        ],
      }
      const result = toSnakeCase<any>(input)

      expect(result.prospects[0].prospect_id).toBe(uuid)
      expect(result.prospects[0].linkedin_url).toBe('https://linkedin.com/in/test')
    })
  })
})
