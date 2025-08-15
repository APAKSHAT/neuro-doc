import { NextRequest, NextResponse } from 'next/server'
import { addDocument, getDocumentChunks, getAllDocuments } from '@/lib/document-store'

export async function POST(request: NextRequest) {
  try {
    // Create a simple test document with known content
    const testDocument = {
      id: 'test-doc-123',
      fileName: 'test-surgery-policy.pdf',
      fileType: 'pdf',
      size: 1000,
      chunks: [
        {
          id: 'test-chunk-1',
          content: 'This policy covers knee surgery and hip surgery for all patients.',
          pageNumber: 1,
          section: 'Section 1',
          chunkIndex: 0,
          documentId: 'test-doc-123',
          fileName: 'test-surgery-policy.pdf',
          embedding: [0.1, 0.2, 0.3]
        },
        {
          id: 'test-chunk-2', 
          content: 'Surgical procedures require pre-authorization. Emergency surgery is covered immediately.',
          pageNumber: 1,
          section: 'Section 2',
          chunkIndex: 1,
          documentId: 'test-doc-123',
          fileName: 'test-surgery-policy.pdf',
          embedding: [0.4, 0.5, 0.6]
        }
      ],
      pages: 1,
      summary: 'Test surgery policy',
      key_clauses: ['Surgery coverage', 'Pre-authorization'],
      uploadedAt: new Date().toISOString(),
      user_id: 'test-user'
    }
    
    console.log('Before addDocument - chunks:', testDocument.chunks.length)
    
    // Test the addDocument function
    addDocument(testDocument)
    
    // Check what was actually stored
    const allDocs = getAllDocuments()
    const allChunks = getDocumentChunks()
    
    console.log('After addDocument - documents:', allDocs.length)
    console.log('After addDocument - chunks in store:', allChunks.length)
    
    return NextResponse.json({
      success: true,
      testDocument: {
        id: testDocument.id,
        chunksCreated: testDocument.chunks.length
      },
      storeState: {
        totalDocuments: allDocs.length,
        totalChunks: allChunks.length,
        documentsInStore: allDocs.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          chunksInDoc: doc.chunks.length
        })),
        chunksInStore: allChunks.map(chunk => ({
          id: chunk.id,
          fileName: chunk.fileName,
          contentPreview: chunk.content.substring(0, 50) + '...'
        }))
      }
    })
  } catch (error) {
    console.error('Test storage error:', error)
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
