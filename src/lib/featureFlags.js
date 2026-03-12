const asBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const featureFlags = {
  ticketingApiEnabled: asBool(import.meta.env.VITE_FEATURE_TICKETING_API_ENABLED, false),
  opsTicketModuleEnabled: asBool(import.meta.env.VITE_FEATURE_OPS_TICKET_MODULE_ENABLED, false),
}

