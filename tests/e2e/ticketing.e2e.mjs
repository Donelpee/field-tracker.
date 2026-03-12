import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const TICKETING_API_BASE_URL = process.env.TICKETING_API_BASE_URL || `${SUPABASE_URL}/functions/v1`

const TEST_CLIENT_ID = process.env.TEST_CLIENT_ID || ''
const TEST_STAFF_USER_ID = process.env.TEST_STAFF_USER_ID || ''
const RUN_CONVERT = String(process.env.TEST_E2E_RUN_CONVERT || 'true').toLowerCase() === 'true'
const RUN_ASSIGN = String(process.env.TEST_E2E_RUN_ASSIGN || 'false').toLowerCase() === 'true'

const log = (msg) => console.log(`[ticketing-e2e] ${msg}`)

const functionCall = async (name, { method = 'POST', body, query, token } = {}) => {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  const res = await fetch(`${TICKETING_API_BASE_URL}/${name}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let json = {}
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { message: text }
    }
  }
  return { status: res.status, ok: res.ok, body: json }
}

const loginAdmin = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD
  })
  if (error || !data.session?.access_token) {
    throw new Error(`Admin login failed: ${error?.message || 'No token'}`)
  }
  return data.session.access_token
}

const run = async () => {
  log('Starting ticketing E2E checks...')

  log('Checking role protection for admin endpoint (anon should fail)')
  const unauthorized = await functionCall('ticketing-admin-list-tickets', {
    body: { page: 1, pageSize: 5 }
  })
  assert.equal(unauthorized.ok, false, 'Anon call to admin endpoint should be rejected')

  const unique = Date.now()
  const requesterEmail = `ticketing-e2e-${unique}@example.com`
  const createPayload = {
    requesterName: 'E2E Customer',
    requesterEmail,
    requesterPhone: '+2340000000000',
    subject: `E2E Ticket ${unique}`,
    description: 'E2E lifecycle validation',
    serviceAddress: 'Lagos, NG',
    priority: 'medium',
    source: 'guest'
  }

  log('Creating ticket as guest')
  const created = await functionCall('ticketing-create-ticket', { body: createPayload })
  assert.equal(created.ok, true, `Create ticket failed: ${JSON.stringify(created.body)}`)
  assert.ok(created.body.ticket?.id, 'Missing ticket id')
  assert.ok(created.body.tracking?.token, 'Missing tracking token')

  const ticketId = created.body.ticket.id
  const trackingToken = created.body.tracking.token

  log('Fetching ticket with magic-link token')
  const fetchedByToken = await functionCall('ticketing-get-ticket', {
    method: 'GET',
    query: { ticketId, token: trackingToken, requesterEmail }
  })
  assert.equal(fetchedByToken.ok, true, 'Ticket fetch by token failed')
  assert.equal(fetchedByToken.body.ticket?.id, ticketId, 'Fetched wrong ticket')
  assert.equal(fetchedByToken.body.ticket?.status, 'new', 'Initial status should be new')

  log('Posting customer comment with token')
  const commentRes = await functionCall('ticketing-add-comment', {
    body: { ticketId, token: trackingToken, requesterEmail, comment: 'Customer follow-up comment.' }
  })
  assert.equal(commentRes.ok, true, `Add customer comment failed: ${JSON.stringify(commentRes.body)}`)

  log('Sending replacement magic link')
  const magicLinkRes = await functionCall('ticketing-send-magic-link', {
    body: { ticketId, requesterEmail }
  })
  assert.equal(magicLinkRes.ok, true, `Send magic link failed: ${JSON.stringify(magicLinkRes.body)}`)

  log('Logging in as admin')
  const adminToken = await loginAdmin()

  log('Listing tickets as admin')
  const adminList = await functionCall('ticketing-admin-list-tickets', {
    token: adminToken,
    body: { page: 1, pageSize: 100, search: String(unique) }
  })
  assert.equal(adminList.ok, true, `Admin list tickets failed: ${JSON.stringify(adminList.body)}`)
  assert.ok(Array.isArray(adminList.body.tickets), 'tickets list missing')
  assert.ok(adminList.body.tickets.some((t) => t.id === ticketId), 'Created ticket not found in admin list')

  log('Updating status to triaged as admin')
  const updateStatus = await functionCall('ticketing-admin-update-status', {
    token: adminToken,
    body: { ticketId, status: 'triaged' }
  })
  assert.equal(updateStatus.ok, true, `Admin status update failed: ${JSON.stringify(updateStatus.body)}`)

  log('Verifying status update from admin fetch')
  const fetchedByAdmin = await functionCall('ticketing-get-ticket', {
    token: adminToken,
    method: 'GET',
    query: { ticketId }
  })
  assert.equal(fetchedByAdmin.ok, true, 'Admin fetch failed')
  assert.equal(fetchedByAdmin.body.ticket?.status, 'triaged', 'Status should be triaged')

  let jobId = ''
  if (RUN_CONVERT) {
    log('Converting ticket to job as admin')
    const convertRes = await functionCall('ticketing-admin-convert-to-job', {
      token: adminToken,
      body: {
        ticketId,
        title: `Converted E2E Job ${unique}`,
        description: 'Converted during E2E',
        clientId: TEST_CLIENT_ID || null
      }
    })
    assert.equal(convertRes.ok, true, `Convert to job failed: ${JSON.stringify(convertRes.body)}`)
    jobId = String(convertRes.body.jobId || '')
    assert.ok(jobId, 'Convert did not return jobId')
  } else {
    log('Skipping convert test (TEST_E2E_RUN_CONVERT=false)')
  }

  if (RUN_ASSIGN) {
    assert.ok(jobId, 'Assign test requires a converted job')
    assert.ok(TEST_STAFF_USER_ID, 'Assign test requires TEST_STAFF_USER_ID')
    log('Assigning converted job to staff')
    const assignRes = await functionCall('ticketing-admin-assign-job', {
      token: adminToken,
      body: { ticketId, jobId, assignedTo: TEST_STAFF_USER_ID }
    })
    assert.equal(assignRes.ok, true, `Assign job failed: ${JSON.stringify(assignRes.body)}`)
  } else {
    log('Skipping assign test (TEST_E2E_RUN_ASSIGN=false)')
  }

  log('All E2E checks passed')
}

run().catch((error) => {
  console.error(`[ticketing-e2e] FAILED: ${error.message}`)
  process.exit(1)
})

