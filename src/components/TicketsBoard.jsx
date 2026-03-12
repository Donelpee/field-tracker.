import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowRightLeft, CheckCircle2, Loader2, MessageSquare, RefreshCw, Ticket } from 'lucide-react'
import { useToast } from '../lib/ToastContext'
import { callTicketingFunction } from '../lib/ticketingApi'

const STATUS_OPTIONS = ['new', 'triaged', 'converted', 'in_progress', 'resolved', 'closed']

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
}

export default function TicketsBoard() {
  const { showToast } = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [converting, setConverting] = useState(false)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await callTicketingFunction('ticketing-admin-list-tickets', {
        body: { page: 1, pageSize: 100 }
      })
      setTickets(res?.tickets || [])
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadTicketDetails = useCallback(async (ticketId) => {
    setDetailsLoading(true)
    try {
      const res = await callTicketingFunction('ticketing-get-ticket', {
        method: 'GET',
        query: { ticketId }
      })
      setDetails(res)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setDetailsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (selected?.id) {
      void loadTicketDetails(selected.id)
    } else {
      setDetails(null)
    }
  }, [selected, loadTicketDetails])

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status !== 'all' && t.status !== status) return false
      if (!query) return true
      const needle = query.toLowerCase()
      return (
        String(t.ticket_number || '').toLowerCase().includes(needle) ||
        String(t.subject || '').toLowerCase().includes(needle) ||
        String(t.requester_email || '').toLowerCase().includes(needle)
      )
    })
  }, [tickets, query, status])

  const updateStatus = async (nextStatus) => {
    if (!selected?.id) return
    setStatusUpdating(true)
    try {
      await callTicketingFunction('ticketing-admin-update-status', {
        body: { ticketId: selected.id, status: nextStatus }
      })
      showToast('Ticket status updated', 'success')
      await loadTickets()
      await loadTicketDetails(selected.id)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setStatusUpdating(false)
    }
  }

  const addComment = async () => {
    if (!selected?.id || !comment.trim()) return
    try {
      await callTicketingFunction('ticketing-add-comment', {
        body: { ticketId: selected.id, comment: comment.trim(), isInternal: false }
      })
      setComment('')
      showToast('Comment added', 'success')
      await loadTicketDetails(selected.id)
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const convertToJob = async () => {
    if (!selected?.id) return
    setConverting(true)
    try {
      await callTicketingFunction('ticketing-admin-convert-to-job', {
        body: {
          ticketId: selected.id,
          title: selected.subject,
          description: selected.description
        }
      })
      showToast('Ticket converted to job', 'success')
      await loadTickets()
      await loadTicketDetails(selected.id)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-blue-600" />
              Ticket Operations
            </h2>
            <p className="text-sm text-gray-500 mt-1">Triage customer requests and convert them into jobs.</p>
          </div>
          <button onClick={() => void loadTickets()} className="btn-secondary flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <input
            className="input-premium"
            placeholder="Search by ticket number, subject, email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="input-premium" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,1.2fr] gap-4">
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading tickets...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No tickets found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${selected?.id === t.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800 truncate">{t.ticket_number} - {t.subject}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium}`}>
                      {t.priority || 'medium'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">{t.requester_name} ({t.requester_email})</p>
                  <p className="text-xs text-gray-500 mt-1">Status: {t.status}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-premium p-5 min-h-[440px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a ticket to view details.
            </div>
          ) : detailsLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading details...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{details?.ticket?.subject || selected.subject}</h3>
                  <p className="text-sm text-gray-500">{details?.ticket?.ticket_number || selected.ticket_number}</p>
                </div>
                <span className="badge badge-info">{details?.ticket?.status || selected.status}</span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">{details?.ticket?.description || selected.description}</p>
              <p className="text-sm text-gray-600">Address: {details?.ticket?.service_address || 'n/a'}</p>

              <div className="grid md:grid-cols-2 gap-3">
                <select
                  className="input-premium"
                  value={details?.ticket?.status || selected.status}
                  onChange={(e) => void updateStatus(e.target.value)}
                  disabled={statusUpdating}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => void convertToJob()}
                  disabled={converting || (details?.ticket?.status || selected.status) === 'converted'}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Convert to Job
                </button>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {(details?.comments || []).length === 0 && (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  )}
                  {(details?.comments || []).map((c) => (
                    <div key={c.id} className="p-2 rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-700">{c.comment}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="input-premium"
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button onClick={() => void addComment()} className="btn-secondary">Add</button>
                </div>
              </div>

              <div className="pt-2 border-t">
                <h4 className="font-semibold text-gray-800 mb-2">Timeline</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {(details?.events || []).length === 0 && <p className="text-sm text-gray-500">No events yet.</p>}
                  {(details?.events || []).map((e) => (
                    <div key={e.id} className="text-sm flex items-start gap-2">
                      {e.event_type === 'ticket_status_changed' ? <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5" /> :
                        e.event_type === 'ticket_converted' ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> :
                          <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />}
                      <div>
                        <p className="text-gray-700">{e.event_type}</p>
                        <p className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

