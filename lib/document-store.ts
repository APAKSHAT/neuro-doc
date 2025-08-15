// Shared document store for uploaded documents and their chunks
// This replaces hardcoded references with real uploaded content

export interface DocumentChunk {
  id: string
  content: string
  pageNumber: number
  section: string
  chunkIndex: number
  documentId: string
  fileName: string
  embedding?: number[]
}

export interface UploadedDocument {
  id: string
  fileName: string
  fileType: string
  size: number
  chunks: DocumentChunk[]
  pages: number
  summary: string
  key_clauses: string[]
  uploadedAt: string
  user_id: string
}

// Global in-memory storage for documents and chunks (persists across module imports)
declare global {
  var globalDocumentStore: {
    uploadedDocuments: UploadedDocument[]
    documentChunks: DocumentChunk[]
  } | undefined
}

// Initialize global store
if (!global.globalDocumentStore) {
  global.globalDocumentStore = {
    uploadedDocuments: [],
    documentChunks: []
  }
}

export function addDocument(document: UploadedDocument): void {
  const store = global.globalDocumentStore!
  
  // Remove any existing document with same filename
  store.uploadedDocuments = store.uploadedDocuments.filter(doc => doc.fileName !== document.fileName)
  
  // Remove existing chunks for this document (do this ONCE before adding new chunks)
  store.documentChunks = store.documentChunks.filter(existingChunk => 
    existingChunk.documentId !== document.id
  )
  
  // Add new document
  store.uploadedDocuments.push(document)
  
  // Add ALL chunks to searchable collection at once
  store.documentChunks.push(...document.chunks)
  
  console.log(`Added document ${document.fileName} with ${document.chunks.length} chunks to global store`)
  console.log(`Total documents: ${store.uploadedDocuments.length}, Total chunks: ${store.documentChunks.length}`)
}

export function getAllDocuments(): UploadedDocument[] {
  return global.globalDocumentStore?.uploadedDocuments || []
}

export function getDocumentChunks(): DocumentChunk[] {
  return global.globalDocumentStore?.documentChunks || []
}

// Enhanced keyword variations for better matching
function getKeywordVariations(word: string): string[] {
  const variations = [word]
  
  // Add plural/singular variations
  if (word.endsWith('s') && word.length > 3) {
    variations.push(word.slice(0, -1)) // Remove 's' for singular
  } else {
    variations.push(word + 's') // Add 's' for plural
  }
  
  // Add specific medical/insurance term variations
  const termVariations: { [key: string]: string[] } = {
    'baby': ['babies', 'infant', 'child', 'newborn', 'dependent'],
    'babies': ['baby', 'infant', 'children', 'newborns', 'dependents'],
    'child': ['children', 'kid', 'minor', 'dependent', 'baby'],
    'children': ['child', 'kids', 'minors', 'dependents', 'babies'],
    'surgery': ['surgical', 'operation', 'procedure', 'treatment'],
    'medical': ['medicine', 'healthcare', 'health', 'clinical'],
    'cover': ['coverage', 'covered', 'covers', 'benefit', 'benefits'],
    'coverage': ['cover', 'covered', 'covers', 'benefit', 'benefits'],
    'claim': ['claims', 'reimbursement', 'payment'],
    'policy': ['policies', 'plan', 'contract', 'agreement']
  }
  
  if (termVariations[word]) {
    variations.push(...termVariations[word])
  }
  
  return [...new Set(variations)] // Remove duplicates
}

export function searchDocumentChunks(query: string): DocumentChunk[] {
  const queryLower = query.toLowerCase()
  const keywords = queryLower.split(/\s+/).filter(word => word.length > 2)
  const chunks = getDocumentChunks()
  
  // Generate keyword variations for better matching
  const expandedKeywords: string[] = []
  keywords.forEach(keyword => {
    expandedKeywords.push(...getKeywordVariations(keyword))
  })
  
  // Score each chunk based on keyword matches
  const scoredChunks = chunks.map((chunk: DocumentChunk) => {
    const contentLower = chunk.content.toLowerCase()
    let score = 0
    
    // Exact phrase match gets highest score
    if (contentLower.includes(queryLower)) {
      score += 10
    }
    
    // Original keyword matches
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        score += 2
      }
    })
    
    // Expanded keyword matches (slightly lower score)
    expandedKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        score += 1
      }
    })
    
    // Boost score for certain important keywords
    const importantKeywords = ['surgery', 'coverage', 'policy', 'claim', 'deductible', 'limit', 'baby', 'babies', 'child', 'children']
    expandedKeywords.forEach(keyword => {
      if (importantKeywords.includes(keyword) && contentLower.includes(keyword)) {
        score += 2
      }
    })
    
    return { chunk, score }
  })
  
  // Return chunks sorted by relevance score
  return scoredChunks
    .filter((item: any) => item.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5) // Top 5 most relevant chunks
    .map((item: any) => item.chunk)
}

export function getReferencedDocuments(): string[] {
  const docs = getAllDocuments()
  return docs.map((doc: UploadedDocument) => doc.fileName)
}

export function clearAllDocuments(): void {
  const store = global.globalDocumentStore!
  store.uploadedDocuments = []
  store.documentChunks = []
  console.log('Cleared all documents from global store')
}

// Simple embedding simulation (in real app, would use OpenAI embeddings)
export function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(384).fill(0) // Simulated 384-dim embedding
  
  // Simple hash-based embedding for demo
  words.forEach((word, index) => {
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const embeddingIndex = Math.abs(hash) % 384
    embedding[embeddingIndex] += 1 / (index + 1) // Weight by position
  })
  
  return embedding
}

export function findSimilarChunks(queryEmbedding: number[], topK: number = 3): DocumentChunk[] {
  const chunks = getDocumentChunks()
  
  if (chunks.length === 0) {
    return []
  }
  
  // Calculate cosine similarity with each chunk
  const similarities = chunks.map((chunk: DocumentChunk) => {
    const chunkEmbedding = chunk.embedding || generateSimpleEmbedding(chunk.content)
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding)
    return { chunk, similarity }
  })
  
  // Return top K most similar chunks
  return similarities
    .sort((a: any, b: any) => b.similarity - a.similarity)
    .slice(0, topK)
    .map((item: any) => item.chunk)
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0
  return dotProduct / (magnitudeA * magnitudeB)
}
