import {
  BrainCircuit,
  Cpu,
  Award,
  TrendingUp,
  Activity,
  Layers,
  Database,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import Metric from '../components/Metric'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const pretty = (s) => (s || '').replace(/_/g, ' ')

export default function MLExplanation() {
  const { data, error, loading, reload } = useApi(() => api.mlExplanation(), [])

  if (loading) return <Loading label="Retrieving Random Forest model parameters & weights…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const importances = data.feature_importances || []
  const top = importances[0]?.importance || 1

  return (
    <>
      <div className="page-header">
        <div>
          <h1>How the model decides</h1>
          <p className="page-subtitle">
            Auditable machine learning transparency. Every metric and feature weight shown here reflects the active scikit-learn model and your profile inputs.
          </p>
        </div>
        <span className={`pill ${data.model_available ? 'ok' : 'warn'}`}>
          <Cpu size={13} />
          <span>{data.model_available ? 'Model Online' : 'Model Offline (Using Rules)'}</span>
        </span>
      </div>

      {!data.model_available && (
        <Card title="Machine Learning Service Notice" icon={AlertTriangle}>
          <EmptyState
            icon={Cpu}
            title={data.ml_enabled ? 'Model weights not loaded' : 'ML service not connected'}
            description="The recommendation engine is currently falling back to deterministic safety rules and content-based ranking. Core app functionality is unaffected."
          />
        </Card>
      )}

      {/* Model Performance KPIs */}
      <div className="grid cols-4">
        <Metric
          label="Model architecture"
          value={data.model_type}
          note={`${data.n_samples} training samples`}
          icon={Cpu}
          variant="teal"
        />
        <Metric
          label="Test accuracy"
          value={(data.metrics.accuracy * 100 || 0).toFixed(1)}
          unit="%"
          note="Held-out validation split"
          icon={Award}
          variant="emerald"
        />
        <Metric
          label="F1 score"
          value={data.metrics.f1}
          note="Weighted across categories"
          icon={TrendingUp}
          variant="indigo"
        />
        <Metric
          label="Precision / Recall"
          value={`${data.metrics.precision} / ${data.metrics.recall}`}
          note="Balanced macro scores"
          icon={Activity}
          variant="blue"
        />
      </div>

      <div style={{ height: 24 }} />

      {/* Feature Importances */}
      <Card
        title="Feature Importance Hierarchy"
        sub="Relative weight assigned to each variable by the trained ensemble forest"
        icon={Layers}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {importances.map((f) => {
            const pct = Math.min(100, Math.max(0, (f.importance / top) * 100))

            return (
              <div className="imp-row" key={f.feature}>
                <span className="imp-fname" title={f.description}>
                  {pretty(f.feature)}
                </span>
                <div className="modern-progress-track">
                  <div
                    className="modern-progress-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="imp-fval">
                  {f.importance.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ height: 24 }} />

      {/* Prediction Output */}
      <Card
        title="Your Current Prediction"
        sub="Inferred primary focus category based on your 14 biometric variables"
        icon={BrainCircuit}
      >
        {data.prediction?.available ? (
          <>
            <div className="why-box" style={{ marginTop: 0, marginBottom: 18 }}>
              <BrainCircuit size={18} className="why-icon" />
              <div className="why-content">
                <div>
                  Primary focus predicted:{' '}
                  <span className="pill ok" style={{ textTransform: 'capitalize', margin: '0 4px' }}>
                    {pretty(data.prediction.category_label)}
                  </span>{' '}
                  with <strong>{Math.round(data.prediction.confidence * 100)}% confidence</strong>.
                </div>
                <div style={{ marginTop: 4, fontSize: '0.82rem' }}>{data.prediction.explanation}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.94rem', marginBottom: 10 }}>Probability distribution across all categories</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ width: '40%' }}>Probability Bar</th>
                    <th className="num">Calculated Likelihood</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.prediction.probabilities || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, p]) => (
                      <tr key={name}>
                        <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{pretty(name)}</td>
                        <td>
                          <div className="modern-progress-track" style={{ height: 6 }}>
                            <div
                              className="modern-progress-fill"
                              style={{ width: `${Math.round(p * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="num" style={{ fontWeight: 700 }}>
                          {(p * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={BrainCircuit}
            title="No prediction calculated"
            description={data.prediction?.reason || 'Recommendations are currently generated by the rule engine.'}
          />
        )}
      </Card>

      <div style={{ height: 24 }} />

      {/* Feature Values */}
      <Card
        title="Features derived from your profile"
        sub="The exact 14 normalized values passed into the Random Forest inference vector"
        icon={Cpu}
      >
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Feature Name</th>
                <th className="num">Your Value</th>
                <th>Meaning & Normalization</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.your_features || {}).map(([name, value]) => (
                <tr key={name}>
                  <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{pretty(name)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--teal-800)' }}>{value}</td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: '0.8rem' }}>
                    {data.feature_descriptions?.[name] || 'Normalized input metric'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confusion Matrix */}
      {data.confusion_matrix && (
        <>
          <div style={{ height: 24 }} />
          <Card
            title="Model Confusion Matrix"
            sub="Validation split: Rows represent ground truth; columns indicate model predictions"
            icon={Layers}
          >
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>True \ Predicted</th>
                    {data.confusion_labels.map((l) => (
                      <th className="num" key={l} style={{ textTransform: 'capitalize' }}>
                        {pretty(l)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.confusion_matrix.map((row, i) => (
                    <tr key={data.confusion_labels[i]}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {pretty(data.confusion_labels[i])}
                      </td>
                      {row.map((n, j) => (
                        <td
                          className="num"
                          key={j}
                          style={{
                            fontWeight: i === j ? 700 : 400,
                            color: i === j ? 'var(--teal)' : 'var(--ink-soft)',
                            background: i === j ? 'var(--teal-soft)' : 'transparent',
                          }}
                        >
                          {n}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <div style={{ height: 24 }} />

      {/* Dataset & Training Provenance */}
      <Card
        title="Training Dataset & Governance"
        sub="Provenance and model iteration tracking"
        icon={Database}
      >
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink)' }}>{data.data_source}</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: 6 }}>
          Last trained: <strong>{data.trained_at ? new Date(data.trained_at).toLocaleString() : 'Not recorded'}</strong>.
          Safety guarantee: The machine learning model strictly re-ranks recommendations that have passed deterministic allergen and medical exclusion rules.
        </p>

        {data.training_runs && data.training_runs.length > 0 && (
          <div className="table-container" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Training Run Timestamp</th>
                  <th className="num">Sample Rows</th>
                  <th className="num">Validation Accuracy</th>
                  <th>Production Status</th>
                </tr>
              </thead>
              <tbody>
                {data.training_runs.map((r) => (
                  <tr key={r.id}>
                    <td>{(r.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                    <td className="num">{r.n_samples}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{(r.accuracy * 100).toFixed(1)}%</td>
                    <td>
                      <span className={`pill ${r.promoted ? 'ok' : 'neutral'}`}>
                        {r.promoted ? 'Promoted' : 'Archived'}
                      </span>
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
