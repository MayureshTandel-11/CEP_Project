import { useState } from 'react'
import {
  MessageSquareQuote,
  Star,
  CheckCircle,
  TrendingUp,
  Activity,
  Send,
  Sparkles
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
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
      toast.success('Thank you — your feedback was recorded.')
      setForm(BLANK)
      history.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const numberField = (name, label, placeholder) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" step="0.1"
             placeholder={placeholder}
             value={form[name]} onChange={change} />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>User feedback</h1>
          <p className="page-subtitle">
            Feedback is stored safely for retraining iterations. It helps improve personalization without altering your baseline safety rules.
          </p>
        </div>
      </div>

      <Card
        title="Rate a plan or experience"
        sub="Help us evaluate the efficacy and realism of your generated targets"
        icon={MessageSquareQuote}
      >
        <form onSubmit={submit} noValidate>
          <div className="grid cols-2">
            <div className="field">
              <label htmlFor="recommendation_id">Select Plan / Session</label>
              <select id="recommendation_id" name="recommendation_id"
                      value={form.recommendation_id} onChange={change}>
                <option value="">General system feedback</option>
                {(recs.data || []).map((r) => (
                  <option key={r.recommendation_id} value={r.recommendation_id}>
                    {r.type} · {r.date}
                    {r.ml_prediction ? ` · ${r.ml_prediction.replace(/_/g, ' ')}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="rating" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} color="var(--amber)" />
                <span>Rating: <strong>{form.rating} of 5 Stars</strong></span>
              </label>
              <input id="rating" name="rating" type="range" min="1" max="5"
                     value={form.rating} onChange={change} style={{ marginTop: 6 }} />
            </div>
          </div>

          <div className="field" style={{ margin: '14px 0' }}>
            <label className={`allergy-label ${form.followed_plan ? 'checked' : ''}`} style={{ display: 'inline-flex' }}>
              <input type="checkbox" name="followed_plan" style={{ width: 'auto', margin: 0 }}
                     checked={form.followed_plan} onChange={change} />
              <span>I adhered to and followed this prescribed plan</span>
            </label>
          </div>

          <div className="grid cols-4">
            {numberField('weight_change', 'Weight change (kg)', 'e.g. -0.4')}
            {numberField('steps_change', 'Steps change', 'e.g. +1200')}
            {numberField('sleep_change', 'Sleep change (h)', 'e.g. +0.8')}
            {numberField('mood_change', 'Mood change (-4 to +4)', 'e.g. +1')}
          </div>

          <div className="field">
            <label htmlFor="comment">Personal qualitative observations</label>
            <textarea id="comment" name="comment" rows="3" maxLength="500"
                      placeholder="Share how you felt, energy levels, food satiety, or workout difficulty…"
                      value={form.comment} onChange={change} />
          </div>

          <div className="btn-row">
            <button type="submit" disabled={busy} className="topbar-cta-btn" style={{ padding: '9px 20px' }}>
              <Send size={15} />
              <span>{busy ? 'Submitting…' : 'Send feedback'}</span>
            </button>
          </div>
        </form>
      </Card>

      <div style={{ height: 24 }} />

      <Card
        title="Feedback Analysis & History"
        sub="Aggregated satisfaction trends and patterns"
        icon={TrendingUp}
      >
        {history.loading ? (
          <Loading label="Loading feedback records…" />
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={history.reload} />
        ) : (!history.data?.feedback || history.data.feedback.length === 0) ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="No feedback submitted yet"
            description="Rate a plan above to establish an audit trail and help improve recommendation relevance."
          />
        ) : (
          <>
            <div className="grid cols-3" style={{ marginBottom: 20 }}>
              <Metric
                label="Responses"
                value={history.data.analysis.count}
                icon={MessageSquareQuote}
                variant="blue"
                note="Total submissions"
              />
              <Metric
                label="Average rating"
                value={history.data.analysis.average_rating}
                unit="/ 5"
                icon={Star}
                variant="amber"
                note="Overall satisfaction"
              />
              <Metric
                label="Plans followed"
                value={Math.round(history.data.analysis.followed_rate * 100)}
                unit="%"
                icon={CheckCircle}
                variant="teal"
                note="Adherence percentage"
              />
            </div>

            {history.data.analysis.patterns && history.data.analysis.patterns.length > 0 && (
              <div className="why-box" style={{ marginBottom: 16 }}>
                <Sparkles size={16} className="why-icon" />
                <div className="why-content">
                  <b>Observed Patterns:</b>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {history.data.analysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Rating</th>
                    <th>Plan Followed</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.feedback.map((f) => (
                    <tr key={f.feedback_id}>
                      <td style={{ fontWeight: 600 }}>{(f.created_at || '').slice(0, 10)}</td>
                      <td className="num">
                        <span className="pill warn">
                          <Star size={11} fill="currentColor" />
                          {f.rating}/5
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${f.followed_plan ? 'ok' : 'neutral'}`}>
                          {f.followed_plan ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{f.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Disclaimer />
    </>
  )
}
