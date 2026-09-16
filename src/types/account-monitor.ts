// Account monitor agent (`account_monitor`)
//
// ONE externally triggered report on ONE account for ONE fixed window — there
// is no backend schedule, no saved cadence and no automatic re-run. Every run
// re-states its own period, so the caller owns when monitoring happens.
//
//   selected signals -> identity resolution -> rosters -> evidence collection
//        -> per-person and per-source analysis -> committee synthesis
//        -> account score + report
//
// What the run collects is decided ONLY by the selected signals (or the
// `depth` preset that stands in for them). Nothing is implied: supplying a
// competitor does not collect its employees, and supplying a company never
// means all of its employees. Coverage is always partial and the report says
// so — a missing record never proves that nothing happened.
//
// Supplying `crmUserId` also reads that owner's connected CRM alongside the
// public collection, and hands the scorer the existing relationship. CRM is
// context, never a monitored event: it adds no signal and no evidence row.

import type { CrmAccountContextBatchResponse } from './crm'

/**
 * Checks the monitor can run. Each name maps to an explicit evidence recipe;
 * unselected checks are never collected and never billed.
 *
 * Company signals:
 * - `company_hiring` — job listings for the account.
 * - `company_news` — news and events about the account.
 * - `company_funding` — funding raised BY the account (not by its portfolio).
 * - `company_posts` — posts from the account's LinkedIn company page.
 * - `company_mention` — posts tagging the page, plus a company-name keyword search.
 * - `company_background` — the account's company record.
 *
 * Committee signals (need `committee` people):
 * - `committee_activity` — the committee's own posts, comments and reactions.
 * - `committee_to_competitor` / `committee_to_our_company` — committee actions
 *   on the other side's content, matched by exact identity.
 *
 * `competitor_to_committee` is the reverse direction: it reads the
 * competitor's own employees' outgoing comments and reactions, so it needs
 * `people` or `employeeTitles` on that competitor.
 *
 * `account_to_our_company` reads the account page's own posts.
 *
 * `our_company_to_committee` and `our_company_to_account` were retired: they
 * remain readable on unfinished older runs but cannot be requested.
 */
export type AccountMonitorSignalName =
  | 'company_hiring'
  | 'company_news'
  | 'company_funding'
  | 'company_posts'
  | 'company_mention'
  | 'company_background'
  | 'committee_activity'
  | 'committee_to_competitor'
  | 'competitor_to_committee'
  | 'committee_to_our_company'
  | 'account_to_our_company'

/**
 * One requested check. Same object-list shape as people-search
 * `signalDefinitions`, but the names and the settings differ: a monitor entry
 * carries only `name`.
 */
export interface AccountMonitorSignalDefinition {
  name: AccountMonitorSignalName
}

/**
 * Source preset used only when `signalDefinitions` is omitted.
 *
 * - `light` (default) — `company_hiring`, `company_news`, `company_funding`,
 *   `company_posts`, `company_background`.
 * - `deep` — light plus `committee_activity` when committee people are
 *   supplied, `committee_to_competitor` when competitors are supplied,
 *   `competitor_to_committee` when a competitor has people or
 *   `employeeTitles`, and `committee_to_our_company` when `ourCompany` is set.
 *
 * Depth never caps pages, truncates model input or promises completeness.
 */
export type AccountMonitorDepth = 'light' | 'deep'

/** Explicit UTC period: `startAt` inclusive, `endAt` exclusive. */
export interface AccountMonitorWindow {
  /** Timezone-aware ISO 8601 start, inclusive. */
  startAt: string
  /** Timezone-aware ISO 8601 end, exclusive. */
  endAt: string
}

/**
 * A company plus an EXPLICIT employee scope. A bare company string means the
 * company page only — it never means the company's employees.
 */
export interface AccountMonitorCompany {
  /** Company domain, website, LinkedIn company URL, or name. */
  company: string
  /**
   * Employee LinkedIn profile URLs to track by hand. Requested reverse
   * signals read these people's outgoing comments and reactions.
   */
  people?: string[]
  /**
   * Current-title filters for employee discovery, e.g. `['VP Sales', 'RevOps']`.
   * Omit to skip discovery entirely; every title must be non-blank.
   */
  employeeTitles?: string[]
}

