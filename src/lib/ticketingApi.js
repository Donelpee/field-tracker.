import { supabase } from './supabase'
import { featureFlags } from './featureFlags'

const resolveBaseUrl = () => {
  const configured = import.meta.env.VITE_TICKETING_API_BASE_URL
  if (configured) return configured.replace(/\/$/, '')
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL')
  return `${supabaseUrl}/functions/v1`
}

const getAuthHeader = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  let session = data?.session || null

  // Refresh shortly-before-expiry sessions to avoid edge-function 401s.
  if (session?.expires_at && session.expires_at * 1000 <= Date.now() + 30_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw refreshError
    session = refreshed?.session || session
  }

  const token = session?.access_token
  if (!token) {
    throw new Error('Missing authenticated session. Please sign in again.')
  }

  return { Authorization: `Bearer ${token}` }
}

const getApiKeyHeader = () => {
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY for ticketing API calls.')
  }
  return { apikey: anonKey }
}

export const isTicketingEnabled = () =>
  featureFlags.ticketingApiEnabled && featureFlags.opsTicketModuleEnabled

export const callTicketingFunction = async (functionName, { method = 'POST', body, query } = {}) => {
  if (!featureFlags.ticketingApiEnabled) {
    throw new Error('Ticketing API is disabled. Enable VITE_FEATURE_TICKETING_API_ENABLED.')
  }

  // Use Supabase Functions client for authenticated non-GET calls.
  if (method !== 'GET') {
    const headers = {
      ...getApiKeyHeader(),
      ...(await getAuthHeader())
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      method,
      headers,
      body,
    })

    if (error) {
      let details = ''
      if (error.context && typeof error.context.text === 'function') {
        try {
          const bodyText = await error.context.text()
          details = bodyText ? ` - ${bodyText}` : ''
        } catch {
          details = ''
        }
      }
      throw new Error(`${error.message || 'Function invoke failed'}${details}`)
    }

    return data || {}
  }

  const queryText = query ? `?${new URLSearchParams(query).toString()}` : ''
  const baseUrl = resolveBaseUrl()
  const headers = {
    'Content-Type': 'application/json',
    ...getApiKeyHeader(),
    ...(await getAuthHeader())
  }

  const response = await fetch(`${baseUrl}/${functionName}${queryText}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  let json = {}
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { message: text }
    }
  }

  if (!response.ok) {
    throw new Error(json?.error || json?.message || `Request failed with ${response.status}`)
  }

  return json
}
