import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { ClipboardIcon, HelpCircleIcon, FileTextIcon, MessageIcon, PinIcon, UtensilsIcon, XIcon } from '../../components/Icons'
import ClientFloorMap from '../../components/ClientFloorMap'

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
  const selfColor = venue?.header_bg_color || '#1A3A6B'
  const waiterColor = venue?.header_text_color || '#B22222'
  const selfTextColor = (() => {
    const c = selfColor.replace('#', '')
    if (c.length < 6) return 'white'
    const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16)
    return (0.299*r + 0.587*g + 0.114*b)/255 > 0.6 ? '#1A2332' : 'white'
  })()
  // Color guaranteed to be legible on a white/light background.
  // Threshold 0.3: on #F0F4F8 (lum≈0.95) a color needs lum<0.3 for usable contrast.
  const accentOnWhite = (() => {
    const lum = (hex) => {
      const c = hex.replace('#', '')
      if (c.length !== 6) return 1
      const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16)
      return (0.299*r + 0.587*g + 0.114*b) / 255
    }
    if (lum(selfColor) < 0.3) return selfColor
    if (lum(waiterColor) < 0.3) return waiterColor
    return '#1A2332'
  })()
  const { setLocation, setSessionId, addItem } = useCart()
  const { customer, isAnonymous, loginWithGoogle } = useCustomer()
  const [googleError, setGoogleError] = useState('')
  const [forceDesktop, setForceDesktop] = useState(() => localStorage.getItem('capy-force-desktop') === '1')
  function toggleDesktop(v) {
    setForceDesktop(v)
    if (v) localStorage.setItem('capy-force-desktop', '1')
    else localStorage.removeItem('capy-force-desktop')
  }
  const fd = forceDesktop
  const [forceCompact, setForceCompact] = useState(() => localStorage.getItem('capy-force-compact') === '1')
  function toggleCompact(v) {
    setForceCompact(v)
    if (v) localStorage.setItem('capy-force-compact', '1')
    else localStorage.removeItem('capy-force-compact')
  }
  const fc = forceCompact

  const [instagramHandle, setInstagramHandle] = useState('')
  const [description, setDescription] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [address, setAddress] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [retiroExternoEnabled, setRetiroExternoEnabled] = useState(false)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [showExternalOptions, setShowExternalOptions] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [finding, setFinding] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [topProducts, setTopProducts] = useState([])
  const [reservationEnabled, setReservationEnabled] = useState(false)

  const [zones, setZones] = useState([])
  const [pickedSector, setPickedSector] = useState(null)
  const [pickedZone, setPickedZone] = useState(null)
  const [showZonePicker, setShowZonePicker] = useState(false)
  const [zonePickerView, setZonePickerView] = useState('lista') // 'lista' | 'mapa'
  const [locationDisplayMode, setLocationDisplayMode] = useState('lista') // 'lista' | 'ambos' | 'mapa'

  const [showOrderLookup, setShowOrderLookup] = useState(false)
  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)
  const [waiterSector, setWaiterSector] = useState(null)
  const [callLoading, setCallLoading] = useState(false)
  const [callSent, setCallSent] = useState(false)

  const prefillZoneId = searchParams.get('zone_id')
  const prefillLabel = searchParams.get('location_label')
  const prefillType = searchParams.get('location_type') || 'zona'
  const prefillSession = searchParams.get('session_id')
  const isMostrador = searchParams.get('mostrador') === '1'
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

    const venueQ = supabaseCustomer
      .from('venues')
      .select('instagram_handle, retiro_externo_enabled, delivery_enabled, client_floor_map_enabled, location_display_mode, description, announcement, schedule')
      .eq('id', venueId)
      .single()

    if (!prefillZoneId) {
      const zonesQ = supabaseCustomer
        .from('venue_zones')
        .select('id, name, type, parent_zone_id, pos_x, pos_y, size_w, size_h, shape')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name')

      Promise.all([zonesQ, venueQ]).then(([{ data: zonesData }, { data: venueData }]) => {
        const zd = zonesData || []
        setZones(zd)
        if (venueData?.instagram_handle) setInstagramHandle(venueData.instagram_handle)
        if (venueData?.retiro_externo_enabled) setRetiroExternoEnabled(true)
        if (venueData?.delivery_enabled) setDeliveryEnabled(true)
        if (venueData?.description) setDescription(venueData.description)
        if (venueData?.announcement) setAnnouncement(venueData.announcement)
        if (venueData?.schedule) setSchedule(venueData.schedule)
        const mode = venueData?.location_display_mode
          || (venueData?.client_floor_map_enabled ? 'ambos' : 'lista')
        setLocationDisplayMode(mode)
        const hasMesaMap = zd.some(z => z.type === 'mesa' && z.pos_x != null)
        if ((mode === 'mapa' || mode === 'ambos') && hasMesaMap) {
          setZonePickerView('mapa')
        } else {
          setZonePickerView('lista')
        }
        if (isMostrador && base) {
          const retiroZone = zd.find(z => z.type === 'retiro')
          if (retiroZone) {
            setLocation({ type: 'retiro', zoneId: retiroZone.id, label: retiroZone.name, mostrador: true })
          } else {
            setLocation({ type: 'retiro', label: 'Mostrador', mostrador: true })
          }
          navigate(`${base}/carta`, { replace: true })
        }
      }).catch(() => {})
    } else {
      venueQ.then(({ data }) => {
        if (data?.instagram_handle) setInstagramHandle(data.instagram_handle)
        if (data?.retiro_externo_enabled) setRetiroExternoEnabled(true)
        if (data?.delivery_enabled) setDeliveryEnabled(true)
        if (data?.description) setDescription(data.description)
        if (data?.announcement) setAnnouncement(data.announcement)
        if (data?.schedule) setSchedule(data.schedule)
      }).catch(() => {})
    }

    supabaseCustomer
      .from('venues')
      .select('address')
      .eq('id', venueId)
      .single()
      .then(({ data }) => { if (data?.address) setAddress(data.address) })
      .catch(() => {})

    supabaseCustomer
      .from('reservation_settings')
      .select('enabled')
      .eq('venue_id', venueId)
      .maybeSingle()
      .then(({ data }) => { if (data?.enabled) setReservationEnabled(true) })
      .catch(() => {})
  }, [venueId])

  function pickSector(sector) {
    const hasMesas = zones.some(z => z.type === 'mesa' && z.parent_zone_id === sector.id)
    if (pickedSector?.id === sector.id) {
      if (!hasMesas) {
        setPickedSector(null)
        setPickedZone(null)
        setLocation(null)
      } else {
        // Re-click on sector with mesas: reset mesa so user can pick again
        setPickedZone(null)
        setLocation(null)
      }
      return
    }
    setPickedSector(sector)
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
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-waiter-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ zone_id: zoneId, venue_id: venueId, location_label: locationLabel }),
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

  const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const DAY_LABELS = [
    { key: 'lunes', label: 'Lunes' }, { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' }, { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' }, { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
  ]
  const currentDayKey = DAY_KEYS[new Date().getDay()]

  let scheduleStatus = null
  if (schedule) {
    const day = schedule[currentDayKey]
    if (!day?.active) {
      scheduleStatus = { isOpen: false, closeTime: null }
    } else {
      const [fH, fM] = day.from.split(':').map(Number)
      const [tH, tM] = day.to.split(':').map(Number)
      const now = new Date().getHours() * 60 + new Date().getMinutes()
      const from = fH * 60 + fM
      let to = tH * 60 + tM
      if (to <= from) to += 24 * 60
      const adjustedNow = (to > 24 * 60 && now < to - 24 * 60) ? now + 24 * 60 : now
      scheduleStatus = { isOpen: adjustedNow >= from && adjustedNow < to, closeTime: day.to }
    }
  }

  const sectores = zones.filter(z => z.type === 'zona')
  const allMesas = zones.filter(z => z.type === 'mesa')
  const retiro = zones.filter(z => z.type === 'retiro')
  const hasMap = allMesas.some(m => m.pos_x != null)
  const sectorMesas = pickedSector
    ? allMesas.filter(m => m.parent_zone_id === pickedSector.id)
    : []
  const orphanMesas = allMesas.filter(m => !m.parent_zone_id)

  return (
    <div className={`min-h-screen bg-[#FAF9F6] flex flex-col ${fd ? 'flex-row' : fc ? '' : 'lg:flex-row'}`}>

      {/* ── Hero (mobile header) / Sidebar (desktop) ── */}
      <div
        className={`relative overflow-hidden min-h-[220px] ${fd ? 'w-[340px] flex-shrink-0 sticky top-0 h-screen flex flex-col' : fc ? '' : 'lg:w-[340px] xl:w-[400px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col'}`}
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: '2rem',
          ...(venue?.banner_url ? {
            backgroundImage: `url(${venue.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : { backgroundColor: '#1A2332' }),
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

        {/* Login / cuenta — top right */}
        <div className="absolute z-10" style={{ top: 'max(0.75rem, env(safe-area-inset-top))', right: '1rem' }}>
          {!isAnonymous && customer ? (
            <button
              onClick={() => navigate(`${base}/cuenta`)}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-sm"
            >
              {customer.full_name?.[0]?.toUpperCase() || '?'}
            </button>
          ) : (
            <button
              onClick={async () => { const r = await loginWithGoogle(`${base}/carta`); if (r?.error) setGoogleError(r.error.message) }}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white"
              title="Iniciar sesión"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          )}
        </div>

        <div className={`relative z-10 px-6 text-center ${fd ? 'flex-1 flex flex-col items-center justify-center py-10' : fc ? '' : 'lg:flex-1 lg:flex lg:flex-col lg:items-center lg:justify-center lg:py-10'}`}>
          <div className={`${fd ? 'w-28 h-28' : fc ? 'w-20 h-20' : 'w-20 h-20 lg:w-28 lg:h-28'} mx-auto mb-3 rounded-2xl bg-white/95 p-1.5 shadow-lg`}>
            <img
              src={venue?.logo_url || '/icon-512.png'}
              alt={venue?.name || 'Capy'}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1
            className="text-3xl font-black tracking-tight leading-tight uppercase"
            style={{ color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
          >
            {venue?.name || 'Bienvenido'}
          </h1>
          {description && (
            <p className="text-white/60 text-sm mt-1 max-w-xs mx-auto leading-snug">{description}</p>
          )}
          {scheduleStatus && (
            <button
              onClick={() => setShowSchedule(v => !v)}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', backdropFilter: 'blur(4px)' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${scheduleStatus.isOpen ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {scheduleStatus.isOpen ? `Abierto · Cierra ${scheduleStatus.closeTime}` : 'Cerrado ahora'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showSchedule ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}
          {decodedLabel && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', backdropFilter: 'blur(4px)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              {decodedLabel}
            </div>
          )}
        </div>

        {/* Desktop sidebar bottom: schedule + social */}
        <div className={`${fd ? 'flex' : fc ? 'hidden' : 'hidden lg:flex'} flex-col relative z-10 px-6 pb-8 gap-4 border-t border-white/10 mt-auto pt-5`}>
          {schedule && (
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Horarios</p>
              <div className="space-y-1">
                {DAY_LABELS.map(({ key, label }) => {
                  const day = schedule[key]
                  const isToday = key === currentDayKey
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className={`text-xs ${isToday ? 'font-bold text-white' : 'text-white/50'}`}>{label}</span>
                      {day?.active
                        ? <span className={`text-xs tabular-nums ${isToday ? 'font-bold text-white' : 'text-white/50'}`}>{day.from}–{day.to}</span>
                        : <span className="text-xs text-white/25">Cerrado</span>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {instagramHandle && (
              <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
                </svg>
                @{instagramHandle}
              </a>
            )}
            {address && (
              <a href={address} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>
                </svg>
                Ver en Google Maps
              </a>
            )}
            <a href="https://capyapp.co" target="_blank" rel="noreferrer"
              className="text-[10px] text-white/25 hover:text-white/50 transition-colors mt-1">
              Capy · capyapp.co
            </a>
          </div>
        </div>
      </div>

      {/* ── Right column (flex-1 on desktop) ── */}
      <div className="flex-1 flex flex-col">

      {googleError && <p className="text-red-500 text-xs text-center px-4 pt-2">{googleError}</p>}

      {/* ── Toggle vista escritorio / compacta ── */}
      {/* "Ver compacta": visible cuando el layout es desktop (forzado o auto ≥lg) */}
      {!fc && (
        <div className={`${fd ? 'flex' : 'hidden lg:flex'} justify-end px-4 pt-3`}>
          <button
            onClick={() => fd ? toggleDesktop(false) : toggleCompact(true)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9DAAB8] hover:text-[#6B7A8D] border border-[#E0E7EF] bg-white rounded-full px-3 py-1.5 shadow-sm transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/>
            </svg>
            Ver versión compacta
          </button>
        </div>
      )}
      {/* "Ver escritorio": visible cuando el layout es compacto (forzado o auto md-lg) */}
      {!fd && (
        <div className={`${fc ? 'hidden md:flex' : 'hidden md:flex lg:hidden'} justify-end px-4 pt-3`}>
          <button
            onClick={() => fc ? toggleCompact(false) : toggleDesktop(true)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9DAAB8] hover:text-[#6B7A8D] border border-[#E0E7EF] bg-white rounded-full px-3 py-1.5 shadow-sm transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            Ver versión escritorio
          </button>
        </div>
      )}

      {/* ── Horario expandible (mobile only — desktop shows in sidebar) ── */}
      {showSchedule && schedule && !fd && (
        <div className={`${fc ? '' : 'lg:hidden'} px-4 pt-3`}>
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4">
            <p className="text-[#1A2332] font-black text-xs uppercase tracking-wider mb-3">Horarios</p>
            <div className="space-y-1.5">
              {DAY_LABELS.map(({ key, label }) => {
                const day = schedule[key]
                const isToday = key === currentDayKey
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`text-sm ${isToday ? 'font-bold text-[#1A2332]' : 'text-[#6B7A8D]'}`}>{label}</span>
                    {day?.active
                      ? <span className={`text-sm tabular-nums ${isToday ? 'font-bold text-[#1A2332]' : 'text-[#6B7A8D]'}`}>{day.from} – {day.to}</span>
                      : <span className="text-sm text-[#C0CBDA]">Cerrado</span>
                    }
                  </div>
                )
              })}
            </div>
            <button onClick={() => setShowSchedule(false)} className="text-[#9DAAB8] text-xs mt-3 underline">Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Anuncio del día ── */}
      {announcement && (
        <div className="px-4 pt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <p className="text-amber-800 text-sm font-medium leading-snug">{announcement}</p>
          </div>
        </div>
      )}

      {/* ── Contenido principal ── */}
      <div className={`px-4 pt-4 pb-6 space-y-3 w-full md:max-w-xl md:mx-auto md:px-6 ${fd ? 'max-w-2xl px-8 pt-8 pb-12 mx-auto' : fc ? '' : 'lg:max-w-2xl lg:px-8 lg:pt-8 lg:pb-12'}`}>

        {/* ── ¿En qué mesa estás? — PRIMERO ── */}
        {!prefillZoneId && zones.length > 0 && (
          <div>
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

              {/* Map / List toggle — only shown in 'ambos' mode */}
              {hasMap && locationDisplayMode === 'ambos' && (
                <div className="flex gap-1 bg-[#F0F4F8] rounded-xl p-1 mb-4">
                  {['mapa', 'lista'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setZonePickerView(mode)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                      style={zonePickerView === mode
                        ? { backgroundColor: selfColor, color: 'white' }
                        : { color: accentOnWhite }
                      }
                    >
                      {mode === 'mapa' ? (
                        <span className="flex items-center justify-center gap-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                            <line x1="9" y1="3" x2="9" y2="18"/>
                            <line x1="15" y1="6" x2="15" y2="21"/>
                          </svg>
                          Mapa
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                          </svg>
                          Lista
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Map view */}
              {zonePickerView === 'mapa' && hasMap && locationDisplayMode !== 'lista' && (
                <ClientFloorMap
                  zones={zones}
                  accent={selfColor}
                  confirmStep={false}
                  venueId={venueId}
                  onChoose={zone => { pickMesa(zone); setShowZonePicker(false) }}
                />
              )}

              {/* Step 1: Sectors */}
              {zonePickerView === 'lista' && (<>
              {sectores.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Sector</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                    {sectores.map(sector => {
                      const active = pickedSector?.id === sector.id
                      return (
                        <button
                          key={sector.id}
                          onClick={() => pickSector(sector)}
                          className="rounded-xl py-2.5 px-1 text-xs font-bold text-center border-2 transition-all leading-tight"
                          style={active
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: selfTextColor }
                            : { backgroundColor: '#F0F4F8', borderColor: accentOnWhite, color: accentOnWhite }
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
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: selfTextColor }
                            : { backgroundColor: '#F0F4F8', borderColor: accentOnWhite, color: accentOnWhite }
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
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: selfTextColor }
                            : { backgroundColor: '#F0F4F8', borderColor: accentOnWhite, color: accentOnWhite }
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
                            ? { backgroundColor: selfColor, borderColor: selfColor, color: selfTextColor }
                            : { backgroundColor: '#F0F4F8', borderColor: accentOnWhite, color: accentOnWhite }
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
              </>)}
            </div>
          )}
        </div>
      )}

        {/* ── Quiero pedir yo mismo ── */}
        <button
          onClick={() => navigate(`${base}/carta`)}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          style={{ backgroundColor: selfColor }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${selfTextColor === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)'}` }}>
            <UtensilsIcon size={22} style={{ color: selfTextColor }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm leading-tight" style={{ color: selfTextColor }}>Quiero pedir yo mismo</p>
            <p className="text-xs mt-0.5" style={{ color: selfTextColor, opacity: 0.7 }}>Ver la carta y hacer mi pedido</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selfTextColor} strokeWidth="2.5" strokeOpacity="0.6">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* ── Llamar al mozo ── */}
        <button
          onClick={openWaiterCall}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl shadow-md border active:scale-[0.98] transition-transform bg-white"
          style={{ borderColor: `${accentOnWhite}30` }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentOnWhite}15` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-black text-sm leading-tight" style={{ color: accentOnWhite }}>Llamar a un camarero/a</p>
            <p className="text-[#9DAAB8] text-xs mt-0.5">Un camarero viene a tu mesa</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="2.5" strokeOpacity="0.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* ── ¿Ya tenés un pedido? ── */}
        <div>
          <button
            onClick={() => setShowOrderLookup(v => !v)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl shadow-sm border active:scale-[0.98] transition-transform bg-white"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-[#F0F4F8] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-sm leading-tight text-[#1A2332]">¿Ya tenés un pedido?</p>
              <p className="text-[#9DAAB8] text-xs mt-0.5">Consultá el estado con tu número</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5"
              className={`transition-transform duration-200 ${showOrderLookup ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showOrderLookup && (
            <div className="mt-2 bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm">
              <p className="text-[#9DAAB8] text-xs mb-3">Ingresá el número que te dio el camarero</p>
              <form onSubmit={handleFindOrder} className="flex gap-2">
                <input
                  type="number"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="Nº de pedido"
                  className="flex-1 bg-[#F0F4F8] text-center font-mono text-lg py-2.5 rounded-xl focus:outline-none text-[#1A2332] border border-transparent focus:border-[#1A2332]/20"
                  min="1"
                  autoFocus
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
          )}
        </div>

        {/* ── Para llevar — separado ── */}
        {(retiroExternoEnabled || deliveryEnabled) && (
          <div className="pt-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-black/[0.07]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B0BBCA]">Para llevar</span>
              <div className="flex-1 h-px bg-black/[0.07]" />
            </div>
            {!showExternalOptions ? (
              <button
                onClick={() => setShowExternalOptions(true)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accentOnWhite}15` }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm leading-tight text-[#1A2332]">Pido desde afuera de {venue?.name || 'acá'}</p>
                  <p className="text-[#9DAAB8] text-xs mt-0.5">Retiro o delivery</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ) : (
              <div className="bg-white border border-black/[0.06] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <p className="text-[#1A2332] font-black text-sm">¿Cómo lo querés?</p>
                  <button onClick={() => setShowExternalOptions(false)} aria-label="Cerrar" className="w-10 h-10 flex items-center justify-center text-[#9DAAB8] text-xs">✕</button>
                </div>
                <div className={`grid gap-3 px-4 pb-4 ${retiroExternoEnabled && deliveryEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {retiroExternoEnabled && (
                    <button
                      onClick={() => { setLocation({ type: 'retiro_externo', label: 'Retiro en local' }); navigate(`${base}/carta`) }}
                      className="border-2 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
                      style={{ borderColor: `${accentOnWhite}40`, backgroundColor: `${accentOnWhite}08` }}
                    >
                      <div className="w-9 h-9 rounded-xl mb-2.5 flex items-center justify-center" style={{ backgroundColor: `${accentOnWhite}15` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                      </div>
                      <p className="font-bold text-sm leading-tight" style={{ color: accentOnWhite }}>Retiro en local</p>
                      <p className="text-[#9DAAB8] text-xs mt-0.5">Pasás a buscar</p>
                    </button>
                  )}
                  {deliveryEnabled && (
                    <button
                      onClick={() => { setLocation({ type: 'delivery', label: 'Delivery' }); navigate(`${base}/carta`) }}
                      className="border-2 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
                      style={{ borderColor: `${accentOnWhite}40`, backgroundColor: `${accentOnWhite}08` }}
                    >
                      <div className="w-9 h-9 rounded-xl mb-2.5 flex items-center justify-center" style={{ backgroundColor: `${accentOnWhite}15` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      </div>
                      <p className="font-bold text-sm leading-tight" style={{ color: accentOnWhite }}>Delivery</p>
                      <p className="text-[#9DAAB8] text-xs mt-0.5">Te lo llevamos</p>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Reservar una mesa ── */}
        {reservationEnabled && (
          <button
            onClick={() => navigate(`${base}/reservar`)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl shadow-md border active:scale-[0.98] transition-transform bg-white"
            style={{ borderColor: `${selfColor}30` }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentOnWhite}15` }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-sm leading-tight" style={{ color: accentOnWhite }}>Reservar una mesa</p>
              <p className="text-[#9DAAB8] text-xs mt-0.5">Elegí día, horario y cantidad de personas</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentOnWhite} strokeWidth="2.5" strokeOpacity="0.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* ── Sugerencias del chef ── */}
        {topProducts.length > 0 && (
          <div className="pt-1">
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
                    <p className="text-sm font-black" style={{ color: accentOnWhite }}>{formatPrice(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>{/* fin contenido principal */}

      {/* ── Footer (mobile only — desktop shows in sidebar) ── */}
      <div className="mt-auto pt-8 pb-10 text-center space-y-3">
        <div className={`${fd ? 'hidden' : fc ? '' : 'lg:hidden'} space-y-3`}>
          {instagramHandle && (
            <div>
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
            </div>
          )}
          {address && (
            <div>
              <a
                href={address}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#9DAAB8] text-xs hover:text-[#1A2332] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>
                </svg>
                Ver en Google Maps
              </a>
            </div>
          )}
        </div>
        <div>
          <a href="https://capyapp.co" target="_blank" rel="noreferrer"
            className={`text-[10px] text-[#C0CBDA] hover:text-[#9DAAB8] transition-colors ${fd ? 'hidden' : fc ? '' : 'lg:hidden'}`}>
            Desarrollado por Capy · capyapp.co
          </a>
        </div>
      </div>

      </div>{/* end right column */}

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
                    aria-label="Cerrar"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D]"><XIcon size={16} /></button>
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
