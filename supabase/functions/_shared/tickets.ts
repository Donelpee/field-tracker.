import { adminClient } from './client.ts'

const encoder = new TextEncoder()

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return toHex(digest)
}

export const createTicketNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `TKT-${date}-${random}`
}

export const createMagicLink = async (ticketId: string, requesterEmail: string) => {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const tokenHash = await hashToken(token)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString()

  const { error } = await adminClient.schema('ticketing').from('ticket_magic_links').insert({
    ticket_id: ticketId,
    requester_email: requesterEmail,
    token_hash: tokenHash,
    expires_at: expiresAt
  })
  if (error) throw error

  return { token, expiresAt }
}

export const validateMagicLink = async (ticketId: string, token: string, requesterEmail?: string) => {
  const tokenHash = await hashToken(token)
  const { data, error } = await adminClient
    .schema('ticketing')
    .from('ticket_magic_links')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .single()

  if (error || !data) throw new Error('Invalid tracking token.')
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('Tracking token expired.')
  if (requesterEmail && String(data.requester_email).toLowerCase() !== String(requesterEmail).toLowerCase()) {
    throw new Error('Tracking token does not match requester email.')
  }
}

export const queueEmail = async (toEmail: string, subject: string, templateKey: string, payload: unknown) => {
  const { error } = await adminClient.schema('ticketing').from('email_outbox').insert({
    to_email: toEmail,
    subject,
    template_key: templateKey,
    payload
  })
  if (error) throw error
}
