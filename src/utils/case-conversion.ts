// UUID regex pattern - don't convert these keys
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(s: string): boolean {
  return UUID_PATTERN.test(s)
}

function toCamel(s: string): string {
  // Don't convert UUIDs - they contain hyphens that would be corrupted
  if (isUUID(s))
    return s

  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}

function toSnake(s: string): string {
  // Don't convert UUIDs
  if (isUUID(s))
    return s

  return s.replace(/[A-Z]/g, (letter, index) => {
    return index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`
  })
}

interface CaseObject { [key: string]: any }

// Keys whose *values* are exempt from case conversion. The keys nested inside
// these subtrees are data rather than Lumnis API field names -- external
// provider-native property names for customFields, and label values such as
// `list_or_framework` or `announcement_or_launch` for engagementProfile.
// Rewriting them would corrupt the data itself, so the value passes through
// verbatim while the container key is still converted. Both spellings are
// listed so the exemption holds in either conversion direction.
const PASSTHROUGH_VALUE_KEYS = new Set([
  'customFields',
  'custom_fields',
  'engagementProfile',
  'engagement_profile',
])

function convertCase(obj: any, converter: (s: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map(v => convertCase(v, converter))
  }
  else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: CaseObject, key: string) => {
      const value = PASSTHROUGH_VALUE_KEYS.has(key)
        ? obj[key]
        : convertCase(obj[key], converter)
      acc[converter(key)] = value
      return acc
    }, {})
  }
  return obj
}

export function toCamelCase<T>(obj: any): T {
  return convertCase(obj, toCamel) as T
}

export function toSnakeCase<T>(obj: any): T {
  return convertCase(obj, toSnake) as T
}
