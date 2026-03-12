import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'
import { validateMagicLink } from '../_shared/tickets.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const body = await req.json()
    const ticketId = String(body.ticketId || '').trim()
    const comment = String(body.comment || '').trim()
    const token = String(body.token || '').trim()
    const requesterEmail = String(body.requesterEmail || '').trim().toLowerCase()
    const isInternal = Boolean(body.isInternal)

    if (!ticketId || !comment) return withCors({ error: 'ticketId and comment are required.' }, { status: 400 })

    let actorType: 'customer' | 'admin' = 'customer'
    let actorRef = requesterEmail || 'guest'

    if (token) {
      await validateMagicLink(ticketId, token, requesterEmail || undefined)
    } else {
      const user = await requireUser(req.headers.get('Authorization'))
      await requireAdminRole(user.id)
      actorType = 'admin'
      actorRef = user.id
    }

    if (actorType !== 'admin' && isInternal) {
      return withCors({ error: 'Customers cannot post internal comments.' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .schema('ticketing')
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_type: actorType,
        author_ref: actorRef,
        comment,
        is_internal: actorType === 'admin' ? isInternal : false
      })
      .select('*')
      .single()

    if (error) throw error

    await adminClient.schema('ticketing').from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'ticket_comment_added',
      actor_type: actorType,
      actor_ref: actorRef,
      payload: { is_internal: actorType === 'admin' ? isInternal : false }
    })

    return withCors({ comment: data })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
