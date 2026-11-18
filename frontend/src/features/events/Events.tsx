import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { CampusEvent } from '../../types'
import { formatEventDate, formatEventDay, formatEventMonth } from '../../utils/format'
import { EmptyState, ErrorState, FormError, LoadingState } from '../shared/Feedback'

export function EventsFeed({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyEvent, setBusyEvent] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try { setEvents(await api<CampusEvent[]>(mine ? '/events/mine' : '/events')) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Campus events could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [mine])

  async function toggleRsvp(event: CampusEvent) {
    setBusyEvent(event.id)
    setActionError('')
    try {
      await api(`/events/${event.id}/rsvp`, { method: event.attending ? 'DELETE' : 'PUT' })
      setEvents((current) => current.map((item) => item.id === event.id ? {
        ...item,
        attending: !item.attending,
        attendee_count: item.attendee_count + (item.attending ? -1 : 1),
      } : item))
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Your RSVP could not be saved.') }
    finally { setBusyEvent(null) }
  }

  return <section className="events-view"><div className="view-title-row"><div><span className="eyebrow">CAMPUS LIFE</span><h1>{mine ? 'My events' : 'Happening on campus'}</h1><p className="muted">{mine ? 'Events you have brought to your campus.' : 'Good reasons to step away from your desk.'}</p></div><Link className="button button-primary" to="/school/events/new"><CalendarDays size={17} /> Create an event</Link></div>
    {actionError && <FormError message={actionError} />}
    {loading ? <LoadingState label="Loading campus events" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : events.length ? <div className="event-list">{events.map((event) => <article className="event-row" key={event.id}>
      <div className="event-date"><span>{formatEventMonth(event.starts_at)}</span><strong>{formatEventDay(event.starts_at)}</strong></div>
      <div className="event-main"><span className="event-org">{event.organization_name}</span><h2>{event.title}</h2><p>{event.description}</p><div className="event-meta"><span><CalendarDays size={15} />{formatEventDate(event.starts_at)}</span><span><MapPin size={15} />{event.campus_location}</span><span><Users size={15} />{event.attendee_count} attending</span></div></div>
      <div className="event-actions">{event.creator_id === user?.id && <Link className="text-button" to={`/school/events/${event.id}/edit`}>Edit event</Link>}<button className={`button ${event.attending ? 'button-outline' : 'button-primary'}`} disabled={busyEvent === event.id} onClick={() => void toggleRsvp(event)}>{busyEvent === event.id ? 'Saving…' : event.attending ? 'Cancel RSVP' : 'RSVP'}</button></div>
    </article>)}</div> : <EmptyState title={mine ? 'You have not created an event' : 'No upcoming events yet'} detail={mine ? 'Bring your organization together and invite your campus.' : 'Check back soon for gatherings from student organizations.'} />}
  </section>
}

const blankEvent = { organization_name: '', title: '', starts_at: '', campus_location: '', description: '' }
type EventDraft = typeof blankEvent

export function EventForm() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<EventDraft>(blankEvent)
  const [loading, setLoading] = useState(Boolean(eventId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) return
    api<CampusEvent>(`/events/${eventId}`).then((event) => setDraft({
      organization_name: event.organization_name,
      title: event.title,
      starts_at: event.starts_at.slice(0, 16),
      campus_location: event.campus_location,
      description: event.description,
    })).catch((reason) => setError(reason instanceof Error ? reason.message : 'This event could not be loaded.')).finally(() => setLoading(false))
  }, [eventId])

  function change(key: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved = await api<CampusEvent>(eventId ? `/events/${eventId}` : '/events', {
        method: eventId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...draft, starts_at: new Date(draft.starts_at).toISOString() }),
      })
      navigate('/school/my-events')
      void saved
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The event could not be saved.') }
    finally { setBusy(false) }
  }

  if (loading) return <LoadingState label="Loading event" />
  if (error && eventId && !draft.title) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  return <section className="form-page"><Link className="back-link" to="/school/events"><ArrowLeft size={16} /> Back to events</Link><div className="form-page-heading"><span className="eyebrow">CAMPUS LIFE</span><h1>{eventId ? 'Edit event' : 'Create an event'}</h1><p className="muted">Give students the details they need to show up.</p></div>
    <form className="form-stack listing-form" onSubmit={submit}>
      <label>Organization name<input value={draft.organization_name} onChange={(event) => change('organization_name', event.target.value)} minLength={2} maxLength={160} required /></label>
      <label>Event name<input value={draft.title} onChange={(event) => change('title', event.target.value)} minLength={4} maxLength={180} required /></label>
      <div className="form-grid-two"><label>Date and time<input type="datetime-local" value={draft.starts_at} onChange={(event) => change('starts_at', event.target.value)} required /></label><label>Campus location<input value={draft.campus_location} onChange={(event) => change('campus_location', event.target.value)} maxLength={180} required /></label></div>
      <label>Description<textarea rows={5} value={draft.description} onChange={(event) => change('description', event.target.value)} minLength={10} maxLength={5000} required /></label>
      <FormError message={error} />
      <div className="form-actions"><button className="button button-outline" type="button" onClick={() => navigate('/school/events')}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : eventId ? 'Save changes' : 'Publish event'}</button></div>
    </form>
  </section>
}