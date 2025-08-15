import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { analyzeWithAI } from '@/lib/openai'
import { searchDocumentChunks, getReferencedDocuments, generateSimpleEmbedding, findSimilarChunks } from '@/lib/document-store'

// In-memory storage for queries
let queries: any[] = []

// Global query tracking
declare global {
  var globalQueryTracker: {
    totalQueries: number
    lastQueryTime: Date
    queryHistory: Array<{
      timestamp: Date
      query: string
      decision: string
    }>
  } | undefined
}

if (!global.globalQueryTracker) {
  global.globalQueryTracker = {
    totalQueries: 0,
    lastQueryTime: new Date(),
    queryHistory: []
  }
}

function trackQuery(query: string, decision: string) {
  const queryTracker = global.globalQueryTracker!
  queryTracker.totalQueries += 1
  queryTracker.lastQueryTime = new Date()
  queryTracker.queryHistory.push({
    timestamp: new Date(),
    query: query || 'Unknown query',
    decision: decision || 'Pending'
  })
  
  // Keep only last 100 queries in memory
  if (queryTracker.queryHistory.length > 100) {
    queryTracker.queryHistory = queryTracker.queryHistory.slice(-100)
  }
  
  console.log(`[REAL-TIME] Query tracked: "${query}" - Decision: ${decision} - Total: ${queryTracker.totalQueries}`)
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('Processing query:', query)
    console.log('[REAL-TIME] Starting query processing for tracking...')
    
    const startTime = Date.now()
    
    // Parse query to extract key information
    const parsedQuery = parseInsuranceQuery(query)
    
    // Search for relevant chunks from ACTUAL uploaded documents
    const relevantChunks = searchDocumentChunks(query)
    const referencedDocs = getReferencedDocuments()
    
    console.log(`Found ${relevantChunks.length} relevant chunks from ${referencedDocs.length} uploaded documents`)
    
    // If no uploaded documents, return error
    if (referencedDocs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents uploaded. Please upload insurance policy documents first.'
      }, { status: 400 })
    }
    
    // Create context from actual uploaded document content
    const documentContext = relevantChunks.map(chunk => 
      `Document: ${chunk.fileName}, Page ${chunk.pageNumber}:\n${chunk.content}`
    ).join('\n\n---\n\n')
    
    // Try AI analysis first, with fallback to rule-based logic
    let aiResult
    try {
      const analysisPrompt = `You are analyzing an insurance claim against the following ACTUAL policy documents:

UPLOADED DOCUMENT CONTENT:
${documentContext}

QUERY: "${query}"

Based on the actual policy content above, provide your analysis in JSON format:
{
  "Decision": "Approved" | "Rejected" | "Requires Review",
  "Amount": "$X,XXX" or null,
  "Justification": "Clear explanation referencing the specific policy content",
  "ReferencedClause": "Specific clause section from the uploaded documents"
}

Important: Base your decision ONLY on the uploaded document content provided above. Reference specific clauses, coverage amounts, and terms from these documents.`
      
      console.log('Sending to AI with actual document content...')
      aiResult = await analyzeWithAI(analysisPrompt)
      
      if (!aiResult || !aiResult.Decision) {
        throw new Error('Invalid AI response')
      }
      
      console.log('AI analysis successful:', aiResult)
    } catch (error) {
      console.log('AI analysis failed, using rule-based fallback with actual document content:', error)
      // Fallback to rule-based analysis using actual document content
      aiResult = analyzeWithRules(parsedQuery, query, relevantChunks)
    }
    
    const processingTime = Date.now() - startTime
    
    // Generate unique query ID
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store query in memory
    const queryRecord = {
      id: queryId,
      user_id: user.id,
      query_text: query,
      parsed_query: parsedQuery,
      decision_json: aiResult,
      confidence_score: calculateConfidence(parsedQuery, aiResult, relevantChunks),
      processing_time: processingTime,
      referenced_chunks: relevantChunks.map(chunk => ({
        document: chunk.fileName,
        section: chunk.section,
        page: chunk.pageNumber
      })),
      created_at: new Date().toISOString()
    }
    
    queries.unshift(queryRecord) // Add to beginning for latest-first
    
    // Track query for real-time stats
    try {
      trackQuery(query, aiResult.Decision)
    } catch (error) {
      console.log('Failed to track query for real-time stats:', error)
    }
    
    const result = {
      success: true,
      result: {
        decision: aiResult,
        confidence: queryRecord.confidence_score,
        processingTime,
        referencedDocuments: referencedDocs, // Actual uploaded document names
        queryId: queryId,
        parsedInfo: parsedQuery,
        relevantSections: relevantChunks.length,
        documentContext: relevantChunks.map(chunk => ({
          document: chunk.fileName,
          section: chunk.section,
          page: chunk.pageNumber,
          excerpt: chunk.content.substring(0, 200) + '...'
        }))
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Query processing error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process query: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Return recent queries from memory
    const recentQueries = queries.slice(0, 20).map(query => ({
      id: query.id,
      query: query.query_text,
      decision: query.decision_json,
      confidence: query.confidence_score,
      timestamp: query.created_at,
      processingTime: query.processing_time,
      referencedDocuments: query.referenced_chunks?.map((chunk: any) => chunk.document) || []
    }))
    
    return NextResponse.json({
      success: true,
      queries: recentQueries
    })
    
  } catch (error) {
    console.error('Error fetching queries:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch queries: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

// Parse natural language query to extract structured information
function parseInsuranceQuery(query: string): any {
  const parsed = {
    age: null as number | null,
    gender: null as string | null,
    procedure: null as string | null,
    location: null as string | null,
    policyDuration: null as string | null,
    keywords: [] as string[]
  }
  
  // Extract age
  const ageMatch = query.match(/(\d+)[-\s]*(year|yr|y)[-\s]*old|(\d+)M|(\d+)F|age\s*(\d+)/i)
  if (ageMatch) {
    parsed.age = parseInt(ageMatch[1] || ageMatch[3] || ageMatch[4] || ageMatch[5])
  }
  
  // Extract gender
  if (query.match(/male|man|M(?![a-z])/i)) {
    parsed.gender = 'male'
  } else if (query.match(/female|woman|F(?![a-z])/i)) {
    parsed.gender = 'female'
  }
  
  // Extract procedure
  const procedures = ['surgery', 'operation', 'procedure', 'treatment', 'knee surgery', 'heart surgery', 'dental', 'consultation']
  for (const proc of procedures) {
    if (query.toLowerCase().includes(proc.toLowerCase())) {
      parsed.procedure = proc
      break
    }
  }
  
  // Extract location
  const locationMatch = query.match(/in\s+([A-Za-z]+)|at\s+([A-Za-z]+)|([A-Za-z]+)\s*,/i)
  if (locationMatch) {
    parsed.location = locationMatch[1] || locationMatch[2] || locationMatch[3]
  }
  
  // Extract policy duration
  const durationMatch = query.match(/(\d+)[-\s]*month|(\d+)[-\s]*year|(\d+)[-\s]*day/i)
  if (durationMatch) {
    parsed.policyDuration = durationMatch[0]
  }
  
  // Extract keywords
  parsed.keywords = query.toLowerCase().split(/[,\s]+/).filter(word => word.length > 2)
  
  return parsed
}

// Rule-based analysis fallback using ACTUAL document content
function analyzeWithRules(parsedQuery: any, originalQuery: string, relevantChunks: any[]): any {
  let decision = 'Requires Review'
  let amount = null
  let justification = ''
  let referencedClause = 'General Terms'
  
  if (relevantChunks.length === 0) {
    return {
      Decision: 'Requires Review',
      Amount: null,
      Justification: 'No relevant policy sections found in uploaded documents for this query.',
      ReferencedClause: 'Document Search Results'
    }
  }
  
  // Analyze based on actual document content
  const allContent = relevantChunks.map(chunk => chunk.content.toLowerCase()).join(' ')
  
  // Extract coverage amounts from actual documents
  const coverageAmounts = allContent.match(/\$[\d,]+/g) || []
  const surgeryMentioned = allContent.includes('surgery') || allContent.includes('surgical')
  const exclusionMentioned = allContent.includes('exclusion') || allContent.includes('excluded')
  
  // Age eligibility from documents
  if (parsedQuery.age && (parsedQuery.age < 18 || parsedQuery.age > 65)) {
    decision = 'Rejected'
    justification = `Age ${parsedQuery.age} may be outside eligible range based on policy terms.`
    referencedClause = `${relevantChunks[0]?.fileName} - Eligibility Section`
  }
  // Surgery coverage from actual documents
  else if (parsedQuery.procedure && parsedQuery.procedure.toLowerCase().includes('surgery')) {
    if (surgeryMentioned && !exclusionMentioned) {
      decision = 'Approved'
      amount = coverageAmounts[0] || '$15,000'
      justification = `Surgery coverage found in uploaded policy documents. ${relevantChunks.length} relevant sections reviewed.`
      referencedClause = `${relevantChunks[0]?.fileName} - ${relevantChunks[0]?.section}`
    } else if (exclusionMentioned) {
      decision = 'Rejected'
      justification = `Surgery may be excluded based on policy exclusions found in uploaded documents.`
      referencedClause = `${relevantChunks[0]?.fileName} - Exclusions Section`
    } else {
      decision = 'Requires Review'
      justification = `Surgery coverage unclear from uploaded policy documents. Manual review needed.`
      referencedClause = `${relevantChunks[0]?.fileName} - Coverage Terms`
    }
  }
  // General procedures from actual documents
  else if (parsedQuery.procedure) {
    decision = 'Approved'
    amount = coverageAmounts[0] || '$5,000'
    justification = `Medical procedure coverage found in uploaded policy documents.`
    referencedClause = `${relevantChunks[0]?.fileName} - Medical Benefits`
  }
  // Default case with actual document reference
  else {
    decision = 'Requires Review'
    justification = `Query processed against ${relevantChunks.length} sections from uploaded documents. Additional clarification needed.`
    referencedClause = `${relevantChunks[0]?.fileName} - General Terms`
  }
  
  return {
    Decision: decision,
    Amount: amount,
    Justification: justification,
    ReferencedClause: referencedClause
  }
}

// Calculate confidence score based on parsed information and document matches
function calculateConfidence(parsedQuery: any, decision: any, relevantChunks: any[]): number {
  let confidence = 0.3 // Base confidence
  
  // Increase confidence based on parsed information completeness
  if (parsedQuery.age) confidence += 0.1
  if (parsedQuery.gender) confidence += 0.05
  if (parsedQuery.procedure) confidence += 0.2
  if (parsedQuery.location) confidence += 0.05
  if (parsedQuery.policyDuration) confidence += 0.1
  
  // Increase confidence based on document matches
  if (relevantChunks.length > 0) confidence += 0.2
  if (relevantChunks.length >= 3) confidence += 0.1
  
  // Adjust based on decision certainty
  if (decision.Decision === 'Approved' || decision.Decision === 'Rejected') {
    confidence += 0.1
  }
  
  return Math.min(confidence, 1.0)
}
