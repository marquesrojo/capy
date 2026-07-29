import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'

// Alta por link: el local reparte un código y quien lo abre queda en la
// categoría. Si todavía no dio nombre y WhatsApp se los pedimos acá, porque
// sin ficha de cliente no hay a quién sumar ni a quién reconocer en el local.
export default function JoinCategoryPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { customer, loading: customerLoading, registerCustomer } = useCustomer()

  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState('idle') // idle | joining | done | error
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseCustomer.auth.getSession()
      if (!session) await supabaseCustomer.auth.signInAnonymously()
      const { data } = await supabaseCustomer.rpc('peek_discount_category', { p_code: code })
      setInfo(data?.[0] || null)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [code])

  useEffect(() => {
    if (customer?.full_name) setName(customer.full_name)
    if (customer?.whatsapp) setWhatsapp(customer.whatsapp)
  }, [customer])

  async function join() {
    setState('joining')
    setError('')
    try {
      if (!customer) {
        if (!name.trim() || !whatsapp.trim()) {
          setError('Completá tu nombre y tu WhatsApp.')
          setState('idle')
          return
        }
        const res = await registerCustomer(name.trim(), whatsapp.trim())
        if (res?.error) throw new Error(res.error.message || 'No se pudo crear tu ficha')
      }
      const { data, error: err } = await supabaseCustomer.rpc('join_discount_category', { p_code: code })
      if (err) throw new Error(err.message)
      if (!data?.length) throw new Error('El link ya no está disponible. Pedile uno nuevo al local.')
      setState('done')
    } catch (e) {
      setError(e.message || 'No se pudo completar. Probá de nuevo.')
      setState('idle')
    }
  }

  if (loading || customerLoading) return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando...</p>
    </div>
  )

  if (!info) return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-smoke-200 font-bold text-lg mb-2">Link no válido</p>
      <p className="text-smoke-500 text-sm">Pedile al local un link actualizado.</p>
    </div>
  )

  const venuePath = info.venue_slug ? `/r/${info.venue_slug}` : '/'

  if (state === 'done') return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p className="text-smoke-100 font-bold text-xl mb-1">¡Listo!</p>
      <p className="text-smoke-400 text-sm mb-6">
        Ya sos parte de <span className="text-smoke-200 font-semibold">{info.category_name}</span> en {info.venue_name}.
      </p>
      <button
        onClick={() => navigate(venuePath)}
        className="bg-ember-500 text-white font-bold py-3.5 px-8 rounded-2xl text-sm"
      >
        Ver la carta →
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-carbon-950 px-6 py-12 flex flex-col justify-center">
      <div className="text-center mb-8">
        <p className="text-smoke-500 text-xs font-semibold uppercase tracking-widest mb-2">{info.venue_name}</p>
        <h1 className="text-smoke-100 font-bold text-2xl leading-tight">
          Te sumás a {info.category_name}
        </h1>
        {!info.is_open && (
          <p className="text-amber-500 text-sm mt-3">Las altas para este grupo están cerradas.</p>
        )}
      </div>

      {info.is_open && (
        <>
          {!customer && (
            <div className="space-y-2 mb-4">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
              />
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Tu WhatsApp"
                className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

          <button
            onClick={join}
            disabled={state === 'joining'}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {state === 'joining' ? 'Sumándote...' : 'Sumarme'}
          </button>
        </>
      )}
    </div>
  )
}
