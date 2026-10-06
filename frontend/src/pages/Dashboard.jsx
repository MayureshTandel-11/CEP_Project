import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Award,
  ChevronRight,
  Droplets,
  Flame,
  Heart,
  Moon,
  Scale,
  Sparkles,
  Utensils,
  TrendingUp,
  Clock,
  Compass
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
import RangePicker from '../components/RangePicker'
import ScorePanel from '../components/ScorePanel'
import { EmptyState, ErrorState, Loading } from '../components/States'
import TrendChart from '../charts/TrendChart'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const BMI_TONE = {
  Normal: 'ok',
  Underweight: 'warn',
  Overweight: 'warn',
  Obese: 'warn'
}

function getRecommendationMeta(rule) {
  const code = (rule.code || '').toLowerCase()
  const msg = (rule.message || '').toLowerCase()

  if (code.includes('water') || msg.includes('water') || msg.includes('drink')) {
    return {
      type: 'hydration',
      label: 'Hydration',
      icon: Droplets,
      badgeColor: 'blue',
      actionText: 'Log Water',
      actionLink: '/logs',
    }
  }
  if (code.includes('sleep') || msg.includes('sleep') || msg.includes('bed')) {
    return {
      type: 'sleep',
      label: 'Sleep & Recovery',
      icon: Moon,
      badgeColor: 'indigo',
      actionText: 'Log Sleep',
      actionLink: '/logs',
    }
  }
  if (code.includes('calorie') || code.includes('tdee') || msg.includes('calorie') || msg.includes('energy')) {
    return {
      type: 'energy',
      label: 'Energy Balance',
      icon: Flame,
      badgeColor: 'amber',
      actionText: 'Nutrition Plan',
      actionLink: '/nutrition',
    }
  }
  if (code.includes('step') || code.includes('activity') || msg.includes('activity') || msg.includes('exercise')) {
    return {
      type: 'activity',
      label: 'Daily Movement',
      icon: Activity,
      badgeColor: 'purple',
      actionText: 'View Activity',
      actionLink: '/activity',
    }
  }
  if (code.includes('food') || code.includes('allergy') || msg.includes('food') || msg.includes('meal')) {
    return {
      type: 'nutrition',
      label: 'Nutrition & Diet',
      icon: Utensils,
      badgeColor: 'emerald',
      actionText: 'View Meals',
      actionLink: '/nutrition',
    }
  }

  return {
    type: 'wellness',
    label: 'Wellness Insight',
    icon: Sparkles,
    badgeColor: 'teal',
    actionText: 'Add Log',
    actionLink: '/logs',
  }
}

