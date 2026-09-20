import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const TONE = { high: 'warn', moderate: 'info', low: 'ok', 'rest / light': 'ok' }

export default function WeeklyPlan() {
  const { data, error, loading, reload } = useApi(() => api.weeklyActivity(), [])

  if (loading) return <Loading label="Building your week" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { days, weekly_minutes, rest_days } = data.plan

  return (
    <>
      <h1>Your 7-day plan</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        {weekly_minutes} active minutes this week. Rest or light days:{' '}
        {(rest_days || []).join(', ')}. Two hard days never fall back to back.
      </p>

      <Card>
        {days.map((day) => (
          <div className="day-row" key={day.day}>
            <div className="dname">{day.day}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{day.activity}</div>
              <div className="dreason">{day.reason}</div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <span className={`pill ${TONE[day.intensity] || 'info'}`}>
                {day.intensity}
              </span>
              <div className="dreason">
                {day.duration} min · {day.estimated_calories_burned} kcal
              </div>
            </div>
          </div>
        ))}
        <Why>{data.why}</Why>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
