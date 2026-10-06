import {
  Activity,
  Flame,
  Droplets,
  Moon,
  Scale,
  Sparkles,
  Heart,
  TrendingUp,
  Award
} from 'lucide-react'

const ICON_MAP = {
  bmi: { icon: Heart, variant: 'teal' },
  'daily calories': { icon: Flame, variant: 'amber' },
  'calorie target': { icon: Flame, variant: 'amber' },
  'water target': { icon: Droplets, variant: 'blue' },
  water: { icon: Droplets, variant: 'blue' },
  sleep: { icon: Moon, variant: 'indigo' },
  'current weight': { icon: Scale, variant: 'emerald' },
  weight: { icon: Scale, variant: 'emerald' },
  protein: { icon: Award, variant: 'teal' },
  carbohydrates: { icon: Flame, variant: 'amber' },
  fat: { icon: Sparkles, variant: 'rose' },
  responses: { icon: Activity, variant: 'blue' },
  'average rating': { icon: Sparkles, variant: 'amber' },
  'plans followed': { icon: TrendingUp, variant: 'teal' },
  model: { icon: Sparkles, variant: 'teal' },
  accuracy: { icon: Award, variant: 'emerald' },
  'f1 score': { icon: TrendingUp, variant: 'indigo' },
  'precision / recall': { icon: Activity, variant: 'blue' },
}

export default function Metric({
  label,
  value,
  unit,
  note,
  tone,
  icon: PropIcon,
  variant: propVariant,
  statusBadge
}) {
  const normKey = (label || '').toLowerCase().trim()
  const fallback = ICON_MAP[normKey] || { icon: Activity, variant: 'teal' }
  const Icon = PropIcon || fallback.icon
  const variant = propVariant || fallback.variant

  // Tone pill formatting
  const pillClass = tone ? `pill ${tone}` : null
  const displayBadge = statusBadge || (note && tone ? note : null)
  const isLogged = value !== null && value !== undefined && value !== '--'

  return (
    <div className={`metric-card ${variant}`}>
      <div className="metric-top-row">
        <span className="metric-label">{label}</span>
        <div className={`metric-icon-badge ${variant}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>

      <div className="metric-value-row">
        <span className="metric-value">{isLogged ? value : '—'}</span>
        {unit && isLogged && <span className="metric-unit">{unit}</span>}
      </div>

      <div className="metric-footer">
        {displayBadge ? (
          <span className={pillClass || `pill ${variant}`}>
            <span className="pill-dot" />
            {displayBadge}
          </span>
        ) : (
          <span style={{ color: isLogged ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
            {note || (isLogged ? 'Active target' : 'Not logged yet')}
          </span>
        )}
        {displayBadge && note && !tone && (
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>{note}</span>
        )}
      </div>
    </div>
  )
}
