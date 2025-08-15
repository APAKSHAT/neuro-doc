import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getEmbedding } from '@/lib/openai'
import { withErrorHandler, withLogging } from '@/lib/middleware'
import { validateEnvironment } from '@/lib/config'

async function checkDatabase(): Promise<{ status: string; details?: any }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('count')
      .limit(1)

    if (error) {
      return { status: 'error', details: error.message }
    }

    return { status: 'healthy' }
  } catch (error) {
    return { status: 'error', details: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function checkAI(): Promise<{ status: string; details?: any }> {
  try {
    // Simple test to verify AI connection
    const embedding = await getEmbedding('health check')

    if (embedding && embedding.length > 0) {
      return { status: 'healthy' }
    } else {
      return { status: 'error', details: 'Invalid response from AI service' }
    }
  } catch (error) {
    return { status: 'error', details: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function checkStorage(): Promise<{ status: string; details?: any }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .list('', { limit: 1 })

    if (error) {
      return { status: 'error', details: error.message }
    }

    return { status: 'healthy' }
  } catch (error) {
    return { status: 'error', details: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'
  const component = searchParams.get('component')

  const startTime = Date.now()

  try {
    // Validate environment variables
    validateEnvironment()
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Environment validation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {} as Record<string, any>
  }

  // Check specific component if requested
  if (component) {
    switch (component) {
      case 'database':
        health.services.database = await checkDatabase()
        break
      case 'openai':
      case 'ai':
        health.services.ai = await checkAI()
        break
      case 'storage':
        health.services.storage = await checkStorage()
        break
      default:
        return NextResponse.json({
          error: 'Invalid component. Available: database, ai, openai, storage'
        }, { status: 400 })
    }
  } else if (detailed) {
    // Check all services if detailed is requested
    const [databaseHealth, aiHealth, storageHealth] = await Promise.all([
      checkDatabase(),
      checkAI(),
      checkStorage()
    ])

    health.services = {
      database: databaseHealth,
      ai: aiHealth,
      storage: storageHealth
    }
  }

  // Determine overall health status
  const serviceStatuses = Object.values(health.services)
  if (serviceStatuses.some((service: any) => service.status === 'error')) {
    health.status = 'degraded'
  }

  if (serviceStatuses.every((service: any) => service.status === 'error')) {
    health.status = 'unhealthy'
  }

  const responseTime = Date.now() - startTime
  health.responseTime = `${responseTime}ms`

  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}

export const GET = withErrorHandler(withLogging(handler))
