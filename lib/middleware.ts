import { NextRequest, NextResponse } from 'next/server'

export interface ApiError extends Error {
  status?: number
  code?: string
}

export class NeuroDocError extends Error {
  public status: number
  public code: string

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.status = status
    this.code = code
    this.name = 'NeuroDocError'
  }
}

// Error handler wrapper for API routes
export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API Error:', error)

      if (error instanceof NeuroDocError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
          },
          { status: error.status }
        )
      }

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message === 'Authentication required') {
          return NextResponse.json(
            {
              error: 'Authentication required',
              code: 'AUTH_REQUIRED',
              timestamp: new Date().toISOString()
            },
            { status: 401 }
          )
        }

        if (error.message.includes('validation')) {
          return NextResponse.json(
            {
              error: error.message,
              code: 'VALIDATION_ERROR',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          )
        }
      }

      // Generic server error
      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

// Rate limiting utility
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000, // 1 minute
  keyGenerator: (request: NextRequest) => string = (req) => {
    // Get IP from headers (common in production with proxies)
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    return forwarded?.split(',')[0] || realIp || 'anonymous'
  }
) {
  return function (
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const key = keyGenerator(request)
      const now = Date.now()
      const userRequest = requestCounts.get(key)

      if (!userRequest || now > userRequest.resetTime) {
        requestCounts.set(key, {
          count: 1,
          resetTime: now + windowMs
        })
      } else if (userRequest.count >= maxRequests) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((userRequest.resetTime - now) / 1000)
          },
          { status: 429 }
        )
      } else {
        userRequest.count++
      }

      return handler(request)
    }
  }
}

// Validation helper
export function validateRequestBody<T>(
  schema: {
    [K in keyof T]: {
      required?: boolean
      type?: string
      validate?: (value: any) => boolean
      message?: string
    }
  }
) {
  return function (body: any): T {
    const errors: string[] = []
    const result: any = {}

    for (const [key, rules] of Object.entries(schema)) {
      const value = body[key]
      const ruleConfig = rules as {
        required?: boolean
        type?: string
        validate?: (value: any) => boolean
        message?: string
      }

      if (ruleConfig.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`)
        continue
      }

      if (value !== undefined && value !== null) {
        if (ruleConfig.type && typeof value !== ruleConfig.type) {
          errors.push(`${key} must be of type ${ruleConfig.type}`)
          continue
        }

        if (ruleConfig.validate && !ruleConfig.validate(value)) {
          errors.push(ruleConfig.message || `${key} validation failed`)
          continue
        }

        result[key] = value
      }
    }

    if (errors.length > 0) {
      throw new NeuroDocError(
        `Validation failed: ${errors.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      )
    }

    return result as T
  }
}

// CORS middleware
export function withCors(
  options: {
    origins?: string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  } = {}
) {
  const {
    origins = ['*'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = true
  } = options

  return function (
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origins.includes('*') ? '*' : origins.join(', '),
            'Access-Control-Allow-Methods': methods.join(', '),
            'Access-Control-Allow-Headers': headers.join(', '),
            'Access-Control-Allow-Credentials': credentials.toString(),
            'Access-Control-Max-Age': '86400'
          }
        })
      }

      const response = await handler(request)
      
      // Add CORS headers to the response
      response.headers.set('Access-Control-Allow-Origin', origins.includes('*') ? '*' : origins.join(', '))
      response.headers.set('Access-Control-Allow-Credentials', credentials.toString())

      return response
    }
  }
}

// Request logging middleware
export function withLogging(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const start = Date.now()
    const { method, url } = request

    console.log(`${method} ${url} - Started`)

    try {
      const response = await handler(request)
      const duration = Date.now() - start
      console.log(`${method} ${url} - ${response.status} (${duration}ms)`)
      return response
    } catch (error) {
      const duration = Date.now() - start
      console.error(`${method} ${url} - Error (${duration}ms):`, error)
      throw error
    }
  }
}

// Combine multiple middlewares
export function withMiddleware(
  ...middlewares: Array<
    (handler: (request: NextRequest) => Promise<NextResponse>) => 
    (request: NextRequest) => Promise<NextResponse>
  >
) {
  return function (
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    )
  }
}
