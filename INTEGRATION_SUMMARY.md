# Backend Integration Summary

**Last Updated:** 2026-01-13
**Source:** Python backend diff integration into TypeScript Node.js SDK

## Changes Made

### 1. Updated Types: `src/types/responses.ts`

Added new fields to `SpecializedAgentParams` interface for direct LinkedIn post URL extraction:

#### New Fields:
- **`directPostUrls?: string[]`** - Direct LinkedIn post URLs to extract candidates from
  - Format: `['https://www.linkedin.com/posts/username_topic-activity-123456-hash']`
  - Note: Works reliably for recent posts (~1 month), older posts return author only
  - Cost: ~11 + N credits per URL (N = people to enrich)

- **`directPostsMaxReactors?: number`** - Max reactors per post (default: 500, range: 0-5000)

- **`directPostsMaxComments?: number`** - Max comments per post (default: 100, range: 0-5000)

- **`directPostsExtractAuthor?: boolean`** - Whether to extract post author (default: true)

- **`directPostsExtractReactors?: boolean`** - Whether to extract reactors (default: true)

- **`directPostsExtractCommenters?: boolean`** - Whether to extract commenters (default: true)

#### LinkedIn Connections Search (NEW - 2026-01-13):
- **`searchConnections?: boolean`** - Search user's 1st-degree LinkedIn connections for candidates
  - Requires LinkedIn connected and synced
  - Cost: ~$0.01 per connection enriched (EnrichLayer)
  - LLM pre-filters connections based on headline before enrichment
  - Default: false (explicit opt-in required)

### 2. Backend Changes (No SDK Changes Required)

The following backend changes don't require SDK updates as they're implementation details:

#### Engagement Status Logic (`sequences.py`)
- Enhanced reply detection across both `step_executions` and `sequence_events`
- Changed `MESSAGE_SENT` → `AWAITING_REPLY` for DMs to 1st-degree connections
- **SDK Impact:** None - `EngagementStatus` enum already includes both values

#### Rate Limiting (`messaging.py`)
- Added chunking for LinkedIn connection checks (20 prospects per batch internally)
- **SDK Impact:** None - internal backend optimization, API contract unchanged

#### Message Deduplication (`integrations.py`)
- Changed from `ON CONFLICT DO NOTHING` to `WHERE NOT EXISTS` pattern
- **SDK Impact:** None - internal database implementation detail

#### Database Configuration (`db.py`, `dsn.py`)
- Removed AUTOCOMMIT isolation level for PgBouncer compatibility
- Added prepared statement cache disabling for `postgresql+asyncpg://` URLs
- **SDK Impact:** None - internal database connection handling

#### Agent Configuration (`agent_task.py`)
- Added `ENABLE_CHECKPOINTER` setting check
- **SDK Impact:** None - internal agent initialization logic

## Testing Recommendations

1. **Type Safety**: Verify TypeScript compilation succeeds
   ```bash
   npm run build
   ```

2. **Deep People Search with Direct Post URLs**: Test the new parameters
   ```typescript
   const response = await client.responses.create({
     messages: [{ role: 'user', content: 'Find candidates from these posts' }],
     specializedAgent: 'deep_people_search',
     specializedAgentParams: {
       directPostUrls: [
         'https://www.linkedin.com/posts/username_topic-activity-123456-hash'
       ],
       directPostsMaxReactors: 500,
       directPostsMaxComments: 100,
       directPostsExtractAuthor: true,
       directPostsExtractReactors: true,
       directPostsExtractCommenters: true
     }
   })
   ```

3. **Engagement Status**: Verify `awaiting_reply` status is handled correctly in existing code

4. **Deep People Search with Connections**: Test the new `searchConnections` parameter
   ```typescript
   const response = await client.responses.create({
     messages: [{ role: 'user', content: 'Find ML engineers in my network' }],
     specializedAgent: 'deep_people_search',
     specializedAgentParams: {
       searchConnections: true,  // Search user's 1st-degree connections
       searchProfiles: true,     // Also search profile databases
       requestedCandidates: 20
     }
   })
   ```

## Migration Notes

### For SDK Users

No breaking changes. New optional parameters added to `SpecializedAgentParams`:
- Existing code continues to work without modification
- New `directPostUrls` feature is opt-in

### Backward Compatibility

✅ **Fully backward compatible** - all new fields are optional with sensible defaults

## Files Modified

- `src/types/responses.ts` - Added 7 new optional fields to `SpecializedAgentParams` (6 for direct posts + 1 for connections search)

## Files Reviewed (No Changes Needed)

- `src/types/sequences.ts` - `EngagementStatus` already includes all required values
- `src/resources/messaging.ts` - No API contract changes

---

# LinkedIn Connections Sync Integration

**Date:** 2026-01-13
**Migration:** 0038_add_connection_columns.py

## Overview

Added support for syncing and managing LinkedIn 1st-degree connections. This enables "warm intro" features by tracking who users are connected to on LinkedIn, separate from message history.

## Changes Made

### 1. New Types: `src/types/integrations.ts`

Added 6 new types for LinkedIn connections sync:

