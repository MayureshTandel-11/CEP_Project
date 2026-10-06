import { useEffect, useState } from 'react'
import {
  User,
  Utensils,
  Activity,
  Save,
  ShieldAlert,
  HeartPulse,
  Info
} from 'lucide-react'
import Card from '../components/Card'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../context/ToastContext'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const COMMON_CONDITIONS = [
  'Diabetes (Type 1 or Type 2)',
  'Hypertension (High Blood Pressure)',
  'High Cholesterol',
  'Thyroid Condition',
  'PCOS / PCOD',
  'Anemia',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Asthma',
  'Gastrointestinal Condition',
  'Food-Related Medical Restriction',
  'Other',
]

const BLANK = {
  age: '', gender: 'male', height_cm: '', weight_kg: '',
  activity_level: 'light', food_preference: 'vegetarian', allergies: [],
  sleep_hours: 7, goal: 'general_wellness', work_type: '', sitting_hours: '',
  water_intake_ml: '', stress_level: '', food_dislikes: '', meal_frequency: '',
  budget: '',
  medical_history: {
    has_conditions: false,
    conditions: [],
    other_condition: '',
    medications: '',
    relevant_notes: '',
  },
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
      const mh = saved.medical_history || {}
      setForm({
        ...BLANK, ...saved,
        allergies: saved.allergies || [],
        food_dislikes: (saved.food_dislikes || []).join(', '),
        work_type: saved.work_type || '', sitting_hours: saved.sitting_hours ?? '',
        water_intake_ml: saved.water_intake_ml ?? '', stress_level: saved.stress_level ?? '',
        meal_frequency: saved.meal_frequency ?? '', budget: saved.budget || '',
        medical_history: {
          has_conditions: mh.has_conditions || false,
          conditions: mh.conditions || [],
          other_condition: mh.other_condition || '',
          medications: (mh.medications || []).join(', '),
          relevant_notes: mh.relevant_notes || '',
        },
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

  /* ── Medical history helpers ── */
  function setMedical(field, value) {
    setForm((f) => ({
      ...f,
      medical_history: { ...f.medical_history, [field]: value },
    }))
  }

  function toggleCondition(condition) {
    setForm((f) => {
      const current = f.medical_history.conditions || []
      const next = current.includes(condition)
        ? current.filter((c) => c !== condition)
        : [...current, condition]
      return { ...f, medical_history: { ...f.medical_history, conditions: next } }
    })
  }

  const showsOther = form.medical_history.conditions.includes('Other')

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

    const mh = form.medical_history
    const medicationsArray = mh.medications
      ? mh.medications.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    setBusy(true)
    try {
      await api.saveProfile({
        ...form,
        food_dislikes: form.food_dislikes,
        sitting_hours: form.sitting_hours === '' ? null : form.sitting_hours,
        water_intake_ml: form.water_intake_ml === '' ? null : form.water_intake_ml,
        stress_level: form.stress_level === '' ? null : form.stress_level,
        meal_frequency: form.meal_frequency === '' ? null : form.meal_frequency,
        medical_history: {
          has_conditions: mh.has_conditions,
          conditions: mh.has_conditions ? mh.conditions : [],
          other_condition: mh.has_conditions && showsOther ? mh.other_condition : '',
          medications: medicationsArray,
          relevant_notes: mh.relevant_notes || '',
        },
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

        <div style={{ height: 20 }} />

        {/* ── Medical History Section ── */}
        <Card
          title="Medical History"
          sub="Optional — used only to personalize wellness recommendations"
          icon={HeartPulse}
        >
          {/* Privacy disclaimer */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--surface-2, rgba(0,0,0,0.04))',
            border: '1px solid var(--border, rgba(0,0,0,0.1))',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            fontSize: '0.82rem', color: 'var(--muted)',
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--teal)' }} />
            <span>
              Medical information is used <strong>only</strong> to personalize wellness recommendations.
              This application does not diagnose or treat medical conditions. This information is
              stored securely and is not shared with third parties.
            </span>
          </div>

          {/* Yes / No toggle */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, marginBottom: 10, display: 'block' }}>
              Have you been diagnosed with any medical condition?
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[false, true].map((val) => (
                <label
                  key={String(val)}
                  className={`allergy-label${form.medical_history.has_conditions === val ? ' checked' : ''}`}
                  style={{ padding: '8px 20px', cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="med_has_conditions"
                    style={{ width: 'auto', margin: 0 }}
                    checked={form.medical_history.has_conditions === val}
                    onChange={() => setMedical('has_conditions', val)}
                  />
                  <span>{val ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Condition checkboxes — only shown if Yes */}
          {form.medical_history.has_conditions && (
            <>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, marginBottom: 10, display: 'block' }}>
                  Select diagnosed conditions <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(select all that apply)</span>
                </label>
                <div className="grid cols-3">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isChecked = form.medical_history.conditions.includes(cond)
                    return (
                      <label
                        key={cond}
                        className={`allergy-label${isChecked ? ' checked' : ''}`}
                        style={{ fontSize: '0.83rem' }}
                      >
                        <input
                          type="checkbox"
                          style={{ width: 'auto', margin: 0 }}
                          checked={isChecked}
                          onChange={() => toggleCondition(cond)}
                        />
                        <span>{cond}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Other condition text field */}
              {showsOther && (
                <div className="field" style={{ marginBottom: 16 }}>
                  <label htmlFor="med_other_condition">Please specify your condition</label>
                  <input
                    id="med_other_condition"
                    type="text"
                    maxLength={200}
                    placeholder="Describe your condition briefly"
                    value={form.medical_history.other_condition}
                    onChange={(e) => setMedical('other_condition', e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* Optional medications — shown regardless of has_conditions */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="med_medications">
              Current medications <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <input
              id="med_medications"
              type="text"
              placeholder="e.g. Metformin, Levothyroxine (comma-separated)"
              value={form.medical_history.medications}
              onChange={(e) => setMedical('medications', e.target.value)}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
              This helps generate recommendations that are appropriate alongside your treatment.
            </div>
          </div>

          {/* Optional relevant notes */}
          <div className="field">
            <label htmlFor="med_relevant_notes">
              Relevant medical notes <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <textarea
              id="med_relevant_notes"
              rows={3}
              maxLength={500}
              placeholder="e.g. 'Low-sodium diet recommended by doctor', 'Avoid high-impact exercise due to joint condition'"
              value={form.medical_history.relevant_notes}
              onChange={(e) => setMedical('relevant_notes', e.target.value)}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'inherit',
                fontSize: '0.9rem', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--ink)', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
              Max 500 characters. Do not include hospital records, doctor names, or insurance details.
            </div>
          </div>
        </Card>

        <div className="btn-row" style={{ marginTop: 24 }}>
          <button type="submit" disabled={busy} className="topbar-cta-btn" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            <Save size={16} />
            <span>{busy ? 'Saving profile…' : 'Save profile'}</span>
          </button>
        </div>
      </form>

      {/* App-wide medical disclaimer */}
      <div style={{
        marginTop: 24, padding: '12px 16px', borderRadius: 8, fontSize: '0.8rem',
        color: 'var(--muted)', border: '1px solid var(--border)',
        background: 'var(--surface-2, rgba(0,0,0,0.03))',
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          This application provides general wellness guidance and is not a substitute for
          professional medical advice, diagnosis, or treatment. Always consult a qualified
          healthcare professional for medical concerns.
        </span>
      </div>
    </>
  )
}

