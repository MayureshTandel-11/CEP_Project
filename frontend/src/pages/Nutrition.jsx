import {
  UtensilsCrossed,
  Flame,
  Award,
  Droplets,
  Sparkles,
  Sun,
  Sunset,
  Coffee,
  Apple,
  Calculator,
  ShieldCheck,
  Info,
  Brain,
  AlertTriangle,
  Stethoscope
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
import { ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Sunset,
  snack: Apple,
}

export default function Nutrition() {
  const { data, error, loading, reload } = useApi(() => api.nutrition(), [])

  if (loading) return <Loading label="Generating your personalized meal plan…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { plan, metrics } = data
  const t = plan.targets || {}
  const totals = plan.totals || {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Nutrition plan</h1>
          <p className="page-subtitle">
            Personalized meal targets formulated from your metabolic expenditure and dietary rules.
          </p>
        </div>
      </div>

      <div className="grid cols-5">
        <Metric
          label="Calorie target"
          value={t.calories}
          unit="kcal"
          statusBadge={`${totals.calories ?? 0} kcal planned`}
          tone="warn"
          note="Daily caloric budget"
          icon={Flame}
          variant="amber"
        />
        <Metric
          label="Protein"
          value={t.protein_g}
          unit="g"
          statusBadge={`${totals.protein ?? 0} g planned`}
          tone="ok"
          note="Satiety & repair"
          icon={Award}
          variant="teal"
        />
        <Metric
          label="Carbohydrates"
          value={t.carbs_g}
          unit="g"
          statusBadge={`${totals.carbs ?? 0} g planned`}
          tone="info"
          note="Daily fuel"
          icon={Flame}
          variant="blue"
        />
        <Metric
          label="Fat"
          value={t.fat_g}
          unit="g"
          statusBadge={`${totals.fat ?? 0} g planned`}
          tone="ok"
          note="Essential lipids"
          icon={Sparkles}
          variant="rose"
        />
        <Metric
          label="Water target"
          value={t.water_ml ? (t.water_ml / 1000).toFixed(1) : null}
          unit="L"
          statusBadge="Daily goal"
          tone="info"
          note="Spread across the day"
          icon={Droplets}
          variant="blue"
        />
      </div>

      <div style={{ height: 24 }} />

      {/* LLM-generated nutrition recommendations (when AI is active) */}
      {data.llm_recommendations?.nutrition?.length > 0 && (
        <>
          {/* Medical safety banners */}
          {data.llm_recommendations.professional_guidance && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem',
            }}>
              <Stethoscope size={18} style={{ flexShrink: 0, marginTop: 1, color: '#d97706' }} />
              <span>
                <strong>Professional guidance recommended.</strong> Based on your profile, consider
                discussing significant dietary changes with a healthcare professional.
              </span>
            </div>
          )}
          {data.llm_recommendations.medical_safety?.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.84rem',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#6366f1' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Medical context considered:</strong>
                {data.llm_recommendations.medical_safety.map((note, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>• {note}</div>
                ))}
              </div>
            </div>
          )}

          <Card
            title="AI Nutrition Guidance"
            sub={`Personalized by AI · Meal plan below uses your dietary rules`}
            icon={Brain}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.llm_recommendations.summary && (
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', margin: 0, fontStyle: 'italic' }}>
                  {data.llm_recommendations.summary}
                </p>
              )}
              {data.llm_recommendations.nutrition.map((rec, i) => (
                <div className="food-item" key={i}>
                  <div className="food-top">
                    <span className="food-name">{rec.title}</span>
                    <span className={`pill ${rec.priority === 'high' ? 'warn' : rec.priority === 'low' ? 'ok' : 'info'}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink)', marginTop: 4 }}>{rec.description}</div>
                  {rec.reason && (
                    <div className="food-reason" style={{ marginTop: 4 }}>
                      <span style={{ fontWeight: 600 }}>Why:</span> {rec.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <div style={{ height: 24 }} />
        </>
      )}

      <Card
        title="Today's meals"
        sub={`Fibre target: ${t.fiber_g ?? 0} g · ${plan.excluded_count} foods excluded by your allergies & preferences`}
        icon={UtensilsCrossed}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ORDER.map((meal) => {
            const block = plan.meals[meal]
            if (!block) return null
            const MealIcon = MEAL_ICONS[meal] || UtensilsCrossed

            return (
              <div className="meal-block" key={meal}>
                <div className="meal-header">
                  <div className="meal-title-group">
                    <MealIcon size={18} style={{ color: 'var(--teal)' }} />
                    <h3>{meal}</h3>
                  </div>
                  <span className="pill info">
                    {block.planned_calories} of {block.budget_calories} kcal
                  </span>
                </div>

                <div>
                  {block.items.map((item) => (
                    <div className="food-item" key={item.food_id}>
                      <div className="food-top">
                        <span className="food-name">{item.food_name}</span>
                        <span className="food-calories-pill">{item.calories} kcal</span>
                      </div>
                      <div className="food-macros">
                        {item.serving_size} · Protein {item.protein} g · Carbs {item.carbs} g · Fat {item.fat} g
                        {item.fiber ? ` · Fibre ${item.fiber} g` : ''}
                      </div>
                      {item.reason && (
                        <div className="food-reason">
                          <span style={{ fontWeight: 600 }}>Why:</span> {item.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <Why>{data.why}</Why>
      </Card>

      {plan.excluded_examples && plan.excluded_examples.length > 0 && (
        <>
          <div style={{ height: 24 }} />
          <Card
            title="Foods left out for you"
            sub="A transparent sample of items filtered out by your dietary rules and recorded allergens"
            icon={ShieldCheck}
          >
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Filtered Food Item</th>
                    <th>Reason For Exclusion</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.excluded_examples.map((row) => (
                    <tr key={row.food_name}>
                      <td style={{ fontWeight: 600 }}>{row.food_name}</td>
                      <td>
                        <span className="pill warn">{row.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <div style={{ height: 24 }} />

      <Card
        title="How your targets were worked out"
        sub="Deterministic metabolic calculation breakdown"
        icon={Calculator}
      >
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Metabolic Factor</th>
                <th className="num">Computed Target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Body Mass Index (BMI)</td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {metrics.bmi} <span className="pill ok" style={{ marginLeft: 8 }}>{metrics.bmi_category}</span>
                </td>
              </tr>
              <tr>
                <td>Basal Metabolic Rate (BMR via Mifflin-St Jeor formula)</td>
                <td className="num" style={{ fontWeight: 600 }}>{metrics.bmr} kcal</td>
              </tr>
              <tr>
                <td>Total Daily Energy Expenditure (TDEE = BMR × Activity Factor)</td>
                <td className="num" style={{ fontWeight: 600 }}>{metrics.tdee} kcal</td>
              </tr>
              <tr>
                <td>Goal-based Adjustment Percentage</td>
                <td className="num" style={{ fontWeight: 600, color: 'var(--teal)' }}>
                  {metrics.calorie_adjustment_pct > 0 ? '+' : ''}
                  {metrics.calorie_adjustment_pct}%
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Final Daily Calorie Target</td>
                <td className="num" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>
                  {metrics.calorie_target} kcal
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
