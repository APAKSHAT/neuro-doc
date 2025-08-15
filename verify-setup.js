#!/usr/bin/env node

/**
 * NeuroDoc Setup Verification Script
 * 
 * This script helps verify your setup and provides next steps
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔧 NeuroDoc Setup Verification');
console.log('=============================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`✅ SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : '❌ Missing'}`);
console.log(`✅ SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : '❌ Missing'}`);
console.log(`✅ SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : '❌ Missing'}`);
console.log(`${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key' ? '✅' : '❌'} OPENAI_API_KEY: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key' ? 'Set' : 'Missing - Please add your OpenAI API key'}`);

console.log('\n🗄️  Manual Database Setup Instructions:');
console.log('Since automated setup had network issues, please follow these steps:');

console.log('\n1️⃣ Go to Supabase SQL Editor:');
console.log(`   👉 https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1]}/sql/new`);

console.log('\n2️⃣ Enable Extensions (run this first):');
console.log(`
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
`);

console.log('\n3️⃣ Create Tables (copy and paste this):');
console.log(`
-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'eml')),
  file_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clauses table with vector embeddings
CREATE TABLE IF NOT EXISTS clauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  section TEXT DEFAULT 'Unknown',
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queries table
CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  decision_json JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  reasoning_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`);

console.log('\n4️⃣ Create Indexes (run this next):');
console.log(`
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_clauses_embedding ON clauses USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_query_id ON audit_log(query_id);
`);

console.log('\n5️⃣ Enable Row Level Security:');
console.log(`
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can manage their own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Clauses policies
CREATE POLICY "Users can manage clauses from their documents" ON clauses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = clauses.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Queries policies
CREATE POLICY "Users can manage their own queries" ON queries
  FOR ALL USING (auth.uid() = user_id);

-- Audit policies
CREATE POLICY "Users can view audit logs for their queries" ON audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = audit_log.query_id 
      AND queries.user_id = auth.uid()
    )
  );
`);

console.log('\n6️⃣ Create Vector Search Function:');
console.log(`
-- Vector search function
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  page_number int,
  section text,
  document_id uuid,
  similarity float,
  file_name text,
  file_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.page_number,
    c.section,
    c.document_id,
    (1 - (c.embedding <=> query_embedding)) as similarity,
    d.file_name,
    d.file_type
  FROM clauses c
  JOIN documents d ON c.document_id = d.id
  WHERE 
    (user_id IS NULL OR d.user_id = user_id) AND
    (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`);

console.log('\n7️⃣ Set up Storage Bucket:');
console.log('   👉 Go to Storage in your Supabase dashboard');
console.log('   👉 Create a bucket named "documents" (private)');

console.log('\n8️⃣ Add OpenAI API Key:');
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
  console.log('   ❌ You need to add your OpenAI API key to .env.local');
  console.log('   👉 Get it from: https://platform.openai.com/api-keys');
} else {
  console.log('   ✅ OpenAI API key is configured');
}

console.log('\n🚀 Once database is set up, test with:');
console.log('   npm run dev');
console.log('   curl http://localhost:3000/api/health');

console.log('\n📚 Full documentation available in README.md and IMPLEMENTATION.md');

console.log('\n✨ After setup is complete, you can:');
console.log('   • Upload PDF/DOCX/EML documents');
console.log('   • Query documents with natural language');
console.log('   • Get structured AI decisions with justifications');
console.log('   • View comprehensive audit trails');
