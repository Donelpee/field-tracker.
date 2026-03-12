import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const user = await requireUser(req.headers.get('Authorization'))
    await requireAdminRole(user.id)
    const body = await req.json()
    const ticketId = String(body.ticketId || '').trim()
    const jobId = String(body.jobId || '').trim()
    const assignedTo = String(body.assignedTo || '').trim()
    if (!ticketId || !jobId || !assignedTo) {
      return withCors({ error: 'ticketId, jobId, and assignedTo are required.' }, { status: 400 })
    }

    const { data: job, error: jobFetchError } = await adminClient
      .from('jobs')
      .select('id, title, client_id')
      .eq('id', jobId)
      .single()
    if (jobFetchError || !job) return withCors({ error: 'Job not found.' }, { status: 404 })

    const { error: updateError } = await adminClient
      .from('jobs')
      .update({ assigned_to: assignedTo, status: 'pending' })
      .eq('id', jobId)
    if (updateError) throw updateError

    const { data: client } = await adminClient
      .from('clients')
      .select('name')
      .eq('id', job.client_id)
      .single()

    await adminClient.from('notifications').insert({
      user_id: assignedTo,
      title: 'New Job Assigned',
      message: `You have been assigned to "${job.title}" at ${client?.name || 'a client location'}`,
      type: 'job_assigned',
      related_job_id: job.id,
      is_read: false
    })

    await adminClient.schema('ticketing').from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'ticket_status_changed',
      actor_type: 'admin',
      actor_ref: user.id,
      payload: { from: 'converted', to: 'in_progress', job_id: job.id, assigned_to: assignedTo }
    })

    await adminClient
      .schema('ticketing')
      .from('tickets')
      .update({ status: 'in_progress' })
      .eq('id', ticketId)

    return withCors({ ok: true })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
