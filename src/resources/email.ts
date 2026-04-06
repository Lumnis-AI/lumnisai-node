import type { Http } from '../core/http'
import type {
  AddOrgMemberRequest,
  AddOrgMemberResponse,
  AddPersonaRequest,
  AddPersonaResponse,
  EmailOnboardRequest,
  EmailOnboardResponse,
  EmailOnboardStatusResponse,
  EmailOrgHealthResponse,
  EmailOrgListResponse,
  EmailOrgSettingsResponse,
  EmailOrgSettingsUpdate,
  RemoveOrgMemberResponse,
  TeardownOrgResponse,
} from '../types/email'

/**
 * Resource for managing email infrastructure.
 *
 * Handles onboarding, organization management, sender personas,
 * and member access for email outreach infrastructure.
 */
export class EmailResource {
  constructor(private readonly http: Http) {}

  // ==================== Onboarding ====================

  /**
   * Start onboarding a new organization for email outreach.
   *
   * This provisions domains, mailboxes, and warmup infrastructure.
   * Typically takes 30-60 minutes to complete.
   */
  async onboard(request: EmailOnboardRequest): Promise<EmailOnboardResponse> {
    return this.http.post<EmailOnboardResponse>('/email/onboard', request)
  }

  // ==================== Organizations ====================

  /**
   * List email organizations the user has access to.
   */
  async listOrganizations(userId: string): Promise<EmailOrgListResponse> {
    return this.http.get<EmailOrgListResponse>('/email/organizations', {
      params: { user_id: userId },
    })
  }

  /**
   * Get onboarding status for an organization.
   */
  async getOnboardingStatus(
    orgId: string,
    userId: string,
  ): Promise<EmailOnboardStatusResponse> {
    return this.http.get<EmailOnboardStatusResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/status`,
      { params: { user_id: userId } },
    )
  }

  /**
   * Get current settings for an organization.
   */
  async getSettings(
    orgId: string,
    userId: string,
  ): Promise<EmailOrgSettingsResponse> {
    return this.http.get<EmailOrgSettingsResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/settings`,
      { params: { user_id: userId } },
    )
  }

  /**
   * Update organization settings. Requires admin role.
   */
  async updateSettings(
    orgId: string,
    userId: string,
    update: EmailOrgSettingsUpdate,
  ): Promise<EmailOrgSettingsResponse> {
    return this.http.put<EmailOrgSettingsResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/settings`,
      update,
      { params: { user_id: userId } },
    )
  }

  /**
   * Get health summary for an organization.
   */
  async getHealth(
    orgId: string,
    userId: string,
  ): Promise<EmailOrgHealthResponse> {
    return this.http.get<EmailOrgHealthResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/health`,
      { params: { user_id: userId } },
    )
  }

  // ==================== Personas ====================

  /**
   * Add a new sender persona to an organization.
   * Provisions mailboxes on existing domains. Requires admin role.
   */
  async addPersona(
    orgId: string,
    userId: string,
    persona: AddPersonaRequest,
  ): Promise<AddPersonaResponse> {
    return this.http.post<AddPersonaResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/personas`,
      persona,
      { params: { user_id: userId } },
    )
  }

  // ==================== Teardown ====================

  /**
   * Teardown an email organization's infrastructure.
   *
   * Full decommission: cancels warmup, InfraGuard, and mailboxes.
   * Requires admin role on the org.
   */
  async teardown(
    orgId: string,
    userId: string,
  ): Promise<TeardownOrgResponse> {
    return this.http.post<TeardownOrgResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/teardown`,
      {},
      { params: { user_id: userId } },
    )
  }

  // ==================== Members ====================

  /**
   * Add a user to an organization. Requires admin role.
   */
  async addMember(
    orgId: string,
    userId: string,
    member: AddOrgMemberRequest,
  ): Promise<AddOrgMemberResponse> {
    return this.http.post<AddOrgMemberResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/members`,
      member,
      { params: { user_id: userId } },
    )
  }

  /**
   * Remove a user from an organization. Requires admin role.
   */
  async removeMember(
    orgId: string,
    userId: string,
    memberEmail: string,
  ): Promise<RemoveOrgMemberResponse> {
    return this.http.delete<RemoveOrgMemberResponse>(
      `/email/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberEmail)}`,
      { params: { user_id: userId } },
    )
  }
}
