import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET() {
  try {
    console.log('Testing database tables...')
    
    const tables = ['documents', 'clauses', 'queries', 'audit_log']
    const results = []
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          results.push({
            table,
            status: 'error',
            message: error.message
          })
        } else {
          results.push({
            table,
            status: 'success',
            count: data?.length || 0
          })
        }
      } catch (err) {
        results.push({
          table,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }
    
    const allSuccess = results.every(r => r.status === 'success')
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'All database tables accessible' : 'Some tables have issues',
      tables: results,
      supabaseUrl
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
