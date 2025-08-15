import { NextRequest, NextResponse } from 'next/server'
import { getDocumentChunks, getAllDocuments } from '@/lib/document-store'

export async function GET(request: NextRequest) {
  try {
    const chunks = getDocumentChunks()
    const documents = getAllDocuments()
    
    // Return debug information about uploaded documents and chunks
    return NextResponse.json({
      success: true,
      debug: {
        totalDocuments: documents.length,
        totalChunks: chunks.length,
        documents: documents.map(doc => ({
          fileName: doc.fileName,
          size: doc.size,
          pages: doc.pages,
          chunksCount: doc.chunks ? doc.chunks.length : 0,
          uploadedAt: doc.uploadedAt
        })),
        recentChunks: chunks.slice(-5).map(chunk => ({
          id: chunk.id,
          fileName: chunk.fileName,
          section: chunk.section,
          contentPreview: chunk.content.substring(0, 300) + '...',
          contentLength: chunk.content.length
        }))
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
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
