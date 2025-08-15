import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const fileType = searchParams.get('fileType')
    
    // Build query
    let query = supabaseAdmin
      .from('documents')
      .select(`
        id,
        file_name,
        file_type,
        uploaded_at,
        file_path,
        clauses(count)
      `)
      .eq('user_id', user.id)
    
    // Add filters
    if (search) {
      query = query.ilike('file_name', `%${search}%`)
    }
    
    if (fileType) {
      query = query.eq('file_type', fileType)
    }
    
    // Add pagination and ordering
    const { data: documents, error } = await query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }
    
    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    if (countError) {
      console.error('Error getting document count:', countError)
    }
    
    return NextResponse.json({
      documents: documents?.map(doc => ({
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        uploadedAt: doc.uploaded_at,
        filePath: doc.file_path,
        clauseCount: Array.isArray(doc.clauses) ? doc.clauses.length : 0
      })) || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
    
  } catch (error) {
    console.error('Get documents error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Get document ID from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }
    
    // Verify document belongs to user
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, file_path, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }
    
    // Delete associated clauses first (due to foreign key constraint)
    const { error: clausesError } = await supabaseAdmin
      .from('clauses')
      .delete()
      .eq('document_id', documentId)
    
    if (clausesError) {
      console.error('Error deleting clauses:', clausesError)
      return NextResponse.json(
        { error: 'Failed to delete document clauses' },
        { status: 500 }
      )
    }
    
    // Delete file from storage
    if (document.file_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('documents')
        .remove([document.file_path])
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with document deletion even if storage deletion fails
      }
    }
    
    // Delete document record
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)
    
    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete document error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
