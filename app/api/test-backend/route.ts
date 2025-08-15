import { NextResponse } from 'next/server'
import { getEmbedding, analyzeWithAI } from '@/lib/openai'

export async function GET() {
  try {
    console.log('Testing backend components...')
    
    // Test 1: AI Embedding
    console.log('Testing embedding generation...')
    const embedding = await getEmbedding('test document content')
    console.log('Embedding generated, length:', embedding?.length)
    
    // Test 2: AI Analysis
    console.log('Testing AI analysis...')
    const analysis = await analyzeWithAI('Analyze this test document for loan approval')
    console.log('Analysis completed:', typeof analysis)
    
    return NextResponse.json({
      success: true,
      message: 'Backend core functionality working',
      tests: {
        embedding: {
          status: 'success',
          length: embedding?.length || 0
        },
        aiAnalysis: {
          status: 'success',
          type: typeof analysis,
          hasContent: !!analysis
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Backend test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
