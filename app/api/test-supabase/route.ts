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
    console.log('Testing Supabase connection...')
    console.log('URL:', supabaseUrl)
    
    // Test basic connection
    const { data: healthData, error: healthError } = await supabase
      .from('health_check')
      .select('*')
      .limit(1)
    
    if (healthError) {
      console.log('Health check failed, trying to create table:', healthError.message)
      
      // If health_check table doesn't exist, try to test with a simple query
      const { data: authData, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.log('Auth test failed:', authError.message)
        return NextResponse.json({
          success: false,
          error: 'Supabase connection failed',
          details: authError.message,
          url: supabaseUrl
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Supabase connected but no tables created yet',
        url: supabaseUrl,
        note: 'Run the SQL schema in Supabase dashboard to create tables'
      })
    }
    
    // If we get here, basic connection works
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      url: supabaseUrl,
      tables: ['health_check table exists']
    })
    
  } catch (error) {
    console.error('Supabase connection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error',
      url: supabaseUrl
    }, { status: 500 })
  }
}
