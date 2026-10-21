# Submit reviewed committee searches through Responses

Prepared for the authorized SDK release. Publication is pending.

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

The isolated candidate passed 74 focused and affected tests, including three
committee tests and twelve lookup tests. Type checking passed. Tests cover
stable keys across explicit retries for committee search and Account Monitor,
reviewed criteria and mixed case criterion IDs reaching the wire unchanged,
and existing Responses behavior. Provider responses were mocked.

The release candidate excludes unrelated network, podcast, competitor and
campaign edits. Frontend integration and adopting the published SDK remain
separate work. This patch neither deploys the backend nor changes its prompt.
