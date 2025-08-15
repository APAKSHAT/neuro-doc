import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentChunks, getDocumentChunks } from '@/lib/document-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'baby'
    
    // Get all chunks and search results
    const allChunks = getDocumentChunks()
    const searchResults = searchDocumentChunks(query)
    
    // Check which chunks contain the query manually
    const queryLower = query.toLowerCase()
    const manualMatches = allChunks.filter(chunk => 
      chunk.content.toLowerCase().includes(queryLower)
    )
    
    return NextResponse.json({
      success: true,
      query,
      totalChunks: allChunks.length,
      searchResults: searchResults.length,
      manualMatches: manualMatches.length,
      manualMatchIds: manualMatches.map(chunk => chunk.id),
      searchResultIds: searchResults.map(chunk => chunk.id),
      sampleManualMatch: manualMatches[0] ? {
        id: manualMatches[0].id,
        fileName: manualMatches[0].fileName,
        contentPreview: manualMatches[0].content.substring(0, 200)
      } : null,
      sampleSearchResult: searchResults[0] ? {
        id: searchResults[0].id,
        fileName: searchResults[0].fileName,
        contentPreview: searchResults[0].content.substring(0, 200)
      } : null
    })
  } catch (error) {
    console.error('Search test error:', error)
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
