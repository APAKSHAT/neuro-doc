// System configuration and constants
export const config = {
  // File upload settings
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,eml').split(','),
    storageBucket: 'documents'
  },

  // OpenAI settings
  ai: {
    embeddingModel: 'text-embedding-3-small',
    chatModel: 'gpt-4',
    embeddingDimensions: 1536,
    maxTokens: 2000,
    temperature: 0.1
  },

  // Vector search settings
  search: {
    defaultLimit: 10,
    maxLimit: 50,
    defaultThreshold: 0.7,
    minThreshold: 0.5,
    maxThreshold: 0.95
  },

  // Document processing settings
  processing: {
    chunkSize: 1000,
    chunkOverlap: 200,
    maxChunksPerDocument: 500
  },

  // API rate limiting
  rateLimit: {
    upload: {
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    },
    query: {
      maxRequests: 50,
      windowMs: 60000 // 1 minute
    },
    general: {
      maxRequests: 100,
      windowMs: 60000 // 1 minute
    }
  },

  // Database settings
  database: {
    vectorIndexLists: 100,
    maxConnections: 20,
    queryTimeout: 30000 // 30 seconds
  }
}

// File type validation
export const fileTypes = {
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSize: config.upload.maxFileSize
  },
  docx: {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    extensions: ['.docx'],
    maxSize: config.upload.maxFileSize
  },
  eml: {
    mimeTypes: ['message/rfc822', 'text/plain'],
    extensions: ['.eml'],
    maxSize: config.upload.maxFileSize
  }
}

// Response templates
export const responseTemplates = {
  success: {
    upload: 'Document uploaded and processed successfully',
    query: 'Query processed successfully',
    delete: 'Resource deleted successfully'
  },
  error: {
    auth: 'Authentication required',
    notFound: 'Resource not found',
    validation: 'Validation failed',
    serverError: 'Internal server error',
    rateLimit: 'Too many requests'
  }
}

// Confidence score thresholds for decision making
export const confidenceThresholds = {
  high: 0.8,
  medium: 0.5,
  low: 0.3
}

// Decision types
export const decisionTypes = {
  APPROVED: 'Approved',
  DENIED: 'Denied',
  REQUIRES_REVIEW: 'Requires Review',
  INSUFFICIENT_INFO: 'Insufficient Information'
} as const

export type DecisionType = typeof decisionTypes[keyof typeof decisionTypes]

// Audit event types
export const auditEvents = {
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_DELETED: 'document_deleted',
  QUERY_PROCESSED: 'query_processed',
  DECISION_MADE: 'decision_made',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout'
} as const

export type AuditEvent = typeof auditEvents[keyof typeof auditEvents]

// Environment validation
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Feature flags
export const features = {
  enableFileUpload: true,
  enableVectorSearch: true,
  enableAuditLogging: true,
  enableRateLimit: process.env.NODE_ENV === 'production',
  enableCors: true,
  enableRequestLogging: process.env.NODE_ENV === 'development'
}

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'
