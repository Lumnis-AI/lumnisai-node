# People discovery

Published to npm as **lumnisai 0.5.65** on October 21, 2026. The release
commit is `d99fd77`; the [publish workflow](https://github.com/Lumnis-AI/lumnisai-node/actions/runs/39603172808) succeeded.
Dashboard and MCP callers can now adopt this version for lookup, committee
request types and the Responses idempotency option.

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

## Find an account's committee

Use `responses.create` with `specializedAgent: 'committee_search'` and
`CommitteeSearchParams`. The parameters hold exactly one account. Everything
else is optional. The search runs as a background job, so poll the response as
usual. This section describes SDK 0.5.72.

### The request

The user message is what you are asking for, in plain words.

```ts
await client.responses.create({
  messages: [{
    role: 'user',
    content: 'Map the team building the AI travel agent at Airbnb, director level and above, plus the people around that team.',
  }],
  specializedAgent: 'committee_search',
  specializedAgentParams: {
    accounts: [{ id: 'airbnb.com', name: 'Airbnb', domain: 'airbnb.com' }],
    focus: 'the team building the AI travel agent',
    orgChart: { scope: 'focus' },
  },
})
```

Optional fields:

- `titles`: job titles that narrow the people search (up to 30). When you
  send none, Lumnis writes them from the message and the focus.
- `criteriaDefinitions` and `criteriaClassification`: reviewed criteria. Send
  both or neither. When sent, they are used as they are.
- `writeCriteria`: only used when you send no criteria. `false` (the default)
  checks each person against your message as written. Every person gets a yes
  or no, a 0 to 10 score and a reason. `true` has Lumnis write separate
  criteria from the message first.
- `focus`: a team, function, product or initiative, in plain words (1 to 2000
  characters). The account's job posts are read for it, its people are
  searched for, and every person check sees it. Do not pass a list of team
  names. If you know a team name, write it inside this text.
- `depth`: `'standard'` (the default) searches stored profiles. `'deep'` runs
  the wider deep people search. It finds more people, takes much longer and
  costs more.
- `orgChart`: `{ scope: 'company' }` charts everyone found at the account.
  `{ scope: 'focus' }` charts the people the search said yes to, plus the
  leaders above them. It needs `focus`.
- `maxCandidatesPerAccount` (1 to 100, default 50) and `limitPerAccount`
  (1 to 25, default 25).

A request with no criteria and an empty message is rejected. `retrievalMode`
and `page` are removed. The backend rejects a request that sends either.

### The result

The criteria used come back in `structuredResponse.criteria`
(`CriteriaMetadata`). `source` is `provided` when you sent them, `query` when
your message was used as written, and `generated` when Lumnis wrote them.

The rest is under `structuredResponse.committee.accounts[0]`. The SDK passes
this subtree through unchanged, so its keys are snake_case.

- `candidates`: each person with a status, score and the decisions behind it.
- `focus` (`CommitteeFocus`): null when the request had no focus. Otherwise
  it holds `description` (your focus text), `title_phrases` (the team names
  searched in people's titles), `posts_read`, and `jobs`. Each job
  (`CommitteeFocusJob`) has `title`, `url`, `date_added`, `location`,
  `team_name`, `reports_to` and one `quote`. `status` is `ok`, `partial` or
  `error`. A skipped focus step never fails the search. `error` is an internal
  code. Do not show it to customers.
- `org_chart` (`CommitteeOrgChart`): present only when you asked for a chart.
  `nodes` lists people and unfilled seats (`kind: 'placeholder'`, no name, a
  likely title). Each node has its most likely `manager_id` (null at the top),
  a `confidence` from 0 to 1 (below 0.7 is an estimate), runner-up
  `other_managers` and `evidence`. `candidate_id` links a node to a committee
  candidate. `status: 'partial'` means the senior roster was unavailable.
  `error` means no chart. The people result is the same either way.

`source` is `crustdata_stored`, `crustdata_stored_exa`, `deep_search` or
`deep_search_exa`. `coverage` is `bounded_stored` or `deep`. The fields
`page`, `next_page`, `provider_job_id`, `retrieval_reused` and
`stored_credits_used` are gone.

### Paid work

Pass `{ idempotencyKey }` as the second argument to `responses.create` to
avoid starting paid work twice. Callers responsible for paid work should use a
client with `maxRetries: 0` and store the key before sending. The SDK does not
store it for you.

## Validation

The committed release passed **228 tests with 1 skipped**, type checking and
the package build. The focused checks below were run before release.

`pnpm exec vitest run test/people-lookup.test.ts test/committee-search.test.ts test/client.test.ts test/responses.test.ts test/account-monitor.test.ts`
passes 74 tests, including 15 new tests. The same 59 existing tests passed
before these changes. `pnpm typecheck` passes.

The tests exercise the real SDK HTTP path with mocked fetch: field conversion,
mixed row outcomes, batch bounds, missing tenant keys, 429/5xx/transport errors,
deadline cancellation, unchanged retries on other operations, and full reviewed
criteria passing through Responses, and stable idempotency headers across
explicit retries. They make no paid calls.
