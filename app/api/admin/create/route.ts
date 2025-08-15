import { NextResponse } from 'next/server'
import { createAdminUser } from '@/lib/create-admin'

export async function POST() {
  try {
    const adminUser = await createAdminUser()
    
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Failed to create admin user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        created_at: adminUser.created_at
      }
    })

  } catch (error) {
    console.error('Admin creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
