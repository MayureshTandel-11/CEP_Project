import { useState } from 'react'
import TrendChart from '../charts/TrendChart'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import RangePicker from '../components/RangePicker'
import ScorePanel from '../components/ScorePanel'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

export default function Progress() {
  const [range, setRange] = useState(30)
  const { data, error, loading, reload } = useApi(() => api.dashboard(range), [range])

  if (loading) return <Loading label="Loading your progress" />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.profile_complete) {
    return <Card title="Progress"><EmptyState>Complete your profile first.</EmptyState></Card>
  }

  const c = data.charts
  const m = data.metrics

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Progress</h1>
        <RangePicker value={range} onChange={setRange} />
      </div>
      <p style={{ color: 'var(--ink-soft)' }}>
        Dashed lines mark your personal target for that measure.
      </p>

      {!data.has_logs ? (
        <Card><EmptyState title="Nothing logged in this range">
          Record a few days on the wellness log page and your trends appear here.
        </EmptyState></Card>
      ) : (
        <div className="grid cols-2">
          <Card title="Weight">
            <TrendChart label="Weight" unit="kg" dates={c.dates} values={c.weight} />
          </Card>
          <Card title="Sleep">
            <TrendChart label="Sleep" unit="h" dates={c.dates} values={c.sleep} target={7} />
          </Card>
          <Card title="Water">
            <TrendChart label="Water" unit="ml" dates={c.dates} values={c.water}
                        target={m.water_target_ml} />
          </Card>
          <Card title="Steps">
            <TrendChart label="Steps" dates={c.dates} values={c.steps} target={8000} />
          </Card>
          <Card title="Exercise minutes">
            <TrendChart label="Exercise" unit="min" dates={c.dates}
                        values={c.exercise_minutes} target={30} />
          </Card>
          <Card title="Calories logged">
            <TrendChart label="Calories" unit="kcal" dates={c.dates} values={c.calories}
                        target={m.calorie_target} />
          </Card>
        </div>
      )}

      <Card title="Weekly wellness engagement score">
        <ScorePanel score={data.wellness_score} />
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