/**
 * The buying committee: ungrouped people and named groups, combined. Each
 * person is fetched once and keeps every group label they appear under.
 *
 * Group labels are caller data and are sent verbatim — the SDK does not
 * rewrite their case the way it rewrites field names.
 */
export interface AccountMonitorCommittee {
  /** Ungrouped LinkedIn profile URLs. */
  people?: string[]
  /** Group label to LinkedIn profile URLs, e.g. `{ 'security team': [...] }`. */
  groups?: Record<string, string[]>
}

/**
 * Committee shorthand accepted alongside the full object: a bare URL array
 * becomes `people`, and a label map becomes `groups`.
 */
export type AccountMonitorCommitteeInput =
  | AccountMonitorCommittee
  | string[]
  | Record<string, string[]>

/**
 * Parameters for the `account_monitor` agent.
 *
 * The backend REJECTS unknown fields here, so send only what this interface
 * declares — unlike the people agents, there is no open parameter bag.
 */
export interface AccountMonitorParams {
  /**
   * The monitored company: domain, website, or LinkedIn company URL. A bare
   * name is not enough — identity has to resolve exactly.
   */
  account: string
  /** Source preset used only when `signalDefinitions` is omitted. @default 'light' */
  depth?: AccountMonitorDepth
  /** The buying committee. Omit for a company-only run. */
  committee?: AccountMonitorCommitteeInput
  /**
   * Companies to match against. Strings mean company pages only; use objects
   * to give an explicit employee scope.
   */
  competitors?: Array<string | AccountMonitorCompany>
  /** Our own company, kept separate from the account and the competitors. */
  ourCompany?: string | AccountMonitorCompany
  /**
   * Rolling look-back in days. Cannot be combined with `window`.
   * @default 7
   * @minimum 1
   */
  days?: number
  /** Explicit period instead of `days`. Frozen on the first save and reused on resume. */
  window?: AccountMonitorWindow
  /**
   * The checks to run, overriding any `depth` preset. `[]` selects no source
   * work at all. Selecting signals never implies complete coverage.
   */
  signalDefinitions?: AccountMonitorSignalDefinition[]
  /**
   * Plain-English direction for report focus, sections, recommendations and
   * scoring. It never changes evidence, permissions, dates or coverage.
   */
  intentScoringInstructions?: string
  /**
   * Previous outputs, corrections and decisions, or plain context text. There
   * is no response-ID lookup, CRM connection or automatic memory retrieval —
   * whatever the comparison should use has to be passed here.
   *
   * Object keys are converted to snake_case in transit like every other field,
   * so pass a plain string when the keys themselves are caller data.
   */
  history?: Record<string, any> | string
  /**
   * Read one tenant member's connected CRM alongside the public evidence: the
   * account and deal context, and for HubSpot the linked record history —
   * properties, dated property changes, and email/call/meeting/note bodies.
   * Pass the CRM owner's UUID or email.
   *
   * The request must also name the requester in its top-level `userId`
   * ({@link AccountMonitorOptions.userId} on the helper); the pair is refused
   * without it. Reading your own CRM is always allowed, another member's needs
   * a CRM access grant (`client.crm.grantExclusionGrant`), and both identities
   * have to belong to the authenticated tenant.
   *
   * What comes back is relationship context, not activity: it gets no signal
   * slot, no evidence id, and never raises the score by itself. A failed or
   * unconnected read is a coverage gap, never proof there is no relationship.
   * Omit for no CRM lookup.
   */
  crmUserId?: string
  /** Caller-defined account tier. Passed through; it is not a collection policy. */
  tier?: string
}

/** Options accepted by {@link ResponsesResource.accountMonitor}. */
export interface AccountMonitorOptions extends AccountMonitorParams {
  /**
   * The acting user, sent as the request's top-level `userId` rather than as a
   * monitor parameter. Required with `crmUserId` — it is the identity the CRM
   * access check runs against.
   */
  userId?: string
}

