const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '')

const supabaseUrl = normalizeBase(import.meta.env.VITE_SUPABASE_URL)
const configuredApiBase = normalizeBase(import.meta.env.VITE_TICKETING_API_BASE_URL)
const apiBase = configuredApiBase || (supabaseUrl ? `${supabaseUrl}/functions/v1` : '')
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!apiBase) {
  throw new Error(
    'Missing API configuration. Set VITE_TICKETING_API_BASE_URL or VITE_SUPABASE_URL in apps/customer-portal/.env.local'
  )
}

const callApi = async (path, { method = 'POST', body, query } = {}) => {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  const headers = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.apikey = anonKey
    headers.Authorization = `Bearer ${anonKey}`
  }

  const res = await fetch(`${apiBase}/${path}${qs}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(json?.error || `Request failed with ${res.status}`)
  return json
}

export const createTicket = (payload) => callApi('ticketing-create-ticket', { body: payload })
export const getTicket = ({ ticketId, token, requesterEmail }) =>
  callApi('ticketing-get-ticket', {
    method: 'GET',
    query: { ticketId, token, requesterEmail }
  })
export const sendMagicLink = ({ ticketId, requesterEmail }) =>
  callApi('ticketing-send-magic-link', {
    body: { ticketId, requesterEmail }
  })
export const addComment = (payload) => callApi('ticketing-add-comment', { body: payload })
