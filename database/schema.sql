-- NeuroDoc System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET timezone TO 'UTC';

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
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queries table to store user queries and decisions
CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  decision_json JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table to track which clauses were used for decisions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  reasoning_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_clauses_embedding ON clauses USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_query_id ON audit_log(query_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_clause_id ON audit_log(clause_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for clauses (through documents)
CREATE POLICY "Users can view clauses from their documents" ON clauses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = clauses.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clauses to their documents" ON clauses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = clauses.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clauses in their documents" ON clauses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = clauses.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clauses from their documents" ON clauses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = clauses.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- RLS Policies for queries
CREATE POLICY "Users can view their own queries" ON queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queries" ON queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queries" ON queries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queries" ON queries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for audit_log (through queries)
CREATE POLICY "Users can view audit logs for their queries" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = audit_log.query_id 
      AND queries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit logs for their queries" ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = audit_log.query_id 
      AND queries.user_id = auth.uid()
    )
  );

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

-- Function to find similar clauses
CREATE OR REPLACE FUNCTION find_similar_clauses(
  target_embedding vector(1536),
  match_count int DEFAULT 5,
  exclude_id uuid DEFAULT NULL
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
    (1 - (c.embedding <=> target_embedding)) as similarity,
    d.file_name,
    d.file_type
  FROM clauses c
  JOIN documents d ON c.document_id = d.id
  WHERE 
    (exclude_id IS NULL OR c.id != exclude_id)
  ORDER BY c.embedding <=> target_embedding
  LIMIT match_count;
END;
$$;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create some useful views
CREATE OR REPLACE VIEW user_document_stats AS
SELECT 
  d.user_id,
  COUNT(d.id) as total_documents,
  COUNT(c.id) as total_clauses,
  COUNT(q.id) as total_queries,
  AVG(q.confidence_score) as avg_confidence,
  MAX(d.uploaded_at) as last_upload,
  MAX(q.created_at) as last_query
FROM documents d
LEFT JOIN clauses c ON d.id = c.document_id
LEFT JOIN queries q ON d.user_id = q.user_id
GROUP BY d.user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert sample data (optional - remove in production)
-- This is just for testing purposes
/*
INSERT INTO documents (user_id, file_name, file_type) VALUES
  ('00000000-0000-0000-0000-000000000000', 'sample_policy.pdf', 'pdf'),
  ('00000000-0000-0000-0000-000000000000', 'terms_conditions.docx', 'docx');

INSERT INTO clauses (document_id, content, page_number, section, embedding) VALUES
  ((SELECT id FROM documents WHERE file_name = 'sample_policy.pdf' LIMIT 1), 
   'Coverage includes hospitalization expenses up to ₹5,00,000 per policy year.', 
   1, 'Coverage Details', 
   vector(ARRAY[0.1, 0.2, 0.3])); -- This would be a real 1536-dimension vector
*/

COMMIT;
