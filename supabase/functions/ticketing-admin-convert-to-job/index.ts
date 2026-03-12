import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'
import { queueEmail } from '../_shared/tickets.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const user = await requireUser(req.headers.get('Authorization'))
    await requireAdminRole(user.id)
    const body = await req.json()
    const ticketId = String(body.ticketId || '').trim()
    if (!ticketId) return withCors({ error: 'ticketId is required.' }, { status: 400 })

    const { data: ticket, error: ticketError } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .select('id, ticket_number, requester_email, subject, description')
      .eq('id', ticketId)
      .single()
    if (ticketError || !ticket) return withCors({ error: 'Ticket not found.' }, { status: 404 })

    const { data: jobId, error: convertError } = await adminClient.rpc('convert_ticket_to_job', {
      target_ticket_id: ticketId,
      new_title: body.title || ticket.subject,
      new_description: body.description || ticket.description,
      new_client_id: body.clientId || null,
      new_assigned_to: body.assignedTo || null,
      new_scheduled_time: body.scheduledTime || null
    })
    if (convertError) throw convertError

    await queueEmail(
      ticket.requester_email,
      `Ticket ${ticket.ticket_number} converted to job`,
      'ticket_converted',
      { ticketNumber: ticket.ticket_number, jobId }
    )

    return withCors({ ticketId, jobId })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
