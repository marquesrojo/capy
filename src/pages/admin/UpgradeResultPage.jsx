import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function UpgradeResultPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const feature = params.get('feature')
  const called = useRef(false)

  const path = window.location.pathname
  const result = path.includes('upgrade-success') ? 'success'
    : path.includes('upgrade-failed') ? 'failure'
    : 'pending'

  // MP passes payment_id in the redirect URL — trigger webhook with anon key
  // so it works even without an active session (e.g. incognito flow).
  useEffect(() => {
    if (result !== 'success' || called.current) return
    called.current = true
    const paymentId = params.get('payment_id') || params.get('collection_id')
    if (!paymentId) return
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-upgrade-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ id: paymentId, topic: 'payment' }),
    }).catch(() => { /* best-effort */ })
  }, [result])

  const config = {
    success: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      title: '¡Pago confirmado!',
      desc: feature === 'extra_photos'
        ? 'Se acreditaron 25 fotos IA en tu cuenta. Ya podés volver a la carta y generarlas.'
        : 'El upgrade fue activado en tu cuenta.',
    },
    failure: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      title: 'El pago no se completó',
      desc: 'No se realizó ningún cargo. Podés intentarlo de nuevo desde la carta.',
    },
    pending: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      title: 'Pago en proceso',
      desc: 'El pago está siendo procesado. Cuando se confirme, los créditos se acreditarán automáticamente.',
    },
  }

  const c = config[result]

  return (
    <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center px-6">
      <div className={`w-full max-w-sm rounded-2xl border ${c.border} ${c.bg} p-6 flex flex-col items-center text-center gap-4`}>
        <div className={`w-16 h-16 rounded-2xl ${c.bg} flex items-center justify-center`}>
          {c.icon}
        </div>
        <div>
          <p className="text-smoke-100 font-bold text-lg">{c.title}</p>
          <p className="text-smoke-400 text-sm mt-1">{c.desc}</p>
        </div>
        <button
          onClick={() => navigate('/admin/carta')}
          className="mt-2 w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Volver a la carta
        </button>
      </div>
    </div>
  )
}
