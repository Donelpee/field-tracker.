import { adminClient, createRequestClient } from './client.ts'

export const requireUser = async (authorization: string | null) => {
  if (!authorization) throw new Error('Missing authorization header.')
  const requestClient = createRequestClient(authorization)
  const { data, error } = await requestClient.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized.')
  return data.user
}

export const requireAdminRole = async (userId: string) => {
  const { data, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) throw error
  const role = String(data?.role || '').trim().toLowerCase()
  if (role !== 'admin' && role !== 'super admin') {
    throw new Error('Forbidden.')
  }
}

