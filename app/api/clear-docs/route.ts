import { NextRequest, NextResponse } from 'next/server'
import { clearAllDocuments } from '@/lib/document-store'

export async function POST(request: NextRequest) {
  try {
    clearAllDocuments()
    
    return NextResponse.json({
      success: true,
      message: 'All documents cleared'
    })
  } catch (error) {
    console.error('Clear API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
