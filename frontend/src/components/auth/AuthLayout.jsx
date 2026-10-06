import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import AuthBrandPanel from './AuthBrandPanel'
import TrustNotice from './TrustNotice'

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkText,
  footerLinkTo,
}) {
  return (
    <div className="auth-split-wrapper">
      {/* Left Visual Storytelling Brand Panel */}
      <AuthBrandPanel />

      {/* Right Authentication Form Panel */}
      <main className="auth-form-panel">
        <div className="auth-form-container">
          {/* Mobile Top Brand Bar (Visible on mobile/tablet when left panel is hidden) */}
          <div className="auth-mobile-brand-bar">
            <div className="brand-icon-wrap" style={{ width: 34, height: 34, borderRadius: 10 }}>
              <Sparkles size={17} strokeWidth={2.5} />
            </div>
            <span className="auth-brand-name" style={{ fontSize: '1rem', color: 'var(--ink)' }}>
              Wellness Recommender
            </span>
            <span className="brand-badge">PRO</span>
          </div>

          {/* Form Header */}
          <div className="auth-form-header">
            <h1 className="auth-form-title">{title}</h1>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}
          </div>

          {/* Form Body */}
          <div className="auth-form-content">
            {children}
          </div>

          {/* Account Switcher Footer */}
          {footerPrompt && footerLinkTo && (
            <div className="auth-switch-box">
              <span>{footerPrompt}</span>{' '}
              <Link to={footerLinkTo} className="auth-switch-link">
                {footerLinkText}
              </Link>
            </div>
          )}

          {/* Trust & Privacy Notice */}
          <TrustNotice />
        </div>
      </main>
    </div>
  )
}
