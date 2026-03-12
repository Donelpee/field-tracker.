import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Missing Supabase environment variables.')
}

export const createRequestClient = (authorization: string | null) =>
  createClient(supabaseUrl, anonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {}
    }
  })

export const adminClient = createClient(supabaseUrl, serviceKey)

