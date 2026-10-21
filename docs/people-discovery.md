# People discovery

These SDK changes are prepared for the authorized patch release. Publication
is pending. The dashboard must adopt the released SDK before it can use the
lookup method, committee types and Responses idempotency option.

## Find LinkedIn candidates

```ts
const result = await client.people.findLinkedInProfiles({
  people: [{ name: 'Example Person', company: 'Example Company', title: 'CEO' }],
})
```

The method accepts 1 to 50 rows and preserves backend result order. Each result
has `inputIndex`, `inputTitle`, `status`, `reason` and up to three `candidates`.
Use `inputIndex` to join the original name and company. A `matched` result means
candidates were returned; identity still needs confirmation. Lookup does not
save prospects or start research.

The method always disables automatic retries because the backend does not
persist replay results. Its default timeout is 90 seconds, allowing the
backend's 60-second batch deadline. An optional second argument can set a
shorter `timeoutMs`. HTTP 503 `NO_DATA_SOURCES` becomes `NoDataSourcesError`
while retaining the status, request ID and backend details. Other operations
retain their configured retry behavior.

## Find a reviewed committee

Use `responses.create` with `specializedAgent: 'committee_search'` and
`CommitteeSearchParams`. The parameters contain exactly one account, reviewed
`criteriaDefinitions` and `criteriaClassification`, and optional title hints.
The backend defaults to bounded live retrieval of up to 50 candidates and
GPT-6 Luna qualification. The return cap is configurable from 1 to 100; the
selection limit is from 1 to 25. Title hints do not replace reviewed criteria.

Existing Responses polling and result handling apply. No extra SDK execution
method or transport is introduced. Explicit unknown/error outcomes in the
committee result must remain distinct from an empty successful committee.

`responses.create(request, { idempotencyKey })` accepts a stable key for retries
of the same logical submission. Keep the request unchanged when reusing it.
Callers responsible for paid work should use a client with `maxRetries: 0` and
persist the key before submission; the SDK does not persist submission state.
This optional argument also requires the updated SDK release.

## Validation

`pnpm exec vitest run test/people-lookup.test.ts test/committee-search.test.ts test/client.test.ts test/responses.test.ts test/account-monitor.test.ts`
passes 74 tests, including 15 new tests. The same 59 existing tests passed
before these changes. `pnpm typecheck` passes.

The tests exercise the real SDK HTTP path with mocked fetch: field conversion,
mixed row outcomes, batch bounds, missing tenant keys, 429/5xx/transport errors,
deadline cancellation, unchanged retries on other operations, and full reviewed
criteria passing through Responses, and stable idempotency headers across
explicit retries. They make no paid calls.