#### Enums:
- **`SyncPhaseStatus`** - Status for sync phases
  - `NOT_STARTED` - Sync has not begun
  - `IN_PROGRESS` - Sync is currently running
  - `COMPLETE` - Sync finished successfully

#### Interfaces:
- **`ContactHistorySyncStatus`** - Contact history (messages) sync status
  ```typescript
  {
    status: SyncPhaseStatus
    contactsMessaged: number
    progressPercent: number
    currentPage?: number | null
  }
  ```

- **`ConnectionsSyncStatus`** - Connections (network) sync status
  ```typescript
  {
    status: SyncPhaseStatus
    connectionsStored: number
    progressPercent: number
    lastSyncedAt?: string | null
  }
  ```

- **`LinkedInSyncStatusResponse`** - Complete sync status for frontend
  ```typescript
  {
    connected: boolean
    syncInProgress: boolean
    lastSyncedAt?: string | null
    contactHistory?: ContactHistorySyncStatus | null
    connections?: ConnectionsSyncStatus | null
  }
  ```

- **`TriggerSyncResponse`** - Response from manual sync trigger
  ```typescript
  {
    status: 'started' | 'already_running' | 'no_account'
    message: string
  }
  ```

- **`DeleteConnectionsResponse`** - Response from connection deletion
  ```typescript
  {
    deletedCount: number
    message: string
  }
  ```

### 2. New Methods: `src/resources/integrations.ts`

Added 3 new methods to `IntegrationsResource`:

#### `getLinkedInSyncStatus(userId: string)`
Get LinkedIn sync status with progress tracking.

**Usage:**
```typescript
const status = await client.integrations.getLinkedInSyncStatus('user@example.com')
console.log(`Connected: ${status.connected}`)
console.log(`Contacts messaged: ${status.contactHistory?.contactsMessaged}`)
console.log(`Connections stored: ${status.connections?.connectionsStored}`)
```

#### `triggerLinkedInSync(userId: string)`
Manually trigger LinkedIn connections sync (runs in background).

**Usage:**
```typescript
const response = await client.integrations.triggerLinkedInSync('user@example.com')
console.log(response.message) // "Sync started in background"

// Poll status until complete
while (true) {
  const status = await client.integrations.getLinkedInSyncStatus('user@example.com')
  if (!status.syncInProgress)
    break
  await new Promise(resolve => setTimeout(resolve, 2000))
}
```

#### `deleteLinkedInConnections(userId: string)`
Delete all stored connections (keeps messaged contacts).

**Usage:**
```typescript
const response = await client.integrations.deleteLinkedInConnections('user@example.com')
console.log(`Deleted ${response.deletedCount} connections`)
```

## Backend Changes (Reference)

### Database Migration: `0038_add_connection_columns.py`

Adds columns to `contact_identities` table:
- `is_connection` (BOOLEAN) - Flag for 1st-degree connections
- `connected_at` (TIMESTAMP) - When connection was established
- `headline` (TEXT) - LinkedIn headline (e.g., "SWE @ Google")
- `first_name` (VARCHAR) - First name from LinkedIn
- `last_name` (VARCHAR) - Last name from LinkedIn

### New API Endpoints

- `GET /integrations/linkedin/sync-status?user_id={userId}`
- `POST /integrations/linkedin/sync?user_id={userId}`
- `DELETE /integrations/linkedin/connections?user_id={userId}`

### Backend Services

- `sync_connections_for_account()` - Sync connections for an account
- `sync_connections_all_active_linkedin_accounts()` - Weekly job for all accounts
- CrustData integration for resolving hashed LinkedIn URLs (FREE preview API)

## Testing Recommendations

1. **Type Safety**: Verify TypeScript compilation
   ```bash
   npm run build
   ```

2. **Sync Status**: Test status endpoint
   ```typescript
   const status = await client.integrations.getLinkedInSyncStatus('user@example.com')
   expect(status).toHaveProperty('connected')
   expect(status).toHaveProperty('syncInProgress')
   ```

3. **Trigger Sync**: Test manual sync
   ```typescript
   const response = await client.integrations.triggerLinkedInSync('user@example.com')
   expect(response.status).toMatch(/started|already_running|no_account/)
   ```

4. **Delete Connections**: Test deletion
   ```typescript
   const response = await client.integrations.deleteLinkedInConnections('user@example.com')
   expect(response.deletedCount).toBeGreaterThanOrEqual(0)
   ```

## Use Cases

1. **Warm Intro Features**: Show which prospects are 1st-degree connections
2. **Connection-Based Filtering**: Filter search results to connections only
3. **Network Analytics**: Track connection growth over time
4. **Exclusion Lists**: Exclude existing connections from outreach campaigns

## Migration Notes

### For SDK Users

✅ **Fully backward compatible** - new optional methods added to `IntegrationsResource`:
- Existing code continues to work without modification
- New LinkedIn connections sync features are opt-in

### Breaking Changes

None - all new functionality is additive.

## Files Modified

- `src/types/integrations.ts` - Added 6 new types (1 enum + 5 interfaces)
- `src/resources/integrations.ts` - Added 3 new methods to IntegrationsResource

## Files Reviewed (No Changes Needed)

- `src/index.ts` - Already exports all types from integrations.ts via wildcard

