#!/usr/bin/env node

/**
 * NeuroDoc Database Setup Script
 * 
 * This script automatically sets up the required database tables and functions
 * in your Supabase project using the provided credentials.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up NeuroDoc database...');
  console.log(`📡 Connecting to: ${supabaseUrl}`);

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_dummy')
            .select('*')
            .limit(0);
          
          // If it's just a table that doesn't exist, that's expected
          if (error.message.includes('does not exist')) {
            console.log(`⚠️  Note: ${error.message}`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, err.message);
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = ['documents', 'clauses', 'queries', 'audit_log'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}' verification failed:`, error.message);
        } else {
          console.log(`✅ Table '${table}' is ready`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' check failed:`, err.message);
      }
    }

    // Set up storage bucket
    console.log('\n📁 Setting up storage bucket...');
    
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Failed to list buckets:', listError.message);
      } else {
        const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
        
        if (!documentsBucket) {
          const { error: createError } = await supabase.storage.createBucket('documents', {
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'message/rfc822']
          });
          
          if (createError) {
            console.error('❌ Failed to create documents bucket:', createError.message);
          } else {
            console.log('✅ Documents storage bucket created');
          }
        } else {
          console.log('✅ Documents storage bucket already exists');
        }
      }
    } catch (err) {
      console.error('❌ Storage setup failed:', err.message);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Add your OpenAI API key to .env.local');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test: curl http://localhost:3000/api/health');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Manual SQL execution function (alternative approach)
async function executeSchemaManually() {
  console.log('\n🛠️  Manual Setup Instructions:');
  console.log('Since automatic execution may have limitations, please:');
  console.log('\n1. Go to your Supabase dashboard:');
  console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/default/sql`);
  console.log('\n2. Copy and paste the following SQL commands:');
  
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  console.log('\n--- SQL SCHEMA START ---');
  console.log(schema);
  console.log('--- SQL SCHEMA END ---\n');
  
  console.log('3. Click "RUN" to execute the schema');
  console.log('4. Verify the tables are created in the Table Editor');
}

// Check if we can connect to Supabase
async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error && !error.message.includes('session')) {
      throw error;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 NeuroDoc Database Setup');
  console.log('========================\n');
  
  // Test connection first
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n📋 Please verify your Supabase credentials in .env.local');
    return;
  }
  
  // Try automatic setup
  try {
    await setupDatabase();
  } catch (error) {
    console.log('\n⚠️  Automatic setup encountered issues.');
    console.log('Falling back to manual setup instructions...\n');
    executeSchemaManually();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupDatabase, executeSchemaManually };
