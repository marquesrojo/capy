import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { useVenueOptional, useClientBase } from '../../hooks/useVenue'
import { useCustomer } from '../../hooks/useCustomer'

const SHAPE_LABELS = { cuadrada: 'Cuadrada', redonda: 'Redonda', rectangular: 'Rectangular', barra: 'Barra' }
const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  return `${DAYS_ES[date.getDay()]} ${d} de ${MONTHS_ES[date.getMonth()]}`
}

export default function ReservationBookingPage() {
  const navigate = useNavigate()
  const venueCtx = useVenueOptional()
  const venue = venueCtx?.venue
  const venueId = venue?.id
  const base = useClientBase()
  const selfColor = venue?.header_bg_color || '#1A3A6B'
  const { customer, isAnonymous, userEmail, loginWithGoogle } = useCustomer()
  const [loginError, setLoginError] = useState('')

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [weeklySlots, setWeeklySlots] = useState([])
  const [blockedDates, setBlockedDates] = useState(new Set())
  const [tableTypes, setTableTypes] = useState([]) // { shape, capacity, total, available }

  const [step, setStep] = useState('fecha') // fecha | turno | mesa | datos | confirmar
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedTableType, setSelectedTableType] = useState(null)
  const [guests, setGuests] = useState(2)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmed, setConfirmed] = useState(null)

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })

  // Auto-fill datos from customer profile
  useEffect(() => {
    if (!customer || isAnonymous) return
    if (customer.full_name) setName(customer.full_name)
    if (customer.whatsapp) setPhone(customer.whatsapp)
    if (userEmail) setEmail(userEmail)
  }, [customer?.id, isAnonymous])

  useEffect(() => {
    if (venueId) loadConfig()
  }, [venueId])

  async function loadConfig() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const [settingsRes, slotsRes, overridesRes] = await Promise.all([
      supabaseCustomer.from('reservation_settings').select('*').eq('venue_id', venueId).maybeSingle(),
      supabaseCustomer.from('reservation_weekly_slots').select('*').eq('venue_id', venueId).eq('is_active', true),
      supabaseCustomer.from('reservation_date_overrides').select('date').eq('venue_id', venueId).eq('is_blocked', true).gte('date', today),
    ])
    if (!settingsRes.data?.enabled) { navigate(base); return }
    setSettings(settingsRes.data)
    setWeeklySlots(slotsRes.data || [])
    setBlockedDates(new Set((overridesRes.data || []).map(o => o.date)))
    setLoading(false)
  }

  async function loadAvailability(dateStr, slotTime) {
    // Count existing reservations per table type for this slot
    const { data: existing } = await supabaseCustomer
      .from('reservations')
      .select('table_shape, table_capacity')
      .eq('venue_id', venueId)
      .eq('date', dateStr)
      .eq('slot_time', slotTime)
      .eq('status', 'confirmed')

    // Get all reservable tables
    const { data: tables } = await supabaseCustomer
      .from('venue_zones')
      .select('shape, reservation_capacity')
      .eq('venue_id', venueId)
      .eq('type', 'mesa')
      .eq('is_active', true)
      .eq('is_reservable', true)
      .not('reservation_capacity', 'is', null)

    if (!tables?.length) { setTableTypes([]); return }

    // Group tables by (shape, capacity)
    const totalByType = {}
    for (const t of tables) {
      const key = `${t.shape}|${t.reservation_capacity}`
      totalByType[key] = (totalByType[key] || 0) + 1
    }

    const reservedByType = {}
    for (const r of existing || []) {
      const key = `${r.table_shape}|${r.table_capacity}`
      reservedByType[key] = (reservedByType[key] || 0) + 1
    }

    const types = Object.entries(totalByType).map(([key, total]) => {
      const [shape, capacity] = key.split('|')
      const reserved = reservedByType[key] || 0
      return { shape, capacity: parseInt(capacity), total, reserved, available: total - reserved }
    }).filter(t => t.available > 0)
    .sort((a, b) => a.capacity - b.capacity)

    setTableTypes(types)
  }

  // Calendar helpers
  function calDays() {
    const { year, month } = calMonth
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const maxDate = settings ? new Date(today.getTime() + settings.max_advance_days * 86400000) : today
    const activeDows = new Set(weeklySlots.map(s => s.day_of_week))
    const days = []
    for (let i = 0; i < (first.getDay() || 7) - 1; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isPast = date < today
      const isBeyondMax = date > maxDate
      const isBlocked = blockedDates.has(dateStr)
      const hasSlot = activeDows.has(date.getDay())
      const available = !isPast && !isBeyondMax && !isBlocked && hasSlot
      days.push({ d, dateStr, available, isSelected: selectedDate === dateStr })
    }
    return days
  }

  function getSlotsForDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00')
    const dow = date.getDay()
    const windows = weeklySlots.filter(s => s.day_of_week === dow)
    const duration = settings?.slot_duration_minutes || 90
    const slots = []
    for (const win of windows) {
      const [startH, startM] = win.start_time.split(':').map(Number)
      const [endH, endM] = win.end_time.split(':').map(Number)
      let cur = startH * 60 + startM
      const end = endH * 60 + endM
      while (cur + duration <= end) {
        const h = Math.floor(cur / 60)
        const m = cur % 60
        slots.push({
          ...win,
          start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        })
        cur += duration
      }
    }
    return slots
  }

  async function selectDate(dateStr) {
    setSelectedDate(dateStr)
    setSelectedSlot(null)
    setSelectedTableType(null)
    setStep('turno')
  }

  async function selectSlot(slot) {
    setSelectedSlot(slot)
    setSelectedTableType(null)
    await loadAvailability(selectedDate, slot.start_time)
    setStep('mesa')
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) return
    setSubmitting(true)
    setSubmitError('')
    const { data: sessionData } = await supabaseCustomer.auth.getSession()
    const customerId = sessionData?.session?.user?.id || null
    const payload = {
      venue_id: venueId,
      date: selectedDate,
      slot_time: selectedSlot.start_time,
      guests,
      table_shape: selectedTableType?.shape || null,
      table_capacity: selectedTableType?.capacity || null,
      guest_name: name.trim(),
      guest_phone: phone.trim(),
      guest_email: email.trim() || null,
      notes: notes.trim() || null,
      status: 'confirmed',
    }
    if (customerId) payload.customer_id = customerId
    let { data, error } = await supabaseCustomer.from('reservations').insert(payload).select().single()
    // Retry without customer_id if the column doesn't exist yet (migration pending)
    if (error?.message?.includes('customer_id')) {
      delete payload.customer_id
      ;({ data, error } = await supabaseCustomer.from('reservations').insert(payload).select().single())
    }

    if (error || !data) {
      setSubmitError('No pudimos confirmar la reserva. Intentá de nuevo.')
      setSubmitting(false)
      return
    }

    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ reservation_id: data.id, event_type: 'reservation_created' }),
    }).catch(() => {})

    setConfirmed(data)
  }

  // Login gate — must have a Google-linked account to reserve
  if (!customer || isAnonymous) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
        <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-black/[0.06]">
          <button onClick={() => navigate(base)} className="text-[#6B7A8D] text-sm">← Volver</button>
          <div>
            <p className="text-[#1A2332] font-black text-base">Reservar mesa</p>
            {venue?.name && <p className="text-[#9DAAB8] text-xs">{venue.name}</p>}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${selfColor}15` }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={selfColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 className="text-[#1A2332] font-black text-xl mb-2">Iniciá sesión para reservar</h2>
          <p className="text-[#9DAAB8] text-sm mb-8 max-w-xs leading-relaxed">
            Tu reserva queda guardada en tu cuenta para que puedas consultarla cuando quieras.
          </p>
          <button
            onClick={async () => {
              const r = await loginWithGoogle(`${base}/reservar`)
              if (r?.error) setLoginError(r.error.message)
            }}
            className="flex items-center gap-3 bg-white border border-black/[0.10] shadow-sm font-semibold text-[#1A2332] text-sm px-6 py-3.5 rounded-2xl"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
          {loginError && <p className="text-red-500 text-xs mt-3">{loginError}</p>}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <p className="text-[#9DAAB8] text-sm">Cargando...</p>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${selfColor}18` }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={selfColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="text-[#1A2332] font-black text-2xl uppercase mb-1">¡Reserva confirmada!</h2>
        <p className="text-[#9DAAB8] text-sm mb-6 capitalize">{fmtDate(confirmed.date)} · {confirmed.slot_time?.slice(0,5)} · {confirmed.guests} pers.</p>
        {settings?.booking_notes && (
          <div className="bg-white border border-black/[0.07] rounded-2xl p-4 mb-6 max-w-xs w-full text-left">
            <p className="text-[#6B7A8D] text-xs leading-relaxed">{settings.booking_notes}</p>
          </div>
        )}
        <button
          onClick={() => navigate(base)}
          className="font-bold px-8 py-3 rounded-2xl text-sm text-white"
          style={{ backgroundColor: selfColor }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const slotsForDate = selectedDate ? getSlotsForDate(selectedDate) : []

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-black/[0.06]">
        <button
          onClick={() => {
            if (step === 'fecha') navigate(base)
            else if (step === 'turno') setStep('fecha')
            else if (step === 'mesa') setStep('turno')
            else if (step === 'datos') setStep('mesa')
            else if (step === 'confirmar') setStep('datos')
          }}
          className="text-[#6B7A8D] text-sm"
        >← Volver</button>
        <div>
          <p className="text-[#1A2332] font-black text-base">Reservar mesa</p>
          {venue?.name && <p className="text-[#9DAAB8] text-xs">{venue.name}</p>}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {['fecha', 'turno', 'mesa', 'datos'].map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
            step === s ? 'opacity-100' :
            ['fecha', 'turno', 'mesa', 'datos', 'confirmar'].indexOf(step) > i ? 'opacity-50' : 'opacity-20'
          }`} style={{ backgroundColor: selfColor }} />
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Paso: Fecha ── */}
        {step === 'fecha' && (
          <>
            <p className="text-[#1A2332] font-black text-lg">¿Cuándo querés venir?</p>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
                  className="w-8 h-8 rounded-lg bg-[#F0F4F8] text-[#6B7A8D] flex items-center justify-center font-bold"
                >‹</button>
                <p className="text-[#1A2332] font-bold text-sm capitalize">
                  {new Date(calMonth.year, calMonth.month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  onClick={() => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
                  className="w-8 h-8 rounded-lg bg-[#F0F4F8] text-[#6B7A8D] flex items-center justify-center font-bold"
                >›</button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L','M','X','J','V','S','D'].map(d => (
                  <p key={d} className="text-center text-[10px] font-bold text-[#C0CBDA]">{d}</p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calDays().map((day, i) => {
                  if (!day) return <div key={`e${i}`} />
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => day.available && selectDate(day.dateStr)}
                      disabled={!day.available}
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                        day.isSelected ? 'text-white shadow-md' :
                        day.available ? 'text-[#1A2332] hover:opacity-80 active:scale-95' :
                        'text-[#D0D9E3] cursor-default'
                      }`}
                      style={day.isSelected ? { backgroundColor: selfColor } :
                        day.available ? { backgroundColor: `${selfColor}12` } : {}}
                    >
                      {day.d}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Paso: Turno ── */}
        {step === 'turno' && selectedDate && (
          <>
            <div>
              <p className="text-[#1A2332] font-black text-lg">Elegí el horario</p>
              <p className="text-[#9DAAB8] text-sm capitalize">{fmtDate(selectedDate)}</p>
            </div>

            <div className="space-y-2">
              {slotsForDate.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => selectSlot(slot)}
                  className="w-full bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <p className="text-[#1A2332] font-bold text-sm">
                      {slot.start_time.slice(0,5)}
                    </p>
                    {slot.label && <p className="text-[#9DAAB8] text-xs mt-0.5">{slot.label}</p>}
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9DAAB8" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Paso: Mesa ── */}
        {step === 'mesa' && selectedDate && selectedSlot && (
          <>
            <div>
              <p className="text-[#1A2332] font-black text-lg">Tipo de mesa</p>
              <p className="text-[#9DAAB8] text-sm capitalize">{fmtDate(selectedDate)} · {selectedSlot.start_time.slice(0,5)}</p>
            </div>

            <div>
              <p className="text-[#9DAAB8] text-xs font-semibold uppercase tracking-wide mb-2">Personas</p>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center justify-between shadow-sm">
                <button
                  onClick={() => setGuests(g => Math.max(settings?.min_guests || 1, g - 1))}
                  className="w-10 h-10 rounded-full bg-[#F0F4F8] font-bold text-xl text-[#3A4A5A] flex items-center justify-center"
                >−</button>
                <span className="font-black text-2xl text-[#1A2332]">{guests}</span>
                <button
                  onClick={() => setGuests(g => Math.min(settings?.max_guests || 10, g + 1))}
                  className="w-10 h-10 rounded-full font-bold text-xl text-white flex items-center justify-center"
                  style={{ backgroundColor: selfColor }}
                >+</button>
              </div>
            </div>

            {tableTypes.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-amber-700 text-sm font-semibold">No hay mesas disponibles para este horario.</p>
                <button onClick={() => setStep('turno')} className="text-amber-600 text-xs underline mt-2">Elegir otro horario</button>
              </div>
            ) : (
              <>
                <p className="text-[#9DAAB8] text-xs font-semibold uppercase tracking-wide -mb-2">Tipo de mesa</p>
                <div className="space-y-2">
                  {tableTypes.map(type => {
                    const isSelected = selectedTableType?.shape === type.shape && selectedTableType?.capacity === type.capacity
                    return (
                      <button
                        key={`${type.shape}|${type.capacity}`}
                        onClick={() => setSelectedTableType(type)}
                        className="w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]"
                        style={isSelected
                          ? { backgroundColor: `${selfColor}10`, borderColor: selfColor }
                          : { backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.08)' }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-[#1A2332] capitalize">
                              Mesa {SHAPE_LABELS[type.shape]?.toLowerCase() || type.shape}
                            </p>
                            <p className="text-[#9DAAB8] text-xs mt-0.5">Hasta {type.capacity} personas</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold" style={{ color: selfColor }}>
                              {type.available} disponible{type.available !== 1 ? 's' : ''}
                            </p>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center ml-auto mt-1" style={{ backgroundColor: selfColor }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setStep('datos')}
                  disabled={!selectedTableType || guests > (selectedTableType?.capacity || 0)}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
                  style={{ backgroundColor: selfColor }}
                >
                  Continuar →
                </button>
                {selectedTableType && guests > (selectedTableType?.capacity || 0) && (
                  <p className="text-red-500 text-xs text-center -mt-2">Esta mesa admite hasta {selectedTableType.capacity} personas.</p>
                )}
              </>
            )}
          </>
        )}

        {/* ── Paso: Datos del cliente ── */}
        {step === 'datos' && (
          <>
            <p className="text-[#1A2332] font-black text-lg">Tus datos</p>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 space-y-3">
              <div>
                <p className="text-[#9DAAB8] text-xs font-semibold mb-1.5">Nombre *</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full bg-[#F8FAFC] border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-[#1A2332] placeholder-[#B0BBCA]"
                  autoFocus
                />
              </div>
              <div>
                <p className="text-[#9DAAB8] text-xs font-semibold mb-1.5">Teléfono *</p>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+54 9 11..."
                  className="w-full bg-[#F8FAFC] border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-[#1A2332] placeholder-[#B0BBCA]"
                />
              </div>
              <div>
                <p className="text-[#9DAAB8] text-xs font-semibold mb-1.5">Email <span className="font-normal">(opcional)</span></p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-[#F8FAFC] border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-[#1A2332] placeholder-[#B0BBCA]"
                />
              </div>
              <div>
                <p className="text-[#9DAAB8] text-xs font-semibold mb-1.5">Aclaraciones <span className="font-normal">(opcional)</span></p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Es cumpleaños, silla para bebé, alergia..."
                  rows={2}
                  className="w-full bg-[#F8FAFC] border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-[#1A2332] placeholder-[#B0BBCA] resize-none"
                />
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 space-y-1.5">
              <p className="text-[#9DAAB8] text-xs font-semibold uppercase tracking-wide mb-2">Resumen</p>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7A8D]">Fecha</span>
                <span className="text-[#1A2332] font-semibold capitalize">{fmtDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7A8D]">Horario</span>
                <span className="text-[#1A2332] font-semibold">{selectedSlot?.start_time?.slice(0,5)}{selectedSlot?.label ? ` · ${selectedSlot.label}` : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7A8D]">Mesa</span>
                <span className="text-[#1A2332] font-semibold capitalize">
                  {SHAPE_LABELS[selectedTableType?.shape]?.toLowerCase() || selectedTableType?.shape} · {guests} pers.
                </span>
              </div>
            </div>

            {settings?.booking_notes && (
              <p className="text-[#9DAAB8] text-xs leading-relaxed px-1">{settings.booking_notes}</p>
            )}

            {submitError && <p className="text-red-500 text-xs text-center">{submitError}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !phone.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
              style={{ backgroundColor: selfColor }}
            >
              {submitting ? 'Confirmando...' : 'Confirmar reserva'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
