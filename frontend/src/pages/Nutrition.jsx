import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
import { ErrorState, Loading } from '../components/States'
import Why from '../components/Why'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

export default function Nutrition() {
  const { data, error, loading, reload } = useApi(() => api.nutrition(), [])

  if (loading) return <Loading label="Building your meal plan" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { plan, metrics } = data
  const t = plan.targets
  const totals = plan.totals

  return (
    <>
      <h1>Nutrition plan</h1>

      <div className="grid cols-5">
        <Metric label="Calorie target" value={t.calories} unit="kcal"
                note={`${totals.calories} kcal planned`} />
        <Metric label="Protein" value={t.protein_g} unit="g"
                note={`${totals.protein} g planned`} />
        <Metric label="Carbohydrates" value={t.carbs_g} unit="g"
                note={`${totals.carbs} g planned`} />
        <Metric label="Fat" value={t.fat_g} unit="g" note={`${totals.fat} g planned`} />
        <Metric label="Water" value={t.water_ml} unit="ml" note="Spread across the day" />
      </div>

      <div style={{ height: 20 }} />

      <Card title="Today's meals"
            sub={`Fibre target ${t.fiber_g} g · ${plan.excluded_count} foods excluded by your preferences and allergies`}>
        {ORDER.map((meal) => {
          const block = plan.meals[meal]
          if (!block) return null
          return (
            <div className="meal" key={meal}>
              <div className="meal-head">
                <h3>{meal}</h3>
                <span className="pill info">
                  {block.planned_calories} of {block.budget_calories} kcal
                </span>
              </div>
              {block.items.map((item) => (
                <div className="food" key={item.food_id}>
                  <div className="top">
                    <span className="name">{item.food_name}</span>
                    <span className="macros">{item.calories} kcal</span>
                  </div>
                  <div className="macros">
                    {item.serving_size} · P {item.protein} g · C {item.carbs} g ·
                    F {item.fat} g{item.fiber ? ` · fibre ${item.fiber} g` : ''}
                  </div>
                  <div className="reason">{item.reason}</div>
                </div>
              ))}
            </div>
          )
        })}

        <Why>{data.why}</Why>
      </Card>

      {plan.excluded_examples.length > 0 && (
        <Card title="Foods left out for you"
              sub="A sample of what your preferences and allergies removed">
          <table>
            <thead>
              <tr><th>Food</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {plan.excluded_examples.map((row) => (
                <tr key={row.food_name}>
                  <td>{row.food_name}</td>
                  <td>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="How your targets were worked out">
        <table>
          <tbody>
            <tr><td>BMI</td><td className="num">{metrics.bmi} ({metrics.bmi_category})</td></tr>
            <tr><td>BMR (Mifflin-St Jeor)</td><td className="num">{metrics.bmr} kcal</td></tr>
            <tr><td>TDEE (BMR × activity factor)</td><td className="num">{metrics.tdee} kcal</td></tr>
            <tr>
              <td>Goal adjustment</td>
              <td className="num">
                {metrics.calorie_adjustment_pct > 0 ? '+' : ''}
                {metrics.calorie_adjustment_pct}%
              </td>
            </tr>
            <tr><td>Daily target</td><td className="num">{metrics.calorie_target} kcal</td></tr>
          </tbody>
        </table>
      </Card>

      <Disclaimer text={data.disclaimer} />
    </>
  )
}
