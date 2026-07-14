import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function UpgradeResultPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const called = useRef(false)
  // 'loading' while webhook runs; 'ok' | 'already' | 'error' after
  const [creditStatus, setCreditStatus] = useState('loading')

  const path = window.location.pathname
  const result = path.includes('upgrade-success') ? 'success'
    : path.includes('upgrade-failed') ? 'failure'
    : 'pending'

  const feature = params.get('feature')

  useEffect(() => {
    if (result !== 'success' || called.current) return
    called.current = true
    const paymentId = params.get('payment_id') || params.get('collection_id')
    if (!paymentId) {
      setCreditStatus('error')
      return
    }
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-upgrade-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ id: paymentId, topic: 'payment' }),
    })
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (data.ok) setCreditStatus(data.already ? 'already' : 'ok')
        else setCreditStatus('error')
      })
      .catch(() => setCreditStatus('error'))
  }, [result, params])

  if (result === 'failure') {
    return (
      <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-800 bg-red-950 p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-900/60 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <p className="text-smoke-100 font-bold text-lg">El pago no se completó</p>
            <p className="text-smoke-400 text-sm mt-1">No se realizó ningún cargo. Podés intentarlo de nuevo desde la carta.</p>
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

  if (result === 'pending') {
    return (
      <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-amber-700 bg-amber-950 p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-900/60 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-smoke-100 font-bold text-lg">Pago en proceso</p>
            <p className="text-smoke-400 text-sm mt-1">El pago está siendo procesado. Cuando se confirme, los créditos se acreditarán automáticamente.</p>
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

  // success
  const isPhotos = feature === 'extra_photos'

  const descMap = {
    loading: 'Verificando pago...',
    ok: isPhotos ? 'Se acreditaron 25 fotos IA en tu cuenta. Ya podés volver a la carta y generarlas.' : 'El upgrade fue activado en tu cuenta.',
    already: isPhotos ? 'Los créditos ya estaban acreditados en tu cuenta.' : 'El upgrade ya estaba activado.',
    error: 'El pago fue recibido pero los créditos no pudieron acreditarse automáticamente. Contactá a soporte con el comprobante.',
  }

  return (
    <div className="min-h-screen bg-[#111316] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-800 bg-emerald-950 p-6 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 flex items-center justify-center">
          {creditStatus === 'loading' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : creditStatus === 'error' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
        </div>
        <div>
          <p className="text-smoke-100 font-bold text-lg">
            {creditStatus === 'loading' ? 'Procesando...' : '¡Pago confirmado!'}
          </p>
          <p className="text-smoke-400 text-sm mt-1">{descMap[creditStatus]}</p>
        </div>
        <button
          onClick={() => navigate('/admin/carta')}
          disabled={creditStatus === 'loading'}
          className="mt-2 w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-40 disabled:cursor-wait text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Volver a la carta
        </button>
      </div>
    </div>
  )
}
