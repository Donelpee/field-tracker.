import { useEffect, useMemo, useState } from 'react'
import { addComment, createTicket, getTicket, sendMagicLink } from './lib/api'

const initialTicketForm = {
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  subject: '',
  description: '',
  serviceAddress: '',
  preferredDatetime: '',
  priority: 'medium',
  source: 'guest'
}

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [tab, setTab] = useState(params.get('ticketId') ? 'track' : 'submit')
  const [submitting, setSubmitting] = useState(false)
  const [ticketForm, setTicketForm] = useState(initialTicketForm)
  const [submitResult, setSubmitResult] = useState(null)

  const [ticketId, setTicketId] = useState(params.get('ticketId') || '')
  const [token, setToken] = useState(params.get('token') || '')
  const [requesterEmail, setRequesterEmail] = useState(params.get('requesterEmail') || '')
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [ticketData, setTicketData] = useState(null)
  const [comment, setComment] = useState('')

  const onFormChange = (e) => {
    setTicketForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const res = await createTicket(ticketForm)
      setSubmitResult(res)
      setTicketForm(initialTicketForm)
    } catch (error) {
      setSubmitResult({ error: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const loadTicket = async () => {
    setTrackLoading(true)
    setTrackError('')
    try {
      const res = await getTicket({ ticketId, token, requesterEmail })
      setTicketData(res)
    } catch (error) {
      setTrackError(error.message)
      setTicketData(null)
    } finally {
      setTrackLoading(false)
    }
  }

  const requestMagicLink = async () => {
    setTrackError('')
    try {
      await sendMagicLink({ ticketId, requesterEmail })
      setTrackError('Magic link sent. Check your email inbox.')
    } catch (error) {
      setTrackError(error.message)
    }
  }

  const submitComment = async () => {
    if (!comment.trim()) return
    try {
      await addComment({ ticketId, token, requesterEmail, comment })
      setComment('')
      await loadTicket()
    } catch (error) {
      setTrackError(error.message)
    }
  }

  useEffect(() => {
    if (ticketId && token) {
      void loadTicket()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <header className="hero">
        <h1>Trackby Customer Portal</h1>
        <p>Submit service requests and track your ticket progress in real time.</p>
      </header>

      <div className="tabs">
        <button className={tab === 'submit' ? 'active' : ''} onClick={() => setTab('submit')}>Submit Ticket</button>
        <button className={tab === 'track' ? 'active' : ''} onClick={() => setTab('track')}>Track Ticket</button>
      </div>

      {tab === 'submit' && (
        <section className="panel">
          <h2>New Ticket</h2>
          <form className="grid" onSubmit={submitTicket}>
            <input name="requesterName" value={ticketForm.requesterName} onChange={onFormChange} placeholder="Full name" required />
            <input name="requesterEmail" value={ticketForm.requesterEmail} onChange={onFormChange} placeholder="Email" type="email" required />
            <input name="requesterPhone" value={ticketForm.requesterPhone} onChange={onFormChange} placeholder="Phone" />
            <input name="subject" value={ticketForm.subject} onChange={onFormChange} placeholder="Subject" required />
            <textarea name="description" value={ticketForm.description} onChange={onFormChange} placeholder="Describe your request" required />
            <input name="serviceAddress" value={ticketForm.serviceAddress} onChange={onFormChange} placeholder="Service address" required />
            <input name="preferredDatetime" value={ticketForm.preferredDatetime} onChange={onFormChange} type="datetime-local" />
            <select name="priority" value={ticketForm.priority} onChange={onFormChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button disabled={submitting} type="submit">{submitting ? 'Submitting...' : 'Submit Ticket'}</button>
          </form>

          {submitResult?.ticket && (
            <div className="notice success">
              Ticket created: <strong>{submitResult.ticket.ticketNumber}</strong>. Save this ticket ID: <strong>{submitResult.ticket.id}</strong>.
            </div>
          )}
          {submitResult?.error && <div className="notice error">{submitResult.error}</div>}
        </section>
      )}

      {tab === 'track' && (
        <section className="panel">
          <h2>Track Ticket</h2>
          <div className="grid">
            <input value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="Ticket ID" />
            <input value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} placeholder="Requester email" />
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Magic link token" />
            <div className="row">
              <button onClick={() => void loadTicket()} disabled={trackLoading}>{trackLoading ? 'Loading...' : 'Load Ticket'}</button>
              <button type="button" className="secondary" onClick={() => void requestMagicLink()}>Send Magic Link</button>
            </div>
          </div>

          {trackError && <div className="notice error">{trackError}</div>}

          {ticketData?.ticket && (
            <div className="ticket-view">
              <h3>{ticketData.ticket.ticket_number} - {ticketData.ticket.subject}</h3>
              <p>Status: <strong>{ticketData.ticket.status}</strong></p>
              <p>{ticketData.ticket.description}</p>

              <h4>Timeline</h4>
              <ul>
                {(ticketData.events || []).map((e) => (
                  <li key={e.id}>{new Date(e.created_at).toLocaleString()} - {e.event_type}</li>
                ))}
              </ul>

              <h4>Comments</h4>
              <ul>
                {(ticketData.comments || []).map((c) => (
                  <li key={c.id}>{c.comment}</li>
                ))}
              </ul>
              <div className="row">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment" />
                <button onClick={() => void submitComment()}>Post</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

