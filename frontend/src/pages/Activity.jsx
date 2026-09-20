import { Link } from 'react-router-dom'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { EmptyState, ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

export default function Activity() {
  const { data, error, loading, reload } = useApi(() => api.activity(), [])

  if (loading) return <Loading label="Picking today's activities" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const activities = data.plan.activities || []

  return (
    <>
      <h1>Activity for today</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Aim for about {data.plan.daily_minutes_target} minutes today.{' '}
        <Link to="/weekly-plan">See the full week</Link>
      </p>

      <Card title="Suggested sessions">
        {activities.length === 0
          ? <EmptyState>No activities match your current level yet.</EmptyState>
          : activities.map((a) => (
            <div className="food" key={a.activity_id}>
              <div className="top">
                <span className="name">{a.activity_name}</span>
                <span className="macros">{a.estimated_calories_burned} kcal</span>
              </div>
              <div className="macros">
                {a.duration} min · {a.category} ·{' '}
                <span className={`pill ${a.difficulty === 'hard' ? 'warn' : 'ok'}`}>
                  {a.difficulty}
                </span>
              </div>
              <div className="reason">{a.description}</div>
              <div className="reason">{a.reason}</div>
            </div>
          ))}
        <Why>{data.why}</Why>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
