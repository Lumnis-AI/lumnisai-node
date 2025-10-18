function toCamel(s: string): string {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}

function toSnake(s: string): string {
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
      acc[converter(key)] = convertCase(obj[key], converter)
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
