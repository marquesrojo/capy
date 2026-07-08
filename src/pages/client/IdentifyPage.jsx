import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { ClipboardIcon, HelpCircleIcon, FileTextIcon, MessageIcon, PinIcon, UtensilsIcon, XIcon } from '../../components/Icons'

const WAITER_REASONS = [
  { id: 'tomar_pedido', label: 'Tomar mi pedido', Icon: ClipboardIcon },
  { id: 'consulta_carta', label: 'Consulta sobre la carta', Icon: HelpCircleIcon },
  { id: 'traer_cuenta', label: 'Traer la cuenta', Icon: FileTextIcon },
  { id: 'otra_consulta', label: 'Otra consulta', Icon: MessageIcon },
]

// Extrae el número de un nombre como "Mesa 4" → "4", o devuelve las primeras 2 letras
function zoneShort(name) {
  const match = name.match(/\d+/)
  if (match) return match[0]
  return name.slice(0, 2).toUpperCase()
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
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
  const { setLocation, setSessionId, addItem } = useCart()
  const { customer, isAnonymous, loginWithGoogle } = useCustomer()
  const [googleError, setGoogleError] = useState('')

  const [instagramHandle, setInstagramHandle] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [topProducts, setTopProducts] = useState([])

  const [zones, setZones] = useState([])
  const [pickedSector, setPickedSector] = useState(null)
  const [pickedZone, setPickedZone] = useState(null)
  const [showZonePicker, setShowZonePicker] = useState(false)

  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)
  const [waiterSector, setWaiterSector] = useState(null)
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
        .select('id, name, type, parent_zone_id')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name')
        .then(({ data }) => setZones(data || []))
    }

    supabaseCustomer
      .from('venues')
      .select('instagram_handle')
      .eq('id', venueId)
      .single()
      .then(({ data }) => { if (data?.instagram_handle) setInstagramHandle(data.instagram_handle) })
      .catch(() => {})
  }, [venueId])

  function pickSector(sector) {
    if (pickedSector?.id === sector.id) {
      setPickedSector(null)
      setPickedZone(null)
      setLocation(null)
      return
    }
    setPickedSector(sector)
    const hasMesas = zones.some(z => z.type === 'mesa' && z.parent_zone_id === sector.id)
    if (!hasMesas) {
      setPickedZone(sector)
      setLocation({ type: sector.type, zoneId: sector.id, label: sector.name })
      setShowZonePicker(false)
    } else {
      setPickedZone(null)
      setLocation(null)
    }
  }

  function pickMesa(mesa) {
    setPickedZone(mesa)
    setLocation({ type: mesa.type, zoneId: mesa.id, label: mesa.name })
    setShowZonePicker(false)
  }

  async function openWaiterCall() {
    setShowWaiterCall(true)
    setCallSent(false)
    setSelectedReason(null)
    setWaiterSector(null)
  }

  async function submitCall(zoneId, zoneName) {
    setCallLoading(true)
    const reason = WAITER_REASONS.find(r => r.id === selectedReason)
    const safeZone = zoneName || 'Sin especificar'
    const locationLabel = reason ? `${safeZone} — ${reason.label}` : safeZone
    await supabaseCustomer.from('waiter_calls').insert({
      venue_id: venueId,
      zone_id: zoneId,
      location_label: locationLabel,
    })
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({
        venue_id: venueId,
        title: '🔔 Solicitud de atención',
        body: locationLabel,
      }),
    }).catch(() => {})
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

  const sectores = zones.filter(z => z.type === 'zona')
  const allMesas = zones.filter(z => z.type === 'mesa')
  const retiro = zones.filter(z => z.type === 'retiro')
  const sectorMesas = pickedSector
    ? allMesas.filter(m => m.parent_zone_id === pickedSector.id)
    : []
  const orphanMesas = allMesas.filter(m => !m.parent_zone_id)

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col pb-10">

      {/* ── Header: logo + nombre ── */}
      <div className="pb-5 px-6 text-center" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
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
          <UtensilsIcon size={30} />
          <span className="text-xs font-bold text-center leading-tight">Quiero pedir yo mismo</span>
        </button>
        <button
          onClick={openWaiterCall}
          style={{ backgroundColor: waiterColor }}
          className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-white active:opacity-85 shadow-sm min-h-[100px]"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="text-xs font-bold text-center leading-tight">Quiero que me atienda un camarero/a</span>
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
              <PinIcon size={16} className="text-[#6B7A8D] flex-shrink-0" />
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

              {/* Step 1: Sectors */}
              {sectores.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Sector</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {sectores.map(sector => {
                      const active = pickedSector?.id === sector.id
                      return (
                        <button
                          key={sector.id}
                          onClick={() => pickSector(sector)}
                          className="rounded-xl py-2.5 px-1 text-xs font-bold text-center border-2 transition-all leading-tight"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {sector.name}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Step 2: Mesas within selected sector */}
              {sectorMesas.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">
                    Mesa — {pickedSector.name}
                  </p>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {sectorMesas.map(mesa => {
                      const active = pickedZone?.id === mesa.id
                      return (
                        <button
                          key={mesa.id}
                          onClick={() => pickMesa(mesa)}
                          className="aspect-square rounded-full flex items-center justify-center text-sm font-black transition-all border-2"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {zoneShort(mesa.name)}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Mesas without a sector */}
              {orphanMesas.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Mesas</p>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {orphanMesas.map(mesa => {
                      const active = pickedZone?.id === mesa.id
                      return (
                        <button
                          key={mesa.id}
                          onClick={() => pickMesa(mesa)}
                          className="aspect-square rounded-full flex items-center justify-center text-sm font-black transition-all border-2"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: 'white' }
                            : { backgroundColor: '#F0F4F8', borderColor: selfColor, color: selfColor }
                          }
                        >
                          {zoneShort(mesa.name)}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Retiro */}
              {retiro.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Retiro</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {retiro.map(zone => {
                      const active = pickedZone?.id === zone.id
                      return (
                        <button
                          key={zone.id}
                          onClick={() => { setPickedZone(zone); setLocation({ type: zone.type, zoneId: zone.id, label: zone.name }); setShowZonePicker(false) }}
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
                  onClick={() => { setPickedSector(null); setPickedZone(null); setLocation(null) }}
                  className="text-[#9DAAB8] text-xs underline w-full text-center mt-1"
                >
                  Quitar selección
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Banner foto de portada ── */}
      {venue?.banner_url && (
        <div className="mt-5 overflow-hidden" style={{ height: 180 }}>
          <img
            src={venue.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Sugerencias del chef ── */}
      {topProducts.length > 0 && (
        <div className="mt-7 px-5">
          <p className="text-sm font-black uppercase tracking-wider text-[#1A2332] mb-3">Sugerencias del chef</p>
          <div className="grid grid-cols-2 gap-3">
            {topProducts.slice(0, 4).map(p => (
              <button
                key={p.id}
                onClick={() => { addItem(p, 1); navigate(`${base}/carta`) }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/[0.05] text-left active:scale-[0.97] transition-transform"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-[#F0F4F8] flex items-center justify-center text-[#C0CBDA]"><UtensilsIcon size={32} /></div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-[#1A2332] leading-tight line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-sm font-black" style={{ color: selfColor }}>{formatPrice(p.price)}</p>
                </div>
              </button>
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

      {/* ── Google login / perfil ── */}
      <div className="mt-6 px-5">
        {isAnonymous ? (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4">
            <button
              onClick={async () => { const r = await loginWithGoogle(`${base}/carta`); if (r?.error) setGoogleError(r.error.message) }}
              className="w-full flex items-center justify-center gap-2.5 bg-[#F8FAFB] border border-black/[0.08] text-[#1A2332] font-semibold text-sm px-4 py-3 rounded-xl hover:bg-[#F0F4F8] transition-colors"
            >
              <GoogleIcon />
              Iniciar sesión con Google
            </button>
            {googleError && <p className="text-red-600 text-xs mt-2 text-center">{googleError}</p>}
            <p className="text-[#9DAAB8] text-xs mt-2.5 text-center">Si no tenés cuenta, hacé tu pedido igual y luego podés registrarte.</p>
          </div>
        ) : customer ? (
          <button
            onClick={() => navigate(`${base}/cuenta`)}
            className="w-full flex items-center justify-between bg-white border border-black/[0.06] rounded-2xl px-4 py-3 shadow-sm"
          >
            <div className="text-left">
              <p className="text-[#1A2332] font-semibold text-sm">{customer.full_name}</p>
              <p className="text-[#9DAAB8] text-xs">Mi cuenta →</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ) : null}
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 text-center space-y-3">
        {instagramHandle && (
          <a
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/[0.08] bg-white shadow-sm text-sm font-semibold text-[#1A2332] hover:bg-[#F0F4F8] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig)" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1" fill="url(#ig)"/>
              <defs>
                <linearGradient id="ig" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="25%" stopColor="#e6683c"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="75%" stopColor="#cc2366"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
            </svg>
            @{instagramHandle}
          </a>
        )}
        <div>
          <a href="https://capyapp.co" target="_blank" rel="noreferrer"
            className="text-[10px] text-[#C0CBDA] hover:text-[#9DAAB8] transition-colors">
            Desarrollado por Capy · capyapp.co
          </a>
        </div>
      </div>

      {/* ── Drawer: llamar al mozo ── */}
      {showWaiterCall && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => !callLoading && setShowWaiterCall(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            {callSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: `${waiterColor}18`, color: waiterColor }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p className="text-[#1A2332] font-black text-xl mb-1 uppercase">¡Camarero/a en camino!</p>
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
                    <h2 className="text-[#1A2332] font-black text-xl uppercase">Solicitar atención</h2>
                    <p className="text-[#9DAAB8] text-sm">¿En qué te podemos ayudar?</p>
                  </div>
                  <button onClick={() => !callLoading && setShowWaiterCall(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D]"><XIcon size={16} /></button>
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
                      <span className="block mb-1.5" style={{ color: selectedReason === r.id ? waiterColor : '#6B7A8D' }}>
                        <r.Icon size={22} />
                      </span>
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
                      <PinIcon size={16} className="text-[#6B7A8D] flex-shrink-0" />
                      <span className="text-[#1A2332] font-bold text-sm">{activeLabel}</span>
                    </div>
                    <button onClick={async () => { await submitCall(activeZoneId, activeLabel) }}
                      disabled={callLoading}
                      style={{ backgroundColor: waiterColor }}
                      className="w-full disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base uppercase tracking-wide">
                      {callLoading ? 'Enviando...' : 'Solicitar atención'}
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
                        {callLoading ? 'Enviando...' : 'Solicitar atención'}
                      </button>
                    ) : (
                      <>
                        {/* Sector selector */}
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

                        {/* Mesa selector inside chosen sector */}
                        {waiterSector && allMesas.filter(m => m.parent_zone_id === waiterSector.id).length > 0 && (
                          <>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">
                              Mesa — {waiterSector.name}
                            </p>
                            <div className="grid grid-cols-5 gap-2 mb-4">
                              {allMesas.filter(m => m.parent_zone_id === waiterSector.id).map(mesa => (
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

                        {/* Orphan mesas (no sector) */}
                        {orphanMesas.length > 0 && (
                          <>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Mesas</p>
                            <div className="grid grid-cols-5 gap-2 mb-4">
                              {orphanMesas.map(mesa => (
                                <button key={mesa.id} onClick={() => submitCall(mesa.id, mesa.name)}
                                  disabled={callLoading}
                                  className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 disabled:opacity-50 bg-white transition-all"
                                  style={{ borderColor: waiterColor, color: waiterColor }}>
                                  {zoneShort(mesa.name)}
                                </button>
                              ))}
                            </div>
                          </>
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
