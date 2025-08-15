import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Get user settings from database
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Return default settings if none exist
    const defaultSettings = {
      embeddingModel: 'gemini',
      confidenceThreshold: 85,
      autoProcessing: true,
      jwtEnabled: false
    }

    return NextResponse.json({
      success: true,
      settings: settings || defaultSettings
    })

  } catch (error) {
    console.error('Settings API error:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request)
    
    // Parse request body
    const body = await request.json()
    const { embeddingModel, apiKey, jwtEnabled, autoProcessing, confidenceThreshold } = body

    // Validate required fields
    if (!embeddingModel || confidenceThreshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Prepare settings data
    const settingsData = {
      user_id: user.id,
      embedding_model: embeddingModel,
      confidence_threshold: confidenceThreshold,
      auto_processing: autoProcessing || false,
      jwt_enabled: jwtEnabled || false,
      updated_at: new Date().toISOString()
    }

    // Store API key securely if provided (encrypted in real implementation)
    if (apiKey && apiKey.trim() !== '') {
      settingsData.api_key_hash = apiKey // In production, this should be encrypted
    }

    // Upsert settings (insert or update)
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .upsert(settingsData, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('Error saving settings:', error)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    // Log the settings change for audit
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'settings_updated',
        details: {
          embeddingModel,
          confidenceThreshold,
          autoProcessing,
          jwtEnabled
        },
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: data?.[0]
    })

  } catch (error) {
    console.error('Settings save error:', error)
    
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
