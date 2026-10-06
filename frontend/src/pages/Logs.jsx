import { useState } from 'react'
import {
  Calendar,
  Scale,
  Droplets,
  Moon,
  Footprints,
  Flame,
  Utensils,
  Smile,
  AlertTriangle,
  PlusCircle,
  Trash2,
  ClipboardList,
  Sparkles
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import RangePicker from '../components/RangePicker'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useToast } from '../context/ToastContext'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const today = () => new Date().toISOString().slice(0, 10)
const BLANK = {
  date: today(), weight: '', water: '', sleep: '', steps: '',
  exercise_minutes: '', calories: '', mood: '3', stress: '3', notes: '',
}

const MOOD_EMOJIS = {
  '1': '😞 Very low',
  '2': '🙁 Low',
  '3': '😐 Neutral',
  '4': '🙂 Good',
  '5': '😄 Excellent'
}

const STRESS_LABELS = {
  '1': '😌 Very low',
  '2': '🟢 Mild',
  '3': '🟡 Moderate',
  '4': '🟠 Elevated',
  '5': '🔴 Severe'
}

export default function Logs() {
  const toast = useToast()
  const [range, setRange] = useState(7)
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useApi(() => api.listLogs(range), [range])
  const tips = useApi(() => api.wellness(), [])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== ''))
      await api.createLog(payload)
      toast.success('Daily wellness log saved.')
      setForm({ ...BLANK, date: form.date })
      reload()
      tips.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    try {
      await api.deleteLog(id)
      toast.success('Log deleted.')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const field = (name, label, icon, props = {}) => (
    <div className="field">
      <label htmlFor={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span>{label}</span>
      </label>
      <input id={name} name={name} value={form[name]} onChange={change} {...props} />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Wellness log</h1>
          <p className="page-subtitle">
            Log your daily metabolic variables and recovery scores to power your trends and predictions.
          </p>
        </div>
      </div>

      <Card
        title="Record a day"
        sub="Saving an entry for an existing date updates that record automatically."
        icon={ClipboardList}
      >
        <form onSubmit={submit} noValidate>
          <div className="grid cols-4">
            {field('date', 'Date', <Calendar size={14} color="var(--teal)" />, { type: 'date', max: today(), required: true })}
            {field('weight', 'Weight (kg)', <Scale size={14} color="var(--emerald)" />, { type: 'number', step: '0.1', min: 25, max: 300, placeholder: 'e.g. 72.5' })}
            {field('water', 'Water intake (ml)', <Droplets size={14} color="var(--blue)" />, { type: 'number', min: 0, max: 10000, placeholder: 'e.g. 2500' })}
            {field('sleep', 'Sleep (hours)', <Moon size={14} color="var(--indigo)" />, { type: 'number', step: '0.1', min: 0, max: 24, placeholder: 'e.g. 7.5' })}
            {field('steps', 'Daily steps', <Footprints size={14} color="var(--teal)" />, { type: 'number', min: 0, max: 100000, placeholder: 'e.g. 8500' })}
            {field('exercise_minutes', 'Exercise (mins)', <Flame size={14} color="var(--amber)" />, { type: 'number', min: 0, max: 1440, placeholder: 'e.g. 45' })}
            {field('calories', 'Calories consumed', <Utensils size={14} color="var(--rose)" />, { type: 'number', min: 0, max: 10000, placeholder: 'e.g. 2100' })}

            <div className="field">
              <label htmlFor="mood" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smile size={14} color="var(--emerald)" />
                <span>Mood: {MOOD_EMOJIS[form.mood]}</span>
              </label>
              <input
                id="mood"
                name="mood"
                type="range"
                min="1"
                max="5"
                value={form.mood}
                onChange={change}
                style={{ marginTop: 6 }}
              />
            </div>

            <div className="field">
              <label htmlFor="stress" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} color="var(--amber)" />
                <span>Stress: {STRESS_LABELS[form.stress]}</span>
              </label>
              <input
                id="stress"
                name="stress"
                type="range"
                min="1"
                max="5"
                value={form.stress}
                onChange={change}
                style={{ marginTop: 6 }}
              />
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="submit" disabled={busy} className="topbar-cta-btn" style={{ padding: '9px 20px' }}>
              <PlusCircle size={16} />
              <span>{busy ? 'Saving entry…' : 'Save log'}</span>
            </button>
          </div>
        </form>
      </Card>

      <div style={{ height: 24 }} />

      <Card
        title="Suggestions from your logs"
        sub="Algorithmic suggestions triggered by your logged inputs"
        icon={Sparkles}
      >
        {tips.loading ? (
          <Loading label="Analyzing your wellness logs…" />
        ) : tips.error ? (
          <ErrorState error={tips.error} onRetry={tips.reload} />
        ) : (!tips.data?.tips || tips.data.tips.length === 0) ? (
          <EmptyState
            icon={Sparkles}
            title="No suggestions yet"
            description="Log your daily data consistently to unlock personalized wellness tips."
          />
        ) : (
          <div className="recommendations-grid">
            {tips.data.tips.map((tip) => (
              <div className="recommendation-card" key={tip.code}>
                <div className="rec-card-header">
                  <div className="rec-icon-badge metric-icon-badge teal">
                    <Sparkles size={16} strokeWidth={2.2} />
                  </div>
                  <span className="rec-tag">{(tip.code || '').replace(/_/g, ' ')}</span>
                </div>
                <div className="rec-card-body">
                  <div className="rec-headline">{tip.message}</div>
                  {tip.reason && <div className="rec-sub">{tip.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ height: 24 }} />

      <Card
        title="Log History"
        sub={`Records from the past ${range} days`}
        icon={Calendar}
        actions={<RangePicker value={range} onChange={setRange} />}
      >
        {loading ? (
          <Loading label="Loading log history…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (!data?.logs || data.logs.length === 0) ? (
          <EmptyState
            icon={Calendar}
            title="No logs found"
            description={`You haven't recorded any logs in the last ${range} days.`}
          />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Weight</th>
                  <th className="num">Water</th>
                  <th className="num">Sleep</th>
                  <th className="num">Steps</th>
                  <th className="num">Exercise</th>
                  <th className="num">Mood</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.log_id}>
                    <td style={{ fontWeight: 600 }}>{log.date}</td>
                    <td className="num">{log.weight ? `${log.weight} kg` : '—'}</td>
                    <td className="num">{log.water ? `${log.water} ml` : '—'}</td>
                    <td className="num">{log.sleep ? `${log.sleep} h` : '—'}</td>
                    <td className="num">{log.steps ? log.steps.toLocaleString() : '—'}</td>
                    <td className="num">{log.exercise_minutes ? `${log.exercise_minutes} m` : '—'}</td>
                    <td className="num">
                      {log.mood ? (
                        <span className="pill neutral" style={{ fontSize: '0.74rem' }}>
                          {log.mood}/5
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}
                        onClick={() => remove(log.log_id)}
                        aria-label={`Delete log for ${log.date}`}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Disclaimer />
    </>
  )
}
