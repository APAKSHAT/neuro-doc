"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Settings, Brain, Shield, Key, Save, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [embeddingModel, setEmbeddingModel] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [jwtEnabled, setJwtEnabled] = useState(false)
  const [autoProcessing, setAutoProcessing] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState("85")
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      const settings = {
        embeddingModel,
        apiKey,
        jwtEnabled,
        autoProcessing,
        confidenceThreshold: parseInt(confidenceThreshold)
      }

      let response
      try {
        response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings)
        })
      } catch (error) {
        console.log('Production settings endpoint unavailable, using dev endpoint')
        response = await fetch('/api/dev-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings)
        })
      }

      const data = await response.json()
      
      if (data.success) {
        setSaved(true)
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully.",
        })
        setTimeout(() => setSaved(false), 2000)
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings: " + (data.error || 'Unknown error'),
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Settings save error:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-black particle-bg p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-400">Configure your NeuroDoc system preferences</p>
        </div>

        {/* AI Model Settings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                AI Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="embedding-model" className="text-gray-300">
                  Embedding Model
                </Label>
                <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select embedding model" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="openai" className="text-white hover:bg-gray-800">
                      OpenAI text-embedding-ada-002
                    </SelectItem>
                    <SelectItem value="huggingface" className="text-white hover:bg-gray-800">
                      HuggingFace sentence-transformers
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400">
                  Choose the embedding model for document processing and similarity search.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confidence-threshold" className="text-gray-300">
                  Confidence Threshold
                </Label>
                <Select value={confidenceThreshold} onValueChange={setConfidenceThreshold}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select threshold" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="70" className="text-white hover:bg-gray-800">
                      70%
                    </SelectItem>
                    <SelectItem value="75" className="text-white hover:bg-gray-800">
                      75%
                    </SelectItem>
                    <SelectItem value="80" className="text-white hover:bg-gray-800">
                      80%
                    </SelectItem>
                    <SelectItem value="85" className="text-white hover:bg-gray-800">
                      85%
                    </SelectItem>
                    <SelectItem value="90" className="text-white hover:bg-gray-800">
                      90%
                    </SelectItem>
                    <SelectItem value="95" className="text-white hover:bg-gray-800">
                      95%
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400">Minimum confidence score required for automatic approvals.</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-processing" className="text-gray-300">
                    Auto Processing
                  </Label>
                  <p className="text-sm text-gray-400">Automatically process queries above confidence threshold</p>
                </div>
                <Switch
                  id="auto-processing"
                  checked={autoProcessing}
                  onCheckedChange={setAutoProcessing}
                  className="data-[state=checked]:bg-cyan-500"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Security & Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="api-key" className="text-gray-300">
                  API Key
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                  />
                </div>
                <p className="text-sm text-gray-400">API key for external service authentication.</p>
              </div>

              <Separator className="bg-gray-700" />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="jwt-auth" className="text-gray-300">
                    JWT Authentication
                  </Label>
                  <p className="text-sm text-gray-400">Enable JWT-based authentication for API access</p>
                </div>
                <Switch
                  id="jwt-auth"
                  checked={jwtEnabled}
                  onCheckedChange={setJwtEnabled}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>

              {jwtEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                >
                  <Label htmlFor="jwt-secret" className="text-gray-300">
                    JWT Secret Key
                  </Label>
                  <Input
                    id="jwt-secret"
                    type="password"
                    placeholder="Enter JWT secret"
                    className="bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                  />
                  <p className="text-sm text-gray-400">Secret key used for JWT token signing and verification.</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass neuro">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Interface Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-300">Dark Theme</Label>
                  <p className="text-sm text-gray-400">
                    Dark theme is always enabled for optimal neural processing visualization
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={true} disabled className="data-[state=checked]:bg-blue-500" />
                  <span className="text-sm text-blue-400 font-medium">Always On</span>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-3">
                <Label className="text-gray-300">Animation Level</Label>
                <Select defaultValue="high">
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select animation level" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="none" className="text-white hover:bg-gray-800">
                      None
                    </SelectItem>
                    <SelectItem value="low" className="text-white hover:bg-gray-800">
                      Low
                    </SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-gray-800">
                      Medium
                    </SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-gray-800">
                      High
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400">Control the level of UI animations and transitions.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleSave}
            className={`bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0 px-8 py-3 text-lg transition-all duration-300 ${
              saved ? "glow" : ""
            }`}
            disabled={saved}
          >
            {saved ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Saved!
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Settings
              </div>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
