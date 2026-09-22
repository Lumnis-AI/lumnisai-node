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

    it('preserves label keys inside engagement_profile', () => {
      const input = {
        structured_response: {
          person_name: 'Jane Doe',
          engagement_profile: {
            post_formats: {
              list_or_framework: 0.4,
              announcement_or_launch: 0.2,
            },
            top_topics: {
              finance_investing: 3,
            },
            comment_styles: {
              agree_or_amplify: 5,
              story_or_lesson: 2,
            },
          },
          confidence_score: 0.9,
        },
      }
      const result = toCamelCase<any>(input)

      // Sibling keys outside the exempt subtree are still camelised.
      expect(result.structuredResponse.personName).toBe('Jane Doe')
      expect(result.structuredResponse.confidenceScore).toBe(0.9)

      // The container key converts, everything inside it stays verbatim.
      expect(result.structuredResponse.engagementProfile).toEqual({
        post_formats: {
          list_or_framework: 0.4,
          announcement_or_launch: 0.2,
        },
        top_topics: {
          finance_investing: 3,
        },
        comment_styles: {
          agree_or_amplify: 5,
          story_or_lesson: 2,
        },
      })
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

    it('preserves provider-native keys inside customFields', () => {
      const input = {
        userId: '123',
        customFields: {
          lead_source: 'Lumnis',
          CaseSensitiveProperty: 'value',
        },
      }

      expect(toSnakeCase<any>(input)).toEqual({
        user_id: '123',
        custom_fields: {
          lead_source: 'Lumnis',
          CaseSensitiveProperty: 'value',
        },
      })
    })
  })

  describe('per-request passthrough keys', () => {
    it('sends provider-native filter syntax verbatim', () => {
      const input = {
        userId: '123',
        filters: {
          filterGroups: [{
            filters: [{ propertyName: 'numberofemployees', operator: 'GT', value: '50' }],
          }],
        },
      }

      expect(toSnakeCase<any>(input, ['filters'])).toEqual({
        user_id: '123',
        filters: {
          filterGroups: [{
            filters: [{ propertyName: 'numberofemployees', operator: 'GT', value: '50' }],
          }],
        },
      })
    })

    it('converts the same key when the request does not exempt it', () => {
      const input = { filters: { templateId: 'abc' } }

      expect(toSnakeCase<any>(input)).toEqual({ filters: { template_id: 'abc' } })
    })

    it('keeps CRM property names intact while converting sibling fields', () => {
      const input = {
        next_cursor: '42',
        companies: [{
          id: '7',
          properties: {
            hs_object_id: '7',
            annual_revenue_2024: '1000',
          },
        }],
      }

      expect(toCamelCase<any>(input, ['properties'])).toEqual({
        nextCursor: '42',
        companies: [{
          id: '7',
          properties: {
            hs_object_id: '7',
            annual_revenue_2024: '1000',
          },
        }],
      })
    })

    it('keeps the always-on exemptions when extra keys are supplied', () => {
      const input = { customFields: { lead_source: 'Lumnis' }, otherField: 1 }

      expect(toSnakeCase<any>(input, ['filters'])).toEqual({
        custom_fields: { lead_source: 'Lumnis' },
        other_field: 1,
      })
    })
  })
})
