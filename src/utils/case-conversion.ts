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
  // account_monitor's committee: its own fields (`people`, `groups`) are
  // spelled the same in both cases, while the group labels underneath
  // `groups` are caller-chosen names such as 'Security team'. Converting
  // those would rename the customer's own groups.
  'committee',
])

function convertCase(
  obj: any,
  converter: (s: string) => string,
  passthroughKeys: ReadonlySet<string>,
): any {
  if (Array.isArray(obj)) {
    return obj.map(v => convertCase(v, converter, passthroughKeys))
  }
  else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: CaseObject, key: string) => {
      const value = passthroughKeys.has(key)
        ? obj[key]
        : convertCase(obj[key], converter, passthroughKeys)
      acc[converter(key)] = value
      return acc
    }, {})
  }
  return obj
}

// Per-request exemptions on top of the always-on set above. Used where a key
// is only provider-native on some routes -- `properties` carries CRM property
// names on `/crm/companies/search` but Lumnis field names elsewhere -- so the
// exemption cannot be global without corrupting the other routes.
function passthroughSet(extraKeys?: readonly string[]): ReadonlySet<string> {
  if (!extraKeys || extraKeys.length === 0)
    return PASSTHROUGH_VALUE_KEYS
  return new Set([...PASSTHROUGH_VALUE_KEYS, ...extraKeys])
}

export function toCamelCase<T>(obj: any, extraPassthroughKeys?: readonly string[]): T {
  return convertCase(obj, toCamel, passthroughSet(extraPassthroughKeys)) as T
}

export function toSnakeCase<T>(obj: any, extraPassthroughKeys?: readonly string[]): T {
  return convertCase(obj, toSnake, passthroughSet(extraPassthroughKeys)) as T
}
