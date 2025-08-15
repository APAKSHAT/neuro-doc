"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Send, FileText, DollarSign, Shield, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface QueryResult {
  decision: "Approved" | "Rejected" | "Error" | "Pending"
  amount: string
  justification: string
  clause: string
  confidenceScore: number
  referencedDocuments: string[]
  processingTime: number
}

const ProcessingAnimation = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        {/* Central node */}
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center glow"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <Brain className="w-8 h-8 text-white" />
        </motion.div>

        {/* Orbiting nodes */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-cyan-400"
            style={{
              top: "50%",
              left: "50%",
              transformOrigin: "0 0",
            }}
            animate={{
              rotate: 360,
              x: Math.cos((i * Math.PI) / 3) * 60,
              y: Math.sin((i * Math.PI) / 3) * 60,
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
              ease: "linear",
            }}
          />
        ))}

        {/* Connecting lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute w-px bg-gradient-to-r from-cyan-400/50 to-transparent"
            style={{
              top: "50%",
              left: "50%",
              height: "60px",
              transformOrigin: "0 0",
              transform: `rotate(${i * 60}deg)`,
            }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function QueryPage() {
  const [query, setQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  const handleSubmit = async () => {
    if (!query.trim()) return

    setIsProcessing(true)
    setResult(null)

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('supabase_token')
      
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          query: query.trim()
        })
      })

      const data = await response.json()

      if (data.success && data.result) {
        setResult({
          decision: data.result.decision?.Decision || 'Pending',
          amount: data.result.decision?.Amount || 'N/A',
          justification: data.result.decision?.Justification || 'No justification provided',
          clause: data.result.decision?.ReferencedClause || 'No clause referenced',
          confidenceScore: Math.round((data.result.confidence || 0) * 100),
          referencedDocuments: data.result.referencedDocuments || [],
          processingTime: data.result.processingTime || 0,
        })
      } else {
        throw new Error(data.error || 'Failed to process query')
      }
    } catch (error) {
      console.error('Query processing error:', error)
      setResult({
        decision: 'Error',
        amount: 'N/A',
        justification: 'Failed to process query. Please try again.',
        clause: 'N/A',
        confidenceScore: 0,
        referencedDocuments: [],
        processingTime: 0,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black particle-bg p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
            Query Interface
          </h1>
          <p className="text-gray-400">Ask questions about your documents and get AI-powered insights</p>
        </div>

        {/* Query Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                Neural Query Terminal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Enter your query (e.g., '46M, knee surgery, 3-month policy')..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[120px] bg-black/50 border-gray-600 text-white placeholder-gray-400 font-mono text-lg resize-none focus:border-cyan-400 focus:ring-cyan-400/20"
                  disabled={isProcessing}
                />
                <div className="absolute bottom-3 right-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!query.trim() || isProcessing}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0"
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Brain className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isProcessing ? "Processing..." : "Submit Query"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Processing Animation */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass neuro">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">Neural Network Processing</h3>
                    <p className="text-gray-400">Analyzing documents and extracting relevant information...</p>
                  </div>
                  <ProcessingAnimation />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="glass neuro">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Decision Header */}
                  <div className="flex items-center justify-between p-4 rounded-lg glass">
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={result.decision === "Approved" ? "default" : "destructive"}
                        className={`text-lg px-4 py-2 ${
                          result.decision === "Approved" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                        }`}
                      >
                        {result.decision}
                      </Badge>
                      <div className="flex items-center gap-2 text-2xl font-bold text-white">
                        <DollarSign className="w-6 h-6" />
                        {result.amount}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Confidence Score</p>
                      <div className="flex items-center gap-2">
                        <Progress value={result.confidenceScore} className="w-24 h-2" />
                        <span className="text-cyan-400 font-semibold">{result.confidenceScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Justification */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      Justification
                    </h4>
                    <p className="text-gray-300 leading-relaxed p-4 rounded-lg bg-black/30">{result.justification}</p>
                  </div>

                  {/* Referenced Clause */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Referenced Clause
                    </h4>
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-300 font-medium">{result.clause}</p>
                    </div>
                  </div>

                  {/* Referenced Documents */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Referenced Documents</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.referencedDocuments.map((doc, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Processing Stats */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">Processing Time:</span>
                    <span className="text-cyan-400 font-medium">{result.processingTime.toFixed(2)}s</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
