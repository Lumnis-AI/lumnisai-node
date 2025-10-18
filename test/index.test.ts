import { describe, expect, it } from 'vitest'
import * as exports from '../src/index'

describe('sDK exports', () => {
  it('should export default LumnisAI class', () => {
    expect(exports.default).toBeDefined()
  })

  it('should export named LumnisClient', () => {
    expect(exports.LumnisClient).toBeDefined()
  })

  it('should export error classes', () => {
    expect(exports.LumnisError).toBeDefined()
    expect(exports.AuthenticationError).toBeDefined()
    expect(exports.ValidationError).toBeDefined()
    expect(exports.NotFoundError).toBeDefined()
    expect(exports.RateLimitError).toBeDefined()
  })

  it('should export types', () => {
    // TypeScript will ensure types are exported correctly
    // This test verifies the module can be imported without errors
    expect(exports).toBeDefined()
  })
})
