"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, File, Mail, CheckCircle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  pages?: number
  uploadProgress: number
  status: "uploading" | "processing" | "completed" | "error"
  uploadedAt: Date
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const { toast } = useToast()
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }, [])

  const processFiles = async (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList.map((file) => ({
      id: Math.random().toString(36),
      name: file.name,
      type: file.type,
      size: file.size,
      pages: 0,
      uploadProgress: 0,
      status: "uploading",
      uploadedAt: new Date(),
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Process each file
    for (const file of fileList) {
      const fileData = newFiles.find(f => f.name === file.name)
      if (!fileData) continue

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Get auth token from localStorage
        const token = localStorage.getItem('supabase_token')
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(errorData.error || `Upload failed with status ${response.status}`)
        }

        const result = await response.json()

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileData.id) {
              return { 
                ...f, 
                uploadProgress: 100, 
                status: "completed",
                pages: result.document?.pages || 0
              }
            }
            return f
          })
        )

        toast({
          title: "Upload Complete",
          description: `${file.name} has been processed successfully.`,
        })

      } catch (error) {
        console.error('Upload error:', error)
        
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileData.id) {
              return { ...f, status: "error", uploadProgress: 0 }
            }
            return f
          })
        )

        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        })
      }
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return FileText
    if (type.includes("word") || type.includes("document")) return File
    if (type.includes("email")) return Mail
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

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
            Upload Documents
          </h1>
          <p className="text-gray-400">Upload PDFs, Word documents, or email files for processing</p>
        </div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={`glass neuro transition-all duration-300 ${isDragOver ? "glow border-cyan-400/50" : ""}`}>
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  isDragOver ? "border-cyan-400 bg-cyan-400/10" : "border-gray-600 hover:border-gray-500"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-2">Drop files here or click to upload</h3>
                <p className="text-gray-400 mb-6">Supports PDF, Word documents, and email files up to 50MB</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.eml,.msg"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  asChild
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0"
                >
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select Files
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass neuro">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Uploaded Files ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence>
                  {files.map((file, index) => {
                    const FileIcon = getFileIcon(file.type)
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="glass rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-purple-600/20 flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{file.name}</h4>
                              <p className="text-sm text-gray-400">
                                {formatFileSize(file.size)} • {file.pages} pages
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={file.status === "completed" ? "default" : "secondary"}
                              className={
                                file.status === "completed"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : file.status === "error"
                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }
                            >
                              {file.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                              {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {file.status !== "completed" && (
                          <div className="flex items-center gap-2">
                            <Progress value={file.uploadProgress} className="flex-1 h-2" />
                            <span className="text-sm text-cyan-400 font-medium">
                              {Math.round(file.uploadProgress)}%
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
