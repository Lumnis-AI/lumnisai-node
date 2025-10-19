# Lumnis AI Node.js SDK

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Official Node.js/TypeScript SDK for the Lumnis AI API. Build AI-powered applications with ease.

## Features

- 📦 **TypeScript First** - Complete type safety and autocompletion
- ⚡ **Modern Architecture** - Built with ES modules and async/await
- 📁 **File Management** - Upload, search, and manage files with semantic search
- 🔄 **Automatic Retries** - Smart retry logic with exponential backoff
- 🎯 **Idempotent Requests** - Built-in idempotency for safe retries
- 📊 **Response Polling** - Easy helpers for async response handling
- 🔐 **Secure by Default** - API key authentication with secure storage
- 🔌 **MCP Integration** - Full support for Model Context Protocol servers
- 🎨 **Advanced Agent Config** - Granular control over agent behavior

## Installation

```bash
npm install lumnisai
```

```bash
yarn add lumnisai
```

```bash
pnpm add lumnisai
```

## Quick Start

```typescript
import LumnisAI from 'lumnisai'

// Initialize the client
const client = new LumnisAI({
  apiKey: process.env.LUMNIS_API_KEY!
})

// Or use named import
// import { LumnisClient } from 'lumnisai'
// const client = new LumnisClient({ apiKey: '...' })

// Or use environment variables (no options needed)
// Set LUMNISAI_API_KEY and optionally LUMNISAI_TENANT_ID
// const client = new LumnisAI()

// Create a simple response
const response = await client.createResponse('What is the meaning of life?')
console.log(response.outputText)

// Create and wait for response completion
const completedResponse = await client.createResponseAndWait(
  'Explain quantum computing',
  {
    responseFormat: {
      type: 'object',
      properties: {
        explanation: { type: 'string' },
        keyTerms: { type: 'array', items: { type: 'string' } }
      }
    }
  }
)
console.log(completedResponse.structuredResponse)
```

## Core Features

### Creating AI Responses

```typescript
// Simple message
// Streaming responses with progress updates
import { displayProgress } from 'lumnisai'

const response = await client.responses.create({
  messages: [{ role: 'user', content: 'Hello!' }]
})

// With conversation history
const response = await client.responses.create({
  threadId: 'existing-thread-id',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'What can you help me with?' }
  ]
})

// With structured output
const response = await client.responses.create({
  messages: [{ role: 'user', content: 'List 5 programming languages' }],
  responseFormat: {
    type: 'object',
    properties: {
      languages: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
})

// Using the invoke method (simpler API)
const response = await client.invoke(
  'Explain quantum computing',
  {
    showProgress: true, // Show progress updates in console
    pollIntervalMs: 1000,
    maxWaitMs: 60000
  }
)

const updates: any[] = []
for await (const update of await client.invoke(
  'Analyze this data',
  {
    stream: true,
    userId: 'user@example.com',
    agentConfig: {
      plannerModelType: 'SMART_MODEL',
      coordinatorModelType: 'REASONING_MODEL'
    }
  }
)) {
  displayProgress(update) // Display progress with tool calls
  updates.push(update)
}

// Access final output
const finalUpdate = updates[updates.length - 1]
if (finalUpdate.outputText) {
  console.log(finalUpdate.outputText)
}

// With agent mode option
const response = await client.responses.create({
  messages: [{ role: 'user', content: 'Analyze complex data patterns' }],
  options: {
    agent_mode: 'multi_agent'
  }
})

// With advanced agent configuration
const response = await client.responses.create({
  messages: [{ role: 'user', content: 'Analyze this data' }],
  agentConfig: {
    plannerModelType: 'SMART_MODEL',
    coordinatorModelType: 'REASONING_MODEL',
    orchestratorModelType: 'SMART_MODEL',
    // Model name overrides
    plannerModelName: 'openai:gpt-4o',
    coordinatorModelName: 'anthropic:claude-3-7-sonnet-20250219',
    // Feature flags
    useCognitiveTools: true,
    enableTaskValidation: true,
    generateComprehensiveOutput: false
  }
})

// List responses with filters
const responses = await client.responses.list({
  userId: 'user@example.com',
  status: 'succeeded',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  limit: 50,
  offset: 0
})
```

### Polling for Response Completion

