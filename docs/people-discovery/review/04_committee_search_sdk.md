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
