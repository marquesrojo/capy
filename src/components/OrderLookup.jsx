import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../lib/supabase'

// Buscar un pedido por su número.
//
// Es para el que pidió con un camarero y quiere seguirlo desde el teléfono: ese
// pedido no nació en esta app, así que no aparece en su historial y lo único
// que tiene es el número que le dictó el mozo.
//
// Vivía en la home, compitiendo con las formas de pedir. Su lugar es la
// pantalla de pedidos vacía: ahí es donde alguien va a buscar un pedido que no
// encuentra.
export default function OrderLookup({ venueId, accent = '#1A3A6B' }) {
  const navigate = useNavigate()
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  async function buscar(e) {
    e.preventDefault()
    if (!numero.trim() || !venueId) return
    setBuscando(true)
    setError('')
    const { data } = await supabaseCustomer
      .from('orders')
      .select('id')
      .eq('venue_id', venueId)
      .eq('daily_number', parseInt(numero))
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setBuscando(false)
    if (!data) {
      setError('No encontramos ese número. Verificá con el camarero.')
      return
    }
    navigate(`/pedido/${data.id}`)
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
      <p className="text-smoke-300 text-sm font-semibold">¿Ya te atendió un camarero/a?</p>
      <p className="text-smoke-500 text-xs mt-0.5 mb-3">
        Pedile el número de pedido y seguilo desde acá.
      </p>
      <form onSubmit={buscar} className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={numero}
          onChange={e => { setNumero(e.target.value); setError('') }}
          placeholder="N° de pedido"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={buscando || !numero.trim()}
          className="text-white font-bold px-5 rounded-xl text-sm disabled:opacity-40 flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          {buscando ? '...' : 'Ver →'}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
