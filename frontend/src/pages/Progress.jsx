import { useState } from 'react'
import {
  TrendingUp,
  Scale,
  Moon,
  Droplets,
  Footprints,
  Flame,
  Award,
  Calendar
} from 'lucide-react'
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

  if (loading) return <Loading label="Compiling your progress trends…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  if (!data?.profile_complete) {
    return (
      <Card title="Profile Incomplete" icon={TrendingUp}>
        <EmptyState
          title="Complete your profile first"
          description="Your personalized targets and comparative benchmarks will calculate once your profile is complete."
          actionText="Complete Profile"
          actionLink="/profile"
        />
      </Card>
    )
  }

  const c = data.charts || {}
  const m = data.metrics || {}
  const profile = data.profile || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Progress analytics</h1>
          <p className="page-subtitle">
            Longitudinal trends across weight, recovery, hydration, activity, and calories. Dashed lines indicate your target threshold.
          </p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {!data.has_logs ? (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Nothing logged in this timeframe"
            description={`Record a few days on the wellness log page to visualize your trends over the last ${range} days.`}
            actionText="Record a day"
            actionLink="/logs"
          />
        </Card>
      ) : (
        <div className="grid cols-2">
          <Card title="Weight Trend" icon={Scale}>
            <TrendChart label="Weight" unit="kg" dates={c.dates} values={c.weight} />
          </Card>
          <Card title="Sleep Duration" icon={Moon}>
            <TrendChart
              label="Sleep"
              unit="h"
              dates={c.dates}
              values={c.sleep}
              target={profile.sleep_hours || 7}
            />
          </Card>
          <Card title="Water Intake" icon={Droplets}>
            <TrendChart
              label="Water"
              unit="ml"
              dates={c.dates}
              values={c.water}
              target={m.water_target_ml}
            />
          </Card>
          <Card title="Daily Steps" icon={Footprints}>
            <TrendChart
              label="Steps"
              dates={c.dates}
              values={c.steps}
              target={8000}
            />
          </Card>
          <Card title="Exercise Minutes" icon={TrendingUp}>
            <TrendChart
              label="Exercise"
              unit="min"
              dates={c.dates}
              values={c.exercise_minutes}
              target={30}
            />
          </Card>
          <Card title="Calories Logged" icon={Flame}>
            <TrendChart
              label="Calories"
              unit="kcal"
              dates={c.dates}
              values={c.calories}
              target={m.calorie_target}
            />
          </Card>
        </div>
      )}

      <div style={{ height: 24 }} />

      <Card
        title="Weekly wellness engagement score"
        sub="Synthesized score evaluating your consistency across nutrition, exercise, sleep and hydration"
        icon={Award}
      >
        <ScorePanel score={data.wellness_score} />
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
