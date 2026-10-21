# People discovery review

The backend LinkedIn lookup and live committee agent are separate completed
backend problems. Committee search is committed as `494d2c52a` on
`feat/context-dev-profile-refresh`. SDK lookup (`37cb12d`) and committee
support (`fed9804`) are reviewed, committed and published in **0.5.65**
(release `d99fd77`). The release passed 228 tests with 1 skipped, type checking
and the package build.

3. **Find LinkedIn candidates through the SDK.** Add
   `people.findLinkedInProfiles` with typed rows and results. Use the existing
   HTTP client, disable automatic retries for this paid lookup, and preserve
   missing credential errors. [Review](review/03_linkedin_lookup_sdk.md).

4. **Submit reviewed committee searches through Responses.** Export the
   committee request type and accept a caller supplied idempotency key in
   `responses.create`. [Review](review/04_committee_search_sdk.md).

MCP registration and dashboard wiring remain separate frontend work. The
published SDK excludes unrelated campaign, network, podcast and competitor
changes in the shared SDK working tree.