/**
 * One date on a saved row, with the precision the provider actually supplied.
 *
 * - `exact` — a timestamp, in `value`.
 * - `day` — a calendar day; `earliest`/`latest` bound it and `latestExclusive`
 *   is set, because a date-only value is an interval, not an instant.
 * - `range` — a provider bracket with `earliest`/`latest`.
 * - `relative` — derived from wording like "3d ago", measured from `fetchedAt`;
 *   treat `estimate` as uncertain.
 * - `unknown` — no date was supplied. Never place the action in time.
 */
export interface AccountMonitorDate {
  precision?: 'exact' | 'day' | 'range' | 'relative' | 'unknown' | string
  value?: string | null
  earliest?: string | null
  latest?: string | null
  /** True when `latest` is the exclusive end of a date-only interval. */
  latestExclusive?: boolean
  /** The provider field this date came from. */
  field?: string | null
  /** The raw provider value, before parsing. */
  raw?: any
  /** `relative` only: the derived instant, and when it was measured from. */
  estimate?: string | null
  fetchedAt?: string
  [key: string]: any
}

/** Token accounting for one model call. Absence is not proof of a free call. */
export interface AccountMonitorUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  /** The model that actually served the call. */
  servingModel?: string | null
  /** Trace id for the call. */
  llmRunId?: string | null
  durationMs?: number
  [key: string]: any
}

/** Names one collected signal: its type and the person or company it is about. */
export interface AccountMonitorSignalRef {
  signalType: string
  subject?: string | null
  [key: string]: any
}

/**
 * Who acted, as resolved from the saved row. `aliases` are the exact
 * identifiers matching used; `basis` says where the identity came from, so a
 * feed's own subject is never mistaken for a proven actor. `raw` is the
 * provider's identity block.
 */
export interface AccountMonitorIdentity {
  aliases?: Array<{ kind: string, namespace: string, value: string }>
  /** e.g. `provider`, `request_subject`, `post_author`, `saved_post_author`. */
  basis?: string
  raw?: Record<string, any>
  /** Set when the identifiers point at both a person and a company. */
  ambiguousKind?: boolean
  [key: string]: any
}

/** Which saved page and row this observation came from. */
export interface AccountMonitorProvenance {
  /** Internal ids of the raw responses behind this row. */
  rawArtifactIds?: string[]
  fetchedAt?: string
  pageIndex?: number
  rowIndex?: number
  pageStatus?: string
  /** The date field used to place this row in the window. */
  windowBasis?: string | null
  [key: string]: any
}

/** Where a cited row sits in time. Written by code from that row, never by the model. */
export interface AccountMonitorRecency {
  evidenceId: string
  windowStatus: 'in_window' | 'outside' | 'uncertain' | 'undated' | string
  /** When the action happened. */
  actionTime?: AccountMonitorDate
  /** When the post it concerns was published — a different date. */
  postTime?: AccountMonitorDate
  [key: string]: any
}

/**
 * One saved observation: an action or source record, kept whole.
 *
 * `record` is the source's own row, so anything not surfaced by the fields
 * below is still there. Its field names vary by source and are camel-cased in
 * transit like every other key in a response — a `date_posted` field reaches
 * you as `datePosted` — while the values are untouched.
 */
export interface AccountMonitorEvidenceRow {
  evidenceId: string
  /** The collected source, e.g. `jobs`, `person_comments`, `news_events`. */
  source: string
  /** The person, company or post this source was collected for. */
  subject: string
  /** `post`, `repost`, `comment`, `reaction`, `job`, `news_candidate`, and so on. */
  kind: string
  record: Record<string, any>
  postIds?: string[]
  /** Who acted. The feed's subject alone never establishes this. */
  actor?: AccountMonitorIdentity
  target?: AccountMonitorIdentity
  postAuthor?: AccountMonitorIdentity
  text?: string | null
  actionTime?: AccountMonitorDate
  postTime?: AccountMonitorDate
  windowStatus: 'in_window' | 'outside' | 'uncertain' | 'undated' | string
  /** Which saved page and row this came from, and the raw responses behind it. */
  provenance?: AccountMonitorProvenance[]
  /** The committee group labels that asked for this row. */
  groups?: string[]
  [key: string]: any
}

