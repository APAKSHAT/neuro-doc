import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { analyzeWithAI } from '@/lib/openai'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const documentId = searchParams.get('document_id')
    
    // Build audit log query with joins
    let query = supabaseAdmin
      .from('audit_log')
      .select(`
        id,
        query_id,
        clause_id,
        reasoning_path,
        timestamp,
        queries!inner (
          id,
          user_id,
          query_text,
          decision_json,
          confidence_score,
          created_at
        ),
        clauses!inner (
          id,
          content,
          page_number,
          section,
          document_id,
          documents!inner (
            id,
            file_name,
            file_type,
            user_id
          )
        )
      `)
    
    // Filter by user through the queries table
    query = query.eq('queries.user_id', user.id)
    
    // Add date filters
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    // Add document filter
    if (documentId) {
      query = query.eq('clauses.document_id', documentId)
    }
    
    // Execute query with pagination
    const { data: auditLogs, error } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }
    
    // Get total count
    let countQuery = supabaseAdmin
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('queries.user_id', user.id)
    
    if (startDate) {
      countQuery = countQuery.gte('timestamp', startDate)
    }
    
    if (endDate) {
      countQuery = countQuery.lte('timestamp', endDate)
    }
    
    if (documentId) {
      countQuery = countQuery.eq('clauses.document_id', documentId)
    }
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('Error getting audit count:', countError)
    }
    
    // Format response
    const formattedLogs = auditLogs?.map((log: any) => ({
      id: log.id,
      timestamp: log.timestamp,
      reasoningPath: log.reasoning_path,
      query: {
        id: log.queries.id,
        text: log.queries.query_text,
        decision: log.queries.decision_json,
        confidenceScore: log.queries.confidence_score,
        createdAt: log.queries.created_at
      },
      clause: {
        id: log.clauses.id,
        content: log.clauses.content.substring(0, 200) + (log.clauses.content.length > 200 ? '...' : ''),
        pageNumber: log.clauses.page_number,
        section: log.clauses.section,
        document: {
          id: log.clauses.documents.id,
          fileName: log.clauses.documents.file_name,
          fileType: log.clauses.documents.file_type
        }
      }
    })) || []
    
    return NextResponse.json({
      auditLogs: formattedLogs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      summary: {
        totalEntries: count || 0,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    })
    
  } catch (error) {
    console.error('Get audit logs error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get audit statistics
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Parse request body for custom date range
    const { startDate, endDate, groupBy = 'day' } = await request.json()
    
    // Get query statistics
    const { data: queryStats, error: queryError } = await supabaseAdmin
      .from('queries')
      .select('decision_json, confidence_score, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())
    
    if (queryError) {
      console.error('Error fetching query stats:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch query statistics' },
        { status: 500 }
      )
    }
    
    // Process statistics
    const decisions = queryStats?.map((q: any) => q.decision_json?.Decision).filter(Boolean) || []
    const confidenceScores = queryStats?.map((q: any) => q.confidence_score).filter((s: number) => s != null) || []
    
    const decisionCounts = decisions.reduce((acc: any, decision: string) => {
      acc[decision] = (acc[decision] || 0) + 1
      return acc
    }, {})
    
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / confidenceScores.length
      : 0
    
    // Get document usage statistics
    const { data: docStats, error: docError } = await supabaseAdmin
      .from('audit_log')
      .select(`
        clauses!inner (
          documents!inner (
            id,
            file_name,
            user_id
          )
        )
      `)
      .eq('clauses.documents.user_id', user.id)
      .gte('timestamp', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('timestamp', endDate || new Date().toISOString())
    
    if (docError) {
      console.error('Error fetching document stats:', docError)
    }
    
    const documentUsage = docStats?.reduce((acc: any, log: any) => {
      const docId = log.clauses.documents.id
      const docName = log.clauses.documents.file_name
      
      if (!acc[docId]) {
        acc[docId] = {
          id: docId,
          name: docName,
          usageCount: 0
        }
      }
      acc[docId].usageCount++
      return acc
    }, {}) || {}
    
    return NextResponse.json({
      statistics: {
        totalQueries: queryStats?.length || 0,
        decisionBreakdown: decisionCounts,
        averageConfidence: Math.round(avgConfidence * 100) / 100,
        confidenceDistribution: {
          high: confidenceScores.filter((s: number) => s >= 0.8).length,
          medium: confidenceScores.filter((s: number) => s >= 0.5 && s < 0.8).length,
          low: confidenceScores.filter((s: number) => s < 0.5).length
        },
        documentUsage: Object.values(documentUsage)
          .sort((a: any, b: any) => b.usageCount - a.usageCount)
          .slice(0, 10), // Top 10 most used documents
        dateRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        }
      }
    })
    
  } catch (error) {
    console.error('Get audit statistics error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
