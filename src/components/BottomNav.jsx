import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useClientBase, useVenueOptional } from '../hooks/useVenue'
import { useCart } from '../hooks/useCart'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../lib/supabase'

const WAITER_REASONS = [
  { id: 'tomar_pedido', label: 'Tomar mi pedido', icon: '📋' },
  { id: 'consulta_carta', label: 'Consulta sobre la carta', icon: '❓' },
  { id: 'traer_cuenta', label: 'Traer la cuenta', icon: '🧾' },
  { id: 'otra_consulta', label: 'Otra consulta', icon: '💬' },
]

function zoneShort(name) {
  const match = name.match(/\d+/)
  if (match) return match[0]
  return name.slice(0, 2).toUpperCase()
}

export default function BottomNav() {
  const base = useClientBase()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { itemCount, location: cartLocation } = useCart()
  const venueCtx = useVenueOptional()
  const venue = venueCtx?.venue
  const venueId = venue?.id || ACTIVE_VENUE_ID
  const selfColor = venue?.landing_self_color || '#1A3A6B'
  const waiterColor = venue?.landing_waiter_color || '#B22222'

  const [showWaiter, setShowWaiter] = useState(false)
  const [zones, setZones] = useState([])
  const [waiterSector, setWaiterSector] = useState(null)
  const [selectedReason, setSelectedReason] = useState(null)
  const [callLoading, setCallLoading] = useState(false)
  const [callSent, setCallSent] = useState(false)

  useEffect(() => {
    if (!showWaiter || zones.length > 0 || !venueId) return
    supabaseCustomer
      .from('venue_zones')
      .select('id, name, type, parent_zone_id')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name')
      .then(({ data }) => setZones(data || []))
  }, [showWaiter, venueId])

  const sectores = zones.filter(z => z.type === 'zona')
  const allMesas = zones.filter(z => z.type === 'mesa')
  const waiterSectorMesas = waiterSector
    ? allMesas.filter(m => m.parent_zone_id === waiterSector.id)
    : []

  function openWaiter() {
    setShowWaiter(true)
    setCallSent(false)
    setSelectedReason(null)
    setWaiterSector(null)
  }

  async function submitCall(zoneId, zoneName) {
    setCallLoading(true)
    const reason = WAITER_REASONS.find(r => r.id === selectedReason)
    const locationLabel = reason ? `${zoneName} — ${reason.label}` : zoneName
    await supabaseCustomer.from('waiter_calls').insert({
      venue_id: venueId,
      zone_id: zoneId,
      location_label: locationLabel,
    })
    setCallLoading(false)
    setCallSent(true)
  }

  const activeZoneId = cartLocation?.zoneId || null
  const activeLabel = cartLocation?.label || null

  const isOnMenu = pathname.endsWith('/carta') || pathname === '/carta'
  const isOnCart = pathname.includes('/pago') || pathname.includes('/pedidos') || pathname.includes('/ubicacion')

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.07] flex z-30 h-16">
        {/* Carta */}
        <NavLink
          to={`${base}/carta`}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide transition-colors"
          style={({ isActive }) => ({ color: isActive ? selfColor : '#9DAAB8' })}
        >
          <span className="text-xl leading-none">🍽️</span>
          CARTA
        </NavLink>

        {/* Mi Pedido */}
        <button
          onClick={() => navigate(itemCount > 0 ? `${base}/pago` : `${base}/pedidos`)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide transition-colors"
          style={{ color: isOnCart ? selfColor : '#9DAAB8' }}
        >
          <div className="relative">
            <span className="text-xl leading-none">🧾</span>
            {itemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-0.5"
                style={{ backgroundColor: selfColor }}
              >
                {itemCount}
              </span>
            )}
          </div>
          MI PEDIDO
        </button>

        {/* Llamar Mozo */}
        <button
          onClick={openWaiter}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide transition-colors"
          style={{ color: waiterColor }}
        >
          <span className="text-xl leading-none">🔔</span>
          ATENCIÓN
        </button>
      </nav>

      {/* Waiter call sheet */}
      {showWaiter && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => !callLoading && setShowWaiter(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            {callSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: `${waiterColor}18` }}>🔔</div>
                <p className="text-[#1A2332] font-black text-xl mb-1 uppercase">¡Camarero/a en camino!</p>
                <p className="text-[#9DAAB8] text-sm mb-6">Ya saben dónde estás.</p>
                <button
                  onClick={() => setShowWaiter(false)}
                  style={{ backgroundColor: waiterColor }}
                  className="text-white font-bold py-3 px-8 rounded-2xl text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[#1A2332] font-black text-xl uppercase">Solicitar atención</h2>
                    <p className="text-[#9DAAB8] text-sm">¿En qué te podemos ayudar?</p>
                  </div>
                  <button
                    onClick={() => !callLoading && setShowWaiter(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D] text-xl"
                  >×</button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {WAITER_REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReason(r.id === selectedReason ? null : r.id)}
                      className="p-3.5 rounded-2xl border-2 text-left transition-all"
                      style={selectedReason === r.id
                        ? { borderColor: waiterColor, backgroundColor: `${waiterColor}12` }
                        : { borderColor: '#E8EEF4', backgroundColor: '#F8FAFB' }
                      }
                    >
                      <span className="text-xl block mb-1.5">{r.icon}</span>
                      <span className="text-xs font-bold leading-tight block"
                        style={{ color: selectedReason === r.id ? waiterColor : '#1A2332' }}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>

                {activeZoneId ? (
                  <>
                    <div className="flex items-center gap-2 bg-[#F0F4F8] rounded-xl px-4 py-3 mb-4">
                      <span className="text-[#6B7A8D] text-sm">📍</span>
                      <span className="text-[#1A2332] font-bold text-sm">{activeLabel}</span>
                    </div>
                    <button
                      onClick={() => submitCall(activeZoneId, activeLabel)}
                      disabled={callLoading}
                      style={{ backgroundColor: waiterColor }}
                      className="w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base uppercase tracking-wide"
                    >
                      {callLoading ? 'Enviando...' : 'Solicitar atención'}
                    </button>
                  </>
                ) : zones.length === 0 ? (
                  <button
                    onClick={() => submitCall(null, 'Sin especificar')}
                    disabled={callLoading}
                    style={{ backgroundColor: waiterColor }}
                    className="w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base uppercase"
                  >
                    {callLoading ? 'Enviando...' : 'Solicitar atención'}
                  </button>
                ) : (
                  <div>
                    <p className="text-[#9DAAB8] text-xs font-bold uppercase tracking-wider mb-3">¿Dónde estás?</p>

                    {sectores.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Sector</p>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {sectores.map(sector => {
                            const hasMesas = allMesas.some(m => m.parent_zone_id === sector.id)
                            const active = waiterSector?.id === sector.id
                            return (
                              <button
                                key={sector.id}
                                disabled={callLoading}
                                onClick={() => {
                                  if (!hasMesas) {
                                    submitCall(sector.id, sector.name)
                                  } else {
                                    setWaiterSector(active ? null : sector)
                                  }
                                }}
                                className="rounded-xl py-2.5 px-1 text-xs font-bold text-center border-2 disabled:opacity-50 transition-all leading-tight"
                                style={active
                                  ? { backgroundColor: waiterColor, borderColor: waiterColor, color: 'white' }
                                  : { backgroundColor: '#F8FAFB', borderColor: waiterColor, color: waiterColor }
                                }
                              >
                                {sector.name}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {waiterSector && waiterSectorMesas.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">
                          Mesa — {waiterSector.name}
                        </p>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {waiterSectorMesas.map(mesa => (
                            <button
                              key={mesa.id}
                              onClick={() => submitCall(mesa.id, mesa.name)}
                              disabled={callLoading}
                              className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 disabled:opacity-50 transition-all"
                              style={{ backgroundColor: '#F8FAFB', borderColor: waiterColor, color: waiterColor }}
                            >
                              {zoneShort(mesa.name)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {allMesas.filter(m => !m.parent_zone_id).length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Mesas</p>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {allMesas.filter(m => !m.parent_zone_id).map(mesa => (
                            <button
                              key={mesa.id}
                              onClick={() => submitCall(mesa.id, mesa.name)}
                              disabled={callLoading}
                              className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 disabled:opacity-50 bg-white transition-all"
                              style={{ borderColor: waiterColor, color: waiterColor }}
                            >
                              {zoneShort(mesa.name)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
