import { useState } from 'react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useToast } from '../context/ToastContext'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const BLANK = {
  recommendation_id: '', rating: '4', followed_plan: false,
  weight_change: '', steps_change: '', sleep_change: '', mood_change: '', comment: '',
}

export default function Feedback() {
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)
  const recs = useApi(() => api.recentRecommendations(), [])
  const history = useApi(() => api.listFeedback(), [])

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== ''))
      await api.sendFeedback(payload)
      toast.success('Thanks — your feedback was saved.')
      setForm(BLANK)
      history.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const numberField = (name, label) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" step="0.1"
             value={form[name]} onChange={change} />
    </div>
  )

  return (
    <>
      <h1>Feedback</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Feedback is stored for later model retraining. It never changes your health
        settings on its own.
      </p>

      <Card title="Rate a plan">
        <form onSubmit={submit} noValidate>
          <div className="grid cols-2">
            <div className="field">
              <label htmlFor="recommendation_id">Which plan?</label>
              <select id="recommendation_id" name="recommendation_id"
                      value={form.recommendation_id} onChange={change}>
                <option value="">General feedback</option>
                {(recs.data || []).map((r) => (
                  <option key={r.recommendation_id} value={r.recommendation_id}>
                    {r.type} · {r.date}
                    {r.ml_prediction ? ` · ${r.ml_prediction.replace(/_/g, ' ')}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rating">Rating (1 poor – 5 great)</label>
              <input id="rating" name="rating" type="range" min="1" max="5"
                     value={form.rating} onChange={change} />
              <div className="hint">Currently {form.rating}</div>
            </div>
          </div>

          <div className="field">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" name="followed_plan" style={{ width: 'auto' }}
                     checked={form.followed_plan} onChange={change} />
              I followed this plan
            </label>
          </div>

          <div className="grid cols-4">
            {numberField('weight_change', 'Weight change (kg)')}
            {numberField('steps_change', 'Steps change')}
            {numberField('sleep_change', 'Sleep change (h)')}
            {numberField('mood_change', 'Mood change (-4 to +4)')}
          </div>

          <div className="field">
            <label htmlFor="comment">Anything else?</label>
            <textarea id="comment" name="comment" rows="3" maxLength="500"
                      value={form.comment} onChange={change} />
          </div>

          <button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      </Card>

      <Card title="What your feedback shows">
        {history.loading ? <Loading label="Loading feedback" />
          : history.error ? <ErrorState error={history.error} onRetry={history.reload} />
          : history.data.feedback.length === 0
            ? <EmptyState>No feedback yet. Rate a plan above to get started.</EmptyState>
            : (
              <>
                <div className="grid cols-3" style={{ marginBottom: 16 }}>
                  <div className="metric">
                    <div className="label">Responses</div>
                    <div className="value">{history.data.analysis.count}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Average rating</div>
                    <div className="value">{history.data.analysis.average_rating}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Plans followed</div>
                    <div className="value">
                      {Math.round(history.data.analysis.followed_rate * 100)}
                      <span> %</span>
                    </div>
                  </div>
                </div>
                <ul style={{ paddingLeft: 18 }}>
                  {history.data.analysis.patterns.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <table>
                  <thead>
                    <tr><th>Date</th><th className="num">Rating</th>
                      <th>Followed</th><th>Comment</th></tr>
                  </thead>
                  <tbody>
                    {history.data.feedback.map((f) => (
                      <tr key={f.feedback_id}>
                        <td>{(f.created_at || '').slice(0, 10)}</td>
                        <td className="num">{f.rating}</td>
                        <td>{f.followed_plan ? 'Yes' : 'No'}</td>
                        <td>{f.comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
      </Card>

      <Disclaimer />
    </>
  )
}
