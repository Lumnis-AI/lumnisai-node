# People discovery review

The backend LinkedIn lookup and live committee agent are separate completed
backend problems. Committee search is committed as `494d2c52a` on
`feat/context-dev-profile-refresh`. This SDK lookup patch is staged, not
committed. It is the next prerequisite for making LinkedIn lookup available
through the existing MCP server. Commit approval is still required.

3. **Find LinkedIn candidates through the SDK.** Add
   `people.findLinkedInProfiles` with typed rows and results. Use the existing
   HTTP client, disable automatic retries for this paid lookup, and preserve
   missing credential errors. [Review](review/03_linkedin_lookup_sdk.md).

MCP registration, committee search SDK types, Responses idempotency options,
dashboard wiring and package publication remain separate work. This patch
does not include the unrelated campaign changes already in the SDK index.