export default function Dashboard() {
  const [range, setRange] = useState(7)
  const { data, error, loading, reload } = useApi(() => api.dashboard(range), [range])

  if (loading) return <Loading label="Building your wellness dashboard…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  if (!data?.profile_complete) {
    return (
      <Card title="Profile Incomplete" icon={Compass}>
        <EmptyState
          icon={Compass}
          title="Complete your wellness profile"
          description="Add your age, height, weight and health goal so the system can calculate personalized targets and unlock your full dashboard."
          actionText="Complete Profile"
          actionLink="/profile"
        />
      </Card>
    )
  }

  const m = data.metrics || {}
  const s = data.summary || {}
  const charts = data.charts || {}
  const profile = data.profile || {}
  const score = data.wellness_score

  const goalText = (profile.goal || 'general wellness').replace(/_/g, ' ')
  const activityLevel = (profile.activity_level || 'light').replace(/_/g, ' ')

  return (
    <>
      {/* Hero / Daily Summary Section */}
      <div className="wellness-hero-card">
        <div className="hero-text-side">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>Personalized Overview</span>
          </div>
          <div className="hero-title">Your wellness today</div>
          <p className="hero-desc">
            Your goal is to <strong>{goalText}</strong> with a <strong>{activityLevel}</strong> activity profile.
            {m.bmi_category && ` Your BMI is ${m.bmi} (${m.bmi_category.toLowerCase()}).`}
            {' '}Keep maintaining your nutrition and daily activity balance.
          </p>
        </div>

        <div className="hero-stats-side">
          {score?.available ? (
            <div className="hero-pill-stat" style={{ borderColor: 'var(--teal-border)', background: 'var(--teal-soft)' }}>
              <span className="hero-stat-label" style={{ color: 'var(--teal-800)' }}>Wellness Score</span>
              <span className="hero-stat-val" style={{ color: 'var(--teal-900)' }}>
                {score.overall} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--teal-700)' }}>/ 100</span>
              </span>
            </div>
          ) : (
            <div className="hero-pill-stat">
              <span className="hero-stat-label">Daily Target</span>
              <span className="hero-stat-val">{m.calorie_target ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span></span>
            </div>
          )}

          <div className="hero-pill-stat">
            <span className="hero-stat-label">Hydration</span>
            <span className="hero-stat-val">
              {m.water_target_ml ? `${(m.water_target_ml / 1000).toFixed(1)}` : '—'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>L</span>
            </span>
          </div>

          <div className="hero-pill-stat">
            <span className="hero-stat-label">Sleep Target</span>
            <span className="hero-stat-val">
              {profile.sleep_hours ? `${profile.sleep_hours}` : '7'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>h</span>
            </span>
          </div>
        </div>
      </div>

      {/* Page Title Row with Segmented Range Picker */}
      <div className="page-header">
        <div>
          <h1>Your day at a glance</h1>
          <p className="page-subtitle">Key health indicators and daily targets based on your metabolic data.</p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid cols-5">
        <Metric
          label="BMI"
          value={m.bmi}
          statusBadge={m.bmi_category}
          tone={BMI_TONE[m.bmi_category] || 'ok'}
          note="Body Mass Index"
          icon={Heart}
          variant="teal"
        />
        <Metric
          label="Daily calories"
          value={m.calorie_target}
          unit="kcal"
          statusBadge="Target"
          tone="warn"
          note={`TDEE ${Math.round(m.tdee || 0)} kcal`}
          icon={Flame}
          variant="amber"
        />
        <Metric
          label="Water target"
          value={m.water_target_ml ? (m.water_target_ml / 1000).toFixed(2) : null}
          unit="L"
          statusBadge={s.avg_water ? `${Math.round(s.avg_water)} ml avg` : 'Target'}
          tone="info"
          note={s.avg_water ? `Logged ${Math.round(s.avg_water)} ml` : '0 ml logged today'}
          icon={Droplets}
          variant="blue"
        />
        <Metric
          label="Sleep"
          value={s.avg_sleep ? s.avg_sleep.toFixed(1) : null}
          unit="h"
          statusBadge={s.avg_sleep ? 'Recorded' : 'Not logged'}
          tone={s.avg_sleep ? 'ok' : 'info'}
          note={s.avg_sleep ? 'Average of your logs' : 'Log your sleep'}
          icon={Moon}
          variant="indigo"
        />
        <Metric
          label="Current weight"
          value={s.latest_weight ?? profile.weight_kg}
          unit="kg"
          statusBadge="Recorded"
          tone="ok"
          note={`Activity: ${activityLevel}`}
          icon={Scale}
          variant="emerald"
        />
      </div>

      <div style={{ height: 24 }} />

      {/* Weekly Wellness Engagement Score Card */}
      <Card
        title="Weekly wellness engagement score"
        sub="How closely your logs tracked your personal targets over the last 7 days"
        icon={Award}
      >
        <ScorePanel score={score} />
      </Card>

      <div style={{ height: 24 }} />

      {/* Today's Recommendations Section */}
      <Card
        title="Today's suggestions"
        sub={data.source === 'hybrid'
          ? 'Rules evaluated first, then the machine learning model personalises priority ranking.'
          : 'Generated deterministically by the rule engine (ML model service is currently offline).'}
        icon={Sparkles}
      >
        {(!data.top_recommendations || data.top_recommendations.length === 0) ? (
          <EmptyState
            icon={Sparkles}
            title="No suggestions yet"
            description="Log a few days of wellness data to enable personalized daily suggestions."
            actionText="Start Logging"
            actionLink="/logs"
          />
        ) : (
          <div className="recommendations-grid">
            {data.top_recommendations.map((rule) => {
              const meta = getRecommendationMeta(rule)
              const Icon = meta.icon

              return (
                <div className={`recommendation-card ${meta.type}`} key={rule.code}>
                  <div className="rec-card-header">
                    <div className={`rec-icon-badge metric-icon-badge ${meta.badgeColor}`}>
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <span className="rec-tag">{meta.label}</span>
                  </div>

                  <div className="rec-card-body">
                    <div className="rec-headline">{rule.message}</div>
                    {rule.reason && (
                      <div className="rec-sub">{rule.reason}</div>
                    )}
                  </div>

                  <div className="rec-card-footer">
                    <Link to={meta.actionLink} className="rec-action-link">
                      <span>{meta.actionText}</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ height: 24 }} />

      {/* Progress Charts Section */}
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h2>Progress trends</h2>
          <p className="page-subtitle">Track your physical metrics and daily compliance over the past {range} days.</p>
        </div>
      </div>

      {!data.has_logs ? (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="No logs recorded in this range"
            description="Your trends, charts, and progress curves will appear as soon as you record your daily wellness logs."
            actionText="Add today's log"
            actionLink="/logs"
          />
        </Card>
      ) : (
        <div className="grid cols-2">
          <Card title="Weight trend" icon={Scale}>
            <TrendChart label="Weight" unit="kg" dates={charts.dates} values={charts.weight} />
          </Card>
          <Card title="Water intake" icon={Droplets}>
            <TrendChart
              label="Water"
              unit="ml"
              dates={charts.dates}
              values={charts.water}
              target={m.water_target_ml}
            />
          </Card>
          <Card title="Sleep duration" icon={Moon}>
            <TrendChart
              label="Sleep"
              unit="h"
              dates={charts.dates}
              values={charts.sleep}
              target={profile.sleep_hours || 7}
            />
          </Card>
          <Card title="Exercise minutes" icon={Activity}>
            <TrendChart
              label="Exercise"
              unit="min"
              dates={charts.dates}
              values={charts.exercise_minutes}
              target={30}
            />
          </Card>
          <Card title="Daily steps" icon={TrendingUp}>
            <TrendChart
              label="Steps"
              dates={charts.dates}
              values={charts.steps}
              target={8000}
            />
          </Card>
          <Card title="Calories logged" icon={Flame}>
            <TrendChart
              label="Calories"
              unit="kcal"
              dates={charts.dates}
              values={charts.calories}
              target={m.calorie_target}
            />
          </Card>
        </div>
      )}

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
