import { NextResponse } from 'next/server'
import { processDocument } from '@/lib/document-processor'
import { getEmbedding, analyzeWithAI } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    // Test document processing without database
    const testText = "This is a sample loan application for $50,000 for home purchase. Applicant has excellent credit score of 780 and stable income."
    
    console.log('Testing document processing pipeline...')
    
    // 1. Text Processing (works locally)
    const chunks = testText.match(/.{1,500}/g) || [testText]
    console.log('Text chunked into', chunks.length, 'pieces')
    
    // 2. Generate Embeddings (works locally)
    const embedding = await getEmbedding(chunks[0])
    console.log('Embedding generated, dimensions:', embedding?.length)
    
    // 3. AI Analysis (works locally)
    const analysisPrompt = `
      Analyze this loan application document and provide a structured response:
      
      Document: ${testText}
      
      Provide your analysis in this exact JSON format:
      {
        "Decision": "Approved/Rejected/Review Required",
        "Amount": "₹XX,XXX",
        "Justification": {
          "creditScore": "description",
          "income": "description", 
          "risk": "description"
        },
        "ConfidenceScore": 0.XX,
        "RiskFactors": ["factor1", "factor2"],
        "Recommendations": ["rec1", "rec2"]
      }
    `
    
    const analysis = await analyzeWithAI(analysisPrompt)
    console.log('AI Analysis completed')
    
    return NextResponse.json({
      success: true,
      message: 'Document processing pipeline working locally',
      pipeline: {
        textProcessing: { status: 'success', chunks: chunks.length },
        embedding: { status: 'success', dimensions: embedding?.length },
        aiAnalysis: { status: 'success', result: analysis }
      },
      limitation: 'Cannot save to database due to network issue',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
