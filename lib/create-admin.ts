import { supabaseAdmin } from '@/lib/supabase'

async function createAdminUser() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@neurodoc.local',
      password: 'admin123456',
      email_confirm: true, // Skip email verification
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        full_name: 'Admin User',
        role: 'admin'
      }
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return
    }

    console.log('Admin user created successfully:', {
      id: data.user?.id,
      email: data.user?.email,
      created_at: data.user?.created_at
    })

    return data.user
  } catch (error) {
    console.error('Admin user creation failed:', error)
  }
}

// Export for use in API
export { createAdminUser }
