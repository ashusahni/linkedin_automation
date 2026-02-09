/**
 * Application Constants
 * 
 * Centralized location for all application constants, magic numbers, and strings.
 */

export default {
  // Lead Statuses
  LEAD_STATUS: {
    NEW: 'new',
    CONTACTED: 'contacted',
    REPLIED: 'replied',
    CONVERTED: 'converted',
    ARCHIVED: 'archived'
  },

  // Campaign Statuses
  CAMPAIGN_STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
  },

  // Campaign Types
  CAMPAIGN_TYPE: {
    STANDARD: 'standard',
    EVENT: 'event',
    WEBINAR: 'webinar',
    NURTURE: 'nurture',
    RE_ENGAGEMENT: 're_engagement',
    COLD_OUTREACH: 'cold_outreach'
  },

  // Campaign Goals
  CAMPAIGN_GOAL: {
    CONNECTIONS: 'connections',
    MEETINGS: 'meetings',
    PIPELINE: 'pipeline',
    BRAND_AWARENESS: 'brand_awareness',
    EVENT_PROMOTION: 'event_promotion',
    CONTENT_ENGAGEMENT: 'content_engagement'
  },

  // Campaign Priority
  CAMPAIGN_PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  },

  // Campaign Lead Statuses
  CAMPAIGN_LEAD_STATUS: {
    NEW: 'new',
    PENDING: 'pending',
    PROCESSING: 'processing',
    NEEDS_APPROVAL: 'needs_approval',
    APPROVED: 'approved',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  },

  // Step Types
  STEP_TYPE: {
    CONNECTION_REQUEST: 'connection_request',
    MESSAGE: 'message',
    EMAIL: 'email'
  },

  // Approval Queue Statuses
  APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EDITED: 'edited'
  },

  // PhantomBuster Container Statuses
  CONTAINER_STATUS: {
    RUNNING: 'running',
    FINISHED: 'finished',
    SUCCESS: 'success',
    ERROR: 'error',
    FAILED: 'failed'
  },

  // LinkedIn Limits (safety)
  LINKEDIN_LIMITS: {
    DAILY_CONNECTION_REQUESTS: 100,
    DAILY_MESSAGES: 50,
    HOURLY_CONNECTION_REQUESTS: 20,
    HOURLY_MESSAGES: 10
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000
  },

  // File Upload Limits
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_CSV_TYPES: ['text/csv', 'application/vnd.ms-excel'],
    ALLOWED_JSON_TYPES: ['application/json']
  },

  // Time Constants (in milliseconds)
  TIME: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  },

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 second
    BACKOFF_MULTIPLIER: 2
  },

  // PhantomBuster Timeouts
  PHANTOMBUSTER: {
    DEFAULT_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    MAX_WAIT_TIME: 20 * 60 * 1000, // 20 minutes
    CHECK_INTERVAL: 10 * 1000 // 10 seconds
  },

  // AI Configuration
  AI: {
    MAX_TOKENS: {
      CONNECTION_REQUEST: 300,
      FOLLOW_UP_MESSAGE: 500,
      EMAIL: 800
    },
    TEMPERATURE: {
      DEFAULT: 0.8,
      CREATIVE: 0.9,
      CONSERVATIVE: 0.7
    }
  },

  // Email Configuration
  EMAIL: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000 // 5 seconds
  },

  // Activity Types
  ACTIVITY_TYPE: {
    CONNECTION_SENT: 'connection_sent',
    CONNECTION_ACCEPTED: 'connection_accepted',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    EMAIL_SENT: 'email_sent',
    EMAIL_OPENED: 'email_opened',
    EMAIL_CLICKED: 'email_clicked',
    STATUS_CHANGED: 'status_changed',
    ENRICHED: 'enriched'
  }
};
