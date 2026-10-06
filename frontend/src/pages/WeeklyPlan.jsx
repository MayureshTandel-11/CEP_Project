import {
  CalendarDays,
  Clock,
  Flame,
  Activity,
  HeartHandshake,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const INTENSITY_TONE = {
  high: 'warn',
  moderate: 'info',
  low: 'ok',
  'rest / light': 'ok'
}

export default function WeeklyPlan() {
  const { data, error, loading, reload } = useApi(() => api.weeklyActivity(), [])

  if (loading) return <Loading label="Synthesizing your 7-day training schedule…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { days = [], weekly_minutes, rest_days = [] } = data.plan || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Your 7-day plan</h1>
          <p className="page-subtitle">
            Structured week balancing cardiovascular effort, functional movement, and neuromuscular recovery.
          </p>
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div className="wellness-hero-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="metric-icon-badge teal">
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>
              {weekly_minutes} total active minutes
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              Rest or low-intensity days: <strong>{rest_days.join(', ') || 'None scheduled'}</strong>
            </div>
          </div>
        </div>

        <span className="pill ok" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
          <HeartHandshake size={14} />
          <span>Fatigue safety: No back-to-back hard days</span>
        </span>
      </div>

      <Card title="Weekly Schedule" icon={CalendarDays}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {days.map((day) => {
            const isRest = day.intensity === 'rest / light' || (day.activity || '').toLowerCase().includes('rest')

            return (
              <div
                className="day-schedule-card"
                key={day.day}
                style={{
                  background: isRest ? 'var(--ground-subtle)' : 'transparent',
                  padding: '14px 12px',
                  borderRadius: 'var(--r-md)',
                  marginBottom: 6
                }}
              >
                <div className="day-name-pill" style={{ color: isRest ? 'var(--ink-soft)' : 'var(--teal-800)' }}>
                  {day.day}
                </div>

                <div>
                  <div className="activity-name-title">{day.activity}</div>
                  <div className="activity-reason-text">{day.reason}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`pill ${INTENSITY_TONE[day.intensity] || 'info'}`}>
                    {day.intensity}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                    {day.duration} min · {day.estimated_calories_burned} kcal
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <Why>{data.why}</Why>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
