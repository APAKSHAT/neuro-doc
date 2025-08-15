import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// In-memory audit log storage (simulating database)
let auditLogs: any[] = [
  {
    id: "1",
    action: "document_query",
    user_id: "dev-user",
    details: {
      query: "What are the coverage limits?",
      confidence: 0.95,
      decision: "Approved",
      amount: "$100,000"
    },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
  },
  {
    id: "2", 
    action: "document_upload",
    user_id: "dev-user",
    details: {
      filename: "sample-policy.pdf",
      size: 1024000,
      chunks_processed: 5
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
  },
  {
    id: "3",
    action: "policy_review",
    user_id: "dev-user", 
    details: {
      document_id: "doc_123",
      review_type: "compliance",
      result: "passed"
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() // 6 hours ago
  }
]

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Filter and paginate audit logs
    const paginatedLogs = auditLogs
      .slice(offset, offset + limit)
      .map(log => ({
        ...log,
        created_at: log.created_at,
        timeAgo: getTimeAgo(new Date(log.created_at))
      }))
    
    return NextResponse.json({
      success: true,
      auditLogs: paginatedLogs,
      total: auditLogs.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < auditLogs.length
      }
    })
    
  } catch (error) {
    console.error('Error in audit endpoint:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch audit logs: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    const body = await request.json()
    const { action, details } = body
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }
    
    // Create new audit log entry
    const auditEntry = {
      id: String(auditLogs.length + 1),
      action,
      user_id: user.id,
      details: details || {},
      created_at: new Date().toISOString()
    }
    
    // Add to in-memory storage
    auditLogs.unshift(auditEntry) // Add to beginning for latest-first ordering
    
    return NextResponse.json({
      success: true,
      auditEntry
    })
    
  } catch (error) {
    console.error('Error creating audit log:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create audit log'
    }, { status: 500 })
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 60) {
    return `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`
  } else {
    return `${diffDays} days ago`
  }
}

// Export function to add audit logs from other endpoints
export function addAuditLog(action: string, userId: string, details: any) {
  const auditEntry = {
    id: String(auditLogs.length + 1),
    action,
    user_id: userId,
    details: details || {},
    created_at: new Date().toISOString()
  }
  
  auditLogs.unshift(auditEntry)
  return auditEntry
}
