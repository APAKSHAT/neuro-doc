import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key for admin operations
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database Types
export interface Document {
  id: string
  user_id: string
  file_name: string
  file_type: string
  uploaded_at: string
  file_path?: string
}

export interface Clause {
  id: string
  document_id: string
  content: string
  page_number: number
  section: string
  embedding: number[]
  created_at: string
  documents?: Document
}

export interface Query {
  id: string
  user_id: string
  query_text: string
  decision_json: any
  confidence_score: number
  created_at: string
}

export interface AuditLog {
  id: string
  query_id: string
  clause_id: string
  reasoning_path: string
  timestamp: string
  queries?: Query
  clauses?: Clause
}
