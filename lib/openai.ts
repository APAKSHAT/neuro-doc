import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// AI Provider configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'

// OpenAI configuration
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// Gemini configuration
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

export { openai, genAI }

// Model configurations
export const MODELS = {
  openai: {
    embedding: 'text-embedding-3-small',
    chat: 'gpt-4',
    dimensions: 1536
  },
  gemini: {
    embedding: 'text-embedding-004', // Gemini embedding model
    chat: 'gemini-1.5-pro', // Updated to use correct Gemini model
    dimensions: 768 // Gemini embedding dimensions
  }
}

export const EMBEDDING_MODEL = MODELS[AI_PROVIDER as keyof typeof MODELS]?.embedding || MODELS.openai.embedding
export const CHAT_MODEL = MODELS[AI_PROVIDER as keyof typeof MODELS]?.chat || MODELS.openai.chat
export const EMBEDDING_DIMENSIONS = MODELS[AI_PROVIDER as keyof typeof MODELS]?.dimensions || MODELS.openai.dimensions

// Function to get embeddings for text
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    if (AI_PROVIDER === 'gemini' && genAI) {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const result = await model.embedContent(text)
      return result.embedding.values
    } else if (AI_PROVIDER === 'openai' && openai) {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      })
      return response.data[0].embedding
    } else {
      throw new Error(`AI provider ${AI_PROVIDER} not configured or API key missing`)
    }
  } catch (error) {
    console.error('Error getting embedding:', error)
    throw error
  }
}

// Function to get embeddings for multiple texts
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (AI_PROVIDER === 'gemini' && genAI) {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const results = await Promise.all(
        texts.map(text => model.embedContent(text))
      )
      return results.map(result => result.embedding.values)
    } else if (AI_PROVIDER === 'openai' && openai) {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      })
      return response.data.map(item => item.embedding)
    } else {
      throw new Error(`AI provider ${AI_PROVIDER} not configured or API key missing`)
    }
  } catch (error) {
    console.error('Error getting embeddings:', error)
    throw error
  }
}

// Function to analyze text and extract structured information
export async function analyzeWithAI(prompt: string, context?: string): Promise<any> {
  try {
    if (AI_PROVIDER === 'gemini' && genAI) {
      return await analyzeWithGemini(prompt, context)
    } else if (AI_PROVIDER === 'openai' && openai) {
      return await analyzeWithOpenAI(prompt, context)
    } else {
      throw new Error(`AI provider ${AI_PROVIDER} not configured or API key missing`)
    }
  } catch (error) {
    console.error('Error with AI analysis:', error)
    throw error
  }
}

// Gemini analysis function
async function analyzeWithGemini(prompt: string, context?: string): Promise<any> {
  try {
    const model = genAI!.getGenerativeModel({ 
      model: CHAT_MODEL,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
      }
    })
    
    const systemPrompt = `You are a document analysis assistant specializing in insurance policies, contracts, and other documents. You analyze these documents to make decisions about claims and queries. Always respond with valid JSON only, no additional text or formatting.`
    
    let fullPrompt = systemPrompt + '\n\n'
    
    if (context) {
      fullPrompt += `Context: ${context}\n\n`
    }
    
    fullPrompt += `User Query: ${prompt}\n\nRespond with valid JSON only:`
    
    const result = await model.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()
    
    try {
      // Clean the response - remove markdown formatting if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleanText)
    } catch (parseError) {
      console.error('Error parsing Gemini response as JSON:', text)
      return { error: 'Invalid JSON response from Gemini', rawResponse: text }
    }
  } catch (error) {
    console.error('Error with Gemini analysis:', error)
    throw error
  }
}

// OpenAI analysis function (fallback)
async function analyzeWithOpenAI(prompt: string, context?: string): Promise<any> {
  try {
    const systemPrompt = `You are a document analysis assistant. You analyze insurance policies, contracts, and other documents to make decisions about claims and queries. Always respond with valid JSON.`
    
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
    
    if (context) {
      messages.splice(1, 0, { role: 'assistant', content: `Context: ${context}` })
    }
    
    const response = await openai!.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 2000,
    })
    
    const content = response.choices[0].message.content
    
    try {
      return JSON.parse(content || '{}')
    } catch (parseError) {
      console.error('Error parsing GPT response as JSON:', content)
      return { error: 'Invalid JSON response from GPT', rawResponse: content }
    }
  } catch (error) {
    console.error('Error with GPT analysis:', error)
    throw error
  }
}

// Legacy function name for backward compatibility
export const analyzeWithGPT = analyzeWithAI
