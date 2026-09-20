import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { EmptyState, ErrorState, Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const pretty = (s) => (s || '').replace(/_/g, ' ')

export default function MLExplanation() {
  const { data, error, loading, reload } = useApi(() => api.mlExplanation(), [])

  if (loading) return <Loading label="Reading the model" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const importances = data.feature_importances || []
  const top = importances[0]?.importance || 1

  return (
    <>
      <h1>How the model decides</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Every number on this page comes from the trained model file and your own
        profile. Nothing here is hardcoded.
      </p>

      {!data.model_available && (
        <Card title="The model is not running">
          <EmptyState title={data.ml_enabled ? 'Model file not loaded' : 'Model switched off'}>
            ML is currently unavailable. The recommendation engine is operating using
            rules and content-based filtering. Train the model with{' '}
            <code>python -m app.training.train</code> from the <code>ai-ml</code> folder,
            or set <code>ML_ENABLED=true</code> in the backend .env file.
          </EmptyState>
        </Card>
      )}

      <div className="grid cols-4">
        <div className="metric">
          <div className="label">Model</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>{data.model_type}</div>
          <div className="note">{data.n_samples} training rows</div>
        </div>
        <div className="metric">
          <div className="label">Accuracy</div>
          <div className="value">{(data.metrics.accuracy * 100 || 0).toFixed(1)}<span> %</span></div>
          <div className="note">on the held-out test split</div>
        </div>
        <div className="metric">
          <div className="label">F1 score</div>
          <div className="value">{data.metrics.f1}</div>
          <div className="note">weighted across classes</div>
        </div>
        <div className="metric">
          <div className="label">Precision / recall</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>
            {data.metrics.precision} / {data.metrics.recall}
          </div>
          <div className="note">weighted</div>
        </div>
      </div>

      <div style={{ height: 20 }} />

      <Card title="What the model weighs most"
            sub="Feature importances read directly from the trained forest">
        {importances.map((f) => (
          <div className="imp-row" key={f.feature}>
            <span className="fname" title={f.description}>{pretty(f.feature)}</span>
            <span className="bar">
              <i style={{ width: `${(f.importance / top) * 100}%` }} />
            </span>
            <span className="fval">{f.importance.toFixed(3)}</span>
          </div>
        ))}
      </Card>

      <Card title="Your prediction right now">
        {data.prediction?.available ? (
          <>
            <p>
              Predicted focus area:{' '}
              <span className="pill ok">{data.prediction.category_label}</span>{' '}
              with confidence {data.prediction.confidence}.
            </p>
            <p>{data.prediction.explanation}</p>
            <h3>Probability across every category</h3>
            <table>
              <thead><tr><th>Category</th><th className="num">Probability</th></tr></thead>
              <tbody>
                {Object.entries(data.prediction.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p]) => (
                    <tr key={name}>
                      <td style={{ textTransform: 'capitalize' }}>{pretty(name)}</td>
                      <td className="num">{(p * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : (
          <EmptyState title="No prediction available">
            {data.prediction?.reason} Your recommendations are coming from the rule
            engine instead.
          </EmptyState>
        )}
      </Card>

      <Card title="The features your profile produced"
            sub="These fourteen numbers are exactly what the model receives">
        <table>
          <thead>
            <tr><th>Feature</th><th className="num">Your value</th><th>What it means</th></tr>
          </thead>
          <tbody>
            {Object.entries(data.your_features).map(([name, value]) => (
              <tr key={name}>
                <td style={{ textTransform: 'capitalize' }}>{pretty(name)}</td>
                <td className="num">{value}</td>
                <td style={{ color: 'var(--ink-soft)', fontSize: '.82rem' }}>
                  {data.feature_descriptions[name]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {data.confusion_matrix && (
        <Card title="Confusion matrix"
              sub="Rows are the true category, columns are what the model predicted">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>True \ predicted</th>
                  {data.confusion_labels.map((l) => (
                    <th className="num" key={l}>{pretty(l)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.confusion_matrix.map((row, i) => (
                  <tr key={data.confusion_labels[i]}>
                    <td style={{ textTransform: 'capitalize' }}>
                      {pretty(data.confusion_labels[i])}
                    </td>
                    {row.map((n, j) => (
                      <td className="num" key={j}
                          style={{ fontWeight: i === j ? 600 : 400,
                                   color: i === j ? 'var(--teal)' : 'inherit' }}>
                        {n}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Where the training data came from">
        <p>{data.data_source}</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: '.88rem' }}>
          Trained {data.trained_at ? new Date(data.trained_at).toLocaleString() : 'not yet'}.
          The model only re-ranks options that already passed your allergy and
          dietary rules, so it can never reintroduce a food you cannot eat.
        </p>
        {data.training_runs.length > 0 && (
          <table>
            <thead>
              <tr><th>Run</th><th className="num">Rows</th><th className="num">Accuracy</th>
                <th>Promoted</th></tr>
            </thead>
            <tbody>
              {data.training_runs.map((r) => (
                <tr key={r.id}>
                  <td>{(r.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td className="num">{r.n_samples}</td>
                  <td className="num">{r.accuracy}</td>
                  <td>{r.promoted ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Disclaimer />
    </>
  )
}
