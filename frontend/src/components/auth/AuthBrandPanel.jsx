import { Sparkles, Check, Heart, Salad, Flame, Droplets, ShieldCheck } from 'lucide-react'

const BENEFITS = [
  'Personalized nutrition insights',
  'Activity & wellness tracking',
  'Data-driven recommendations',
]

export default function AuthBrandPanel() {
  return (
    <aside className="auth-brand-panel" aria-label="Product Highlights">
      {/* Background Ambient Glow & Wave Graphic */}
      <div className="auth-brand-ambient-glow" aria-hidden="true" />
      <div className="auth-brand-grid-pattern" aria-hidden="true" />

      {/* Top Brand Identity */}
      <div className="auth-brand-header">
        <div className="auth-brand-logo-wrap">
          <div className="brand-icon-wrap" style={{ width: 42, height: 42, borderRadius: 12 }}>
            <Sparkles size={20} strokeWidth={2.5} />
          </div>
          <div className="auth-brand-title-wrap">
            <span className="auth-brand-name">Wellness Recommender</span>
            <span className="brand-badge" style={{ alignSelf: 'flex-start' }}>PRO</span>
          </div>
        </div>
      </div>

      {/* Center Storytelling & Abstract Health Data Visualization */}
      <div className="auth-brand-body">
        <div className="auth-brand-hero-text">
          <h2 className="auth-brand-headline">
            Personalized wellness,<br />built around you.
          </h2>
          <p className="auth-brand-subheadline">
            Evidence-based metabolic targets, allergen-filtered meal ideas, and transparent machine learning personalization.
          </p>
        </div>

        {/* Abstract Health Data Visualization Card (Pure CSS/SVG) */}
        <div className="auth-visual-data-card" aria-hidden="true">
          <div className="auth-visual-card-top">
            <div className="auth-visual-metric-info">
              <div className="auth-visual-pulse-dot" />
              <span className="auth-visual-pulse-label">Daily Wellness Alignment</span>
            </div>
            <span className="auth-visual-score-pill">88 / 100</span>
          </div>

          {/* Abstract SVG Wave Chart */}
          <div className="auth-visual-chart-wrap">
            <svg viewBox="0 0 340 90" className="auth-visual-svg-curve" preserveAspectRatio="none">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="50%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              {/* Shaded Area */}
              <path
                d="M0,70 C50,60 90,30 140,40 C190,50 240,15 290,25 C315,30 330,20 340,18 L340,90 L0,90 Z"
                fill="url(#curveGradient)"
              />
              {/* Target Dashed Line */}
              <line x1="0" y1="36" x2="340" y2="36" stroke="#475569" strokeDasharray="4 4" strokeWidth="1.2" />
              {/* Main Glowing Trend Curve */}
              <path
                d="M0,70 C50,60 90,30 140,40 C190,50 240,15 290,25 C315,30 330,20 340,18"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Peak Data Nodes */}
              <circle cx="140" cy="40" r="4.5" fill="#2dd4bf" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="290" cy="25" r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Micro Metrics Strip */}
          <div className="auth-visual-chips-row">
            <div className="auth-visual-chip">
              <Salad size={13} className="auth-chip-icon emerald" />
              <span>Nutrition 86%</span>
            </div>
            <div className="auth-visual-chip">
              <Flame size={13} className="auth-chip-icon amber" />
              <span>Activity 78%</span>
            </div>
            <div className="auth-visual-chip">
              <Droplets size={13} className="auth-chip-icon blue" />
              <span>Hydration 92%</span>
            </div>
          </div>
        </div>

        {/* 3 Concise Benefits */}
        <div className="auth-benefits-list">
          {BENEFITS.map((text, i) => (
            <div className="auth-benefit-item" key={i}>
              <div className="auth-benefit-check">
                <Check size={14} strokeWidth={2.8} />
              </div>
              <span className="auth-benefit-text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Assurance */}
      <div className="auth-brand-footer">
        <div className="auth-footer-guarantee">
          <ShieldCheck size={16} strokeWidth={2} style={{ color: 'var(--teal-400)' }} />
          <span>Deterministic safety filters · Transparent ML · Privacy first</span>
        </div>
      </div>
    </aside>
  )
}
