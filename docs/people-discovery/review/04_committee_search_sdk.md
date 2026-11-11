# Submit reviewed committee searches through Responses

Reviewed and committed as `fed9804`; published in SDK **0.5.65** on
October 21, 2026 (release commit `d99fd77`).

The user chose a specialized committee agent using CrustData live search and
Luna. SDK callers need its reviewed request shape and a stable submission key
through the existing Responses API.

This patch exports `CommitteeSearchAccount` and `CommitteeSearchParams`, adds
the agent to the known names, and preserves all reviewed criterion fields.
`responses.create(request, { idempotencyKey })` forwards the caller's key using
the existing HTTP client. There is no extra execution method or endpoint.

Callers performing paid work use `maxRetries: 0` and persist the submission key
before calling. Explicit retries reuse that key and the unchanged request. The
SDK does not persist a workflow or enable automatic retries for these callers.
Luna is the only committee model in the typed contract.

The committed SDK release passed 228 tests with 1 skipped, type checking and
the package build. The earlier isolated candidate passed 74 focused and
affected tests, including three
committee tests and twelve lookup tests. Type checking passed. Tests cover
stable keys across explicit retries for committee search and Account Monitor,
reviewed criteria and mixed case criterion IDs reaching the wire unchanged,
and existing Responses behavior. Provider responses were mocked.

The published release excludes unrelated network, podcast, competitor and
campaign edits. Frontend integration and adopting SDK 0.5.65 remain separate
work. This SDK release did not deploy the backend or change its prompt.

## Message, focus, depth and org chart (release 0.5.72)

Types only. No new method and no client-side checks were added.

`CommitteeSearchParams`:

- `criteriaDefinitions` and `criteriaClassification` are now optional. Send
  both or neither. With neither, the user message is the request.
- Added `writeCriteria`, `focus`, `depth` (`'standard'` or `'deep'`) and
  `orgChart` (`{ scope: 'company' | 'focus' }`).
- Removed `retrievalMode` and `page`. The backend rejects both.

New result types, all snake_case because the SDK passes
`structuredResponse.committee` through unchanged: `CommitteeFocus`,
`CommitteeFocusJob`, `CommitteeOrgChart`, `CommitteeOrgChartNode` and
`CommitteeOrgChartOtherManager`. `CriteriaMetadata.source` also accepts
`'query'`.

Tests in `test/committee-search.test.ts` cover the request body for each new
field and the unchanged result.

Not in this release: CRM contacts in committee search (`crmUserId`, `inCrm`,
`crm`). Those lines stay uncommitted.

## One org chart, no written criteria (release 0.5.73)

Types only, to match the backend clean-up.

`CommitteeSearchParams`:

- `orgChart` is now a boolean. `true` asks for the chart. The
  `CommitteeOrgChartRequest` type and its `scope` are removed. There is one
  chart: the people the search kept, plus the leaders above them.
- `writeCriteria` is removed. With no criteria sent, the backend always
  writes them from the message. The backend rejects the field.
- `limitPerAccount` has no maximum. Left out, everyone who passes is selected.
- `maxCandidatesPerAccount` is 1 to 5000 and defaults to 1000. The search
  reads saved profiles in pages of 100 and stops when the matches run out.

`CommitteeOrgChart`:

- `scope` is removed. `focus` stays.
- `status` is `'ok'` or `'error'`. `error` is `'model_failed'` or null. The
  `'partial'` status and the two roster errors are gone.

The criteria `source` for a committee search is `'provided'` or
`'generated'`.

Not typed in the SDK, so unchanged here: the web search receipt
(`exa_retrieval.reason` is now `enough_people_found` in place of
`candidate_limit_reached`) and each candidate's `selected` flag, which now
marks everyone who passed unless `limitPerAccount` was sent.
