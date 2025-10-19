/**
 * Utility functions for displaying progress updates
 */
import type { ProgressEntry } from '../types/responses'

/**
 * Display a progress update with optional tool calls.
 *
 * Simple one-liner replacement for:
 *     console.log(`${update.state.toUpperCase()} - ${update.message}`)
 *
 * Now just use:
 *     displayProgress(update)
 *
 * This will display the message and any associated tool calls. The SDK now
 * yields both new messages and tool call updates (with state="tool_update").
 *
 * @param update - A ProgressEntry from streaming
 * @param indent - Indentation string for tool calls (default: tab)
 */
export function displayProgress(update: ProgressEntry, indent: string = '\t'): void {
  // Special handling for tool updates (just show the tools, not the message)
  if (update.state === 'tool_update') {
    // For tool updates, only show the tool calls
    if (update.toolCalls && update.toolCalls.length > 0) {
      for (const toolCall of update.toolCalls) {
        const toolName = toolCall.name || 'unknown'
        const toolArgs = toolCall.args || {}

        // eslint-disable-next-line node/prefer-global/process
        process.stdout.write(`${indent}→ ${toolName}`)
        if (Object.keys(toolArgs).length > 0) {
          // Format args compactly
          const argsStr = Object.entries(toolArgs)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')
          // eslint-disable-next-line no-console
          console.log(`(${argsStr})`)
        }
        else {
          // eslint-disable-next-line no-console
          console.log()
        }
      }
    }
  }
  else {
    // Display main message
    // eslint-disable-next-line no-console
    console.log(`${update.state.toUpperCase()} - ${update.message}`)

    // Display tool calls if present
    if (update.toolCalls && update.toolCalls.length > 0) {
      for (const toolCall of update.toolCalls) {
        const toolName = toolCall.name || 'unknown'
        const toolArgs = toolCall.args || {}

        // eslint-disable-next-line node/prefer-global/process
        process.stdout.write(`${indent}→ ${toolName}`)
        if (Object.keys(toolArgs).length > 0) {
          // Format args compactly
          const argsStr = Object.entries(toolArgs)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')
          // eslint-disable-next-line no-console
          console.log(`(${argsStr})`)
        }
        else {
          // eslint-disable-next-line no-console
          console.log()
        }
      }
    }
  }
}

/**
 * Format a progress entry with optional tool calls.
 *
 * @param state - The state of the progress entry (e.g., 'processing', 'completed')
 * @param message - The progress message
 * @param toolCalls - Optional list of tool calls associated with this message
 * @returns Formatted string with message and indented tool calls
 */
export function formatProgressEntry(
  state: string,
  message: string,
  toolCalls?: Array<Record<string, any>> | null,
): string {
  const lines = [`${state.toUpperCase()}: ${message}`]

  if (toolCalls && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      const toolName = toolCall.name || 'unknown'
      const toolArgs = toolCall.args || {}

      if (Object.keys(toolArgs).length > 0) {
        // Format args compactly
        const argsStr = Object.entries(toolArgs)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(', ')
        lines.push(`\t→ ${toolName}(${argsStr})`)
      }
      else {
        lines.push(`\t→ ${toolName}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Track and format progress entries to avoid duplicates.
 */
export class ProgressTracker {
  private seenMessages = new Set<string>()
  private messageToolCalls = new Map<string, Set<string>>()

  /**
   * Format new progress entries, returning null if nothing new to display.
   *
   * @param state - The state of the progress entry
   * @param message - The progress message
   * @param toolCalls - Optional list of tool calls
   * @returns Formatted string if there are new entries to display, null otherwise
   */
  formatNewEntries(
    state: string,
    message: string,
    toolCalls?: Array<Record<string, any>> | null,
  ): string | null {
    const messageKey = `${state}:${message}`
    const outputLines: string[] = []

    // Check if this is a new message
    if (!this.seenMessages.has(messageKey)) {
      outputLines.push(`${state.toUpperCase()}: ${message}`)
      this.seenMessages.add(messageKey)
      this.messageToolCalls.set(messageKey, new Set())
    }

    // Check for new tool calls
    if (toolCalls && this.messageToolCalls.has(messageKey)) {
      const seenToolCalls = this.messageToolCalls.get(messageKey)!
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name || 'unknown'
        const toolArgs = toolCall.args || {}
        const toolKey = `${toolName}:${JSON.stringify(toolArgs)}`

        if (!seenToolCalls.has(toolKey)) {
          if (Object.keys(toolArgs).length > 0) {
            const argsStr = Object.entries(toolArgs)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(', ')
            outputLines.push(`\t→ ${toolName}(${argsStr})`)
          }
          else {
            outputLines.push(`\t→ ${toolName}`)
          }
          seenToolCalls.add(toolKey)
        }
      }
    }

    return outputLines.length > 0 ? outputLines.join('\n') : null
  }

  /**
   * Reset the tracker to start fresh.
   */
  reset(): void {
    this.seenMessages.clear()
    this.messageToolCalls.clear()
  }
}
