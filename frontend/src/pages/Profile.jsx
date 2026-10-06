import { useEffect, useState } from 'react'
import {
  User,
  Utensils,
  Activity,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldAlert
} from 'lucide-react'
import Card from '../components/Card'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../context/ToastContext'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const BLANK = {
  age: '', gender: 'male', height_cm: '', weight_kg: '',
  activity_level: 'light', food_preference: 'vegetarian', allergies: [],
  sleep_hours: 7, goal: 'general_wellness', work_type: '', sitting_hours: '',
  water_intake_ml: '', stress_level: '', food_dislikes: '', meal_frequency: '',
  budget: '',
}

const RULES = {
  age: [10, 100, 'Age must be between 10 and 100.'],
  height_cm: [90, 250, 'Height must be between 90 and 250 cm.'],
  weight_kg: [25, 300, 'Weight must be between 25 and 300 kg.'],
  sleep_hours: [0, 24, 'Sleep hours must be between 0 and 24.'],
}

const pretty = (v) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export default function Profile() {
  const toast = useToast()
  const { data: options, loading: optionsLoading } = useApi(() => api.profileOptions(), [])
  const { data: saved, error, loading, reload } = useApi(() => api.getProfile(), [])
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (saved) {
      setForm({
        ...BLANK, ...saved,
        allergies: saved.allergies || [],
        food_dislikes: (saved.food_dislikes || []).join(', '),
        work_type: saved.work_type || '', sitting_hours: saved.sitting_hours ?? '',
        water_intake_ml: saved.water_intake_ml ?? '', stress_level: saved.stress_level ?? '',
        meal_frequency: saved.meal_frequency ?? '', budget: saved.budget || '',
      })
    }
  }, [saved])

  if (loading || optionsLoading) return <Loading label="Loading your profile data…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const change = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function validateField(name, value) {
    const rule = RULES[name]
    if (!rule) return null
    if (value === '') return 'This field is required.'
    const n = Number(value)
    if (Number.isNaN(n)) return 'Enter a number.'
    return n < rule[0] || n > rule[1] ? rule[2] : null
  }

  function toggleAllergy(tag) {
    setForm((f) => ({
      ...f,
      allergies: f.allergies.includes(tag)
        ? f.allergies.filter((a) => a !== tag)
        : [...f.allergies, tag],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    const found = {}
    Object.keys(RULES).forEach((key) => {
      const message = validateField(key, form[key])
      if (message) found[key] = message
    })
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error('Fix the highlighted fields before saving.')
      return
    }

    setBusy(true)
    try {
      await api.saveProfile({
        ...form,
        food_dislikes: form.food_dislikes,
        sitting_hours: form.sitting_hours === '' ? null : form.sitting_hours,
        water_intake_ml: form.water_intake_ml === '' ? null : form.water_intake_ml,
        stress_level: form.stress_level === '' ? null : form.stress_level,
        meal_frequency: form.meal_frequency === '' ? null : form.meal_frequency,
      })
      toast.success('Profile saved.')
      reload()
    } catch (err) {
      toast.error(err.message)
      if (err.details?.missing) {
        setErrors(Object.fromEntries(
          err.details.missing.map((f) => [f, 'This field is required.'])))
      }
    } finally {
      setBusy(false)
    }
  }

  const field = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} value={form[name]} onChange={change}
             aria-invalid={!!errors[name]}
             aria-describedby={errors[name] ? `${name}-err` : undefined} {...props} />
      {errors[name] && <div className="err" id={`${name}-err`}>{errors[name]}</div>}
    </div>
  )

  const select = (name, label, values) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} value={form[name]} onChange={change}>
        {values.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
      </select>
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My profile</h1>
          <p className="page-subtitle">
            Configure your personal biometric baselines, dietary restrictions, and lifestyle parameters.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <Card title="About you" sub="Biometrics used to calculate BMR, TDEE and calorie targets" icon={User}>
          <div className="grid cols-3">
            {field('age', 'Age', { type: 'number', min: 10, max: 100, required: true })}
            {select('gender', 'Gender', options.genders)}
            {field('height_cm', 'Height (cm)',
              { type: 'number', min: 90, max: 250, step: '0.1', required: true })}
            {field('weight_kg', 'Weight (kg)',
              { type: 'number', min: 25, max: 300, step: '0.1', required: true })}
            {select('activity_level', 'Activity level', options.activity_levels)}
            {select('goal', 'Wellness goal', options.goals)}
          </div>
        </Card>

        <div style={{ height: 20 }} />

        <Card title="Food & Dietary Preferences" sub="Filters and rules applied across meal suggestions" icon={Utensils}>
          <div className="grid cols-3">
            {select('food_preference', 'Food preference', options.food_preferences)}
            {field('sleep_hours', 'Usual sleep (hours)',
              { type: 'number', min: 0, max: 24, step: '0.5', required: true })}
            {field('food_dislikes', 'Foods you would rather avoid',
              { placeholder: 'e.g. paneer, corn' })}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ marginBottom: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={16} color="var(--rose)" />
              <span>Allergens — anything checked will be completely excluded from every meal</span>
            </label>
            <div className="grid cols-4">
              {options.allergens.map((tag) => {
                const isChecked = form.allergies.includes(tag)
                return (
                  <label
                    key={tag}
                    className={`allergy-label ${isChecked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={isChecked}
                      onChange={() => toggleAllergy(tag)}
                    />
                    <span>{pretty(tag)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </Card>

        <div style={{ height: 20 }} />

        <Card title="Lifestyle & Daily Habits" sub="Optional information that sharpens activity recommendations and ML predictions" icon={Activity}>
          <div className="grid cols-3">
            {field('work_type', 'Work type', { placeholder: 'desk, field, shift…' })}
            {field('sitting_hours', 'Sitting hours a day',
              { type: 'number', min: 0, max: 24, step: '0.5' })}
            {field('water_intake_ml', 'Usual water intake (ml)',
              { type: 'number', min: 0, max: 10000 })}
            {field('stress_level', 'Usual stress (1 low – 5 high)',
              { type: 'number', min: 1, max: 5 })}
            {field('meal_frequency', 'Meals a day', { type: 'number', min: 1, max: 8 })}
            {field('budget', 'Food budget', { placeholder: 'low, medium, high' })}
          </div>
        </Card>

        <div className="btn-row" style={{ marginTop: 24 }}>
          <button type="submit" disabled={busy} className="topbar-cta-btn" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            <Save size={16} />
            <span>{busy ? 'Saving profile…' : 'Save profile'}</span>
          </button>
        </div>
      </form>
    </>
  )
}
