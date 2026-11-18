import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, BadgeCheck, Flag, MapPin, Search, SlidersHorizontal, Tag } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { Listing, ListingPage, University } from '../../types'
import { formatJoinDate, formatPrice, formatRelativeTime } from '../../utils/format'
import { EmptyState, ErrorState, FormError, LoadingState } from '../shared/Feedback'
import { PublicHeader } from '../shared/SiteChrome'

const categories = ['All categories', 'Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Home', 'Biology']

export function Landing() {
  return <><PublicHeader /><main className="landing-page">
    <section className="landing-hero"><div className="landing-copy"><span className="eyebrow">YOUR CAMPUS, IN GOOD HANDS</span><h1>Good finds. Right on campus.</h1><p>Secondhand essentials and student events, all in one place.</p><div className="hero-actions"><Link className="button button-primary" to="/auth/register">Join your campus</Link><Link className="button button-outline" to="#browse">Browse listings</Link></div><div className="hero-proof"><span>12 campus listings seeded</span><span>·</span><span>2 student communities</span></div></div><div className="landing-photo"><img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1400&q=88" alt="A stack of used books ready for a new student" /><div className="photo-caption"><span>Pass it on</span><strong>Good things stay in circulation.</strong></div></div></section>
    <PublicPreview />
  </main><footer className="site-footer"><BrandFooter /><span>Made for campus life</span><Link to="/auth/register">Get started <span aria-hidden="true">→</span></Link></footer></>
}

function BrandFooter() {
  return <span className="footer-brand">unilink <span>© 2026</span></span>
}

function ListingCard({ listing, publicSchoolId }: { listing: Listing; publicSchoolId?: number }) {
  const query = publicSchoolId ? `?university_id=${publicSchoolId}` : ''
  return <Link to={`/listings/${listing.id}${query}`} className="listing-card">
    <div className="listing-photo-wrap"><img src={listing.image_url} alt={listing.title} className="listing-photo" loading="lazy" /><span className={`status-pill${listing.status === 'sold' ? ' status-sold' : ''}`}>{listing.status}</span></div>
    <div className="listing-card-body"><div className="listing-price">{formatPrice(listing.price)}</div><h3>{listing.title}</h3><div className="listing-card-meta"><span>{listing.location}</span><span>{formatRelativeTime(listing.created_at)}</span></div></div>
  </Link>
}

export function PublicPreview() {
  const [universities, setUniversities] = useState<University[]>([])
  const [schoolId, setSchoolId] = useState<number | ''>('')
  const [page, setPage] = useState<ListingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError('')
    api<University[]>('/universities').then((rows) => {
      setUniversities(rows)
      if (rows.length) setSchoolId(rows[0].id)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Universities could not be loaded.')).finally(() => setLoading(false))
  }, [retryKey])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    api<ListingPage>(`/public/listings?university_id=${schoolId}&page_size=6`)
      .then(setPage)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Listings could not be loaded.'))
      .finally(() => setLoading(false))
  }, [schoolId, retryKey])

  return <section className="preview-section" id="browse">
    <div className="section-heading"><div><span className="eyebrow">A LOOK AROUND CAMPUS</span><h2>Find something good.</h2></div>
      <label className="school-select"><span>Browse</span><select value={schoolId} onChange={(event) => setSchoolId(Number(event.target.value))} aria-label="Choose a university to preview">{universities.map((school) => <option value={school.id} key={school.id}>{school.name}</option>)}</select></label>
    </div>
    {loading && !page ? <LoadingState label="Loading campus listings" /> : error ? <ErrorState message={error} onRetry={() => setRetryKey((current) => current + 1)} /> : page?.items.length ? <div className="listing-grid">{page.items.map((listing) => <ListingCard key={listing.id} listing={listing} publicSchoolId={Number(schoolId)} />)}</div> : <EmptyState title="No listings here yet" detail="Try another campus or check back soon." />}
    <div className="preview-bottom"><span>Browsing stays open. School feeds are private to each campus.</span><Link className="inline-link" to="/auth/register">Join your campus <span aria-hidden="true">→</span></Link></div>
  </section>
}