```typescript
// Manual polling
const response = await client.responses.create({ messages })
while (response.status === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, 1000))
  response = await client.responses.get(response.responseId)
}

// Using the helper method
const completedResponse = await client.createResponseAndWait(
  messages,
  { pollIntervalMs: 2000, maxWaitMs: 60000 }
)

// Long polling
const response = await client.responses.get(responseId, { wait: 30 })
```

### Progress Display Utilities

The SDK provides utilities for displaying progress updates with tool calls:

```typescript
import { displayProgress, formatProgressEntry, ProgressTracker } from 'lumnisai'

// Simple display with automatic tool call formatting
for await (const update of await client.invoke(task, { stream: true })) {
  displayProgress(update) // Automatically formats message and tool calls
}

// Custom formatting
for await (const update of await client.invoke(task, { stream: true })) {
  if (update.state === 'tool_update') {
    // Only tool calls are shown for tool_update entries
    displayProgress(update)
  }
  else {
    // Full message with tool calls
    displayProgress(update, '  ') // Custom indentation
  }
}

// Manual formatting
const formatted = formatProgressEntry(
  'processing',
  'Analyzing data',
  [
    { name: 'read_file', args: { path: '/data.csv' } },
    { name: 'calculate_stats', args: { method: 'mean' } }
  ]
)
console.log(formatted)
// Output:
// PROCESSING: Analyzing data
//   → read_file(path="/data.csv")
//   → calculate_stats(method="mean")

// Advanced: Track duplicates
const tracker = new ProgressTracker()

for await (const update of await client.invoke(task, { stream: true })) {
  const newContent = tracker.formatNewEntries(
    update.state,
    update.message,
    update.toolCalls
  )

  if (newContent) {
    console.log(newContent) // Only new content is displayed
  }
}
```

The `displayProgress` function automatically handles:
- **Regular updates**: Displays message + tool calls with proper formatting
- **Tool updates**: Shows only new tool calls (when `state === 'tool_update'`)
- **Completed state**: Shows final message with output text
- **Compact formatting**: Tool arguments are formatted concisely

### Managing Threads

```typescript
// List threads
const threads = await client.threads.list({
  userId: 'user@example.com',
  limit: 20
})

// Get thread with responses
const thread = await client.threads.get(threadId)
const responses = await client.threads.getResponses(threadId)

// Update thread title
await client.threads.update(threadId, {
  title: 'Quantum Physics Discussion'
})

// Delete thread
await client.threads.delete(threadId)
```

### User Management

```typescript
// Create or get user
const user = await client.users.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
})

// List users with pagination
const users = await client.users.list({
  page: 1,
  pageSize: 50
})

// Get user by email or ID
const user = await client.users.get('user@example.com')
const user = await client.users.get('550e8400-e29b-41d4-a716-446655440000')

// Get user's responses and threads
const userResponses = await client.users.getResponses('user@example.com')
const userThreads = await client.users.getThreads('user@example.com')
```

### External API Keys (BYO Keys)

```typescript
// Store an external API key
await client.externalApiKeys.store({
  provider: 'OPENAI_API_KEY',
  apiKey: 'sk-...'
})

// List stored keys (metadata only)
const keys = await client.externalApiKeys.list()

// Set API key mode
await client.externalApiKeys.updateMode({ mode: 'byo_keys' })
```

### Model Preferences

```typescript
// Get current preferences
const prefs = await client.modelPreferences.get()

// Update specific model type
await client.modelPreferences.update('SMART_MODEL', {
  modelType: 'SMART_MODEL',
  provider: 'anthropic',
  modelName: 'claude-3-opus'
})

// Bulk update
await client.modelPreferences.updateBulk({
  preferences: {
    SMART_MODEL: { provider: 'anthropic', modelName: 'claude-3-opus' },
    FAST_MODEL: { provider: 'openai', modelName: 'gpt-4o-mini' }
  }
})

// Check availability
const availability = await client.modelPreferences.checkAvailability([
  { modelType: 'SMART_MODEL', provider: 'openai', modelName: 'gpt-4o' }
])
```

### Integrations

```typescript
// Initiate OAuth connection
const { redirectUrl } = await client.integrations.initiateConnection({
  userId: 'user@example.com',
  appName: 'GITHUB',
  redirectUrl: 'https://myapp.com/callback'
})

// Check connection status
const status = await client.integrations.getConnectionStatus(
  'user@example.com',
  'GITHUB'
)

// Get available tools
const { tools } = await client.integrations.getTools({
  userId: 'user@example.com',
  appFilter: ['GITHUB', 'SLACK']
})

// Disconnect app
await client.integrations.disconnect({
  userId: 'user@example.com',
  appName: 'GITHUB'
})
```

