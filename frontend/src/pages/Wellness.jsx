import {
  HeartPulse,
  Sparkles,
  Droplets,
  Moon,
  Smile,
  ShieldCheck,
  Brain,
  AlertTriangle,
  Stethoscope
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Why from '../components/Why'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const PRIORITY_TONE = { high: 'warn', medium: 'info', low: 'ok' }

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
  const isLlm = data?.source === 'llm'
  const isHybrid = data?.source === 'hybrid'
  const llmRec = data?.llm_recommendations
  const hasMedicalSafety = llmRec?.medical_safety?.length > 0
  const needsProfessionalGuidance = llmRec?.professional_guidance === true

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Wellness plan</h1>
          <p className="page-subtitle">
            Evidence-based recovery, sleep, hydration, and stress habits tailored to your recent logs.
          </p>
        </div>
        <span className={`pill ${isLlm ? 'ok' : isHybrid ? 'ok' : 'info'}`}>
          <Brain size={13} />
          <span>
            {isLlm ? 'AI-Powered Recommendations' : isHybrid ? 'Hybrid Rules + ML Ranking' : 'Rule Engine Active'}
          </span>
        </span>
      </div>

      {/* Professional guidance banner — shown only when LLM flagged it */}
      {needsProfessionalGuidance && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: '0.85rem',
        }}>
          <Stethoscope size={18} style={{ flexShrink: 0, marginTop: 1, color: '#d97706' }} />
          <span>
            <strong>Professional guidance recommended.</strong> Based on your profile, consider discussing
            any significant dietary or exercise changes with your healthcare professional before starting.
          </span>
        </div>
      )}

      {/* Medical safety notes */}
      {hasMedicalSafety && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: '0.84rem',
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

      <Card
        title="Today's Wellness Focus"
        sub={isLlm
          ? 'Personalized by AI using your profile, goals, and medical context.'
          : isHybrid
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
            {tips.map((tip, idx) => {
              const Icon = getTipIcon(tip.code)
              const cleanTitle = tip.title || (tip.code || '').replace(/_/g, ' ')
              const tone = PRIORITY_TONE[tip.priority] || 'info'

              return (
                <div className="recommendation-card" key={tip.code || idx}>
                  <div className="rec-card-header">
                    <div className="rec-icon-badge metric-icon-badge teal">
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="rec-tag" style={{ textTransform: 'capitalize' }}>
                        {cleanTitle}
                      </span>
                      {tip.priority && (
                        <span className={`pill ${tone}`} style={{ fontSize: '0.72rem' }}>
                          {tip.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rec-card-body">
                    <div className="rec-headline">{tip.message || tip.description}</div>
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

      {/* Disclaimer */}
      <div style={{
        marginTop: 20, padding: '10px 14px', borderRadius: 8, fontSize: '0.79rem',
        color: 'var(--muted)', border: '1px solid var(--border)',
        background: 'var(--surface-2, rgba(0,0,0,0.03))',
      }}>
        This application provides general wellness guidance and is not a substitute for professional
        medical advice, diagnosis, or treatment.
      </div>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
