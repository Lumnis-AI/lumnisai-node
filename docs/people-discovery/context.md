# People discovery review

The backend LinkedIn lookup and live committee agent are separate completed
backend problems. Committee search is committed as `494d2c52a` on
`feat/context-dev-profile-refresh`. SDK lookup and committee support are prepared for the user authorized patch
release. Publication is pending. These contracts let the existing MCP server
and dashboard use the new backend features.

3. **Find LinkedIn candidates through the SDK.** Add
   `people.findLinkedInProfiles` with typed rows and results. Use the existing
   HTTP client, disable automatic retries for this paid lookup, and preserve
   missing credential errors. [Review](review/03_linkedin_lookup_sdk.md).

4. **Submit reviewed committee searches through Responses.** Export the
   committee request type and accept a caller supplied idempotency key in
   `responses.create`. [Review](review/04_committee_search_sdk.md).

MCP registration, dashboard wiring and package publication remain separate
work. The release candidate excludes unrelated campaign, network, podcast and
competitor changes in the shared SDK working tree.
