import { createClient } from '@supabase/supabase-js'

// Public project configuration. The publishable key is intended for browser use.
// Never place a service_role/secret key or WhatsApp/Meta credentials here.
const supabaseUrl = 'https://bkyqbbigfvfaobblxziu.supabase.co'
const supabasePublishableKey = 'sb_publishable_HIzGXC7XaboKJQzF8sztiQ_Qoh4B4Gr'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
