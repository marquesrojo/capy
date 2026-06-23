import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'

export default function IdentifyPage() {
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')

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
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <img src="/icon-512.png" alt="Capy" className="w-24 h-24 mx-auto mb-3" />
          <p className="font-display text-4xl text-ember-500 tracking-wide">CAPY</p>
          <p className="text-smoke-500 text-sm mt-1">Pedí desde donde estés</p>
        </div>

        {/* Seguir pedido */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-200 font-medium text-sm mb-1">¿Ya tenés un pedido?</p>
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

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-carbon-700" />
          <span className="text-smoke-600 text-xs">o</span>
          <div className="flex-1 h-px bg-carbon-700" />
        </div>

        {/* Armar pedido */}
        <button
          onClick={() => navigate('/carta')}
          className="w-full bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white font-semibold py-4 rounded-2xl text-lg"
        >
          Hacé tu pedido →
        </button>

      </div>
    </div>
  )
}
