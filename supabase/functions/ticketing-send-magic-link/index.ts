import { adminClient } from '../_shared/client.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'
import { createMagicLink, queueEmail } from '../_shared/tickets.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const body = await req.json()
    const ticketId = String(body.ticketId || '').trim()
    const requesterEmail = String(body.requesterEmail || '').trim().toLowerCase()
    if (!ticketId || !requesterEmail) {
      return withCors({ error: 'ticketId and requesterEmail are required.' }, { status: 400 })
    }

    const { data: ticket, error: ticketError } = await adminClient
      .schema('ticketing')
      .from('tickets')
      .select('id, ticket_number, subject, requester_email')
      .eq('id', ticketId)
      .single()
    if (ticketError || !ticket) return withCors({ error: 'Ticket not found.' }, { status: 404 })
    if (String(ticket.requester_email).toLowerCase() !== requesterEmail) {
      return withCors({ error: 'Requester email does not match ticket.' }, { status: 403 })
    }

    const { token, expiresAt } = await createMagicLink(ticketId, requesterEmail)
    const portalBaseUrl = Deno.env.get('CUSTOMER_PORTAL_BASE_URL') || 'http://localhost:5174'
    const trackUrl = `${portalBaseUrl}/track?ticketId=${ticket.id}&token=${token}`

    await queueEmail(
      requesterEmail,
      `Track your ticket: ${ticket.ticket_number}`,
      'ticket_magic_link',
      {
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        trackUrl,
        expiresAt
      }
    )

    return withCors({ ok: true, expiresAt })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