export function MarketplaceFeed() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState<ListingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadListings() {
    if (!user?.university) return
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ sort, page_size: '24' })
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    try {
      setPage(await api<ListingPage>(`/listings?${params}`))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Listings could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadListings() }, [user?.university?.id, query, category, minPrice, maxPrice, sort])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setQuery(search.trim())
  }

  return <div className="marketplace-view">
    <div className="view-title-row"><div><span className="eyebrow">CAMPUS MARKETPLACE</span><h1>Find your next useful thing.</h1><p className="muted">A closer look at what students are passing along.</p></div><Link className="button button-primary" to="/school/listings/new"><Tag size={17} /> List an item</Link></div>
    <div className="marketplace-layout">
      <aside className="filter-sidebar">
        <form className="search-box" onSubmit={submitSearch}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search listings" /><button aria-label="Submit search"><Search size={16} /></button></form>
        <div className="filter-head"><SlidersHorizontal size={17} /><strong>Filters</strong><button className="clear-button" onClick={() => { setSearch(''); setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setSort('newest') }}>Clear</button></div>
        <label className="filter-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.slice(1).map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <div className="filter-label"><span>Price range</span><div className="price-range"><label className="sr-only" htmlFor="min-price">Minimum price</label><input id="min-price" inputMode="decimal" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /><span>to</span><label className="sr-only" htmlFor="max-price">Maximum price</label><input id="max-price" inputMode="decimal" type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></div></div>
        <label className="filter-label">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Recently listed</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
      </aside>
      <section className="feed-results" aria-live="polite">
        <div className="results-heading"><strong>{page?.total ?? 0} items</strong><span>Near {user?.university?.name}</span></div>
        {loading ? <LoadingState label="Loading listings" /> : error ? <ErrorState message={error} onRetry={() => void loadListings()} /> : page?.items.length ? <div className="listing-grid">{page.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <EmptyState title="No listings match those filters" detail="Try a different search or clear a filter to see more campus finds." />}
      </section>
    </div>
  </div>
}

