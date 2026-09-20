import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Why from '../components/Why'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

export default function Wellness() {
  const { data, error, loading, reload } = useApi(() => api.wellness(), [])

  if (loading) return <Loading label="Building your wellness plan" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const tips = data.tips || []

  return (
    <>
      <h1>Wellness plan</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Sleep, hydration, stress and daily habits based on your logs and rules.
        {data.source === 'rules_only'
          ? ' ML is currently unavailable. The recommendation engine is operating using rules and content-based filtering.'
          : ''}
      </p>

      <Card title="Today's wellness focus" sub={data.source === 'hybrid' ? 'Rules first, ML focus second' : 'Rule engine only'}>
        {tips.length === 0 ? (
          <EmptyState>Complete your profile and logs to see wellness tips.</EmptyState>
        ) : (
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {tips.map((tip) => (
              <li key={tip.code} style={{ marginBottom: 12 }}>
                <strong>{tip.code.replace(/_/g, ' ')}</strong>
                <div>{tip.message}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>{tip.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.why && <Why text={data.why} />}
      <Disclaimer text={data.disclaimer} />
    </>
  )
}
