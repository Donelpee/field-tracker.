const baseAllowHeaders = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-supabase-client-platform',
  'x-supabase-api-version'
].join(', ')

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': baseAllowHeaders,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

const buildCorsHeaders = (req?: Request) => {
  const requested = req?.headers.get('Access-Control-Request-Headers')
  return {
    ...corsHeaders,
    // Echo requested headers so browser preflight succeeds for SDK-added headers.
    'Access-Control-Allow-Headers': requested || baseAllowHeaders
  }
}

export const withCors = (payload: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  })

export const handleOptions = (req: Request) => new Response('ok', { headers: buildCorsHeaders(req) })
