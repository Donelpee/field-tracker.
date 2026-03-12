import { adminClient } from '../_shared/client.ts'
import { corsHeaders, handleOptions, withCors } from '../_shared/cors.ts'
import { createMagicLink, createTicketNumber, queueEmail } from '../_shared/tickets.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const body = await req.json()
    const requesterName = String(body.requesterName || '').trim()
    const requesterEmail = String(body.requesterEmail || '').trim().toLowerCase()
    const requesterPhone = String(body.requesterPhone || '').trim() || null
    const subject = String(body.subject || '').trim()
    const description = String(body.description || '').trim()
    const serviceAddress = String(body.serviceAddress || '').trim()
    const preferredDatetime = body.preferredDatetime || null
    const priority = body.priority || 'medium'
    const source = body.source || 'guest'
    const customerId = body.customerId || null

    if (!requesterName || !requesterEmail || !subject || !description || !serviceAddress) {
      return withCors({ error: 'Missing required fields.' }, { status: 400 })
    }

    const ticketNumber = createTicketNumber()

    const { data: ticket, error } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        customer_id: customerId,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone: requesterPhone,
        subject,
        description,
        service_address: serviceAddress,
        preferred_datetime: preferredDatetime,
        priority,
        status: 'new',
        source
      })
      .select('*')
      .single()

    if (error) throw error

    await adminClient.schema('ticketing').from('ticket_events').insert({
      ticket_id: ticket.id,
      event_type: 'ticket_created',
      actor_type: source === 'account' ? 'customer' : 'system',
      actor_ref: requesterEmail,
      payload: { source }
    })

    const { token, expiresAt } = await createMagicLink(ticket.id, requesterEmail)

    const portalBaseUrl = Deno.env.get('CUSTOMER_PORTAL_BASE_URL') || 'http://localhost:5174'
    const trackUrl = `${portalBaseUrl}/track?ticketId=${ticket.id}&token=${token}`
    await queueEmail(
      requesterEmail,
      `Ticket received: ${ticket.ticket_number}`,
      'ticket_created',
      {
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        trackUrl,
        expiresAt
      }
    )

    return withCors({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status
      },
      tracking: {
        token,
        expiresAt
      }
    })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
