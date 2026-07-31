import { useEffect, useState } from 'react'

// Aviso de versión nueva.
//
// Un deploy no llega solo al teléfono: el navegador —y sobre todo la app
// instalada en el inicio— se queda con el bundle que ya tiene. Así el local
// sigue operando con una versión vieja durante días sin enterarse, y lo que se
// arregla hoy para él no existe.
//
// Se compara el script que está corriendo contra el del index publicado. Si
// cambió, hay versión nueva.
const CHECK_EVERY_MS = 5 * 60 * 1000

function currentBundle() {
  const el = document.querySelector('script[type="module"][src]')
  return el?.getAttribute('src') || null
}

async function fetchLatestBundle() {
  const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return null
  const html = await res.text()
  return html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1] || null
}

export default function UpdateBanner() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const mine = currentBundle()
    // En desarrollo el script es siempre el mismo y no hay nada que comparar
    if (!mine || !mine.includes('/assets/')) return

    let cancelled = false
    async function check() {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const latest = await fetchLatestBundle()
        if (!cancelled && latest && latest !== mine) setReady(true)
      } catch { /* sin conexión: se reintenta en el próximo turno */ }
    }

    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    // Volver a la app es el momento más probable de encontrar algo nuevo,
    // y es cuando el navegador venía de congelar los timers
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!ready || dismissed) return null

  return (
    <div
      className="fixed left-3 right-3 z-[60] flex items-center gap-3 bg-[#1A2332] text-white rounded-2xl shadow-xl px-4 py-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      role="status"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Hay una versión nueva</p>
        <p className="text-white/60 text-xs mt-0.5 leading-tight">Actualizá para ver los últimos cambios</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-[#1A2332] font-bold text-sm px-4 py-2 rounded-xl flex-shrink-0"
      >
        Actualizar
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Ahora no"
        className="text-white/50 text-lg leading-none px-1 flex-shrink-0"
      >
        ✕
      </button>
    </div>
  )
}
