import { NextRequest, NextResponse } from 'next/server'
import { processDocument } from '@/lib/document-processor'
import { analyzeWithAI } from '@/lib/openai'

interface HackRXRequest {
  documents: string // URL to document
  questions: string[]
}

interface HackRXResponse {
  answers: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = 'f52031c67a78585014ed3ea516573de21ad4a25e79074c2be81d7632f31b24ce'
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documents, questions }: HackRXRequest = await request.json()

    if (!documents || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected { documents: string, questions: string[] }' },
        { status: 400 }
      )
    }

    console.log(`Processing HackRX request with ${questions.length} questions`)
    console.log('Document URL:', documents)

    // Download the document from the provided URL
    let documentBuffer: Buffer
    try {
      const response = await fetch(documents)
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      documentBuffer = Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Error downloading document:', error)
      return NextResponse.json(
        { error: 'Failed to download document from provided URL' },
        { status: 400 }
      )
    }

    // Process the document
    let documentText: string
    try {
      // Determine file type from URL
      const fileType = documents.toLowerCase().includes('.pdf') ? 'pdf' : 
                     documents.toLowerCase().includes('.docx') ? 'docx' : 'pdf'
      
      const processed = await processDocument(documentBuffer, fileType)
      documentText = processed.text
      console.log(`Document processed successfully. Text length: ${documentText.length} characters`)
    } catch (error) {
      console.error('Error processing document:', error)
      return NextResponse.json(
        { error: 'Failed to process document' },
        { status: 500 }
      )
    }

    // Process each question
    const answers: string[] = []
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      console.log(`Processing question ${i + 1}/${questions.length}: ${question.substring(0, 100)}...`)
      
      try {
        // Create context for AI analysis
        const analysisPrompt = `You are analyzing an insurance policy document to answer specific questions.

DOCUMENT CONTENT:
${documentText.substring(0, 8000)} ${documentText.length > 8000 ? '...' : ''}

QUESTION: ${question}

Please provide a direct, factual answer based ONLY on the information in the document provided above. 
Be specific and reference policy clauses where applicable. If the information is not clearly stated in the document, say so.

Format your response as a clear, concise answer that directly addresses the question.`

        const aiResult = await analyzeWithAI(analysisPrompt)
        
        // Extract answer from AI result
        let answer = ''
        if (typeof aiResult === 'string') {
          answer = aiResult
        } else if (aiResult && typeof aiResult === 'object') {
          // Try to extract text from various possible AI response formats
          answer = aiResult.answer || aiResult.response || aiResult.Justification || JSON.stringify(aiResult)
        } else {
          answer = 'Unable to process this question based on the provided document.'
        }
        
        answers.push(answer)
        console.log(`Question ${i + 1} answered successfully`)
        
      } catch (error) {
        console.error(`Error processing question ${i + 1}:`, error)
        answers.push('Error processing this question. Please try again.')
      }
    }

    const response: HackRXResponse = {
      answers
    }

    console.log(`HackRX request completed successfully. Processed ${questions.length} questions.`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('HackRX API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
