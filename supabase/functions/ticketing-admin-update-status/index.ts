import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'
import { queueEmail } from '../_shared/tickets.ts'

const transitions: Record<string, string[]> = {
  new: ['triaged', 'closed'],
  triaged: ['converted', 'closed', 'resolved'],
  converted: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const user = await requireUser(req.headers.get('Authorization'))
    await requireAdminRole(user.id)
    const body = await req.json()
    const ticketId = String(body.ticketId || '').trim()
    const status = String(body.status || '').trim()
    if (!ticketId || !status) return withCors({ error: 'ticketId and status are required.' }, { status: 400 })

    const { data: existing, error: fetchError } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .select('id, status, requester_email, ticket_number')
      .eq('id', ticketId)
      .single()
    if (fetchError || !existing) return withCors({ error: 'Ticket not found.' }, { status: 404 })

    const allowed = transitions[existing.status] || []
    if (!allowed.includes(status) && existing.status !== status) {
      return withCors({ error: `Invalid status transition from ${existing.status} to ${status}.` }, { status: 400 })
    }

    const { data, error } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)
      .select('*')
      .single()
    if (error) throw error

    await adminClient.schema('ticketing').from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'ticket_status_changed',
      actor_type: 'admin',
      actor_ref: user.id,
      payload: {
        from: existing.status,
        to: status
      }
    })

    await queueEmail(
      existing.requester_email,
      `Ticket ${existing.ticket_number} status updated`,
      'ticket_status_changed',
      { ticketNumber: existing.ticket_number, status }
    )

    return withCors({ ticket: data })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
