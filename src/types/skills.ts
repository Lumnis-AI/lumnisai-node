// Skills types for Lumnis AI SDK

export interface SkillGuidelineBase {
  name: string
  description: string
  content: string
  category?: string
  version: string
}

export interface SkillGuidelineCreate extends SkillGuidelineBase {}

export interface SkillGuidelineUpdate {
  name?: string
  description?: string
  content?: string
  category?: string
  version?: string
  isActive?: boolean
}

export interface SkillGuidelineResponse extends SkillGuidelineBase {
  id: string
  tenantId?: string
  userId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SkillGuidelineListResponse {
  skills: SkillGuidelineResponse[]
  total: number
  page: number
  pageSize: number
}

export interface SkillUsageBase {
  responseId: string
  skillId: string
  skillName: string
}

export interface SkillUsageCreate extends SkillUsageBase {
  tenantId: string
  userId?: string
  relevanceScore?: number
}

export interface SkillUsageUpdate {
  plannerSelected?: boolean
  usageReasoning?: string
  priority?: number
  executionOutcome?: 'success' | 'partial' | 'failed' | 'cancelled' | 'not_executed'
  effectivenessScore?: number
  feedbackNotes?: string
}

export interface SkillUsageResponse extends SkillUsageBase {
  id: string
  tenantId: string
  userId?: string
  relevanceScore?: number
  retrievedAt?: string
  plannerSelected: boolean
  usageReasoning?: string
  priority?: number
  selectedAt?: string
  executionOutcome?: string
  effectivenessScore?: number
  feedbackNotes?: string
  executedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SkillUsageListResponse {
  usages: SkillUsageResponse[]
  total: number
  page: number
  pageSize: number
}

export interface SkillEffectivenessMetrics {
  skillId?: string
  totalRetrievals: number
  totalSelections: number
  successfulExecutions: number
  selectionRate: number
  successRate: number
  avgEffectiveness: number
  usageFrequency: number
}

export interface SkillAnalyticsRequest {
  skillId?: string
  tenantId?: string
  daysBack?: number
}

export interface SelectedSkill {
  skillId: string
  skillName: string
  relevanceScore: number
  usageReasoning: string
  priority: number
}

export interface SkillRetrievalMetadata {
  skillId: string
  skillName: string
  relevanceScore: number
  content: string
}
