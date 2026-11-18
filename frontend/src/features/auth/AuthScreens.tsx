import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, BadgeCheck, LocateFixed, MapPin, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { LocationResult, University } from '../../types'
import { EmptyState, ErrorState, FormError, LoadingState } from '../shared/Feedback'
import { Brand } from '../shared/SiteChrome'
import { UniversityPicker } from './UniversityPicker'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate(user.university ? '/school' : '/onboarding', { replace: true })
  }, [user, navigate])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'register') await register(name, email, password)
      else await login(email, password)
      navigate(mode === 'register' ? '/onboarding' : (user?.university ? '/school' : '/onboarding'))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'We could not sign you in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <Brand />
        <div className="auth-side-copy"><span className="eyebrow">A better campus hand-me-down</span><h1>Good things find their next person.</h1><p>Buy, sell, and show up for what is happening around campus.</p></div>
        <div className="auth-side-foot"><ShieldCheck size={17} /> Your campus community, in one place</div>
      </div>
      <main className="auth-main">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Back to browsing</Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{mode === 'register' ? 'GET STARTED' : 'WELCOME BACK'}</span>
          <h2>{mode === 'register' ? 'Join your campus' : 'Log in to UniLink'}</h2>
          <p className="muted">{mode === 'register' ? 'Use your university email to get a student-verified badge.' : 'Pick up where your campus left off.'}</p>
          <form onSubmit={submit} className="form-stack">
            {mode === 'register' && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'register' ? 8 : undefined} /></label>
            {mode === 'register' && <p className="field-note"><BadgeCheck size={15} /> A matching .edu domain is recognized after you choose your university.</p>}
            <FormError message={error} />
            <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</button>
          </form>
          <p className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New to your campus?'} <Link to={mode === 'register' ? '/auth/login' : '/auth/register'}>{mode === 'register' ? 'Log in' : 'Create an account'}</Link></p>
        </div>
      </main>
    </div>
  )
}

export function Onboarding() {
  const { user, selectUniversity } = useAuth()
  const navigate = useNavigate()
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>(user?.university?.id ?? '')
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<University[]>('/universities').then(setUniversities).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load universities.')).finally(() => setLoading(false))
  }, [])

  async function chooseSchool() {
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      await selectUniversity(selectedId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your university.')
    } finally {
      setBusy(false)
    }
  }

  async function submitLocation(coords?: GeolocationPosition) {
    setBusy(true)
    setError('')
    const body = demo
      ? { demo_on_campus: true }
      : coords
        ? { latitude: coords.coords.latitude, longitude: coords.coords.longitude }
        : { unavailable: true }
    try {
      setLocation(await api<LocationResult>('/me/location-check', { method: 'POST', body: JSON.stringify(body) }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Location check is unavailable. You can continue.')
      setLocation({ available: false, distance_miles: null, near_campus: false, simulated: false, message: 'Location is unavailable. You can continue without it.' })
    } finally {
      setBusy(false)
    }
  }

  function checkLocation() {
    if (demo) {
      void submitLocation()
      return
    }
    if (!navigator.geolocation) {
      void submitLocation()
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (position) => { void submitLocation(position) },
      () => { void submitLocation() },
      { timeout: 8000, maximumAge: 60_000 },
    )
  }

  if (loading) return <div className="standalone-state"><LoadingState label="Loading universities" /></div>
  if (error && !universities.length) return <div className="standalone-state"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>

  const hasSchool = Boolean(user?.university)
  return (
    <div className="onboarding-page">
      <div className="onboarding-top"><Brand /><Link to="/" className="quiet-link">Browse first</Link></div>
      <main className="onboarding-content">
        <div className="step-mark">{hasSchool ? 'YOUR CAMPUS' : 'STEP 1 OF 2'}</div>
        <h1>{hasSchool ? 'A quick campus check' : 'Where do you study?'}</h1>
        <p className="muted">{hasSchool ? 'This optional signal helps campus members feel at home. It never limits access.' : 'Your university keeps your marketplace and events close to home.'}</p>
        {!hasSchool && <section className="onboarding-step">
          <UniversityPicker universities={universities} value={selectedId} onChange={setSelectedId} />
          <button className="button button-primary button-wide" onClick={() => void chooseSchool()} disabled={!selectedId || busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </section>}
        {(hasSchool || user?.university) && <section className="location-panel">
          <div className="location-icon"><MapPin size={21} /></div>
          <div className="location-copy"><strong>{user?.university?.name}</strong><span>Campus proximity is a soft trust signal.</span></div>
          <div className="location-control">
            <label className="toggle-row"><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} /><span>Demo: on campus</span></label>
            <button className="button button-outline" onClick={checkLocation} disabled={busy}><LocateFixed size={16} />{busy ? 'Checking…' : 'Check location'}</button>
          </div>
          {location && <div className={`location-result${location.near_campus ? ' is-near' : ''}`} role="status">
            {location.near_campus && <BadgeCheck size={17} />}
            <span>{location.message}{location.distance_miles !== null && !location.simulated ? ` · ${location.distance_miles} miles away` : ''}</span>
          </div>}
        </section>}
        <FormError message={error} />
        {hasSchool && <button className="button button-primary button-wide" onClick={() => navigate('/school')}>Continue to campus</button>}
        <p className="soft-note"><ShieldCheck size={15} /> Your location is checked once and is not stored.</p>
      </main>
    </div>
  )
}

export function UniversitySettings() {
  const { user, selectUniversity } = useAuth()
  const navigate = useNavigate()
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>(user?.university?.id ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api<University[]>('/universities').then(setUniversities).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load universities.')).finally(() => setLoading(false)) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await selectUniversity(Number(selectedId), password)
      navigate('/school')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not change university.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading universities" />
  if (error && !universities.length) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!universities.length) return <EmptyState title="No universities are available" detail="Check back when campus access is restored." />
  return <section className="form-page"><Link className="back-link" to="/school"><ArrowLeft size={16} /> Back to campus</Link><div className="form-page-heading"><span className="eyebrow">ACCOUNT SETTINGS</span><h1>Change university</h1><p className="muted">Your campus change takes effect immediately. Re-enter your password to confirm.</p></div>
    <form className="form-stack form-surface" onSubmit={submit}>
      <UniversityPicker universities={universities} value={selectedId} onChange={setSelectedId} />
      <label>Current password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
      <p className="field-note"><BadgeCheck size={15} /> Student verification updates to match your email domain.</p>
      <FormError message={error} />
      <button className="button button-primary" disabled={busy || selectedId === user?.university?.id}>{busy ? 'Updating…' : 'Confirm university'}</button>
    </form>
  </section>
}