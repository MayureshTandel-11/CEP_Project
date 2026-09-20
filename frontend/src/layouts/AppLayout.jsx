import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const LINKS = [
  ['/dashboard', 'Dashboard'],
  ['/profile', 'My profile'],
  ['/nutrition', 'Nutrition'],
  ['/activity', 'Activity'],
  ['/weekly-plan', 'Weekly plan'],
  ['/wellness', 'Wellness'],
  ['/logs', 'Wellness log'],
  ['/progress', 'Progress'],
  ['/feedback', 'Feedback'],
  ['/assistant', 'AI assistant'],
  ['/ml', 'How the model decides'],
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  async function handleLogout() {
    await logout()
    toast.success('Signed out.')
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          Wellness Recommender
          <small>Nutrition · activity · wellness</small>
        </div>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="main-nav" aria-label="Main">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <button className="link" onClick={handleLogout}>Sign out</button>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="who">{user?.name ? `Hello, ${user.name}` : 'Welcome'}</div>
            <div className="when">{today}</div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
