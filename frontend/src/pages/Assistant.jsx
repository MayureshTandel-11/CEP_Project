import { useState } from 'react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

export default function Assistant() {
  const status = useApi(() => api.assistantStatus(), [])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e) {
    e.preventDefault()
    const question = draft.trim()
    if (!question) return
    setMessages((list) => [...list, { who: 'me', text: question }])
    setDraft('')
    setBusy(true)
    try {
      const reply = await api.askAssistant(question)
      setMessages((list) => [...list, { who: 'bot', text: reply.reply }])
    } catch (err) {
      setMessages((list) => [...list, { who: 'bot', text: err.message }])
    } finally {
      setBusy(false)
    }
  }

  const configured = status.data?.configured

  return (
    <>
      <h1>AI assistant</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        An optional extra. Everything else in this app works whether or not it is
        switched on.
      </p>

      {status.loading ? <Loading label="Checking the assistant" /> : (
        <Card
          title="Ask a wellness question"
          sub={configured
            ? `Connected through ${status.data.provider}. Your profile and recent logs are sent as context.`
            : 'Not configured. Add an API key to the backend .env file to switch it on.'}
        >
          {!configured && (
            <p className="hint" style={{ marginBottom: 14 }}>
              The optional AI assistant is not configured. Core nutrition, activity
              and wellness recommendations are still available.
            </p>
          )}

          {messages.length > 0 && (
            <div className="chat">
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.who}`}>{m.text}</div>
              ))}
              {busy && <div className="bubble bot">Thinking…</div>}
            </div>
          )}

          <form onSubmit={send}>
            <div className="field">
              <label htmlFor="q">Your question</label>
              <input id="q" value={draft} onChange={(e) => setDraft(e.target.value)}
                     placeholder="How can I spread my water intake through the day?" />
            </div>
            <button type="submit" disabled={busy || !draft.trim()}>Send</button>
          </form>

          <p className="hint" style={{ marginTop: 14 }}>
            The assistant answers general wellness questions only. It does not
            diagnose conditions or advise on treatment.
          </p>
        </Card>
      )}

      <Disclaimer />
    </>
  )
}
