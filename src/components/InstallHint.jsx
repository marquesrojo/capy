import { useEffect, useState } from 'react'

// Invitación a instalar la app del local.
//
// No aparece en la primera visita: a alguien que entró una vez no le sirve de
// nada tener el ícono, y el aviso le roba lugar a lo único que vino a hacer.
// Recién cuando vuelve —ahí ya es un cliente del local— la propuesta tiene
// sentido: entrar de un toque en vez de escanear el QR cada vez.
const VISITS_KEY = 'capy-visits'
const DISMISS_KEY = 'capy-install-dismissed'
const MIN_VISITS = 2

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPad moderno se declara Mac; el touch lo delata
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function InstallHint({ venueId, venueName, accent = '#1A3A6B' }) {
  const [show, setShow] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [prompt, setPrompt] = useState(window._pwaInstallPrompt || null)

  useEffect(() => {
    if (!venueId || isStandalone()) return
    try {
      if (localStorage.getItem(`${DISMISS_KEY}-${venueId}`) === '1') return
      const key = `${VISITS_KEY}-${venueId}`
      const visits = Number(localStorage.getItem(key) || 0) + 1
      localStorage.setItem(key, String(visits))
      if (visits >= MIN_VISITS) setShow(true)
    } catch { /* sin localStorage no hay forma de saber si volvió */ }
  }, [venueId])

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); window._pwaInstallPrompt = e; setPrompt(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(`${DISMISS_KEY}-${venueId}`, '1') } catch { /* nada que guardar */ }
  }

  async function install() {
    // Android y escritorio tienen instalación nativa; en iPhone hay que
    // explicar los pasos porque Safari no ofrece ningún botón
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      window._pwaInstallPrompt = null
      setPrompt(null)
      if (outcome === 'accepted') dismiss()
      return
    }
    setShowSteps(true)
  }

  if (!show) return null

  return (
    <>
      <div className="px-4 pt-3">
        <div className="bg-white border border-black/[0.06] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2.5" />
              <path d="M12 6v6M9 9l3-3 3 3" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[#1A2332] text-sm font-bold leading-tight">
              ¿Venís seguido{venueName ? ` a ${venueName}` : ''}?
            </p>
            <p className="text-[#6B7A8D] text-xs mt-0.5 leading-snug">
              Guardalo en tu celular y pedí sin escanear el QR
            </p>
          </div>
          <button
            onClick={install}
            className="text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0 text-white"
            style={{ backgroundColor: accent }}
          >
            Guardar
          </button>
          <button onClick={dismiss} aria-label="Ahora no" className="text-[#C0CBDA] text-lg leading-none px-1 flex-shrink-0">
            ✕
          </button>
        </div>
      </div>

      {showSteps && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSteps(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-black text-[#1A2332] text-base">Guardalo en tu celular</p>
              <button onClick={() => setShowSteps(false)} className="text-[#C0CBDA] text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              {(isIOS()
                ? [
                    'Tocá el botón Compartir, abajo en Safari',
                    'Deslizá y tocá "Agregar a pantalla de inicio"',
                    'Confirmá tocando "Agregar"',
                  ]
                : [
                    'Abrí el menú del navegador (los tres puntos)',
                    'Tocá "Instalar app" o "Agregar a pantalla principal"',
                    'Confirmá y listo',
                  ]
              ).map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[#4A5568] text-sm leading-snug">{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowSteps(false); dismiss() }}
              className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: accent }}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  )
}