export function MyListings() {
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try { setItems(await api<Listing[]>('/listings/mine')) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Your listings could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function updateStatus(item: Listing) {
    setActionError('')
    try { await api(`/listings/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: item.status === 'sold' ? 'available' : 'sold' }) }); await load() }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'The listing could not be updated.') }
  }

  async function remove(item: Listing) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return
    setActionError('')
    try { await api(`/listings/${item.id}`, { method: 'DELETE' }); await load() }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'The listing could not be deleted.') }
  }

  return <section className="management-view"><div className="view-title-row"><div><span className="eyebrow">YOUR MARKETPLACE</span><h1>My listings</h1><p className="muted">Keep your campus listings current.</p></div><Link className="button button-primary" to="/school/listings/new"><Tag size={17} /> List an item</Link></div>
    {actionError && <FormError message={actionError} />}
    {loading ? <LoadingState label="Loading your listings" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : items.length ? <div className="my-listing-list">{items.map((item) => <article className="my-listing-row" key={item.id}><img src={item.image_url} alt={item.title} /><div className="my-listing-info"><span className={`status-text${item.status === 'sold' ? ' is-sold' : ''}`}>{item.status}</span><h2>{item.title}</h2><strong>{formatPrice(item.price)}</strong><span className="muted">{item.location} · {formatRelativeTime(item.created_at)}</span></div><div className="row-actions"><Link className="button button-outline" to={`/school/listings/${item.id}/edit`}>Edit</Link><button className="button button-outline" onClick={() => void updateStatus(item)}>{item.status === 'sold' ? 'Mark available' : 'Mark sold'}</button><button className="button button-danger" onClick={() => void remove(item)}>Delete</button></div></article>)}</div> : <EmptyState title="Your listings will show up here" detail="Post an item when you are ready to pass it along." />}
  </section>
}

const blankListing = { title: '', price: '', description: '', category: 'Textbooks', condition: 'Good', image_url: '', location: '' }
type ListingDraft = typeof blankListing

export function ListingForm() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ListingDraft>(blankListing)
  const [loading, setLoading] = useState(Boolean(listingId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!listingId) return
    api<Listing>(`/listings/${listingId}`).then((listing) => setDraft({
      title: listing.title,
      price: String(listing.price),
      description: listing.description,
      category: listing.category,
      condition: listing.condition,
      image_url: listing.image_url,
      location: listing.location,
    })).catch((reason) => setError(reason instanceof Error ? reason.message : 'This listing could not be loaded.')).finally(() => setLoading(false))
  }, [listingId])

  function change(key: keyof ListingDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const saved = await api<Listing>(listingId ? `/listings/${listingId}` : '/listings', {
        method: listingId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...draft, price: Number(draft.price) }),
      })
      navigate(`/listings/${saved.id}`)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'The listing could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading listing" />
  if (error && listingId && !draft.title) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  return <section className="form-page"><Link className="back-link" to="/school/listings"><ArrowLeft size={16} /> Back to my listings</Link><div className="form-page-heading"><span className="eyebrow">CAMPUS MARKETPLACE</span><h1>{listingId ? 'Edit listing' : 'List an item'}</h1><p className="muted">Share the useful details so another student knows what to expect.</p></div>
    <form className="form-stack listing-form" onSubmit={submit}>
      <label>Title<input value={draft.title} onChange={(event) => change('title', event.target.value)} minLength={4} maxLength={180} required /></label>
      <div className="form-grid-two"><label>Price (USD)<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => change('price', event.target.value)} required /></label><label>Category<select value={draft.category} onChange={(event) => change('category', event.target.value)}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label></div>
      <div className="form-grid-two"><label>Condition<select value={draft.condition} onChange={(event) => change('condition', event.target.value)}>{['New', 'Like new', 'Very good', 'Good', 'Fair'].map((condition) => <option key={condition}>{condition}</option>)}</select></label><label>Campus location<input value={draft.location} onChange={(event) => change('location', event.target.value)} maxLength={160} required /></label></div>
      <label>Image URL<input type="url" value={draft.image_url} onChange={(event) => change('image_url', event.target.value)} required /></label>
      <label>Description<textarea rows={5} value={draft.description} onChange={(event) => change('description', event.target.value)} minLength={10} maxLength={5000} required /></label>
      <FormError message={error} />
      <div className="form-actions"><button className="button button-outline" type="button" onClick={() => navigate('/school/listings')}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : listingId ? 'Save changes' : 'Publish listing'}</button></div>
    </form>
  </section>
}

export function ListingDetail() {
  const { listingId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')
  const publicUniversityId = searchParams.get('university_id')

  async function load() {
    setLoading(true)
    setError('')
    const path = user?.university
      ? `/listings/${listingId}`
      : `/public/listings/${listingId}?university_id=${publicUniversityId ?? ''}`
    try { setListing(await api<Listing>(path)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This listing could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [listingId, user?.university?.id, publicUniversityId])

  async function startMessage() {
    if (!user) { navigate('/auth/login'); return }
    try {
      const conversation = await api<{ id: number }>(`/listings/${listingId}/conversation`, { method: 'POST' })
      navigate(`/messages/${conversation.id}`)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not start a conversation.') }
  }

  async function report() {
    try {
      await api(`/listings/${listingId}/reports`, { method: 'POST', body: JSON.stringify({ reason }) })
      setActionError('Thanks. Your report was sent to the campus team.')
      setReporting(false)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'The report could not be sent.') }
  }

  if (loading) return <section className="detail-page"><LoadingState label="Loading listing details" /></section>
  if (error || !listing) return <section className="detail-page"><ErrorState message={error || 'Listing not found.'} onRetry={() => void load()} /></section>
  const isOwner = user?.id === listing.seller.id
  return <section className="detail-page"><Link className="back-link" to={user ? '/school' : '/'}><ArrowLeft size={16} /> Back to listings</Link>
    <div className="detail-layout"><div className="detail-photo-column"><img className="detail-photo" src={listing.image_url} alt={listing.title} /><div className="detail-description"><span className="eyebrow">ITEM DETAILS</span><h2>About this item</h2><p>{listing.description}</p></div></div>
      <div className="detail-info"><div className="detail-tags"><span>{listing.category}</span><span>{listing.condition}</span><span className={`status-text${listing.status === 'sold' ? ' is-sold' : ''}`}>{listing.status}</span></div><h1>{listing.title}</h1><div className="detail-price">{formatPrice(listing.price)}</div><div className="detail-location"><MapPin size={16} />{listing.location}<span>·</span>{formatRelativeTime(listing.created_at)}</div>
        <div className="seller-panel"><span className="eyebrow">SELLER</span><div className="seller-line"><div className="avatar-mark">{listing.seller.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{listing.seller.name}{listing.seller.student_verified && <BadgeCheck className="verified-icon" size={15} />}</strong><span>{listing.seller.university.name}</span><span>Joined {formatJoinDate(listing.seller.joined_at)}</span></div></div></div>
        {isOwner ? <Link className="button button-outline button-wide" to={`/school/listings/${listing.id}/edit`}>Edit your listing</Link> : listing.status === 'available' && <button className="button button-primary button-wide" onClick={() => void startMessage()}>Message seller</button>}
        {actionError && <FormError message={actionError} />}
        {user && !isOwner && <div className="report-section"><button className="text-button report-button" onClick={() => setReporting((value) => !value)}><Flag size={15} /> Report listing</button>{reporting && <div className="report-form"><label htmlFor="report-reason">What is the issue?</label><textarea id="report-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} /><button className="button button-outline" disabled={reason.trim().length < 5} onClick={() => void report()}>Send report</button></div>}</div>}
      </div>
    </div>
  </section>
}