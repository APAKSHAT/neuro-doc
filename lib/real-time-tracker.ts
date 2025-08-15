// Global query tracking
declare global {
  var globalQueryTracker: {
    totalQueries: number
    lastQueryTime: Date
    queryHistory: Array<{
      timestamp: Date
      query: string
      decision: string
    }>
  } | undefined
}

if (!global.globalQueryTracker) {
  global.globalQueryTracker = {
    totalQueries: 0,
    lastQueryTime: new Date(),
    queryHistory: []
  }
}

export function trackQuery(query: string, decision: string) {
  const queryTracker = global.globalQueryTracker!
  queryTracker.totalQueries += 1
  queryTracker.lastQueryTime = new Date()
  queryTracker.queryHistory.push({
    timestamp: new Date(),
    query: query || 'Unknown query',
    decision: decision || 'Pending'
  })
  
  // Keep only last 100 queries in memory
  if (queryTracker.queryHistory.length > 100) {
    queryTracker.queryHistory = queryTracker.queryHistory.slice(-100)
  }
  
  console.log(`[REAL-TIME] Query tracked: "${query}" - Decision: ${decision} - Total: ${queryTracker.totalQueries}`)
}

export function getQueryStats() {
  const queryTracker = global.globalQueryTracker!
  return {
    totalQueries: queryTracker.totalQueries,
    lastQueryTime: queryTracker.lastQueryTime,
    queryHistory: queryTracker.queryHistory
  }
}
