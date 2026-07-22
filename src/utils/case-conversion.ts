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

function convertCase(obj: any, converter: (s: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map(v => convertCase(v, converter))
  }
  else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: CaseObject, key: string) => {
      // Values inside customFields/custom_fields are keyed by external
      // provider-native property names, not by Lumnis API field names.
      // Preserve those keys verbatim while still converting the container key.
      const value = key === 'customFields' || key === 'custom_fields'
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
