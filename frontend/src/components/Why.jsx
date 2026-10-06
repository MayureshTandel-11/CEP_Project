import { Sparkles } from 'lucide-react'

/** The "Why this recommendation?" block used across plan views. */
export default function Why({ text, children }) {
  const content = text || children
  if (!content) return null

  return (
    <div className="why-box">
      <Sparkles size={18} className="why-icon" />
      <div className="why-content">
        <b>Why this recommendation?</b> {content}
      </div>
    </div>
  )
}
