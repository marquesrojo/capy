import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'

const STEPS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V4.5a1 1 0 0 1 1-1h6.5L18 9.5V19.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M11.5 3.5V9h5.5"/><path d="M8 13h8M8 16.5h5"/></svg>,
    title: 'Mirá la carta con calma',
    desc: 'Sin que nadie te apure'
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11"/></svg>,
    title: 'Pedí cuando quieras',
    desc: 'A tu propio ritmo'
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2M10 15h4"/></svg>,
    title: 'Pagá como prefieras',
    desc: 'Sin esperar la cuenta'
  }
]

export default function IdentifyPage() {
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')

  // Detectar si viene de un link de confirmación de email
  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      navigate('/auth/callback' + hash)
    }
  }, [])

  async function handleFindOrder(e) {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setFinding(true)
    setError('')

    const { data } = await supabaseCustomer
      .from('orders')
      .select('id')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .eq('daily_number', parseInt(orderNumber))
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    setFinding(false)

    if (!data) {
      setError('No encontramos ese número. Verificá con el camarero.')
      return
    }
    navigate(`/pedido/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">

      {/* Glow cálido de fondo */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-ember-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 w-72 h-72 rounded-full bg-pucara-blue-400/10 blur-3xl" />

      <div className="w-full max-w-sm space-y-8 relative">

        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-md p-2.5">
            <img src="/icon-512.png" alt="Capy" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-3xl text-smoke-300 tracking-wide leading-tight">
            Tu mesa está lista.<br />Ahora disfrutá.
          </h1>
          <p className="text-smoke-500 text-sm mt-3 max-w-[18rem] mx-auto leading-relaxed">
            Pedí a tu ritmo, sin esperar al mozo y sin apuro por la cuenta.
          </p>
        </div>

        {/* Pasos */}
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-carbon-900/70 border border-carbon-700 rounded-2xl px-2 py-4 text-center">
              <div className="w-9 h-9 rounded-xl bg-ember-500/10 text-ember-600 flex items-center justify-center mx-auto mb-2">
                {s.icon}
              </div>
              <p className="text-smoke-300 text-[11px] font-semibold leading-snug">{s.title}</p>
              <p className="text-smoke-500 text-[10px] mt-0.5 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA principal */}
        <button
          onClick={() => navigate('/carta')}
          className="w-full bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white font-semibold py-4 rounded-2xl text-lg shadow-pucara"
        >
          Ver la carta →
        </button>

        {/* Seguimiento de pedido */}
        <div className="bg-carbon-900/70 border border-carbon-700 rounded-2xl p-4 text-left">
          <p className="text-smoke-300 font-medium text-sm mb-1">¿Ya tenés un pedido?</p>
          <p className="text-smoke-500 text-xs mb-3">Ingresá el número que te dio el camarero</p>
          <form onSubmit={handleFindOrder} className="flex gap-2">
            <input
              type="number"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Nº de pedido"
              className="input flex-1 text-center font-mono text-lg py-3"
              min="1"
            />
            <button
              type="submit"
              disabled={finding || !orderNumber.trim()}
              className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl"
            >
              {finding ? '...' : 'Ver →'}
            </button>
          </form>
          {error && <p className="text-red-700 text-xs mt-2">{error}</p>}
        </div>

      </div>
    </div>
  )
}
