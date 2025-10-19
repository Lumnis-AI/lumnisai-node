import type { ProgressEntry } from '../src/types/responses'
import { describe, expect, it } from 'vitest'
import { displayProgress, formatProgressEntry, ProgressTracker } from '../src/utils/progress'

describe('progress utilities', () => {
  describe('formatProgressEntry', () => {
    it('formats a simple message without tool calls', () => {
      const result = formatProgressEntry('processing', 'Analyzing data')
      expect(result).toBe('PROCESSING: Analyzing data')
    })

    it('formats a message with tool calls', () => {
      const toolCalls = [
        { name: 'read_file', args: { path: '/data.csv' } },
        { name: 'calculate_stats', args: { method: 'mean' } },
      ]
      const result = formatProgressEntry('processing', 'Analyzing data', toolCalls)
      expect(result).toContain('PROCESSING: Analyzing data')
      expect(result).toContain('\t→ read_file(path="/data.csv")')
      expect(result).toContain('\t→ calculate_stats(method="mean")')
    })

    it('formats tool calls without arguments', () => {
      const toolCalls = [{ name: 'get_data', args: {} }]
      const result = formatProgressEntry('processing', 'Fetching', toolCalls)
      expect(result).toContain('\t→ get_data')
      expect(result).not.toContain('()')
    })
  })

  describe('progressTracker', () => {
    it('tracks and deduplicates messages', () => {
      const tracker = new ProgressTracker()

      // First call should return formatted message
      const result1 = tracker.formatNewEntries('processing', 'Analyzing data')
      expect(result1).toContain('PROCESSING: Analyzing data')

      // Second call with same message should return null
      const result2 = tracker.formatNewEntries('processing', 'Analyzing data')
      expect(result2).toBeNull()
    })

    it('tracks and deduplicates tool calls', () => {
      const tracker = new ProgressTracker()
      const toolCalls = [
        { name: 'read_file', args: { path: '/data.csv' } },
      ]

      // First call with message and tool call
      const result1 = tracker.formatNewEntries('processing', 'Analyzing data', toolCalls)
      expect(result1).toContain('PROCESSING: Analyzing data')
      expect(result1).toContain('\t→ read_file')

      // Second call with same message and tool call
      const result2 = tracker.formatNewEntries('processing', 'Analyzing data', toolCalls)
      expect(result2).toBeNull()

      // Third call with new tool call
      const newToolCalls = [
        { name: 'read_file', args: { path: '/data.csv' } },
        { name: 'calculate_stats', args: { method: 'mean' } },
      ]
      const result3 = tracker.formatNewEntries('processing', 'Analyzing data', newToolCalls)
      expect(result3).toContain('\t→ calculate_stats')
      expect(result3).not.toContain('PROCESSING') // Message already seen
      expect(result3).not.toContain('read_file') // Tool call already seen
    })

    it('resets tracking state', () => {
      const tracker = new ProgressTracker()

      // Add a message
      tracker.formatNewEntries('processing', 'Analyzing data')

      // Reset
      tracker.reset()

      // Same message should be treated as new
      const result = tracker.formatNewEntries('processing', 'Analyzing data')
      expect(result).toContain('PROCESSING: Analyzing data')
    })
  })

  describe('displayProgress', () => {
    it('handles regular progress entries', () => {
      const entry: ProgressEntry = {
        ts: new Date().toISOString(),
        state: 'processing',
        message: 'Analyzing data',
        toolCalls: [
          { name: 'read_file', args: { path: '/data.csv' } },
        ],
      }

      // Should not throw
      expect(() => displayProgress(entry)).not.toThrow()
    })

    it('handles tool_update entries', () => {
      const entry: ProgressEntry = {
        ts: new Date().toISOString(),
        state: 'tool_update',
        message: '[Tool calls for: Some message...]',
        toolCalls: [
          { name: 'calculate_stats', args: { method: 'mean' } },
        ],
      }

      // Should not throw
      expect(() => displayProgress(entry)).not.toThrow()
    })

    it('handles completed entries with output text', () => {
      const entry: ProgressEntry = {
        ts: new Date().toISOString(),
        state: 'completed',
        message: 'Task completed successfully',
        outputText: 'Final result text',
      }

      // Should not throw
      expect(() => displayProgress(entry)).not.toThrow()
    })

    it('handles custom indentation', () => {
      const entry: ProgressEntry = {
        ts: new Date().toISOString(),
        state: 'processing',
        message: 'Working',
        toolCalls: [{ name: 'test_tool', args: {} }],
      }

      // Should not throw with custom indent
      expect(() => displayProgress(entry, '  ')).not.toThrow()
    })
  })
})
