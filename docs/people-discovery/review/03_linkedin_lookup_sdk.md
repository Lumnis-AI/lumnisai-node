# Find LinkedIn candidates through the SDK

## Status and files

Approved for SDK 0.5.65 release on October 21, 2026. The implementation covers the people
resource and types, shared HTTP options, the missing data source error,
lookup tests, the review index and this note.

## How this came up

The user asked to find a person's LinkedIn URL from their name and company
through MCP. The backend lookup exists, but SDK 0.5.64 has no method for it.

## Root cause

The MCP server uses the SDK. Calling the missing method cannot reach the
backend. Reusing normal HTTP defaults would also retry this paid endpoint
after failures even though the endpoint has no durable replay protection.

## The fix and the backup

`people.findLinkedInProfiles` accepts 1 to 50 name and company rows with an
optional title. It calls the existing endpoint and returns ordered candidate
results. Matches are possible identities for the caller to confirm.

The method disables automatic retries and uses a 90 second timeout to allow
the backend's 60 second batch deadline. Callers may set a shorter timeout.
Missing credentials preserve HTTP status, request ID and backend details.
Other methods retain their configured retry and timeout behavior.

## Before and after

Before: SDK callers cannot submit a name and company lookup.

After: one SDK call returns matched, missing or failed rows, each with up to
three candidates. The call neither saves prospects nor starts research.

## Results

The exact staged extraction passed 71 tests: 12 lookup tests and 59 existing
client, Responses and Account Monitor tests. Type checking passed. Its seven
feature files match the isolated HEAD based candidate, which passed the same
checks. Scoped ESLint passed with one existing JSDoc warning in the people
resource. The preexisting staged campaign file was preserved.
[Commands and results](validation/03/results.json) record the exact tested tree.
All provider responses were mocked; these checks made no paid calls.

## What you decide

The user authorized committing and publishing this SDK change. MCP and
dashboard integration are being completed against the published package.

## Every scenario we checked

| Scenario | Expected behavior | Result |
| --- | --- | --- |
| Mixed matched, missing and failed rows | Preserve order, titles and candidate fields | Pass |
| Empty, 50 row and oversized batches | Accept 50; reject invalid sizes before HTTP | Pass |
| Missing tenant credentials | Preserve HTTP 503, request ID and error details | Pass |
| Rate limit, server or transport failure | One attempt with no retry delay | Pass |
| Backend deadline and explicit shorter timeout | Abort once at the configured deadline | Pass |
| Existing methods after a failed lookup | Keep their normal retries | Pass |
| Existing Responses and Account Monitor calls | No regression | Pass |

## Gaps and risks

The SDK must be published and adopted before the MCP server can call this
method. This patch does not register an MCP tool, change committee search,
publish a package or deploy anything. Unrelated staged campaign changes remain
outside this problem.
