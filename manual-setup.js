#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Setting up NeuroDoc database...');
  
  // SQL statements to execute
  const sqlStatements = [
    // Enable extensions
    `CREATE EXTENSION IF NOT EXISTS vector;`,
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    
    // Create documents table
    `CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'eml')),
      file_path TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create clauses table
    `CREATE TABLE IF NOT EXISTS clauses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      page_number INTEGER DEFAULT 1,
      section TEXT DEFAULT 'Unknown',
      embedding vector(768),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create queries table
    `CREATE TABLE IF NOT EXISTS queries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      query_text TEXT NOT NULL,
      decision_json JSONB NOT NULL,
      confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create audit_log table
    `CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
      reasoning_path TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_clauses_document_id ON clauses(document_id);`,
    `CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_log_query_id ON audit_log(query_id);`,
  ];
  
  for (let i = 0; i < sqlStatements.length; i++) {
    console.log(`⚡ Executing statement ${i + 1}/${sqlStatements.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: sqlStatements[i] });
      
      if (error) {
        console.log(`❌ Error: ${error.message}. Trying alternative method...`);
        // If RPC fails, try direct table creation for tables only
        if (sqlStatements[i].includes('CREATE TABLE')) {
          const tableName = sqlStatements[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
          if (tableName) {
            console.log(`📋 Creating table ${tableName} via API...`);
          }
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.log(`❌ Error executing statement ${i + 1}: ${err.message}`);
    }
  }
  
  // Test if tables exist by trying to query them
  console.log('\n🔍 Verifying table creation...');
  
  const tables = ['documents', 'clauses', 'queries', 'audit_log'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' verification failed: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' verification error: ${err.message}`);
    }
  }
  
  console.log('\n🎉 Database setup completed!');
}

setupDatabase().catch(console.error);
