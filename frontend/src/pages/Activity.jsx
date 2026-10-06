import { Link } from 'react-router-dom'
import {
  Flame,
  Clock,
  Dumbbell,
  CalendarDays,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  AlertTriangle,
  Stethoscope
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
  const llmRec = data?.llm_recommendations
  const hasMedicalSafety = llmRec?.medical_safety?.length > 0
  const needsGuidance = llmRec?.professional_guidance === true

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

      {/* LLM Activity Recommendations */}
      {llmRec?.activity?.length > 0 && (
        <>
          {needsGuidance && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem',
            }}>
              <Stethoscope size={18} style={{ flexShrink: 0, marginTop: 1, color: '#d97706' }} />
              <span>
                <strong>Professional guidance recommended.</strong> Based on your profile,
                consider discussing exercise changes with a healthcare professional.
              </span>
            </div>
          )}
          {hasMedicalSafety && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.84rem',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#6366f1' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Medical context considered:</strong>
                {llmRec.medical_safety.map((note, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>• {note}</div>
                ))}
              </div>
            </div>
          )}

          <Card title="AI Activity Guidance" sub="Personalized by AI using your goals and medical context" icon={Brain}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {llmRec.summary && (
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', margin: 0, fontStyle: 'italic' }}>
                  {llmRec.summary}
                </p>
              )}
              {llmRec.activity.map((rec, i) => (
                <div className="meal-block" key={i} style={{ marginBottom: 0 }}>
                  <div className="food-top">
                    <span className="food-name" style={{ fontSize: '0.95rem' }}>{rec.title}</span>
                    <span className={`pill ${rec.priority === 'high' ? 'warn' : rec.priority === 'low' ? 'ok' : 'info'}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink)', marginTop: 4 }}>{rec.description}</div>
                  {rec.reason && (
                    <div className="food-reason" style={{ marginTop: 4 }}>
                      <span style={{ fontWeight: 600 }}>Why:</span> {rec.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <div style={{ height: 20 }} />
        </>
      )}

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
