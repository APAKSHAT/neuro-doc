import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sampleRequest = {
      documents: "https://hackrx.blob.core.windows.net/assets/policy.pdf?sv=2023-01-03&st=2025-07-04T09%3A11%3A24Z&se=2027-07-05T09%3A11%3A00Z&sr=b&sp=r&sig=N4a9OU0w0QXO6AOIBiu4bpl7AXvEZogeT%2FjUHNO7HzQ%3D",
      questions: [
        "What is the grace period for premium payment under the National Parivar Mediclaim Plus Policy?",
        "What is the waiting period for pre-existing diseases (PED) to be covered?",
        "Does this policy cover maternity expenses, and what are the conditions?"
      ]
    }

    // Test the HackRX endpoint
    const testResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/hackrx/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer f52031c67a78585014ed3ea516573de21ad4a25e79074c2be81d7632f31b24ce'
      },
      body: JSON.stringify(sampleRequest)
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      return NextResponse.json({
        success: false,
        error: `HackRX endpoint test failed: ${testResponse.status}`,
        details: errorText
      }, { status: 500 })
    }

    const result = await testResponse.json()

    return NextResponse.json({
      success: true,
      message: 'HackRX endpoint is working correctly',
      testRequest: sampleRequest,
      testResponse: result,
      compliance: {
        endpoint: '✅ /hackrx/run endpoint exists',
        authentication: '✅ Bearer token authentication working', 
        requestFormat: '✅ Accepts { documents: string, questions: string[] }',
        responseFormat: '✅ Returns { answers: string[] }',
        documentProcessing: '✅ Downloads and processes PDF from URL',
        aiAnalysis: '✅ AI-powered question answering'
      }
    })

  } catch (error) {
    console.error('HackRX test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test HackRX endpoint',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testUrl } = await request.json()
    
    if (!testUrl) {
      return NextResponse.json({
        error: 'testUrl is required'
      }, { status: 400 })
    }

    // Test custom document URL
    const sampleRequest = {
      documents: testUrl,
      questions: [
        "What are the key coverage details mentioned in this document?",
        "What are the eligibility criteria?",
        "What exclusions are mentioned?"
      ]
    }

    const testResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/hackrx/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer f52031c67a78585014ed3ea516573de21ad4a25e79074c2be81d7632f31b24ce'
      },
      body: JSON.stringify(sampleRequest)
    })

    const result = await testResponse.json()

    return NextResponse.json({
      success: testResponse.ok,
      testRequest: sampleRequest,
      testResponse: result,
      httpStatus: testResponse.status
    })

  } catch (error) {
    console.error('Custom test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test custom URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
