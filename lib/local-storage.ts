// Local storage utilities for development/fallback
export interface StoredDocument {
  id: string
  fileName: string
  fileType: string
  content: string
  uploadedAt: string
  userId: string
}

export interface StoredQuery {
  id: string
  query: string
  result: any
  confidence: number
  timestamp: string
  userId: string
}

export interface StoredSettings {
  embeddingModel: string
  confidenceThreshold: number
  autoProcessing: boolean
  jwtEnabled: boolean
  userId: string
}

class LocalStorage {
  private getStorageKey(type: string, userId: string = 'default') {
    return `neurodoc_${type}_${userId}`
  }

  // Documents
  saveDocument(doc: StoredDocument) {
    const key = this.getStorageKey('documents', doc.userId)
    const docs = this.getDocuments(doc.userId)
    docs.push(doc)
    localStorage.setItem(key, JSON.stringify(docs))
  }

  getDocuments(userId: string = 'default'): StoredDocument[] {
    const key = this.getStorageKey('documents', userId)
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  }

  // Queries
  saveQuery(query: StoredQuery) {
    const key = this.getStorageKey('queries', query.userId)
    const queries = this.getQueries(query.userId)
    queries.unshift(query) // Add to beginning
    // Keep only last 100 queries
    if (queries.length > 100) {
      queries.splice(100)
    }
    localStorage.setItem(key, JSON.stringify(queries))
  }

  getQueries(userId: string = 'default'): StoredQuery[] {
    const key = this.getStorageKey('queries', userId)
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  }

  // Settings
  saveSettings(settings: StoredSettings) {
    const key = this.getStorageKey('settings', settings.userId)
    localStorage.setItem(key, JSON.stringify(settings))
  }

  getSettings(userId: string = 'default'): StoredSettings | null {
    const key = this.getStorageKey('settings', userId)
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  }

  // Stats
  getStats(userId: string = 'default') {
    const docs = this.getDocuments(userId)
    const queries = this.getQueries(userId)
    const approved = queries.filter(q => q.result?.Decision === 'Approved').length

    return {
      documentsIndexed: docs.length,
      queriesProcessed: queries.length,
      approvedClaims: approved,
      processingTime: '1.2s',
      documentsChange: docs.length > 0 ? '+12%' : '0%',
      queriesChange: queries.length > 0 ? '+8%' : '0%',
      claimsChange: approved > 0 ? '+15%' : '0%',
      timeChange: queries.length > 0 ? '-5%' : '0%'
    }
  }
}

export const localStorage_db = new LocalStorage()
