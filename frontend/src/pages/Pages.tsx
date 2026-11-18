import { Link, useParams } from 'react-router-dom'
import { AuthForm, Onboarding, UniversitySettings } from '../features/auth/AuthScreens'
import { EventsFeed, EventForm } from '../features/events/Events'
import { ListingDetail, ListingForm, MarketplaceFeed, MyListings, Landing } from '../features/marketplace/Marketplace'
import { MessageCenter } from '../features/messaging/Messaging'
import { CampusLayout, PublicHeader } from '../features/shared/SiteChrome'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from '../features/shared/Feedback'

export function LandingPage() {
  return <Landing />
}

export function AuthPage() {
  const { mode } = useParams()
  return <AuthForm mode={mode === 'register' ? 'register' : 'login'} />
}

export function OnboardingPage() {
  return <Onboarding />
}

export function MarketplacePage() {
  return <CampusLayout><MarketplaceFeed /></CampusLayout>
}

export function MyListingsPage() {
  return <CampusLayout><MyListings /></CampusLayout>
}

export function EventsPage({ mine = false }: { mine?: boolean }) {
  return <CampusLayout><EventsFeed mine={mine} /></CampusLayout>
}

export function ListingDetailPage() {
  const { user, loading } = useAuth()
  if (loading) return <div className="standalone-state"><LoadingState label="Checking your account" /></div>
  return user?.university ? <CampusLayout><ListingDetail /></CampusLayout> : <><PublicHeader /><main className="public-detail"><ListingDetail /></main></>
}

export function ListingFormPage() {
  return <CampusLayout><ListingForm /></CampusLayout>
}

export function EventFormPage() {
  return <CampusLayout><EventForm /></CampusLayout>
}

export function MessagesPage() {
  return <CampusLayout><MessageCenter /></CampusLayout>
}

export function UniversitySettingsPage() {
  return <CampusLayout><UniversitySettings /></CampusLayout>
}

export function NotFoundPage() {
  return <><PublicHeader /><main className="not-found"><span className="eyebrow">404 · NOT FOUND</span><h1>This page is not on campus.</h1><p>That address may have moved or the item is no longer available.</p><Link className="button button-primary" to="/">Back to UniLink</Link></main></>
}