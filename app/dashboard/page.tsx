"use client"

import { motion } from "framer-motion"
import { FileText, Brain, CheckCircle, XCircle, Clock, TrendingUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"

interface DashboardStats {
  documentsIndexed: number
  queriesProcessed: number
  approvedClaims: number
  processingTime: string
  documentsChange: string
  queriesChange: string
  claimsChange: string
  timeChange: string
}

interface RecentQuery {
  id: string
  query: string
  decision: string
  amount: string
  confidence: number
  timestamp: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { isAuthenticated } = useAuth()

  async function fetchDashboardData() {
    try {
      setRefreshing(true)
      const token = localStorage.getItem('supabase_token')
      if (!token) {
        throw new Error('No authentication token')
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      }

      // Try real-time stats first (no auth required), then production endpoints, then dev endpoints
      let statsResponse, queriesResponse

      try {
        // Use real-time stats as primary source
        statsResponse = await fetch('/api/real-time-stats')
        queriesResponse = await fetch('/api/dev-queries')
      } catch (error) {
        console.log('Real-time stats unavailable, trying production endpoints')
        try {
          statsResponse = await fetch('/api/queries?type=stats', { headers })
          queriesResponse = await fetch('/api/queries?limit=5', { headers })
        } catch (prodError) {
          console.log('Production endpoints unavailable, using dev endpoints')
          statsResponse = await fetch('/api/dev-stats')
          queriesResponse = await fetch('/api/dev-queries')
        }
      }

      const statsData = await statsResponse.json()
      const queriesData = await queriesResponse.json()

      if (statsData.success) {
        setStats(statsData.stats)
      } else {
        // If auth fails, try real-time stats, then dev endpoint as fallback
        console.log('Main API failed, trying real-time stats:', statsData)
        try {
          const realTimeResponse = await fetch('/api/real-time-stats')
          const realTimeData = await realTimeResponse.json()
          if (realTimeData.success) {
            setStats(realTimeData.stats)
          } else {
            throw new Error('Real-time stats failed')
          }
        } catch (realTimeError) {
          console.log('Real-time stats failed, trying dev endpoint')
          const devStatsResponse = await fetch('/api/dev-stats')
          const devStatsData = await devStatsResponse.json()
          if (devStatsData.success) {
            setStats(devStatsData.stats)
          }
        }
      }

      if (queriesData.success) {
        setRecentQueries(queriesData.queries)
      } else {
        // If auth fails, use dev endpoint as fallback
        console.log('Main API failed, trying dev endpoint:', queriesData)
        const devQueriesResponse = await fetch('/api/dev-queries')
        const devQueriesData = await devQueriesResponse.json()
        if (devQueriesData.success) {
          setRecentQueries(devQueriesData.queries)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Set empty data instead of mock data
      setStats({
        documentsIndexed: 0,
        queriesProcessed: 0,
        approvedClaims: 0,
        processingTime: "0s",
        documentsChange: "0%",
        queriesChange: "0%",
        claimsChange: "0%",
        timeChange: "0%"
      })
      setRecentQueries([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      // Fetch dev data when not authenticated
      async function fetchDevData() {
        try {
          const [statsResponse, queriesResponse] = await Promise.all([
            fetch('/api/dev-stats'),
            fetch('/api/dev-queries')
          ])
          
          const [statsData, queriesData] = await Promise.all([
            statsResponse.json(),
            queriesResponse.json()
          ])
          
          if (statsData.success) setStats(statsData.stats)
          if (queriesData.success) setRecentQueries(queriesData.queries)
        } catch (error) {
          console.error('Failed to fetch dev data:', error)
          setStats({
            documentsIndexed: 0,
            queriesProcessed: 0,
            approvedClaims: 0,
            processingTime: "0s",
            documentsChange: "0%",
            queriesChange: "0%",
            claimsChange: "0%",
            timeChange: "0%"
          })
          setRecentQueries([])
        } finally {
          setLoading(false)
        }
      }
      
      fetchDevData()
      return
    }

    fetchDashboardData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    
    return () => clearInterval(interval)
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen bg-black particle-bg p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-gray-400">Loading your document processing analytics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass neuro animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-700/50 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Documents Indexed",
      value: stats?.documentsIndexed.toString() || "0",
      change: stats?.documentsChange || "0%",
      icon: FileText,
      color: "from-cyan-400 to-cyan-600",
    },
    {
      title: "Queries Processed",
      value: stats?.queriesProcessed.toString() || "0",
      change: stats?.queriesChange || "0%",
      icon: Brain,
      color: "from-purple-400 to-purple-600",
    },
    {
      title: "Approved Claims",
      value: stats?.approvedClaims.toString() || "0",
      change: stats?.claimsChange || "0%",
      icon: CheckCircle,
      color: "from-green-400 to-green-600",
    },
    {
      title: "Processing Time",
      value: stats?.processingTime || "0s",
      change: stats?.timeChange || "0%",
      icon: Clock,
      color: "from-blue-400 to-blue-600",
    },
  ]

  return (
    <div className="min-h-screen bg-black particle-bg p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-gray-400">
              {isAuthenticated 
                ? "Monitor your document processing system" 
                : "Demo mode - Please log in to see your real data"}
            </p>
            {!isAuthenticated && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ You are viewing demo data. Please log in to access your personalized dashboard.
                </p>
              </div>
            )}
          </div>
          
          {isAuthenticated && (
            <Button
              variant="outline"
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className="glass neuro hover:glow transition-all duration-300 animate-float"
                style={{ animationDelay: `${index * 0.5}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">{stat.change}</span>
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center glow`}
                    >
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Queries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentQueries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No queries processed yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Upload documents and start querying to see analytics here.</p>
                </div>
              ) : (
                recentQueries.map((query, index) => (
                  <motion.div
                    key={query.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="glass rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={query.decision === "Approved" ? "default" : "destructive"}
                          className={
                            query.decision === "Approved" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                          }
                        >
                          {query.decision === "Approved" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {query.decision}
                        </Badge>
                        <span className="text-lg font-semibold text-white">{query.amount}</span>
                      </div>
                      <span className="text-sm text-gray-400">{query.timestamp}</span>
                    </div>
                    <p className="text-gray-300 mb-2">{query.query}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Confidence:</span>
                      <Progress value={query.confidence} className="flex-1 h-2" />
                      <span className="text-sm text-cyan-400 font-medium">{query.confidence}%</span>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
