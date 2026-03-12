import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'
import { validateMagicLink } from '../_shared/tickets.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'GET') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const url = new URL(req.url)
    const ticketId = String(url.searchParams.get('ticketId') || '').trim()
    const token = String(url.searchParams.get('token') || '').trim()
    const requesterEmail = String(url.searchParams.get('requesterEmail') || '').trim().toLowerCase()
    if (!ticketId) return withCors({ error: 'ticketId is required.' }, { status: 400 })

    if (token) {
      await validateMagicLink(ticketId, token, requesterEmail || undefined)
    } else {
      const user = await requireUser(req.headers.get('Authorization'))
      await requireAdminRole(user.id)
    }

    const { data: ticket, error: ticketError } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()
    if (ticketError || !ticket) return withCors({ error: 'Ticket not found.' }, { status: 404 })

    const [{ data: comments, error: commentsError }, { data: events, error: eventsError }] = await Promise.all([
      adminClient
        .schema('ticketing')
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true }),
      adminClient
        .schema('ticketing')
        .from('ticket_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
    ])

    if (commentsError) throw commentsError
    if (eventsError) throw eventsError

    return withCors({ ticket, comments: comments || [], events: events || [] })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