/**
 * One evidence-backed claim: what the evidence supports, why, and the saved
 * rows that support it. `recency` is attached by code from the cited rows —
 * the model never writes dates into it.
 */
export interface AccountMonitorClaim {
  statement?: string
  /** Saved evidence ids supporting this claim. */
  evidenceIds?: string[]
  /** Per-cited-row action/post dates, precision, and window status. */
  recency?: AccountMonitorRecency[]
  [key: string]: any
}

/**
 * One check this run collected, with the status code assigned it. Only
 * `found` signals are given to the model; code answers the rest.
 *
 * - `found` — in-window evidence exists.
 * - `snapshot` — background facts with no dates, e.g. the company record.
 * - `error` — the source could not be checked.
 * - `incomplete` — it stopped early, or dates could not be placed.
 * - `nothing_in_window` — it finished and found nothing in the window.
 */
export interface AccountMonitorCollectedSignal {
  signalType: string
  subject?: string | null
  status: 'found' | 'snapshot' | 'error' | 'incomplete' | 'nothing_in_window' | string
  /** Null when coverage cannot say how many rows fell in the window. */
  inWindowObservations?: number | null
  collectedObservations?: number | null
  /** The feeds behind this signal, and how each one stopped. */
  feeds?: Array<{ feed?: string, stopReason?: string, error?: string | null }>
  /** True when the check was requested but no corresponding source ran. */
  requestedMissing?: boolean
  [key: string]: any
}

/** How one collected signal was judged. A positive score needs in-window evidence. */
export interface AccountMonitorSignal {
  signalType: string
  subject?: string | null
  /** `found` when the signal has in-window evidence. */
  status?: string
  /** Customer-facing explanation, written before the score. */
  reasoning?: string
  /** Whether the evidence matters for the requested analysis. */
  relevant?: boolean
  score?: number
  evidenceIds?: string[]
  /** Link of a cited row, attached by code. */
  evidenceUrl?: string | null
  /** Optional customer-friendly label; never a provider name. */
  source?: string
  /** Per-cited-row dates and window status, attached by code. */
  recency?: AccountMonitorRecency[]
  [key: string]: any
}

/**
 * One narrative section of the report. By default each covers one important
 * change, with a Markdown-bullet body: what the cited records show, then what
 * it supports for this account.
 */
export interface AccountMonitorReportSection {
  title?: string
  body?: string
  evidenceIds?: string[]
  [key: string]: any
}

/**
 * The suggested next move — a suggestion, not a recorded commitment. Null when
 * the customer's direction asked for no action advice.
 */
export interface AccountMonitorRecommendation {
  action?: string
  reasoning?: string
  evidenceIds?: string[]
  suggestedTiming?: string | null
  [key: string]: any
}

/** The model's account judgment. */
export interface AccountMonitorScore {
  score?: number
  /** Strongest useful finding first. */
  reasoning?: string[]
  signals?: AccountMonitorSignal[]
  /** What was and was not covered; gaps are never treated as negatives. */
  coverage?: string[]
  sections?: AccountMonitorReportSection[]
  recommendation?: AccountMonitorRecommendation | null
  uncertainty?: string[]
  /** Evidence-backed priority under the customer's direction; null when unsupported. */
  level?: string | null
  [key: string]: any
}

/**
 * Automated evidence checks on the generated answer. Checks describe the
 * answer, they never withhold it: `warnings` still ships a full report.
 */
