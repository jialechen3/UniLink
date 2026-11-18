import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LoadingState } from './features/shared/Feedback'
import {
  AuthPage,
  EventFormPage,
  EventsPage,
  LandingPage,
  ListingDetailPage,
  ListingFormPage,
  MarketplacePage,
  MyListingsPage,
  MessagesPage,
  NotFoundPage,
  OnboardingPage,
  UniversitySettingsPage,
} from './pages/Pages'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <div className="standalone-state"><LoadingState label="Checking your account" /></div>
  return user ? <Outlet /> : <Navigate to="/auth/login" replace />
}

function RequireUniversity() {
  const { user } = useAuth()
  return user?.university ? <Outlet /> : <Navigate to="/onboarding" replace />
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth/:mode" element={<AuthPage />} />
    <Route path="/listings/:listingId" element={<ListingDetailPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<RequireUniversity />}>
        <Route path="/school" element={<MarketplacePage />} />
        <Route path="/school/events" element={<EventsPage />} />
        <Route path="/school/my-events" element={<EventsPage mine />} />
        <Route path="/school/events/new" element={<EventFormPage />} />
        <Route path="/school/events/:eventId/edit" element={<EventFormPage />} />
        <Route path="/school/listings" element={<MyListingsPage />} />
        <Route path="/school/listings/new" element={<ListingFormPage />} />
        <Route path="/school/listings/:listingId/edit" element={<ListingFormPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
        <Route path="/settings/university" element={<UniversitySettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter>
}