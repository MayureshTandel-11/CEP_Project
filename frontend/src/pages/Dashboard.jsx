import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
import RangePicker from '../components/RangePicker'
import ScorePanel from '../components/ScorePanel'
import { EmptyState, ErrorState, Loading } from '../components/States'
import TrendChart from '../charts/TrendChart'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const BMI_TONE = { Normal: 'ok', Underweight: 'warn', Overweight: 'warn', Obese: 'warn' }

export default function Dashboard() {
  const [range, setRange] = useState(7)
  const { data, error, loading, reload } = useApi(() => api.dashboard(range), [range])

  if (loading) return <Loading label="Building your dashboard" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  if (!data.profile_complete) {
    return (
      <Card title="One step to go">
        <EmptyState title="Your profile is not complete">
          Add your age, height, weight and goal and the dashboard fills in
          straight away. <Link to="/profile">Complete your profile</Link>
        </EmptyState>
      </Card>
    )
  }

  const m = data.metrics
  const s = data.summary
  const charts = data.charts

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Your day at a glance</h1>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid cols-5">
        <Metric label="BMI" value={m.bmi} note={m.bmi_category}
                tone={BMI_TONE[m.bmi_category] || 'info'} />
        <Metric label="Daily calories" value={m.calorie_target} unit="kcal"
                note={`TDEE ${Math.round(m.tdee)} kcal`} />
        <Metric label="Water target" value={m.water_target_ml} unit="ml"
                note={s.avg_water ? `Logged ${Math.round(s.avg_water)} ml` : 'Not logged yet'} />
        <Metric label="Sleep" value={s.avg_sleep ? s.avg_sleep.toFixed(1) : null} unit="h"
                note={s.avg_sleep ? 'Average of your logs' : 'Not logged yet'} />
        <Metric label="Current weight"
                value={s.latest_weight ?? data.profile.weight_kg} unit="kg"
                note={`Activity: ${data.profile.activity_level}`} />
      </div>

      <div style={{ height: 20 }} />

      <Card title="Weekly wellness engagement score"
            sub="How closely your logs tracked your own targets over the last 7 days">
        <ScorePanel score={data.wellness_score} />
      </Card>

      <Card title="Today's suggestions"
            sub={data.source === 'hybrid'
              ? 'Rules first, then the model personalises the ranking'
              : 'Generated from the rule engine (the model is currently off)'}>
        {data.top_recommendations.length === 0
          ? <EmptyState>Log a few days of data to see suggestions here.</EmptyState>
          : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {data.top_recommendations.map((rule) => (
                <li key={rule.code} style={{ marginBottom: 10 }}>
                  {rule.message}
                  <div style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>
                    {rule.reason}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>

      {!data.has_logs ? (
        <Card title="Progress charts">
          <EmptyState title="No logs in this range">
            Charts appear as soon as you record a day.{' '}
            <Link to="/logs">Add today's log</Link>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid cols-2" style={{ marginTop: 20 }}>
          <Card title="Weight">
            <TrendChart label="Weight" unit="kg" dates={charts.dates} values={charts.weight} />
          </Card>
          <Card title="Water intake">
            <TrendChart label="Water" unit="ml" dates={charts.dates} values={charts.water}
                        target={m.water_target_ml} />
          </Card>
          <Card title="Sleep">
            <TrendChart label="Sleep" unit="h" dates={charts.dates} values={charts.sleep}
                        target={7} />
          </Card>
          <Card title="Exercise minutes">
            <TrendChart label="Exercise" unit="min" dates={charts.dates}
                        values={charts.exercise_minutes} target={30} />
          </Card>
          <Card title="Steps">
            <TrendChart label="Steps" dates={charts.dates} values={charts.steps}
                        target={8000} />
          </Card>
          <Card title="Calories logged">
            <TrendChart label="Calories" unit="kcal" dates={charts.dates}
                        values={charts.calories} target={m.calorie_target} />
          </Card>
        </div>
      )}

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
