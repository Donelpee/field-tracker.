import { adminClient } from '../_shared/client.ts'
import { requireAdminRole, requireUser } from '../_shared/auth.ts'
import { handleOptions, withCors } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions(req)
  if (req.method !== 'POST') return withCors({ error: 'Method not allowed' }, { status: 405 })

  try {
    const user = await requireUser(req.headers.get('Authorization'))
    await requireAdminRole(user.id)
    const body = await req.json().catch(() => ({}))

    const page = Math.max(1, Number(body.page || 1))
    const pageSize = Math.min(200, Math.max(1, Number(body.pageSize || 25)))
    const status = String(body.status || '').trim()
    const priority = String(body.priority || '').trim()
    const search = String(body.search || '').trim()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = adminClient
      .schema('ticketing')
      .from('tickets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (search) query = query.or(`ticket_number.ilike.%${search}%,subject.ilike.%${search}%,requester_email.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) throw error

    return withCors({
      tickets: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    })
  } catch (error) {
    return withCors({ error: String(error.message || error) }, { status: 500 })
  }
})
