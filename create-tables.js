#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTablesDirectly() {
  console.log('🚀 Creating tables directly...');
  
  // Try to create a simple documents table first
  try {
    console.log('📋 Creating documents table...');
    
    // Insert sample data to auto-create table structure (Supabase approach)
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000',
        file_name: 'test.pdf',
        file_type: 'pdf',
        file_path: '/test.pdf'
      }]);
      
    if (error) {
      console.log(`❌ Documents table creation failed: ${error.message}`);
    } else {
      console.log('✅ Documents table created successfully');
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
  
  // Try to query existing tables
  try {
    console.log('🔍 Checking existing tables...');
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (error) {
      console.log(`❌ Could not list tables: ${error.message}`);
    } else {
      console.log('📋 Existing tables:', data?.map(t => t.table_name) || []);
    }
  } catch (err) {
    console.log(`❌ Error listing tables: ${err.message}`);
  }
}

createTablesDirectly().catch(console.error);
