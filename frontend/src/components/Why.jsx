/** The "Why this recommendation?" block used across every plan view. */
export default function Why({ children }) {
  if (!children) return null
  return (
    <div className="why">
      <b>Why this recommendation?</b> {children}
    </div>
  )
}
