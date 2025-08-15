import { supabaseAdmin } from './supabase'
import { getEmbedding } from './openai'

export interface SearchResult {
  id: string
  content: string
  page_number: number
  section: string
  document_id: string
  similarity: number
  document?: {
    file_name: string
    file_type: string
  }
}

// Perform vector similarity search
export async function vectorSearch(
  query: string,
  limit: number = 10,
  threshold: number = 0.7,
  userId?: string
): Promise<SearchResult[]> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query)
    
    // Build the query
    let rpcQuery = `
      SELECT 
        c.id,
        c.content,
        c.page_number,
        c.section,
        c.document_id,
        c.embedding <=> $1::vector as distance,
        (1 - (c.embedding <=> $1::vector)) as similarity,
        d.file_name,
        d.file_type
      FROM clauses c
      JOIN documents d ON c.document_id = d.id
    `
    
    // Add user filter if userId is provided
    if (userId) {
      rpcQuery += ` WHERE d.user_id = $${userId ? '2' : '1'}`
    }
    
    rpcQuery += `
      ORDER BY c.embedding <=> $1::vector
      LIMIT $${userId ? '3' : '2'}
    `
    
    const params = [JSON.stringify(queryEmbedding)]
    if (userId) {
      params.push(userId)
    }
    params.push(limit.toString())
    
    const { data, error } = await supabaseAdmin.rpc('vector_search', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      user_id: userId
    })
    
    if (error) {
      console.error('Vector search error:', error)
      // Fallback to direct SQL query if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('clauses')
        .select(`
          id,
          content,
          page_number,
          section,
          document_id,
          documents:document_id(file_name, file_type)
        `)
        .limit(limit)
      
      if (fallbackError) {
        throw fallbackError
      }
      
      return (fallbackData || []).map(item => ({
        id: item.id,
        content: item.content,
        page_number: item.page_number,
        section: item.section,
        document_id: item.document_id,
        similarity: 0.5, // Default similarity for fallback
        document: Array.isArray(item.documents) ? item.documents[0] : item.documents
      }))
    }
    
    return (data || [])
      .filter((item: any) => item.similarity >= threshold)
      .map((item: any) => ({
        id: item.id,
        content: item.content,
        page_number: item.page_number,
        section: item.section,
        document_id: item.document_id,
        similarity: item.similarity,
        document: {
          file_name: item.file_name,
          file_type: item.file_type
        }
      }))
      
  } catch (error) {
    console.error('Error in vector search:', error)
    throw error
  }
}

// Store document chunks with embeddings
export async function storeDocumentChunks(
  documentId: string,
  chunks: Array<{
    content: string
    pageNumber: number
    section: string
    chunkIndex: number
  }>
): Promise<void> {
  try {
    // Get embeddings for all chunks
    const contents = chunks.map(chunk => chunk.content)
    const embeddings = await Promise.all(
      contents.map(content => getEmbedding(content))
    )
    
    // Prepare data for insertion
    const clauseData = chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk.content,
      page_number: chunk.pageNumber,
      section: chunk.section,
      embedding: JSON.stringify(embeddings[index])
    }))
    
    // Insert chunks into database
    const { error } = await supabaseAdmin
      .from('clauses')
      .insert(clauseData)
    
    if (error) {
      console.error('Error storing document chunks:', error)
      throw error
    }
    
  } catch (error) {
    console.error('Error in storeDocumentChunks:', error)
    throw error
  }
}

// Get similar clauses for a given clause
export async function findSimilarClauses(
  clauseId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Get the clause embedding
    const { data: clause, error } = await supabaseAdmin
      .from('clauses')
      .select('embedding')
      .eq('id', clauseId)
      .single()
    
    if (error || !clause) {
      throw new Error('Clause not found')
    }
    
    // Use the embedding to find similar clauses
    const { data, error: searchError } = await supabaseAdmin.rpc('find_similar_clauses', {
      target_embedding: clause.embedding,
      match_count: limit,
      exclude_id: clauseId
    })
    
    if (searchError) {
      console.error('Error finding similar clauses:', searchError)
      throw searchError
    }
    
    return data || []
    
  } catch (error) {
    console.error('Error in findSimilarClauses:', error)
    throw error
  }
}
