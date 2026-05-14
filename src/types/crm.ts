/**
 * CRM Sync API types.
 *
 * These types map to the Python backend endpoints under /v1/crm.
 * Provider list mirrors `CrmProvider` in src/app/api/schemas/crm_schemas.py.
 *
 * All types are prefixed with `Crm` to avoid collisions with the
 * messaging-API prospect-sync types (`SyncProspectRequest`,
 * `SyncProspectResponse` in `./messaging`), which serve a different
 * purpose (LinkedIn/email conversation sync, not CRM linkage).
 */

// ==================== Providers ====================

/**
 * Connected CRM systems supported by the sync API.
 *
 * Capability notes:
 * - `attio` supports both email and LinkedIn-URL person search.
 * - `hubspot` only supports email search; LinkedIn URLs are stored as a
 *   custom property on create but are not searchable through the
 *   reconciliation flow.
 */
export type CrmProvider = 'attio' | 'hubspot'

// ==================== sync ====================

/**
 * Push one Lumnis prospect to the connected CRM.
 *
 * The prospect must already exist in a `campaign_prospects` row owned
 * by `userId`; the linkedin URL is the lookup key.
 */
export interface CrmSyncProspectRequest {
  /** UUID or email of the user whose CRM connection executes the call. */
  userId: string
  provider: CrmProvider
  /** Must contain `linkedin.com/in/`. */
  linkedinUrl: string
}

export interface CrmSyncProspectResponse {
  /**
   * `linked` — record already existed in the CRM (matched by email or
   * LinkedIn URL) and was linked back to the prospect.
   * `created` — no existing match, a new CRM record was created.
   */
  action: 'linked' | 'created'
  /** Provider-native record id (Attio record_id, HubSpot contact id). */
  crmRecordId: string
  /** Stable URL that opens the record in the CRM UI. */
  crmUrl: string
}

// ==================== match-batch ====================

/**
 * Bulk-check whether prospects are already in the CRM.
 *
 * Server-side fan-out is bounded by the
 * `CRM_MATCH_LIVE_SEARCH_PARALLELISM` setting; the array max
 * (1000) is a Pydantic guard, not a UX cap.
 */
export interface CrmMatchBatchRequest {
  userId: string
  provider: CrmProvider
  /** 1..1000 LinkedIn profile URLs. */
  linkedinUrls: string[]
}

export interface CrmMatchedProspect {
  /** Echoed input URL (in original casing/form). */
  linkedinUrl: string
  linked: boolean
  /** Present iff `linked` is true. */
  crmRecordId?: string | null
  crmUrl?: string | null
}

export interface CrmMatchBatchResponse {
  matches: CrmMatchedProspect[]
}
