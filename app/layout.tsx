import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ClientLayout } from "@/components/client-layout"
import { AuthProvider } from "@/lib/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NeuroDoc - AI Document Processing",
  description: "Advanced LLM-powered document processing system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
