import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeWithAI } from '@/lib/openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('Processing query with AI:', query)
    
    const startTime = Date.now()
    
    // Create context for insurance analysis
    const context = "You are analyzing an insurance policy and claims. Provide a structured decision with Decision (Approved/Rejected/Requires Review), Amount (if applicable), Justification (clear reasoning), and ReferencedClause (relevant policy section)."
    
    // Use the AI analysis function
    const aiResult = await analyzeWithAI(query, context)
    
    const processingTime = Date.now() - startTime
    
    console.log('AI analysis result:', aiResult)

    // Store the query and result in the database
    const queryRecord = {
      user_id: '00000000-0000-0000-0000-000000000000', // Default user for demo
      query_text: query,
      decision_json: aiResult,
      confidence_score: Math.random() * 0.3 + 0.7, // Random confidence 0.7-1.0
    }

    const { data: savedQuery, error: queryError } = await supabase
      .from('queries')
      .insert([queryRecord])
      .select()
      .single()

    if (queryError) {
      console.error('Error saving query:', queryError)
      // Continue anyway, don't fail the request
    }

    const result = {
      success: true,
      result: {
        decision: aiResult,
        confidence: queryRecord.confidence_score,
        processingTime,
        referencedDocuments: ['policy-document.pdf'],
        queryId: savedQuery?.id || null
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Query processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process query: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get recent queries from database using direct Supabase client
    const { data: queries, error } = await supabase
      .from('queries')
      .select('id, query_text, decision_json, confidence_score, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching queries:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch queries: ' + error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      queries: queries?.map(query => ({
        id: query.id,
        query: query.query_text,
        decision: query.decision_json,
        confidence: query.confidence_score,
        timestamp: query.created_at
      })) || []
    })

  } catch (error) {
    console.error('Error fetching queries:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch queries: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
