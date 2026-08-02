import { useState } from 'react'

// Una explicación que se lee una vez y después estorba.
//
// Arranca cerrada y recuerda si la abriste: quien ya entendió cómo funciona no
// tiene que volver a scrollear medio pantallazo cada vez que entra a cargar un
// precio, y quien no entendió la tiene ahí.
export default function HelpNote({ title = 'Cómo funciona', storageKey, children }) {
  const [open, setOpen] = useState(() => {
    if (!storageKey) return false
    try { return localStorage.getItem(`capy-help-${storageKey}`) === '1' } catch { return false }
  })

  function toggle() {
    const next = !open
    setOpen(next)
    if (storageKey) {
      try { localStorage.setItem(`capy-help-${storageKey}`, next ? '1' : '0') } catch { /* sin storage, no se recuerda */ }
    }
  }

  return (
    <div className="mb-4 bg-carbon-900 border border-carbon-700 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center gap-2.5 text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-ember-500/15 text-ember-500 flex items-center justify-center flex-shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" /><path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
          </svg>
        </span>
        <span className="flex-1 text-smoke-300 text-xs font-semibold">{title}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-smoke-600 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 -mt-0.5">{children}</div>}
    </div>
  )
}