### MCP Servers

```typescript
// Test configuration before saving
const testResult = await client.mcpServers.testConfig({
  transport: 'stdio',
  command: 'python',
  args: ['mcp_server.py'],
  env: { API_KEY: 'secret' }
})

// Create MCP server configuration
const server = await client.mcpServers.create({
  name: 'github-tools',
  description: 'GitHub API tools',
  transport: 'streamable_http',
  scope: 'tenant',
  url: 'https://github-mcp.example.com/api',
  headers: {
    Authorization: 'Bearer token'
  }
})

// List servers
const servers = await client.mcpServers.list({
  scope: 'all',
  isActive: true
})

// Test existing server connection
const connectionTest = await client.mcpServers.testConnection(server.id)
```

### File Management

```typescript
// Upload a file
const uploadResult = await client.files.upload(file, {
  scope: 'user',
  userId: 'user@example.com',
  tags: 'documentation,important',
  duplicateHandling: 'suffix'
})

// Upload multiple files
const bulkResult = await client.files.bulkUpload([file1, file2, file3], {
  scope: 'tenant',
  tags: 'batch-upload'
})

// List files with filters
const files = await client.files.list({
  scope: 'tenant',
  fileType: 'pdf',
  status: 'completed',
  tags: 'important',
  page: 1,
  limit: 20
})

// Semantic search across files
const searchResults = await client.files.search({
  query: 'machine learning algorithms',
  limit: 10,
  minScore: 0.7,
  fileTypes: ['pdf', 'md'],
  userId: 'user@example.com'
})

// Get file content
const content = await client.files.getContent(fileId, {
  contentType: 'text',
  startLine: 1,
  endLine: 100,
  userId: 'user@example.com'
})

// Check processing status
const status = await client.files.getStatus(fileId)
console.log(`Progress: ${status.progressPercentage}%`)

// Delete files
await client.files.delete(fileId, { hardDelete: true })

// Bulk delete
await client.files.bulkDelete({
  fileIds: ['id1', 'id2', 'id3']
}, { hardDelete: true })
```

## Error Handling

The SDK provides typed error classes for different scenarios:

```typescript
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError
} from 'lumnisai'

try {
  await client.responses.create({ messages })
}
catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key')
  }
  else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`)
  }
  else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details)
  }
}
```

## Advanced Configuration

```typescript
const client = new LumnisAI({
  apiKey: process.env.LUMNIS_API_KEY!,
  baseUrl: 'https://custom.api.url/v1', // Custom API endpoint
  timeoutMs: 60000, // 60 second timeout
  maxRetries: 3 // Retry up to 3 times
})
```

## Environment Variables

The SDK supports configuration via environment variables:

- `LUMNISAI_API_KEY` - Your API key (if not passed to constructor)
- `LUMNISAI_TENANT_ID` - Your tenant ID (optional)
- `LUMNISAI_BASE_URL` - Custom API base URL (optional)

## API Resources

The SDK provides access to all Lumnis AI API resources:

| Resource | Description | Endpoints |
|----------|-------------|-----------|
| `client.responses` | AI response generation and management | 5 |
| `client.threads` | Conversation thread management | 6 |
| `client.users` | User management within tenant | 7 |
| `client.files` | File upload, search, and management | 15 |
| `client.integrations` | OAuth integrations (GitHub, Slack, etc.) | 10 |
| `client.mcpServers` | Model Context Protocol server management | 8 |
| `client.modelPreferences` | Configure preferred AI models | 5 |
| `client.externalApiKeys` | Manage external API keys (BYO keys) | 6 |
| `client.tenantInfo` | Read tenant information | 1 |

**Total: 63 endpoints** with full TypeScript support.

## TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  AgentConfig,
  FileMetadata,
  FileScope,
  Message,
  ModelType,
  ResponseObject,
  ThreadObject,
  UserResponse
} from 'lumnisai'
```

## License

[MIT](./LICENSE) License © Lumnis AI

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/lumnisai?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/lumnisai
[npm-downloads-src]: https://img.shields.io/npm/dm/lumnisai?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/lumnisai
[bundle-src]: https://img.shields.io/bundlephobia/minzip/lumnisai?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=lumnisai
[license-src]: https://img.shields.io/github/license/Lumnis-AI/lumnisai-node.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Lumnis-AI/lumnisai-node/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/lumnisai
