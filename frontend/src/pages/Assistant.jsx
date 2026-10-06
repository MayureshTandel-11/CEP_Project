import { useState } from 'react'
import {
  Bot,
  Send,
  Sparkles,
  User,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Card from '../components/Card'
import Disclaimer from '../components/Disclaimer'
import { Loading } from '../components/States'
import useApi from '../hooks/useApi'
import { api } from '../services/api'

const PROMPT_CHIPS = [
  'How can I spread my water intake across the day?',
  'What are balanced pre-workout snack ideas?',
  'How does sleep quality impact recovery & metabolism?',
  'Suggestions for staying active during desk work'
]

export default function Assistant() {
  const status = useApi(() => api.assistantStatus(), [])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e) {
    if (e) e.preventDefault()
    const question = draft.trim()
    if (!question || busy) return

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

  function usePrompt(chip) {
    setDraft(chip)
  }

  const configured = status.data?.configured

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI assistant</h1>
          <p className="page-subtitle">
            Context-aware conversational wellness guidance. Uses your profile data and recent logs as non-identifiable context.
          </p>
        </div>
        {status.data && (
          <span className={`pill ${configured ? 'ok' : 'neutral'}`}>
            <Bot size={13} />
            <span>{configured ? `Connected: ${status.data.provider}` : 'API Key Not Set'}</span>
          </span>
        )}
      </div>

      {status.loading ? (
        <Loading label="Connecting to AI assistant service…" />
      ) : (
        <Card
          title="Wellness Assistant"
          sub={configured
            ? `Connected via ${status.data.provider}. Your dietary preferences and logs are available to inform responses.`
            : 'Assistant offline. Add an OpenAI, Gemini, or Llama API key to backend .env to enable generative replies.'}
          icon={Bot}
        >
          {!configured && (
            <div className="why-box" style={{ marginBottom: 16, borderColor: 'var(--amber-border)', background: 'var(--amber-soft)' }}>
              <AlertCircle size={18} color="var(--amber)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--amber-hover)' }}>Generative model is currently offline:</strong>{' '}
                Core nutrition, activity, rules, and machine learning scoring operate normally without this service.
              </div>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggested inquiries
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {PROMPT_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: 'var(--r-full)' }}
                  onClick={() => usePrompt(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          {messages.length > 0 && (
            <div className="chat-window">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble-row ${m.who}`}>
                  {m.who === 'bot' && (
                    <div className="metric-icon-badge teal" style={{ width: 28, height: 28 }}>
                      <Sparkles size={14} />
                    </div>
                  )}
                  <div className={`bubble ${m.who}`}>
                    {m.text}
                  </div>
                  {m.who === 'me' && (
                    <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                      You
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="chat-bubble-row">
                  <div className="metric-icon-badge teal" style={{ width: 28, height: 28 }}>
                    <Sparkles size={14} />
                  </div>
                  <div className="bubble bot" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="modern-spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Generating response…</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Form */}
          <form onSubmit={send}>
            <div className="field">
              <label htmlFor="q">Ask a health, nutrition, or activity question</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="q"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. How can I optimize my sleep consistency this week?"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="topbar-cta-btn"
                  style={{ padding: '0 20px', borderRadius: 'var(--r-sm)' }}
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </form>

          <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', marginTop: 12, marginBottom: 0 }}>
            The AI assistant addresses general wellness concepts only. It does not provide medical diagnoses, prescriptions, or clinical treatments.
          </p>
        </Card>
      )}

      <Disclaimer />
    </>
  )
}
