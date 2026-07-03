import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'

export default function IdentifyPage() {
  const navigate = useNavigate()
  const base = useClientBase()
  const venueCtx = useVenueOptional()
  const venue = venueCtx?.venue
  const venueId = venue?.id || ACTIVE_VENUE_ID

  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')

  // Waiter call flow
  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [callLoading, setCallLoading] = useState(false)
  const [callSent, setCallSent] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      navigate('/auth/callback' + hash)
    }
  }, [])

  async function openWaiterCall() {
    setShowWaiterCall(true)
    setCallSent(false)
    if (zones.length === 0) {
      setZonesLoading(true)
      const { data } = await supabaseCustomer
        .from('venue_zones')
        .select('id, name, type')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name')
      setZones(data || [])
      setZonesLoading(false)
    }
  }

  async function handleCallWaiter(zone) {
    setCallLoading(true)
    await supabaseCustomer.from('waiter_calls').insert({
      venue_id: venueId,
      zone_id: zone.id,
      location_label: zone.name,
    })
    setCallLoading(false)
    setCallSent(true)
  }

  async function handleFindOrder(e) {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setFinding(true)
    setError('')

    const { data } = await supabaseCustomer
      .from('orders')
      .select('id')
      .eq('venue_id', venueId)
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

  const mesas = zones.filter(z => z.type === 'mesa')
  const sectores = zones.filter(z => z.type === 'zona')
  const retiro = zones.filter(z => z.type === 'retiro')

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">

      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-ember-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 w-72 h-72 rounded-full bg-pucara-blue-400/10 blur-3xl" />

      <div className="w-full max-w-sm space-y-6 relative">

        {/* Logo + venue */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-md p-2.5">
            <img
              src={venue?.logo_url || '/icon-512.png'}
              alt={venue?.name || 'Capy'}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-display text-2xl text-smoke-300 tracking-wide leading-tight">
            {venue?.name || 'Bienvenido'}
          </h1>
          <p className="text-smoke-500 text-sm mt-1">¿Qué querés hacer?</p>
        </div>

        {/* Acciones principales */}
        <div className="space-y-3">
          <button
            onClick={openWaiterCall}
            className="w-full bg-carbon-900 border border-carbon-700 hover:border-teal-500/60 hover:bg-carbon-800 text-smoke-300 font-semibold py-5 rounded-2xl text-base flex items-center justify-center gap-3 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18h18"/>
              <path d="M12 3a7 7 0 0 1 7 7v5H5v-5a7 7 0 0 1 7-7z"/>
              <path d="M12 3V1.5"/>
              <circle cx="12" cy="20" r="1.5"/>
            </svg>
            Llamar al camarero
          </button>
          <button
            onClick={() => navigate(`${base}/carta`)}
            className="w-full bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white font-semibold py-5 rounded-2xl text-base flex items-center justify-center gap-3 shadow-pucara transition-colors"
          >
            <span className="text-2xl">🍽️</span>
            Ver la carta
          </button>
        </div>

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

      {/* Drawer: Llamar camarero */}
      {showWaiterCall && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !callLoading && setShowWaiterCall(false)}
          />
          <div className="relative bg-carbon-900 rounded-t-3xl px-5 pt-5 pb-10 max-h-[80vh] overflow-y-auto">
            {callSent ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/10 text-teal-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18h18"/>
                    <path d="M12 3a7 7 0 0 1 7 7v5H5v-5a7 7 0 0 1 7-7z"/>
                    <path d="M12 3V1.5"/>
                    <circle cx="12" cy="20" r="1.5"/>
                  </svg>
                </div>
                <p className="text-smoke-200 font-semibold text-lg mb-2">¡Camarero en camino!</p>
                <p className="text-smoke-500 text-sm mb-6">Ya saben dónde estás.</p>
                <button
                  onClick={() => setShowWaiterCall(false)}
                  className="bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3 px-8 rounded-2xl text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-smoke-200 font-semibold text-lg">¿Dónde estás?</h2>
                    <p className="text-smoke-500 text-sm">Así saben a dónde ir</p>
                  </div>
                  <button
                    onClick={() => setShowWaiterCall(false)}
                    className="text-smoke-500 hover:text-smoke-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {zonesLoading ? (
                  <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>
                ) : zones.length === 0 ? (
                  <p className="text-smoke-500 text-sm text-center py-8">No hay mesas configuradas todavía.</p>
                ) : (
                  <div className="space-y-5">
                    {mesas.length > 0 && (
                      <ZoneGroup label="Mesas" zones={mesas} onSelect={handleCallWaiter} loading={callLoading} />
                    )}
                    {sectores.length > 0 && (
                      <ZoneGroup label="Sectores" zones={sectores} onSelect={handleCallWaiter} loading={callLoading} />
                    )}
                    {retiro.length > 0 && (
                      <ZoneGroup label="Puntos de retiro" zones={retiro} onSelect={handleCallWaiter} loading={callLoading} />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ZoneGroup({ label, zones, onSelect, loading }) {
  return (
    <div>
      <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-2">
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => onSelect(zone)}
            disabled={loading}
            className="w-full bg-carbon-800 border border-carbon-700 hover:border-teal-500/60 hover:bg-carbon-750 disabled:opacity-50 rounded-2xl p-4 flex items-center justify-between text-left transition-colors"
          >
            <span className="text-smoke-300 font-medium">{zone.name}</span>
            <span className="text-teal-400">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
