"use client"

import { Brain, FileText, Upload, Shield, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Upload",
    url: "/upload",
    icon: Upload,
  },
  {
    title: "Query",
    url: "/query",
    icon: Brain,
  },
  {
    title: "Clauses",
    url: "/clauses",
    icon: FileText,
  },
  {
    title: "Audit Trail",
    url: "/audit",
    icon: Shield,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-white/10">
      <SidebarHeader className="p-6">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              NeuroDoc
            </h1>
            <p className="text-xs text-gray-400">AI Document Processing</p>
          </div>
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarMenu>
          {menuItems.map((item, index) => (
            <SidebarMenuItem key={item.title}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  className="glass-hover rounded-xl mb-2 h-12 relative overflow-hidden group"
                >
                  <Link href={item.url}>
                    <motion.div
                      className="flex items-center gap-3 w-full"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </motion.div>
                    {pathname === item.url && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl"
                        layoutId="activeTab"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
