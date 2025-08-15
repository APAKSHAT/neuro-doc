"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Shield, Download, Filter, CheckCircle, XCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AuditEntry {
  id: string
  query: {
    text: string
    decision: any
    confidenceScore: number
    createdAt: string
  }
  clause: {
    content: string
    pageNumber: number
    section: string
    document: {
      fileName: string
      fileType: string
    }
  }
  timestamp: string
  reasoningPath: any[]
}

export default function Audit() {
  const [auditData, setAuditData] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredData, setFilteredData] = useState<AuditEntry[]>([])
  const [timeFilter, setTimeFilter] = useState("all")
  const [decisionFilter, setDecisionFilter] = useState("all")

  useEffect(() => {
    async function fetchAuditData() {
      try {
        const response = await fetch('/api/audit?limit=50')
        const data = await response.json()
        
        if (data.auditLogs) {
          setAuditData(data.auditLogs)
          setFilteredData(data.auditLogs)
        }
      } catch (error) {
        console.error('Failed to fetch audit data:', error)
        setAuditData([])
        setFilteredData([])
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [])

  useEffect(() => {
    let filtered = auditData

    if (decisionFilter !== "all") {
      filtered = filtered.filter((entry) => {
        const decision = entry.query.decision?.Decision || 'Pending'
        return decision.toLowerCase() === decisionFilter.toLowerCase()
      })
    }

    if (timeFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()
      
      switch (timeFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter((entry) => 
        new Date(entry.timestamp) >= filterDate
      )
    }

    setFilteredData(filtered)
  }, [auditData, timeFilter, decisionFilter])

  const exportData = () => {
    const dataStr = JSON.stringify(filteredData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDecisionBadge = (decision: any) => {
    const decisionText = decision?.Decision || 'Pending'
    const variant = decisionText === 'Approved' ? 'default' : 
                   decisionText === 'Rejected' ? 'destructive' : 
                   'secondary'
    
    return (
      <Badge variant={variant} className={
        decisionText === 'Approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''
      }>
        {decisionText === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
        {decisionText === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
        {decisionText === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
        {decisionText}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black particle-bg p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
                Audit Trail
              </h1>
              <p className="text-gray-400">Loading audit trail...</p>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-20 bg-gray-700/50 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-700/50 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-black particle-bg p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
            Audit Trail
          </h1>
          <p className="text-gray-400">Track all document processing decisions and reasoning paths</p>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass neuro">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-48 bg-black/50 border-gray-600 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by time" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-800">
                        All Time
                      </SelectItem>
                      <SelectItem value="today" className="text-white hover:bg-gray-800">
                        Today
                      </SelectItem>
                      <SelectItem value="week" className="text-white hover:bg-gray-800">
                        Past Week
                      </SelectItem>
                      <SelectItem value="month" className="text-white hover:bg-gray-800">
                        Past Month
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                    <SelectTrigger className="w-48 bg-black/50 border-gray-600 text-white">
                      <SelectValue placeholder="Filter by decision" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-800">
                        All Decisions
                      </SelectItem>
                      <SelectItem value="approved" className="text-white hover:bg-gray-800">
                        Approved
                      </SelectItem>
                      <SelectItem value="rejected" className="text-white hover:bg-gray-800">
                        Rejected
                      </SelectItem>
                      <SelectItem value="pending" className="text-white hover:bg-gray-800">
                        Pending
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    {filteredData.length} entries
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportData}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audit Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Decision Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No audit entries found</h3>
                  <p className="text-gray-500">Process some queries to see audit trail here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-transparent">
                        <TableHead className="text-gray-300">Query</TableHead>
                        <TableHead className="text-gray-300">Decision</TableHead>
                        <TableHead className="text-gray-300">Confidence</TableHead>
                        <TableHead className="text-gray-300">Document</TableHead>
                        <TableHead className="text-gray-300">Referenced Clause</TableHead>
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-gray-700 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-gray-300 max-w-xs">
                            <div className="truncate">{entry.query.text}</div>
                          </TableCell>
                          <TableCell>
                            {getDecisionBadge(entry.query.decision)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {Math.round((entry.query.confidenceScore || 0) * 100)}%
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            <div className="truncate max-w-32">
                              {entry.clause.document.fileName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Page {entry.clause.pageNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-sm">
                            <div className="truncate text-sm">
                              {entry.clause.content}
                            </div>
                            {entry.clause.section && (
                              <Badge variant="outline" className="text-xs mt-1 bg-blue-500/10 text-blue-300 border-blue-500/30">
                                {entry.clause.section}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {formatTimestamp(entry.timestamp)}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
