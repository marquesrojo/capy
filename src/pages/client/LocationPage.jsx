import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'

export default function LocationPage() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const { setLocation, itemCount } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    if (itemCount === 0) navigate('/carta')
  }, [itemCount, navigate])

  useEffect(() => {
    async function load() {
      const { data } = await supabaseCustomer
        .from('venue_zones')
        .select('*')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('is_active', true)
        .order('sort_order')
      setZones(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function chooseZone(zone) {
    setLocation({
      type: zone.type,
      zoneId: zone.id,
      label: zone.name
    })
    navigate('/pago')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const mesas = zones.filter(z => z.type === 'mesa')
  const sectores = zones.filter(z => z.type === 'zona')

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">¿DÓNDE ESTÁS?</h1>
        <p className="text-smoke-400 text-sm mt-1">Así sabemos a dónde llevar tu pedido</p>
      </header>

      <div className="px-5 space-y-6">
        {mesas.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
              Mesas — Restaurante / Bar
            </p>
            <div className="space-y-2">
              {mesas.map(zone => (
                <ZoneButton key={zone.id} zone={zone} onClick={() => chooseZone(zone)} />
              ))}
            </div>
          </div>
        )}

        {sectores.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
              Sectores generales
            </p>
            <div className="space-y-2">
              {sectores.map(zone => (
                <ZoneButton key={zone.id} zone={zone} onClick={() => chooseZone(zone)} />
              ))}
            </div>
          </div>
        )}

        {zones.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">
            No hay mesas ni sectores configurados todavía.
          </p>
        )}
      </div>
    </div>
  )
}

function ZoneButton({ zone, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-carbon-900 border border-carbon-700 hover:border-ember-500 rounded-2xl p-4 flex items-center justify-between text-left transition-colors"
    >
      <p className="text-smoke-300 font-medium">{zone.name}</p>
      <span className="text-ember-500">→</span>
    </button>
  )
}
