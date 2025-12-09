// LinkedIn rate limit constants and helpers
// These constants match the backend implementation for safe automation
//
// NOTE: Connection request limits are primarily reputation-based (SSI score),
// not subscription-based. Premium, Sales Navigator, and Recruiter Lite do NOT
// increase your weekly connection request capacity beyond the base limits.

/**
 * LinkedIn subscription types
 */
export type LinkedInLimitSubscriptionType =
  | 'basic'
  | 'premium_career'
  | 'premium_business'
  | 'sales_navigator'
  | 'recruiter_lite'
  | 'recruiter_corporate'

/**
 * LinkedIn limits by subscription type
 */
export interface LinkedInLimits {
  connectionRequests: {
    weeklyMax: number
    dailySafe: number
  }
  messages: {
    weeklyMax: number
    dailySafe: number
  }
  inmail: {
    monthlyCredits: number
    maxAccumulation: number
    rollover: boolean
  }
  profileViews: {
    dailyMax: number
    dailySafe: number
  }
}

/**
 * LinkedIn rate limits by subscription type
 */
export const LINKEDIN_LIMITS: Record<LinkedInLimitSubscriptionType, LinkedInLimits> = {
  basic: {
    connectionRequests: {
      weeklyMax: 100,
      dailySafe: 15,
    },
    messages: {
      weeklyMax: 100,
      dailySafe: 15,
    },
    inmail: {
      monthlyCredits: 0,
      maxAccumulation: 0,
      rollover: false,
    },
    profileViews: {
      dailyMax: 500,
      dailySafe: 250,
    },
  },
  premium_career: {
    connectionRequests: {
      weeklyMax: 150,
      dailySafe: 20,
    },
    messages: {
      weeklyMax: 150,
      dailySafe: 20,
    },
    inmail: {
      monthlyCredits: 5,
      maxAccumulation: 15,
      rollover: true,
    },
    profileViews: {
      dailyMax: 1000, // Premium (non-SN): 150-1000/day
      dailySafe: 300,
    },
  },
  premium_business: {
    connectionRequests: {
      weeklyMax: 150, // Same as Premium Career, SSI-dependent
      dailySafe: 20,
    },
    messages: {
      weeklyMax: 150,
      dailySafe: 20,
    },
    inmail: {
      monthlyCredits: 15,
      maxAccumulation: 45,
      rollover: true,
    },
    profileViews: {
      dailyMax: 1000, // Premium (non-SN): 150-1000/day
      dailySafe: 300,
    },
  },
  sales_navigator: {
    connectionRequests: {
      weeklyMax: 200,
      dailySafe: 25,
    },
    messages: {
      weeklyMax: 150,
      dailySafe: 20,
    },
    inmail: {
      monthlyCredits: 50,
      maxAccumulation: 150,
      rollover: true,
    },
    profileViews: {
      dailyMax: 2000,
      dailySafe: 500,
    },
  },
  recruiter_lite: {
    connectionRequests: {
      weeklyMax: 200,
      dailySafe: 25,
    },
    messages: {
      weeklyMax: 200,
      dailySafe: 25,
    },
    inmail: {
      monthlyCredits: 30,
      maxAccumulation: 120, // LinkedIn official: 120 max per seat
      rollover: true,
    },
    profileViews: {
      dailyMax: 2000,
      dailySafe: 500,
    },
  },
  recruiter_corporate: {
    connectionRequests: {
      weeklyMax: 250,
      dailySafe: 30,
    },
    messages: {
      weeklyMax: 200,
      dailySafe: 30,
    },
    inmail: {
      monthlyCredits: 150,
      maxAccumulation: 600,
      rollover: true,
    },
    profileViews: {
      dailyMax: 2000,
      dailySafe: 500,
    },
  },
}

/**
 * Action delays for human-like behavior (in seconds)
 */
export const ACTION_DELAYS = {
  betweenConnectionRequests: 30,
  betweenMessages: 15,
  betweenProfileViews: 5,
  afterError: 60,
} as const

/**
 * Get all limits for a subscription type
 */
export function getLimits(subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined): LinkedInLimits {
  const type = (subscriptionType || 'basic') as LinkedInLimitSubscriptionType
  return LINKEDIN_LIMITS[type] || LINKEDIN_LIMITS.basic
}

/**
 * Get connection request limit for a subscription type
 */
export function getConnectionRequestLimit(
  subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined,
  useSafeLimit = true,
): number {
  const limits = getLimits(subscriptionType)
  return useSafeLimit ? limits.connectionRequests.dailySafe : limits.connectionRequests.weeklyMax
}

/**
 * Get message limit for a subscription type
 */
export function getMessageLimit(
  subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined,
  useSafeLimit = true,
): number {
  const limits = getLimits(subscriptionType)
  return useSafeLimit ? limits.messages.dailySafe : limits.messages.weeklyMax
}

/**
 * Get InMail allowance for a subscription type
 */
export function getInmailAllowance(
  subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined,
): {
    monthlyCredits: number
    maxAccumulation: number
    rollover: boolean
  } {
  const limits = getLimits(subscriptionType)
  return limits.inmail
}

/**
 * Check if subscription can send InMail
 */
export function canSendInmail(subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined): boolean {
  const limits = getLimits(subscriptionType)
  return limits.inmail.monthlyCredits > 0
}

/**
 * Get best subscription for a specific action when user has multiple subscriptions
 */
export function getBestSubscriptionForAction(
  subscriptionTypes: (LinkedInLimitSubscriptionType | string)[],
  action: 'inmail' | 'connection_requests' | 'messages',
): LinkedInLimitSubscriptionType | string | null {
  if (subscriptionTypes.length === 0)
    return null

  if (subscriptionTypes.length === 1)
    return subscriptionTypes[0]

  // Priority order for InMail: recruiter_corporate > recruiter_lite > sales_navigator > premium_business > premium_career > basic
  if (action === 'inmail') {
    const priority = ['recruiter_corporate', 'recruiter_lite', 'sales_navigator', 'premium_business', 'premium_career', 'basic']
    for (const priorityType of priority) {
      if (subscriptionTypes.includes(priorityType))
        return priorityType
    }
  }

  // Priority order for connection requests: recruiter_corporate > sales_navigator/recruiter_lite > premium_business > premium_career > basic
  if (action === 'connection_requests') {
    const priority = ['recruiter_corporate', 'sales_navigator', 'recruiter_lite', 'premium_business', 'premium_career', 'basic']
    for (const priorityType of priority) {
      if (subscriptionTypes.includes(priorityType))
        return priorityType
    }
  }

  // Priority order for messages: recruiter_corporate > recruiter_lite > sales_navigator > premium_business > premium_career > basic
  if (action === 'messages') {
    const priority = ['recruiter_corporate', 'recruiter_lite', 'sales_navigator', 'premium_business', 'premium_career', 'basic']
    for (const priorityType of priority) {
      if (subscriptionTypes.includes(priorityType))
        return priorityType
    }
  }

  return subscriptionTypes[0]
}
