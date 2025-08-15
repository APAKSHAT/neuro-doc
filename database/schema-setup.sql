-- NeuroDoc Database Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
CREATE TYPE document_type AS ENUM ('pdf', 'docx', 'eml', 'txt');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE decision_type AS ENUM ('approved', 'rejected', 'pending', 'review_required');

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    document_type document_type NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    processing_status processing_status DEFAULT 'pending',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    extracted_text TEXT,
    summary TEXT,
    key_entities JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2),
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Document chunks table for vector storage
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768), -- Gemini embedding dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queries table for storing user queries and responses
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_embedding vector(768),
    response JSONB NOT NULL,
    documents_referenced UUID[] DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document clauses table
CREATE TABLE document_clauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    clause_type VARCHAR(100) NOT NULL,
    clause_text TEXT NOT NULL,
    clause_embedding vector(768),
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions table for tracking AI decisions
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
    decision decision_type NOT NULL,
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'INR',
    justification JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    risk_factors JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at);
CREATE INDEX idx_queries_embedding ON queries USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_document_clauses_document_id ON document_clauses(document_id);
CREATE INDEX idx_document_clauses_type ON document_clauses(clause_type);
CREATE INDEX idx_document_clauses_embedding ON document_clauses USING ivfflat (clause_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_decisions_document_id ON decisions(document_id);
CREATE INDEX idx_decisions_decision ON decisions(decision);
CREATE INDEX idx_decisions_created_at ON decisions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to documents table
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Document chunks policies
CREATE POLICY "Users can view chunks of their documents" ON document_chunks
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chunks for their documents" ON document_chunks
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

-- Queries policies
CREATE POLICY "Users can view their own queries" ON queries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queries" ON queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Document clauses policies
CREATE POLICY "Users can view clauses of their documents" ON document_clauses
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clauses for their documents" ON document_clauses
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Decisions policies
CREATE POLICY "Users can view decisions for their documents" ON decisions
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert decisions" ON decisions
    FOR INSERT WITH CHECK (true);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    document_id uuid,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE sql
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
        (user_id_filter IS NULL OR d.user_id = user_id_filter)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats(user_id_param uuid)
RETURNS TABLE(
    total_documents bigint,
    processed_documents bigint,
    failed_documents bigint,
    total_queries bigint,
    avg_confidence_score numeric
)
LANGUAGE sql
AS $$
    SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE processing_status = 'completed') as processed_documents,
        COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_documents,
        (SELECT COUNT(*) FROM queries WHERE queries.user_id = user_id_param) as total_queries,
        AVG(confidence_score) as avg_confidence_score
    FROM documents
    WHERE user_id = user_id_param;
$$;

-- Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
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

-- Insert sample data (optional)
-- You can uncomment this if you want some test data
/*
INSERT INTO documents (
    filename, 
    original_filename, 
    file_size, 
    document_type, 
    mime_type, 
    storage_path,
    processing_status,
    extracted_text,
    summary
) VALUES (
    'sample-loan-application.pdf',
    'loan-application.pdf',
    1048576,
    'pdf',
    'application/pdf',
    'documents/sample/loan-application.pdf',
    'completed',
    'This is a sample loan application document...',
    'Loan application for ₹5,00,000 for home purchase'
);
*/
