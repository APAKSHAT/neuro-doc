import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // First, try to select from documents table
    const { data: selectResult, error: selectError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .limit(1)
    
    if (selectError) {
      return NextResponse.json({
        step: 'select',
        error: selectError.message,
        details: selectError
      })
    }
    
    // Now try to get table info using Supabase introspection
    const { data: tableInfo, error: infoError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'documents')
      .eq('table_schema', 'public')
    
    if (infoError) {
      return NextResponse.json({
        step: 'table_info',
        error: infoError.message,
        details: infoError
      })
    }
    
    return NextResponse.json({
      success: true,
      selectResult,
      tableColumns: tableInfo
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
