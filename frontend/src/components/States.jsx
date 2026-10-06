import { Link } from 'react-router-dom'
import {
  Inbox,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Sparkles
} from 'lucide-react'

/** Loading, empty and error states with modern SaaS visual excellence */
export function Loading({ label = 'Loading your wellness data…' }) {
  return (
    <div className="state-container" role="status" aria-live="polite">
      <div className="modern-spinner" />
      <div className="state-title" style={{ fontSize: '0.98rem' }}>{label}</div>
      <p className="state-description" style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginBottom: 0 }}>
        Personalizing your metrics and calculations…
      </p>
    </div>
  )
}

export function SkeletonKPI({ count = 5 }) {
  return (
    <div className={`grid cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric-card" style={{ height: 110 }}>
          <div className="skeleton-box" style={{ height: 14, width: '40%', marginBottom: 12 }} />
          <div className="skeleton-box" style={{ height: 32, width: '60%', marginBottom: 8 }} />
          <div className="skeleton-box" style={{ height: 12, width: '75%' }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title = 'No data available yet',
  description,
  children,
  icon: PropIcon,
  actionText,
  actionLink,
  onAction
}) {
  const Icon = PropIcon || Inbox
  const content = description || children

  return (
    <div className="state-container">
      <div className="state-icon-bubble">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <div className="state-title">{title}</div>
      {content && (
        <div className="state-description">
          {typeof content === 'string' ? <p style={{ margin: 0 }}>{content}</p> : content}
        </div>
      )}
      {actionLink && actionText && (
        <Link to={actionLink} className="topbar-cta-btn" style={{ marginTop: 8 }}>
          <PlusCircle size={15} />
          <span>{actionText}</span>
        </Link>
      )}
      {onAction && actionText && !actionLink && (
        <button type="button" className="topbar-cta-btn" onClick={onAction} style={{ marginTop: 8 }}>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Unable to load wellness data' }) {
  // Keep technical errors safe and logged to console
  if (error) {
    console.error('Wellness Recommender API Error:', error)
  }

  const userMessage = error?.message && !error.message.includes('<!DOCTYPE')
    ? error.message
    : 'We encountered an issue communicating with the wellness services. Please check your connection and try again.'

  return (
    <div className="state-container error" role="alert">
      <div className="state-icon-bubble">
        <AlertCircle size={28} strokeWidth={2} />
      </div>
      <div className="state-title">{title}</div>
      <p className="state-description">{userMessage}</p>
      {onRetry && (
        <button type="button" className="btn ghost" onClick={onRetry} style={{ gap: 8 }}>
          <RefreshCw size={15} />
          <span>Try again</span>
        </button>
      )}
    </div>
  )
}
