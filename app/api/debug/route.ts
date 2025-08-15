import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDocumentChunks, getAllDocuments } from '@/lib/document-store'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
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
          chunksCount: doc.chunks.length,
          uploadedAt: doc.uploadedAt
        })),
        recentChunks: chunks.slice(-10).map(chunk => ({
          id: chunk.id,
          fileName: chunk.fileName,
          section: chunk.section,
          contentPreview: chunk.content.substring(0, 200) + '...',
          contentLength: chunk.content.length
        }))
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
