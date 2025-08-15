"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, User, Building } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

const FloatingParticle = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      className="absolute w-2 h-2 bg-cyan-400/30 rounded-full"
      animate={{
        y: [-20, -100],
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        delay,
        ease: "easeOut",
      }}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      }}
    />
  )
}

const NeuralNetwork = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.2} />
      ))}

      {/* Neural connections */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.line
            key={i}
            x1={`${20 + i * 20}%`}
            y1="20%"
            x2={`${30 + i * 15}%`}
            y2="80%"
            stroke="url(#gradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
          />
        ))}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [organization, setOrganization] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        // Login with Supabase
        if (!email || !password) {
          toast({
            title: "Login Failed",
            description: "Please enter both email and password.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Use auth context to store session
          login(data.session.access_token, data.user)

          toast({
            title: "Login Successful",
            description: "Welcome to NeuroDoc AI Processing System",
          })
          router.push("/dashboard")
        } else {
          toast({
            title: "Login Failed",
            description: data.error || "Please check your credentials and try again.",
            variant: "destructive",
          })
        }
      } else {
        // Register with Supabase
        if (!email || !password || !confirmPassword || !firstName || !lastName || !acceptTerms) {
          toast({
            title: "Registration Failed",
            description: "Please fill in all required fields and accept the terms.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        if (password !== confirmPassword) {
          toast({
            title: "Registration Failed",
            description: "Passwords do not match.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            password, 
            firstName, 
            lastName, 
            organization 
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          toast({
            title: "Account Created Successfully",
            description: data.needsVerification 
              ? "Please check your email to verify your account before logging in."
              : "Welcome to NeuroDoc! You can now access the system.",
          })
          
          if (!data.needsVerification) {
            router.push("/dashboard")
          } else {
            // Switch to login mode for email verification
            setIsLogin(true)
            setEmail("")
            setPassword("")
          }
        } else {
          toast({
            title: "Registration Failed",
            description: data.error || "An error occurred during registration.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      toast({
        title: isLogin ? "Login Failed" : "Registration Failed",
        description: "A network error occurred. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    // Reset form fields
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFirstName("")
    setLastName("")
    setOrganization("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    setRememberMe(false)
    setAcceptTerms(false)
  }

  return (
    <div className="min-h-screen bg-black particle-bg flex items-center justify-center p-6 relative overflow-hidden">
      <NeuralNetwork />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center glow animate-pulse-glow">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
            NeuroDoc
          </h1>
          <p className="text-gray-400">AI Document Processing System</p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass neuro border-white/10">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                {isLogin ? "Secure Access" : "Create Account"}
              </CardTitle>
              <p className="text-gray-400 text-sm">
                {isLogin ? "Enter your credentials to continue" : "Join the future of document processing"}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 h-12"
                            required
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 h-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            className="border-gray-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                          />
                          <Label htmlFor="remember" className="text-sm text-gray-300 cursor-pointer">
                            Remember me
                          </Label>
                        </div>
                        <Button
                          variant="link"
                          className="text-cyan-400 hover:text-cyan-300 p-0 h-auto text-sm"
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-gray-300 text-sm font-medium">
                            First Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="firstName"
                              type="text"
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-gray-300 text-sm font-medium">
                            Last Name
                          </Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                            required
                          />
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                            required
                          />
                        </div>
                      </div>

                      {/* Organization Field */}
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-gray-300 text-sm font-medium">
                          Organization <span className="text-gray-500">(Optional)</span>
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="organization"
                            type="text"
                            placeholder="Your organization"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                          />
                        </div>
                      </div>

                      {/* Password Fields */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10 pr-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-gray-300 text-sm font-medium">
                            Confirm Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="pl-10 pr-10 bg-black/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400/20 h-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions */}
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={acceptTerms}
                          onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                          className="border-gray-600 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 mt-1"
                        />
                        <Label htmlFor="terms" className="text-sm text-gray-300 cursor-pointer leading-relaxed">
                          I agree to the{" "}
                          <Button variant="link" className="text-purple-400 hover:text-purple-300 p-0 h-auto text-sm">
                            Terms of Service
                          </Button>{" "}
                          and{" "}
                          <Button variant="link" className="text-purple-400 hover:text-purple-300 p-0 h-auto text-sm">
                            Privacy Policy
                          </Button>
                        </Label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full ${
                    isLogin
                      ? "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                      : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  } text-white border-0 h-12 text-lg font-medium relative overflow-hidden group`}
                >
                  {isLoading ? (
                    <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Brain className="w-5 h-5" />
                      </motion.div>
                      {isLogin ? "Authenticating..." : "Creating Account..."}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="flex items-center gap-2"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {isLogin ? "Access System" : "Create Account"}
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  )}

                  {/* Animated background effect */}
                  <motion.div
                    className={`absolute inset-0 ${
                      isLogin
                        ? "bg-gradient-to-r from-cyan-400/20 to-purple-600/20"
                        : "bg-gradient-to-r from-purple-400/20 to-pink-600/20"
                    }`}
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </p>
                <Button
                  variant="link"
                  onClick={toggleMode}
                  className={`${
                    isLogin ? "text-purple-400 hover:text-purple-300" : "text-cyan-400 hover:text-cyan-300"
                  } p-0 h-auto text-sm font-medium mt-1`}
                >
                  {isLogin ? "Create Account" : "Sign In"}
                </Button>
              </div>

              {/* Demo Credentials - Only show for login */}
              <AnimatePresence>
                {isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <p className="text-blue-300 text-sm font-medium mb-2">Demo Credentials:</p>
                    <div className="text-xs text-blue-200 space-y-1">
                      <p>Email: demo@neurodoc.ai</p>
                      <p>Password: neurodoc2024</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-8 text-gray-400 text-sm"
        >
          <p>© 2024 NeuroDoc. Advanced AI Document Processing.</p>
          <p className="mt-1">Secure • Intelligent • Efficient</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