export interface AccountMonitorValidation {
  /**
   * `validated` — every check passed. `warnings` — the answer shipped with
   * flagged claims to verify. `error` — that analysis could not finish and its
   * original evidence went to the next stage instead.
   */
  status?: 'validated' | 'warnings' | 'error' | string
  /** Cited ids that are not saved evidence at all. */
  unknownEvidenceIds?: string[]
  /** Cited ids that are real, but belong to a different signal or section. */
  mismatchedEvidenceIds?: string[]
  /** Person reports report their mismatches per claim list. */
  mismatchedEvidenceIdsBySection?: Record<string, string[]>
  /** Listed signals the answer never judged. */
  missingSignalTypes?: string[]
  missingSignals?: AccountMonitorSignalRef[]
  /** Judgments for signals that were not listed. */
  extraSignals?: AccountMonitorSignalRef[]
  /** Positive scores without relevant, in-window evidence of their own. */
  unsupportedPositiveSignals?: AccountMonitorSignalRef[]
  /**
   * Internal evidence ids the model wrote into customer-facing prose. The
   * checks read its raw answer, while the prose that ships has those handles
   * removed — so this can be non-empty and the returned text still clean.
   * Citation fields (`evidenceIds`, `evidenceUrl`) are untouched either way.
   */
  rawEvidenceIdsInReasoning?: string[]
  /** An account score above zero with no positive signal behind it. */
  unsupportedAccountScore?: boolean
  unsupportedReportEvidenceIds?: string[]
  invalidReportSections?: boolean
  /** A missing or incomplete recommendation where one was required. */
  invalidRecommendation?: boolean
  /** How many signals were collected, and how many the answer judged. */
  collectedSignals?: number
  signalEntries?: number
  /** The answer did not fit the expected shape; it is returned in full anyway. */
  schemaErrors?: Array<Record<string, any>>
  signalKeyError?: boolean
  /** Set with `status: 'error'`: the exception type that stopped this analysis. */
  errorType?: string
  [key: string]: any
}

/**
 * Whether the requested checks support the assessment.
 *
 * - `supported` — every requested check finished within its stated limits.
 * - `limited` — current findings stand, but some checks or dates are incomplete.
 * - `insufficient` — the account cannot be prioritized from this evidence. A
 *   zero here is a coverage statement, not a low-priority judgment.
 */
export interface AccountMonitorAssessment {
  status: 'supported' | 'limited' | 'insufficient' | string
  reason: string
  requestedSignalTypes?: string[]
  /** Requested checks that were incomplete, errored, or background-only. */
  incompleteSignalTypes?: string[]
  [key: string]: any
}

/**
 * One finding matched against the supplied baseline.
 *
 * `new` means first seen relative to that baseline — not that the event just
 * happened. `unknown` means the records could not be compared at all.
 */
export interface AccountMonitorComparisonFinding {
  signalType?: string
  subject?: string | null
  evidenceId?: string
  status?: 'new' | 'repeated' | 'unknown' | string
  /** Stable identity of the underlying record across runs. */
  findingKey?: string | null
  identityKeys?: string[]
  windowStatus?: string
  actionTime?: AccountMonitorDate
  postTime?: AccountMonitorDate
  [key: string]: any
}

/**
 * How this run's findings compare with the history the caller supplied. There
 * is no automatic lookup: with no comparable prior output this is a first
 * assessment.
 */
export interface AccountMonitorComparison {
  status?: 'compared' | 'unavailable' | 'first_assessment' | string
  /** Newly observed is not newly occurred — the run states this itself. */
  meaning?: string
  findings?: AccountMonitorComparisonFinding[]
  /** Earlier findings this run did not observe; unresolved, not disappeared. */
  unresolvedPrevious?: AccountMonitorComparisonFinding[]
  corrections?: Array<Record<string, any> | string>
  decisions?: Array<Record<string, any> | string>
  [key: string]: any
}

/** The compact card: a projection of the score, never a second judgment. */
export interface AccountMonitorCard {
  account: string
  tier?: string | null
  /** Copied from the score; null when the evidence is insufficient. */
  level?: string | null
  /** Always null — routing an alert to an owner needs context this run does not have. */
  owner?: string | null
  score?: number | null
  /** Top reasons, in the score's own order. */
  reasons: string[]
  coverage: string[]
  signalsFound: number
  signalsChecked: number
  validation?: string
  assessmentStatus: string
  assessmentReason: string
  /** The report's sections and next step, copied from the score. */
  sections?: AccountMonitorReportSection[]
  recommendation?: AccountMonitorRecommendation | null
  [key: string]: any
}

