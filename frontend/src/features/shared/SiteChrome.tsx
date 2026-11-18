import { CalendarCheck2, CalendarDays, CircleUserRound, GraduationCap, LogOut, MessageSquare, Settings2, ShoppingBag } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UniversityLogo } from '../auth/UniversityLogo'

export function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand${light ? ' brand-light' : ''}`} to="/"><span className="brand-mark">u</span><span>unilink</span></Link>
}

export function PublicHeader() {
  const { user, logout } = useAuth()
  return (
    <header className="public-header">
      <Brand />
      <nav className="public-nav" aria-label="Account navigation">
        {user ? <><Link to={user.university ? '/school' : '/onboarding'}>Go to campus</Link><button className="icon-button" title="Sign out" onClick={logout}><LogOut size={18} /></button></> : <><Link to="/auth/login">Log in</Link><Link className="button button-small" to="/auth/register">Join UniLink</Link></>}
      </nav>
    </header>
  )
}

const navigation = [
  { to: '/school', label: 'Marketplace', icon: ShoppingBag, end: true },
  { to: '/school/events', label: 'Campus events', icon: CalendarDays },
  { to: '/school/listings', label: 'My listings', icon: GraduationCap },
  { to: '/school/my-events', label: 'My events', icon: CalendarCheck2 },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
]

export function CampusLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="campus-app">
      <header className="app-header">
        <Brand />
        <div className="campus-name">{user?.university && <UniversityLogo university={user.university} />}<span>{user?.university?.name ?? 'Your campus'}</span><span className="campus-label">CAMPUS</span></div>
        <div className="account-actions">
          <Link className="account-link" to="/settings/university" title="University settings"><Settings2 size={18} /><span>University</span></Link>
          <span className="user-name"><CircleUserRound size={19} />{user?.name}</span>
          <button className="icon-button" title="Sign out" onClick={logout}><LogOut size={18} /></button>
        </div>
      </header>
      <div className="campus-frame">
        <nav className="campus-nav" aria-label="Campus navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `campus-nav-link${isActive ? ' active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
          <Link className="campus-nav-create" to="/school/listings/new">+ Create a listing</Link>
        </nav>
        <main className="campus-content">{children}</main>
      </div>
    </div>
  )
}