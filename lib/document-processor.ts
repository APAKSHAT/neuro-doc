import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { parse } from 'node-html-parser'

export interface ProcessedDocument {
  text: string
  metadata: {
    pages?: number
    title?: string
    author?: string
  }
}

export interface DocumentChunk {
  content: string
  pageNumber: number
  section: string
  chunkIndex: number
}

// Process PDF files
export async function processPDF(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const data = await pdfParse(buffer)
    
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        title: data.info?.Title || '',
        author: data.info?.Author || ''
      }
    }
  } catch (error) {
    console.error('Error processing PDF:', error)
    throw new Error('Failed to process PDF file')
  }
}

// Process DOCX files
export async function processDOCX(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    
    return {
      text: result.value,
      metadata: {
        title: 'DOCX Document'
      }
    }
  } catch (error) {
    console.error('Error processing DOCX:', error)
    throw new Error('Failed to process DOCX file')
  }
}

// Process EML files (basic email parsing)
export async function processEML(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const emailContent = buffer.toString('utf-8')
    
    // Basic email parsing - extract body content
    const lines = emailContent.split('\n')
    let bodyStartIndex = -1
    
    // Find where the email body starts (after headers)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && bodyStartIndex === -1) {
        bodyStartIndex = i + 1
        break
      }
    }
    
    const bodyText = bodyStartIndex > -1 
      ? lines.slice(bodyStartIndex).join('\n').trim()
      : emailContent
    
    // Remove HTML tags if present
    const root = parse(bodyText)
    const cleanText = root.text || bodyText
    
    return {
      text: cleanText,
      metadata: {
        title: 'Email Document'
      }
    }
  } catch (error) {
    console.error('Error processing EML:', error)
    throw new Error('Failed to process EML file')
  }
}

// Main document processor
export async function processDocument(
  buffer: Buffer, 
  fileType: string
): Promise<ProcessedDocument> {
  const type = fileType.toLowerCase()
  
  switch (type) {
    case 'pdf':
      return processPDF(buffer)
    case 'docx':
      return processDOCX(buffer)
    case 'eml':
      return processEML(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// Chunk text into smaller pieces for embedding
export function chunkText(
  text: string, 
  maxChunkSize: number = 1000,
  overlap: number = 200
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  let currentPageNumber = 1
  let chunkIndex = 0
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.'
    
    // Check if adding this sentence would exceed the chunk size
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        pageNumber: currentPageNumber,
        section: `Section ${Math.floor(chunkIndex / 3) + 1}`,
        chunkIndex: chunkIndex++
      })
      
      // Start new chunk with overlap
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.floor(overlap / 6)) // Approximate word overlap
      currentChunk = overlapWords.join(' ') + ' ' + sentence
      
      // Estimate page number based on chunk position
      currentPageNumber = Math.floor(chunkIndex / 3) + 1
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      pageNumber: currentPageNumber,
      section: `Section ${Math.floor(chunkIndex / 3) + 1}`,
      chunkIndex: chunkIndex
    })
  }
  
  return chunks
}

// Validate file type
export function validateFileType(filename: string): boolean {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'docx', 'eml']
  const extension = filename.split('.').pop()?.toLowerCase()
  
  return extension ? allowedTypes.includes(extension) : false
}

// Validate file size
export function validateFileSize(size: number): boolean {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  return size <= maxSize
}
