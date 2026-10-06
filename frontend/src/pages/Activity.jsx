import { Link } from 'react-router-dom'
import {
  Flame,
  Clock,
  Dumbbell,
  CalendarDays,
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { EmptyState, ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

export default function Activity() {
  const { data, error, loading, reload } = useApi(() => api.activity(), [])

  if (loading) return <Loading label="Formulating today's activity recommendations…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const activities = data?.plan?.activities || []
  const dailyTarget = data?.plan?.daily_minutes_target || 30

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Activity for today</h1>
          <p className="page-subtitle">
            Aim for about <strong>{dailyTarget} minutes</strong> of purposeful movement today.
          </p>
        </div>
        <Link to="/weekly-plan" className="btn ghost" style={{ gap: 8 }}>
          <CalendarDays size={16} />
          <span>See full 7-day schedule</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <Card
        title="Suggested Sessions"
        sub="Tailored to your current fitness level and recovery capacity"
        icon={Dumbbell}
      >
        {activities.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No matching activities found"
            description="Update your activity level or physical goals on your profile to generate new sessions."
            actionText="Update profile"
            actionLink="/profile"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activities.map((a) => (
              <div className="meal-block" key={a.activity_id} style={{ marginBottom: 0 }}>
                <div className="food-top">
                  <div>
                    <span className="food-name" style={{ fontSize: '1rem' }}>{a.activity_name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <span className="pill info">
                        <Clock size={12} />
                        {a.duration} min
                      </span>
                      <span className="pill neutral">{a.category}</span>
                      <span className={`pill ${a.difficulty === 'hard' ? 'warn' : 'ok'}`}>
                        {a.difficulty}
                      </span>
                    </div>
                  </div>

                  <span className="food-calories-pill" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={13} />
                    <span>~{a.estimated_calories_burned} kcal</span>
                  </span>
                </div>

                {a.description && (
                  <p style={{ margin: '8px 0 4px', fontSize: '0.84rem', color: 'var(--ink)' }}>
                    {a.description}
                  </p>
                )}

                {a.reason && (
                  <div className="food-reason" style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 600 }}>Why:</span> {a.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Why>{data.why}</Why>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
