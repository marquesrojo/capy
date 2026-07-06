import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'
import { useCart } from '../../hooks/useCart'

const WAITER_REASONS = [
  { id: 'tomar_pedido', label: 'Tomar mi pedido', icon: '📋' },
  { id: 'consulta_carta', label: 'Consulta sobre la carta', icon: '❓' },
  { id: 'traer_cuenta', label: 'Traer la cuenta', icon: '🧾' },
  { id: 'otra_consulta', label: 'Otra consulta', icon: '💬' },
]

// Extrae el número de un nombre como "Mesa 4" → "4", o devuelve las primeras 2 letras
function zoneShort(name) {
  const match = name.match(/\d+/)
  if (match) return match[0]
  return name.slice(0, 2).toUpperCase()
}

export default function IdentifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const base = useClientBase()
  const venueCtx = useVenueOptional()
  const venue = venueCtx?.venue
  const venueId = venue?.id || ACTIVE_VENUE_ID
  const selfColor = venue?.landing_self_color || '#1A3A6B'
  const waiterColor = venue?.landing_waiter_color || '#B22222'
  const { setLocation, setSessionId } = useCart()

  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [topProducts, setTopProducts] = useState([])

  const [zones, setZones] = useState([])
  const [pickedZone, setPickedZone] = useState(null)
  const [showZonePicker, setShowZonePicker] = useState(false)

  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)
  const [callLoading, setCallLoading] = useState(false)
  const [callSent, setCallSent] = useState(false)

  const prefillZoneId = searchParams.get('zone_id')
  const prefillLabel = searchParams.get('location_label')
  const prefillType = searchParams.get('location_type') || 'zona'
  const prefillSession = searchParams.get('session_id')
  const decodedLabel = prefillLabel ? decodeURIComponent(prefillLabel) : null

  const activeZoneId = prefillZoneId || pickedZone?.id || null
  const activeLabel = decodedLabel || pickedZone?.name || null

  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      navigate('/auth/callback' + hash)
      return
    }
    if (prefillZoneId && prefillLabel) {
      setLocation({ type: prefillType, zoneId: prefillZoneId, label: decodedLabel })
    }
    if (prefillSession) setSessionId(prefillSession)
  }, [])

  useEffect(() => {
    if (!venueId) return
    supabaseCustomer
      .from('products')
      .select('id, name, price, image_url')
      .eq('venue_id', venueId)
      .eq('is_available', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(10)
      .then(({ data }) => setTopProducts(data || []))

    if (!prefillZoneId) {
      supabaseCustomer
        .from('venue_zones')
        .select('id, name, type')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name')
        .then(({ data }) => setZones(data || []))
    }
  }, [venueId])

  function pickZone(zone) {
    if (pickedZone?.id === zone.id) {
      setPickedZone(null)
      setLocation(null)
    } else {
      setPickedZone(zone)
      setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })
    }
  }

  async function openWaiterCall() {
    setShowWaiterCall(true)
    setCallSent(false)
    setSelectedReason(null)
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

  async function handleFindOrder(e) {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setFinding(true)
    setOrderError('')
    const { data } = await supabaseCustomer
      .from('orders')
      .select('id')
      .eq('venue_id', venueId)
      .eq('daily_number', parseInt(orderNumber))
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setFinding(false)
    if (!data) { setOrderError('No encontramos ese número. Verificá con el camarero.'); return }
    navigate(`/pedido/${data.id}`)
  }

  function formatPrice(p) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p)
  }

  const mesas = zones.filter(z => z.type === 'mesa')
  const sectores = zones.filter(z => z.type === 'zona')
  const retiro = zones.filter(z => z.type === 'retiro')

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col pb-10">

      {/* ── Header: logo + nombre ── */}
      <div className="pt-10 pb-5 px-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white p-1.5 shadow-md border border-black/[0.06]">
          <img
            src={venue?.logo_url || '/icon-512.png'}
            alt={venue?.name || 'Capy'}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
        <h1 className="text-3xl font-black text-[#1A2332] tracking-tight leading-none uppercase">
          {venue?.name || 'Bienvenido'}
        </h1>
        {decodedLabel && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: `${selfColor}18`, color: selfColor }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            {decodedLabel}
          </div>
        )}
      </div>

      {/* ── CTAs lado a lado ── */}
      <div className="px-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate(`${base}/carta`)}
          style={{ backgroundColor: selfColor }}
          className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-white active:opacity-85 shadow-sm min-h-[100px]"
        >
          <span className="text-3xl leading-none">🍽️</span>
          <span className="text-xs font-bold text-center leading-tight">Quiero pedir yo mismo</span>
        </button>
        <button
          onClick={openWaiterCall}
          style={{ backgroundColor: waiterColor }}
          className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-white active:opacity-85 shadow-sm min-h-[100px]"
        >
          <span className="text-3xl leading-none">🔔</span>
          <span className="text-xs font-bold text-center leading-tight">Quiero que me atienda un mozo</span>
        </button>
      </div>

      {/* ── Selector de mesa/sector (QR general, sin prefill) ── */}
      {!prefillZoneId && zones.length > 0 && (
        <div className="mt-5 px-5">
          {/* Toggle row */}
          <button
            onClick={() => setShowZonePicker(v => !v)}
            className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-black/[0.06] shadow-sm active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              {pickedZone ? (
                <span className="text-sm font-bold text-[#1A2332]">{pickedZone.name}</span>
              ) : (
                <span className="text-sm font-semibold text-[#6B7A8D]">¿En qué mesa o sector estás?</span>
              )}
              <span className="text-[10px] text-[#C0CBDA] font-medium ml-1">opcional</span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5"
              className={`transition-transform duration-200 ${showZonePicker ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Expandable content */}
          {showZonePicker && (
            <div className="mt-2 bg-white rounded-2xl border border-black/[0.06] p-4 shadow-sm">
              {mesas.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Mesas</p>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {mesas.map(zone => {
                      const active = pickedZone?.id === zone.id
                      return (
                        <button
                          key={zone.id}
                          onClick={() => { pickZone(zone); setShowZonePicker(false) }}
                          className="aspect-square rounded-full flex items-center justify-center text-sm font-black transition-all border-2"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {zoneShort(zone.name)}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {sectores.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Sectores</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {sectores.map(zone => {
                      const active = pickedZone?.id === zone.id
                      return (
                        <button
                          key={zone.id}
                          onClick={() => { pickZone(zone); setShowZonePicker(false) }}
                          className="rounded-xl py-2.5 text-xs font-bold text-center border-2 transition-all"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {zone.name}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {retiro.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Retiro</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {retiro.map(zone => {
                      const active = pickedZone?.id === zone.id
                      return (
                        <button
                          key={zone.id}
                          onClick={() => { pickZone(zone); setShowZonePicker(false) }}
                          className="rounded-xl py-2.5 text-xs font-bold text-center border-2 transition-all"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {zone.name}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {pickedZone && (
                <button
                  onClick={() => { setPickedZone(null); setLocation(null) }}
                  className="text-[#9DAAB8] text-xs underline w-full text-center mt-1"
                >
                  Quitar selección
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Sugerencias del chef ── */}
      {topProducts.length > 0 && (
        <div className="mt-7 px-5">
          <p className="text-sm font-black uppercase tracking-wider text-[#1A2332] mb-3">Sugerencias del chef</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
            {topProducts.map(p => (
              <div key={p.id} className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm border border-black/[0.05]">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-[#F0F4F8] flex items-center justify-center text-3xl">🍴</div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-[#1A2332] leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-sm font-black" style={{ color: selfColor }}>{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seguimiento de pedido ── */}
      <div className="mt-7 px-5">
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4">
          <p className="text-[#1A2332] font-bold text-sm mb-0.5">¿Ya tenés un pedido?</p>
          <p className="text-[#9DAAB8] text-xs mb-3">Ingresá el número que te dio el camarero</p>
          <form onSubmit={handleFindOrder} className="flex gap-2">
            <input
              type="number"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Nº de pedido"
              className="flex-1 bg-[#F0F4F8] text-center font-mono text-lg py-2.5 rounded-xl focus:outline-none text-[#1A2332] border border-transparent focus:border-[#1A2332]/20"
              min="1"
            />
            <button
              type="submit"
              disabled={finding || !orderNumber.trim()}
              style={{ backgroundColor: selfColor }}
              className="disabled:opacity-40 text-white font-bold px-4 rounded-xl text-sm"
            >
              {finding ? '...' : 'Ver →'}
            </button>
          </form>
          {orderError && <p className="text-red-500 text-xs mt-2">{orderError}</p>}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 text-center">
        <a href="https://capyapp.co" target="_blank" rel="noreferrer"
          className="text-[10px] text-[#C0CBDA] hover:text-[#9DAAB8] transition-colors">
          Desarrollado por Capy · capyapp.co
        </a>
      </div>

      {/* ── Drawer: llamar al mozo ── */}
      {showWaiterCall && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => !callLoading && setShowWaiterCall(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            {callSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: `${waiterColor}18` }}>🔔</div>
                <p className="text-[#1A2332] font-black text-xl mb-1 uppercase">¡Camarero en camino!</p>
                <p className="text-[#9DAAB8] text-sm mb-6">Ya saben dónde estás.</p>
                <button onClick={() => setShowWaiterCall(false)}
                  style={{ backgroundColor: waiterColor }}
                  className="text-white font-bold py-3 px-8 rounded-2xl text-sm">
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[#1A2332] font-black text-xl uppercase">Llamar al mozo</h2>
                    <p className="text-[#9DAAB8] text-sm">¿En qué te podemos ayudar?</p>
                  </div>
                  <button onClick={() => !callLoading && setShowWaiterCall(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D] text-xl">×</button>
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
                      <span className="text-[#6B7A8D] text-sm">📍 Ubicación:</span>
                      <span className="text-[#1A2332] font-bold text-sm">{activeLabel}</span>
                    </div>
                    <button onClick={async () => { await submitCall(activeZoneId, activeLabel) }}
                      disabled={callLoading}
                      style={{ backgroundColor: waiterColor }}
                      className="w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base uppercase tracking-wide">
                      {callLoading ? 'Enviando...' : 'Llamar al mozo'}
                    </button>
                  </>
                ) : (
                  <div>
                    <p className="text-[#9DAAB8] text-xs font-bold uppercase tracking-wider mb-3">¿Dónde estás?</p>
                    {zones.length === 0 ? (
                      <button onClick={() => submitCall(null, 'Sin especificar')}
                        disabled={callLoading}
                        style={{ backgroundColor: waiterColor }}
                        className="w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base uppercase">
                        {callLoading ? 'Enviando...' : 'Llamar al mozo'}
                      </button>
                    ) : (
                      <>
                        {mesas.length > 0 && (
                          <div className="grid grid-cols-5 gap-2 mb-4">
                            {mesas.map(zone => (
                              <button key={zone.id} onClick={() => submitCall(zone.id, zone.name)}
                                disabled={callLoading}
                                className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 disabled:opacity-50 bg-white transition-all"
                                style={{ borderColor: waiterColor, color: waiterColor }}>
                                {zoneShort(zone.name)}
                              </button>
                            ))}
                          </div>
                        )}
                        {sectores.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {sectores.map(zone => (
                              <button key={zone.id} onClick={() => submitCall(zone.id, zone.name)}
                                disabled={callLoading}
                                className="rounded-xl py-2.5 text-xs font-bold border-2 disabled:opacity-50 bg-white"
                                style={{ borderColor: waiterColor, color: waiterColor }}>
                                {zone.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
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