/** The account scorer's full output, including the evidence it cited. */
export interface AccountMonitorAccountAnalysis {
  /**
   * Null when scoring itself could not finish — the completed analyses and the
   * source coverage still ship, and `assessment` explains the gap.
   */
  score?: AccountMonitorScore | Record<string, any> | null
  assessment?: AccountMonitorAssessment
  validation?: AccountMonitorValidation
  /** Full saved rows behind every cited id, so the report can be re-checked. */
  citedEvidence?: AccountMonitorEvidenceRow[]
  /** The model's untouched answer, kept when the checks raised warnings. */
  rawModelOutput?: Record<string, any>
  /** Comparison against the supplied history, written by code. */
  comparison?: AccountMonitorComparison
  /** The caller's history, minus the prior reports it was derived from. */
  history?: Record<string, any>
  /** Every collected signal and its status, including the ones not judged. */
  collectedSignals?: AccountMonitorCollectedSignal[]
  requestedSignalTypes?: string[]
  intentScoringInstructions?: string | null
  promptId?: string
  usage?: AccountMonitorUsage
  [key: string]: any
}

/** One committee member's activity report. */
export interface AccountMonitorPersonReport {
  /** The person's LinkedIn profile URL. */
  subject?: string
  window?: Partial<AccountMonitorWindow>
  report?: {
    /** What the evidence shows, what is background, and what was not covered. */
    reasoning?: string
    /** Written by code from the evidence, never by the model. */
    nothingInWindow?: boolean
    activitySummary?: string
    topicsDiscussed?: AccountMonitorClaim[]
    /** Stated changes in their work: responsibilities, projects, evaluations, timing. */
    professionalDevelopments?: AccountMonitorClaim[]
    hiringStatements?: AccountMonitorClaim[]
    engagedWith?: AccountMonitorClaim[]
    competitorOrOurCompanyInteractions?: AccountMonitorClaim[]
    /** Written by code, never by the model. */
    coverageStatement?: string
    sourceCoverage?: AccountMonitorSourceCoverage[]
    [key: string]: any
  }
  validation?: AccountMonitorValidation
  promptId?: string
  usage?: AccountMonitorUsage
  [key: string]: any
}

/** One company-source analysis: `web` covers news/events and funding, `hiring` covers jobs. */
export interface AccountMonitorCompanySourceReport {
  kind?: 'web' | 'hiring' | string
  window?: Partial<AccountMonitorWindow>
  report?: {
    reasoning?: string
    findings?: AccountMonitorClaim[]
    coverageStatement?: string
    sourceCoverage?: AccountMonitorSourceCoverage[]
    [key: string]: any
  }
  validation?: AccountMonitorValidation
  usage?: AccountMonitorUsage
  [key: string]: any
}

/** The committee read as a group, before the customer's prioritisation is applied. */
export interface AccountMonitorCommitteeSynthesis {
  account?: string
  window?: Partial<AccountMonitorWindow>
  report?: {
    reasoning?: string
    findings?: AccountMonitorClaim[]
    /** Themes shared across members, and where they diverge. */
    committeePatterns?: AccountMonitorClaim[]
    contradictions?: AccountMonitorClaim[]
    /** Questions the evidence cannot answer. */
    questions?: string[]
    coverage?: string[]
    [key: string]: any
  }
  validation?: AccountMonitorValidation
  usage?: AccountMonitorUsage
  [key: string]: any
}

/**
 * An analysis that could not finish — its `validation.status` is `error` and
 * `validation.errorType` names what stopped it. Its original evidence still
 * reached the scorer, and the report says so.
 *
 * An analysis whose evidence checks merely raised warnings is NOT a failure:
 * it ships in the ordinary reports list with `validation.status: 'warnings'`.
 */
