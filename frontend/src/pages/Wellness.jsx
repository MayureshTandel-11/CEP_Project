import {
  HeartPulse,
  Sparkles,
  Droplets,
  Moon,
  Smile,
  ShieldCheck,
  Brain
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Why from '../components/Why'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

function getTipIcon(code = '') {
  const c = code.toLowerCase()
  if (c.includes('water') || c.includes('hydrate')) return Droplets
  if (c.includes('sleep') || c.includes('rest')) return Moon
  if (c.includes('stress') || c.includes('mood')) return Smile
  return HeartPulse
}

export default function Wellness() {
  const { data, error, loading, reload } = useApi(() => api.wellness(), [])

  if (loading) return <Loading label="Evaluating your lifestyle logs & wellness rules…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const tips = data?.tips || []
  const isHybrid = data?.source === 'hybrid'

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Wellness plan</h1>
          <p className="page-subtitle">
            Evidence-based recovery, sleep, hydration, and stress habits tailored to your recent logs.
          </p>
        </div>
        <span className={`pill ${isHybrid ? 'ok' : 'info'}`}>
          <Brain size={13} />
          <span>{isHybrid ? 'Hybrid Rules + ML Ranking' : 'Rule Engine Active'}</span>
        </span>
      </div>

      <Card
        title="Today's Wellness Focus"
        sub={isHybrid
          ? 'Deterministically filtered for safety, with machine learning personalized focus ranking.'
          : 'Operating using rule-based algorithms (ML model service is currently offline).'}
        icon={HeartPulse}
      >
        {tips.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title="No wellness tips yet"
            description="Complete your profile biometrics and record daily logs to generate tailored wellness insights."
            actionText="Go to logs"
            actionLink="/logs"
          />
        ) : (
          <div className="recommendations-grid">
            {tips.map((tip) => {
              const Icon = getTipIcon(tip.code)
              const cleanTitle = (tip.code || '').replace(/_/g, ' ')

              return (
                <div className="recommendation-card" key={tip.code}>
                  <div className="rec-card-header">
                    <div className="rec-icon-badge metric-icon-badge teal">
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <span className="rec-tag" style={{ textTransform: 'capitalize' }}>
                      {cleanTitle}
                    </span>
                  </div>

                  <div className="rec-card-body">
                    <div className="rec-headline">{tip.message}</div>
                    {tip.reason && (
                      <div className="rec-sub">{tip.reason}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {data.why && <Why text={data.why} />}
      <Disclaimer text={data.disclaimer} />
    </>
  )
}
