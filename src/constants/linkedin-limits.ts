// LinkedIn rate limit constants and helpers
// These constants match the backend implementation for safe automation
//
// IMPORTANT: Connection request limits are primarily SSI (Social Selling Index) and
// reputation-based, NOT subscription-based. Premium/Sales Navigator/Recruiter do NOT
// automatically increase your connection request capacity. Only InMail credits and
// profile view limits vary significantly by subscription tier.
//
// Unipile recommends: 80-100 connection requests/day for paid active accounts,
// ~200/week. For automation, stay conservative (our safe limits are 15-30/day).

/**
 * LinkedIn subscription types
 */
export type LinkedInLimitSubscriptionType =
  | 'basic'
  | 'premium'
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
    personalizedMonthly: number | null // null = unlimited
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
  openProfileMessagesMonthly: number | null // Recruiter only
}

/**
 * LinkedIn rate limits by subscription type
 */
export const LINKEDIN_LIMITS: Record<LinkedInLimitSubscriptionType, LinkedInLimits> = {
  basic: {
    connectionRequests: {
      weeklyMax: 100,
      dailySafe: 15,
      personalizedMonthly: 10, // Very limited personalized requests
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
    openProfileMessagesMonthly: null,
  },
  premium: {
    connectionRequests: {
      weeklyMax: 150, // Same as basic, SSI-dependent
      dailySafe: 20,
      personalizedMonthly: null, // Unlimited
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
      dailySafe: 500,
    },
    openProfileMessagesMonthly: null,
  },
  premium_career: {
    connectionRequests: {
      weeklyMax: 150, // Same as basic, SSI-dependent
      dailySafe: 20,
      personalizedMonthly: null, // Unlimited
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
      dailySafe: 500,
    },
    openProfileMessagesMonthly: null,
  },
  premium_business: {
    connectionRequests: {
      weeklyMax: 150, // Same as Premium Career, SSI-dependent
      dailySafe: 20,
      personalizedMonthly: null,
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
      dailySafe: 500,
    },
    openProfileMessagesMonthly: null,
  },
  sales_navigator: {
    connectionRequests: {
      weeklyMax: 200,
      dailySafe: 25,
      personalizedMonthly: null,
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
      dailySafe: 1000,
    },
    openProfileMessagesMonthly: null,
  },
  recruiter_lite: {
    connectionRequests: {
      weeklyMax: 200,
      dailySafe: 25,
      personalizedMonthly: null,
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
      dailySafe: 1000,
    },
    openProfileMessagesMonthly: 1000,
  },
  recruiter_corporate: {
    connectionRequests: {
      weeklyMax: 250,
      dailySafe: 30,
      personalizedMonthly: null,
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
      dailySafe: 1000,
    },
    openProfileMessagesMonthly: 1000,
  },
}

/**
 * Safe limits when using automation (more conservative than LinkedIn's limits)
 * These are Unipile-recommended limits for automation
 */
export const UNIPILE_SAFE_LIMITS = {
  // Connection requests per day (Unipile recommends 80-100 for paid)
  connectionRequestsDaily: {
    basic: 15,
    premium: 20,
    premium_career: 20,
    premium_business: 20,
    sales_navigator: 25,
    recruiter_lite: 25,
    recruiter_corporate: 30,
  },
  // Messages per day (steady pace recommended)
  messagesDaily: {
    basic: 15,
    premium: 20,
    premium_career: 20,
    premium_business: 20,
    sales_navigator: 20,
    recruiter_lite: 25,
    recruiter_corporate: 30,
  },
  // Profile views per day (stay under 50% of max)
  profileViewsDaily: {
    basic: 250,
    premium: 300, // 50% of 1000 max, conservative
    premium_career: 300,
    premium_business: 300,
    sales_navigator: 500, // 50% of 2000 max
    recruiter_lite: 500,
    recruiter_corporate: 500,
  },
} as const

/**
 * Cooldown periods (in seconds) after hitting limits
 */
export const RATE_LIMIT_COOLDOWNS = {
  connectionRequestRejected: 3600, // 1 hour after rejection
  messageRateLimited: 1800, // 30 min after rate limit
  dailyLimitReached: 86400, // 24 hours
  weeklyLimitReached: 604800, // 7 days
} as const

/**
 * HTTP error codes from Unipile indicating rate limits
 */
export const UNIPILE_RATE_LIMIT_ERRORS: Record<number, string> = {
  422: 'cannot_resend_yet', // Connection request limit
  429: 'rate_limited', // Too many requests
  500: 'server_error_possibly_rate_limited', // Sometimes indicates limits
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
 * Daily InMail sending limits by subscription type.
 *
 * These are the maximum InMails you can SEND per day (rate limit), separate from
 * the monthly credits you have available.
 *
 * Per LinkedIn official documentation (https://www.linkedin.com/help/recruiter/answer/a745199):
 * - Recruiter Corporate/RPS: 1,000 InMails per day per seat
 * - Recruiter Lite: Limited by monthly credits (30/month + 100 Open Profile/month)
 * - Other tiers: No official daily limit, but limited by monthly credits
 *
 * For non-Recruiter accounts, we set daily limit = monthly credits to allow
 * flexibility while still respecting credit availability.
 */
export const DAILY_INMAIL_LIMITS: Record<LinkedInLimitSubscriptionType, number> = {
  basic: 0, // No InMail capability
  premium: 5, // 5 credits/month - can send all in one day if desired
  premium_career: 5, // Same as premium
  premium_business: 15, // 15 credits/month
  sales_navigator: 50, // 50 credits/month
  recruiter_lite: 100, // 30 InMails + up to 100 Open Profile/month
  recruiter_corporate: 1000, // LinkedIn official: 1,000/day per seat
}

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
 * Check if subscription has Open Profile messaging (Recruiter only)
 */
export function hasOpenProfileMessages(subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined): boolean {
  const limits = getLimits(subscriptionType)
  return limits.openProfileMessagesMonthly !== null
}

/**
 * Get best subscription for a specific action when user has multiple subscriptions
 *
 * Priority order matches backend:
 * - InMail: recruiter_corporate > sales_navigator > recruiter_lite > premium_business > premium_career
 * - Other actions: recruiter_corporate > sales_navigator > recruiter_lite > premium_business > premium_career > basic
 */
export function getBestSubscriptionForAction(
  subscriptionTypes: (LinkedInLimitSubscriptionType | string)[],
  action: 'inmail' | 'connection_requests' | 'messages',
): LinkedInLimitSubscriptionType | string | null {
  if (subscriptionTypes.length === 0)
    return null

  if (subscriptionTypes.length === 1)
    return subscriptionTypes[0]

  // Priority order for InMail: recruiter_corporate > sales_navigator > recruiter_lite > premium_business > premium/premium_career
  if (action === 'inmail') {
    const priority = ['recruiter_corporate', 'sales_navigator', 'recruiter_lite', 'premium_business', 'premium', 'premium_career']
    for (const priorityType of priority) {
      if (subscriptionTypes.includes(priorityType))
        return priorityType
    }
  }
  else {
    // Priority order for connection_requests/messages: recruiter_corporate > sales_navigator > recruiter_lite > premium_business > premium/premium_career > basic
    const priority = ['recruiter_corporate', 'sales_navigator', 'recruiter_lite', 'premium_business', 'premium', 'premium_career', 'basic']
    for (const priorityType of priority) {
      if (subscriptionTypes.includes(priorityType))
        return priorityType
    }
  }

  // Return first available if none in priority list
  return subscriptionTypes[0]
}

/**
 * Get daily InMail sending limit for a subscription type.
 *
 * Per LinkedIn official documentation:
 * - Recruiter Corporate: 1,000 InMails per day per seat
 * - Recruiter Lite: ~100/day (30 regular + 100 Open Profile per month)
 * - Other tiers: Limited by monthly credits
 *
 * Note: This is the daily SENDING rate limit, not the total credits available.
 * Credits are still consumed per InMail sent.
 */
export function getDailyInmailLimit(subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined): number {
  const type = (subscriptionType || 'basic') as LinkedInLimitSubscriptionType
  return DAILY_INMAIL_LIMITS[type] ?? DAILY_INMAIL_LIMITS.basic
}

/**
 * Check if subscription type is a Recruiter subscription.
 *
 * Recruiter subscriptions have special privileges:
 * - High daily InMail limits (up to 1,000/day for Corporate)
 * - Access to Recruiter API features
 * - Open Profile messaging (free InMails to open profiles)
 */
export function isRecruiterSubscription(subscriptionType: LinkedInLimitSubscriptionType | string | null | undefined): boolean {
  return subscriptionType === 'recruiter_lite' || subscriptionType === 'recruiter_corporate'
}