export interface AccountMonitorAnalysisFailure {
  /** Present on person failures: the person's LinkedIn profile URL. */
  subject?: string
  /** Present on company-source failures: `web` or `hiring`. */
  kind?: string
  validation?: AccountMonitorValidation
  [key: string]: any
}

/** One source request exactly as it was made and frozen. */
export interface AccountMonitorSourceRequest {
  source: string
  subject: string
  window: AccountMonitorWindow
  /**
   * Source-specific settings, e.g. `{ kind: 'funding' }` or `{ mode: 'tagged' }`.
   * Keys are camel-cased in transit: `company_id` reaches you as `companyId`.
   */
  parameters?: Record<string, any>
  /** The committee group labels this request serves. */
  groups?: string[]
  [key: string]: any
}

/**
 * What one source returned. `complete` means the requested traversal finished
 * — never that all public activity was seen.
 */
export interface AccountMonitorCoverage {
  complete?: boolean
  /** Spells out what `complete` does and does not claim. */
  completeMeaning?: string
  /** Why traversal stopped, e.g. `no_more_pages`, `lookback_window`, `error`. */
  stopReason?: string
  error?: string | null
  window?: AccountMonitorWindow
  pages?: number
  pageStatuses?: Record<string, number>
  /** Rows the provider returned, before duplicates were merged. */
  sourceRecords?: number
  observations?: number
  exactDuplicates?: number
  /** How the retained rows fall across the window. */
  windowStatuses?: {
    inWindow?: number
    outside?: number
    uncertain?: number
    undated?: number
    [key: string]: number | undefined
  }
  missingPostIds?: number
  missingActorIds?: number
  credits?: number | null
  /** Rows the provider returned in an unusable shape. */
  skippedRows?: number
  /** Set when records could not be normalized; their raw responses are kept. */
  preparationError?: string
  /** Set when saved evidence could not be read back. */
  savedEvidenceError?: string
  [key: string]: any
}

/** What each requested source actually returned, and how it stopped. */
export interface AccountMonitorSourceCoverage {
  request: AccountMonitorSourceRequest
  coverage: AccountMonitorCoverage
  evidenceIds?: string[]
  [key: string]: any
}

/**
 * Why the CRM read produced context, or did not.
 *
 * - `ok` — the CRM answered; `response` carries the account context.
 * - `not_connected` — that owner has no supported active CRM connection.
 * - `discovery_failed` — the connection status could not be checked.
 * - `read_failed` — the CRM was reachable but the read did not complete.
 *
 * Only `ok` with a complete no-match result says there is no relationship.
 * Every other status is a gap in what could be read.
 */
export type AccountMonitorCrmStatus =
  | 'ok'
  | 'not_connected'
  | 'discovery_failed'
  | 'read_failed'

/**
 * Company-rooted HubSpot history for the matched account.
 *
 * - `complete` / `partial` — records were read; `partial` means at least one
 *   `coverage` row did not finish. Both ship everything that was retrieved.
 * - `no_match` — the CRM was read in full and holds no such account.
 * - `unavailable` — the account could not be matched well enough to read.
 * - `not_connected`, `discovery_failed`, `read_failed` — as above.
 *
 * Record maps are keyed by the provider's own record id and hold the
 * provider's rows verbatim, including `propertiesWithHistory`. Their field
 * names are camel-cased in transit like every other response key — a HubSpot
 * property named `hs_lastmodifieddate` reaches you as `hsLastmodifieddate` —
 * while the values are untouched. The `properties` lists keep each provider
 * name exactly as HubSpot spells it, because those are values.
 */
