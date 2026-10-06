import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCircle,
  UtensilsCrossed,
  Flame,
  CalendarDays,
  HeartPulse,
  ClipboardList,
  TrendingUp,
  MessageSquareQuote,
  Bot,
  BrainCircuit,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'My profile', icon: UserCircle },
  { to: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { to: '/activity', label: 'Activity', icon: Flame },
  { to: '/weekly-plan', label: 'Weekly plan', icon: CalendarDays },
  { to: '/wellness', label: 'Wellness', icon: HeartPulse },
  { to: '/logs', label: 'Wellness log', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareQuote },
  { to: '/assistant', label: 'AI assistant', icon: Bot },
  { to: '/ml', label: 'How the model decides', icon: BrainCircuit },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const hour = new Date().getHours()
  let greetingPrefix = 'Good morning'
  if (hour >= 12 && hour < 17) greetingPrefix = 'Good afternoon'
  else if (hour >= 17 || hour < 4) greetingPrefix = 'Good evening'

  const firstName = user?.name ? user.name.split(' ')[0] : 'there'
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  async function handleLogout() {
    await logout()
    toast.success('Signed out.')
    navigate('/login')
  }

  return (
    <div className="shell">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand-container">
          <NavLink to="/dashboard" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="brand-icon-wrap">
              <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <div className="brand-info">
              <div className="brand-title">
                Wellness <span className="brand-badge">PRO</span>
              </div>
              <span className="brand-subtitle">Health & Nutrition</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          <div className="sidebar-section-title">Navigation</div>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={label}
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <NavLink
            to="/profile"
            className="sidebar-user-pill"
            onClick={() => setMobileOpen(false)}
            title="Edit profile"
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{user?.email || 'Member'}</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out of your account"
          >
            <LogOut size={16} />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="topbar-greeting">
              <div className="topbar-title">
                {greetingPrefix}, {firstName} 👋
              </div>
              <div className="topbar-subtitle">
                Here's your wellness overview for today.
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-date-badge">
              <Calendar size={14} />
              <span>{today}</span>
            </div>

            <NavLink to="/logs" className="topbar-cta-btn">
              <Plus size={15} strokeWidth={2.5} />
              <span>Log Today</span>
            </NavLink>

            <NavLink
              to="/profile"
              className="topbar-avatar-btn"
              title={`${user?.name || 'User'} - Profile`}
            >
              {initials}
            </NavLink>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
