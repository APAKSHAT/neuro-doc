import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return default settings for development
    const defaultSettings = {
      embeddingModel: 'gemini',
      confidenceThreshold: 85,
      autoProcessing: true,
      jwtEnabled: false
    }

    return NextResponse.json({
      success: true,
      settings: defaultSettings
    })

  } catch (error) {
    console.error('Dev Settings API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { embeddingModel, apiKey, jwtEnabled, autoProcessing, confidenceThreshold } = body

    // In development mode, just return success
    console.log('Development settings saved:', {
      embeddingModel,
      confidenceThreshold,
      autoProcessing,
      jwtEnabled
    })

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully (development mode)',
      settings: body
    })

  } catch (error) {
    console.error('Dev Settings save error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save settings'
    }, { status: 500 })
  }
}
