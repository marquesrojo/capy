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

export default function IdentifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const base = useClientBase()
  const venueCtx = useVenueOptional()
  const venue = venueCtx?.venue
  const venueId = venue?.id || ACTIVE_VENUE_ID
  const selfColor = venue?.landing_self_color || '#008080'
  const waiterColor = venue?.landing_waiter_color || '#FF8C69'
  const { setLocation, setSessionId } = useCart()

  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [topProducts, setTopProducts] = useState([])

  // Zones for location picker (general QR)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [pickedZone, setPickedZone] = useState(null) // { id, name, type }
  const [showZonePicker, setShowZonePicker] = useState(false)

  // Waiter call flow
  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)
  const [callLoading, setCallLoading] = useState(false)
  const [callSent, setCallSent] = useState(false)

  // URL params from QR per-table
  const prefillZoneId = searchParams.get('zone_id')
  const prefillLabel = searchParams.get('location_label')
  const prefillType = searchParams.get('location_type') || 'zona'
  const prefillSession = searchParams.get('session_id')

  const decodedLabel = prefillLabel ? decodeURIComponent(prefillLabel) : null

  // Active location: prefilled from URL or picked manually
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
    if (prefillSession) {
      setSessionId(prefillSession)
    }
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

    // Load zones for general QR (no prefill)
    if (!prefillZoneId) {
      setZonesLoading(true)
      supabaseCustomer
        .from('venue_zones')
        .select('id, name, type')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name')
        .then(({ data }) => {
          setZones(data || [])
          setZonesLoading(false)
        })
    }
  }, [venueId])

  function pickZone(zone) {
    setPickedZone(zone)
    setShowZonePicker(false)
    setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })
  }

  function clearPickedZone() {
    setPickedZone(null)
    setLocation(null)
    setShowZonePicker(true)
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

  async function handleWaiterCallConfirm() {
    if (activeZoneId && activeLabel) {
      await submitCall(activeZoneId, activeLabel)
    }
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
    if (!data) {
      setOrderError('No encontramos ese número. Verificá con el camarero.')
      return
    }
    navigate(`/pedido/${data.id}`)
  }

  const mesas = zones.filter(z => z.type === 'mesa')
  const sectores = zones.filter(z => z.type === 'zona')
  const retiro = zones.filter(z => z.type === 'retiro')

  // In the waiter drawer, we need zones split too — but zones are already loaded
  const waiterNeedsZonePick = !activeZoneId && zones.length > 0

  function formatPrice(p) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p)
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">

      {/* Header */}
      <div className="pt-10 pb-6 px-5 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white shadow-sm border border-black/5 p-2">
          <img
            src={venue?.logo_url || '/icon-512.png'}
            alt={venue?.name || 'Capy'}
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-[#1A2332] tracking-tight">
          {venue?.name || 'Bienvenido'}
        </h1>

        {/* Location chip — prefilled or picked */}
        {activeLabel ? (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-[#008080]/10 text-[#005f5f] text-xs font-semibold px-3 py-1.5 rounded-full">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            {activeLabel}
            {/* Allow changing if it was manually picked (not from URL) */}
            {!prefillZoneId && (
              <button onClick={clearPickedZone} className="ml-1 text-[#008080]/60 hover:text-[#008080] leading-none">×</button>
            )}
          </div>
        ) : (
          <p className="text-[#6B7A8D] text-sm mt-1">¿Cómo querés continuar?</p>
        )}
      </div>

      {/* Main CTAs */}
      <div className="px-5 space-y-3">
        <button
          onClick={() => navigate(`${base}/carta`)}
          style={{ backgroundColor: selfColor }}
          className="w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2.5 shadow-sm active:opacity-90"
        >
          <span className="text-xl">🍽️</span>
          Quiero pedir yo mismo
        </button>
        <button
          onClick={openWaiterCall}
          style={{ backgroundColor: waiterColor }}
          className="w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2.5 shadow-sm active:opacity-90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18h18"/>
            <path d="M12 3a7 7 0 0 1 7 7v5H5v-5a7 7 0 0 1 7-7z"/>
            <path d="M12 3V1.5"/>
            <circle cx="12" cy="20" r="1.5"/>
          </svg>
          Quiero que me atienda un mozo
        </button>
      </div>

      {/* Location picker — general QR only (no prefill), optional */}
      {!prefillZoneId && zones.length > 0 && (
        <div className="mt-5 mx-5 bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowZonePicker(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              <span className="text-sm font-semibold text-[#1A2332]">
                {pickedZone ? pickedZone.name : '¿En qué mesa estás?'}
              </span>
              {!pickedZone && (
                <span className="text-xs text-[#9DAAB8] font-normal">(opcional)</span>
              )}
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5"
              className={`transition-transform ${showZonePicker ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showZonePicker && !zonesLoading && (
            <div className="px-4 pb-4 space-y-4 border-t border-black/[0.04] pt-3">
              {mesas.length > 0 && (
                <ZoneGroup label="Mesas" zones={mesas} selected={pickedZone?.id} onSelect={pickZone} />
              )}
              {sectores.length > 0 && (
                <ZoneGroup label="Sectores" zones={sectores} selected={pickedZone?.id} onSelect={pickZone} />
              )}
              {retiro.length > 0 && (
                <ZoneGroup label="Puntos de retiro" zones={retiro} selected={pickedZone?.id} onSelect={pickZone} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Sugerencias del chef */}
      {topProducts.length > 0 && (
        <div className="mt-6 px-5">
          <p className="text-xs font-semibold text-[#9DAAB8] uppercase tracking-wider mb-3">Sugerencias del chef</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
            {topProducts.map(p => (
              <div key={p.id} className="flex-shrink-0 w-32 bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover" />
                ) : (
                  <div className="w-full h-20 bg-[#F0F4F8] flex items-center justify-center text-3xl">🍴</div>
                )}
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-[#1A2332] leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-[11px] text-[#008080] font-bold mt-1">{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order tracking */}
      <div className="mt-auto px-5 pb-10 pt-8">
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4">
          <p className="text-[#1A2332] font-semibold text-sm mb-0.5">¿Ya tenés un pedido?</p>
          <p className="text-[#6B7A8D] text-xs mb-3">Ingresá el número que te dio el camarero</p>
          <form onSubmit={handleFindOrder} className="flex gap-2">
            <input
              type="number"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Nº de pedido"
              className="flex-1 bg-[#F0F4F8] border border-transparent text-center font-mono text-lg py-2.5 rounded-xl focus:outline-none focus:border-[#008080]/30 text-[#1A2332]"
              min="1"
            />
            <button
              type="submit"
              disabled={finding || !orderNumber.trim()}
              className="bg-[#1A2332] disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm"
            >
              {finding ? '...' : 'Ver →'}
            </button>
          </form>
          {orderError && <p className="text-red-500 text-xs mt-2">{orderError}</p>}
        </div>
      </div>

      {/* Waiter call drawer */}
      {showWaiterCall && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !callLoading && setShowWaiterCall(false)}
          />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            {callSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF8C69]/10 flex items-center justify-center text-3xl">
                  🔔
                </div>
                <p className="text-[#1A2332] font-bold text-lg mb-1">¡Camarero en camino!</p>
                <p className="text-[#6B7A8D] text-sm mb-6">Ya saben dónde estás.</p>
                <button
                  onClick={() => setShowWaiterCall(false)}
                  className="bg-[#FF8C69] text-white font-bold py-3 px-8 rounded-2xl text-sm"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[#1A2332] font-bold text-lg">Llamar al mozo</h2>
                    <p className="text-[#6B7A8D] text-sm">¿En qué te podemos ayudar?</p>
                  </div>
                  <button
                    onClick={() => !callLoading && setShowWaiterCall(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D] text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Reason grid */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {WAITER_REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReason(r.id === selectedReason ? null : r.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        selectedReason === r.id
                          ? 'border-[#FF8C69] bg-[#FFF3EF]'
                          : 'border-[#E8EEF4] bg-[#F8FAFB]'
                      }`}
                    >
                      <span className="text-xl block mb-1.5">{r.icon}</span>
                      <span className={`text-xs font-semibold leading-tight block ${
                        selectedReason === r.id ? 'text-[#c0603a]' : 'text-[#1A2332]'
                      }`}>{r.label}</span>
                    </button>
                  ))}
                </div>

                {/* Location: prefilled or picked or zone selector */}
                {activeZoneId ? (
                  <>
                    <div className="flex items-center gap-2 bg-[#F0F4F8] rounded-xl px-4 py-3 mb-4">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="2.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      <span className="text-[#6B7A8D] text-sm">Ubicación:</span>
                      <span className="text-[#1A2332] font-semibold text-sm">{activeLabel}</span>
                    </div>
                    <button
                      onClick={handleWaiterCallConfirm}
                      disabled={callLoading}
                      style={{ backgroundColor: waiterColor }}
                      className="w-full disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
                    >
                      {callLoading ? 'Enviando...' : 'Llamar al mozo'}
                    </button>
                  </>
                ) : (
                  /* No location set — show zone picker inline */
                  <div>
                    <p className="text-[#9DAAB8] text-xs font-semibold uppercase tracking-wider mb-3">¿Dónde estás?</p>
                    {zonesLoading ? (
                      <p className="text-[#6B7A8D] text-sm text-center py-4">Cargando...</p>
                    ) : zones.length === 0 ? (
                      /* No zones configured — call without location */
                      <button
                        onClick={() => submitCall(null, 'Sin especificar')}
                        disabled={callLoading}
                        className="w-full bg-[#FF8C69] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
                      >
                        {callLoading ? 'Enviando...' : 'Llamar al mozo'}
                      </button>
                    ) : (
                      <div className="space-y-4">
                        {mesas.length > 0 && (
                          <ZoneGroup label="Mesas" zones={mesas} onSelect={z => submitCall(z.id, z.name)} loading={callLoading} />
                        )}
                        {sectores.length > 0 && (
                          <ZoneGroup label="Sectores" zones={sectores} onSelect={z => submitCall(z.id, z.name)} loading={callLoading} />
                        )}
                        {retiro.length > 0 && (
                          <ZoneGroup label="Puntos de retiro" zones={retiro} onSelect={z => submitCall(z.id, z.name)} loading={callLoading} />
                        )}
                      </div>
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

function ZoneGroup({ label, zones, selected, onSelect, loading }) {
  return (
    <div>
      <p className="text-[#9DAAB8] text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => onSelect(zone)}
            disabled={loading}
            className={`border rounded-xl py-3 px-2 text-center transition-colors disabled:opacity-50 ${
              selected === zone.id
                ? 'border-[#008080] bg-[#008080]/8 text-[#005f5f]'
                : 'bg-[#F0F4F8] border-[#E0E8EF] text-[#1A2332]'
            }`}
          >
            <span className="font-semibold text-sm">{zone.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