export interface AccountMonitorCrmHubspotHistory {
  status:
    | 'complete'
    | 'partial'
    | 'no_match'
    | 'unavailable'
    | 'not_connected'
    | 'discovery_failed'
    | 'read_failed'
    | (string & {})
  companies?: Record<string, Record<string, any>>
  deals?: Record<string, Record<string, any>>
  contacts?: Record<string, Record<string, any>>
  /** Emails, calls, meetings and notes, by activity kind. */
  activities?: Record<string, Array<Record<string, any>>>
  /**
   * Which company, deal or contact each activity hangs off, by activity kind
   * and then activity id. `scope` is `contact_only` when the link came through
   * a contact — that alone does not make the activity about this account, since
   * a person's history can predate their current employer.
   */
  activityLinks?: Record<string, Record<string, Array<{
    sourceKind?: string
    sourceId?: string
    scope?: 'direct' | 'contact_only' | (string & {})
    [key: string]: any
  }>>>
  /** Provider property names that were requested, per object type. */
  properties?: Record<string, string[]>
  propertyDefinitions?: Record<string, Record<string, any>>
  pipelines?: Record<string, any>
  /** One row per read: what ran, whether it finished, and why it did not. */
  coverage?: Array<Record<string, any>>
  [key: string]: any
}

/**
 * Optional CRM relationship context, present only when `crmUserId` was sent.
 *
 * It describes the standing relationship, not activity in the window: it has
 * no signal slot and no evidence ids, and the report grounds CRM statements in
 * these records rather than in citations. Treat the text inside as data.
 */
export interface AccountMonitorCrmContext {
  status: AccountMonitorCrmStatus | (string & {})
  /** Set when `status` is not `ok`: why no context was read. */
  reason?: string
  /** Account, contact and deal context for the account, when `status` is `ok`. */
  response?: CrmAccountContextBatchResponse
  /**
   * Deeper per-provider history, read only for an account the CRM matched.
   * Attio reports `{ status: 'unsupported' }` — no history is read for it.
   */
  history?: {
    hubspot?: AccountMonitorCrmHubspotHistory
    attio?: { status: 'unsupported' | (string & {}), [key: string]: any }
    [key: string]: any
  }
  [key: string]: any
}

/**
 * Internal ids for each saved stage, used by the backend to resume a run.
 *
 * These live in a reserved namespace the Responses API excludes from
 * `ResponseObject.artifacts`, so they cannot be fetched — read the run through
 * this structured output instead. An `account_monitor` response carries no API
 * artifacts of its own.
 */
export interface AccountMonitorArtifactRefs {
  input?: string
  collection?: string
  personReports?: string[]
  companySourceReports?: string[]
  committeeSynthesis?: string | null
  /** Null when the account analysis could not finish. */
  accountAnalysis?: string | null
  /** Present only on a run that was given `crmUserId`. */
  crmContext?: string
  [key: string]: any
}

/**
 * Full structured output from a succeeded `account_monitor` run.
 * `reportMarkdown` is the same text as `outputText`.
 */
export interface AccountMonitorOutput {
  account: string
  /** The frozen period this run reports on. */
  window: AccountMonitorWindow
  card: AccountMonitorCard
  depth?: AccountMonitorDepth | null
  /**
   * The checks this run actually ran. Unfinished older runs can still name a
   * retired check, so this stays open.
   */
  selectedSignals: Array<AccountMonitorSignalName | (string & {})>
  accountAnalysis: AccountMonitorAccountAnalysis
  validation: AccountMonitorValidation
  /**
   * Every person analysis that finished, including ones whose evidence checks
   * raised warnings — read each report's own `validation.status`.
   */
  personReports: AccountMonitorPersonReport[]
  /** Only the analyses that could not finish at all. */
  personReportFailures: AccountMonitorAnalysisFailure[]
  /** Web (news and funding) and hiring analyses that finished. */
  companySourceReports: AccountMonitorCompanySourceReport[]
  companySourceReportFailures: AccountMonitorAnalysisFailure[]
  committeeSynthesis: AccountMonitorCommitteeSynthesis | null
  committeeSynthesisFailure: { validation?: AccountMonitorValidation } | null
  sourceCoverage: AccountMonitorSourceCoverage[]
  /**
   * The CRM read, present only when the run was given `crmUserId`. Context for
   * the report — it never appears in `selectedSignals` or the evidence rows.
   */
  crmContext?: AccountMonitorCrmContext
  reportMarkdown: string
  artifactRefs: AccountMonitorArtifactRefs
}
