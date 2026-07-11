import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const DAYS = [
  { dow: 1, label: 'Lunes' }, { dow: 2, label: 'Martes' }, { dow: 3, label: 'Miércoles' },
  { dow: 4, label: 'Jueves' }, { dow: 5, label: 'Viernes' }, { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
]

const SHAPE_LABELS = { cuadrada: 'Cuadrada', redonda: 'Redonda', rectangular: 'Rectangular', barra: 'Barra' }

const STATUS_LABELS = { confirmed: 'Confirmada', cancelled: 'Cancelada', no_show: 'No se presentó', completed: 'Completada' }
const STATUS_COLORS = {
  confirmed: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/30',
  no_show: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  completed: 'text-smoke-400 bg-carbon-800 border-carbon-700',
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${value ? 'bg-ember-500' : 'bg-carbon-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SectionLabel({ children }) {
  return <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">{children}</p>
}

export default function ReservasPage() {
  const { venueId } = useAuth()
  const [tab, setTab] = useState('config')
  const [loading, setLoading] = useState(true)

  // Config
  const [settings, setSettings] = useState({ enabled: false, slot_duration_minutes: 90, max_advance_days: 30, min_guests: 1, max_guests: 10, booking_notes: '' })
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedConfig, setSavedConfig] = useState(false)

  // Mesas
  const [tables, setTables] = useState([])

  // Horarios
  const [weeklySlots, setWeeklySlots] = useState([])
  const [newSlot, setNewSlot] = useState({ day_of_week: 5, start_time: '20:00', end_time: '23:00', label: '', max_covers: 30 })

  // Calendario
  const [overrides, setOverrides] = useState([])
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })

  // Reservas
  const [reservations, setReservations] = useState([])
  const [resFilter, setResFilter] = useState('upcoming')

  useEffect(() => {
    if (venueId) loadAll()
  }, [venueId])

  async function loadAll() {
    setLoading(true)
    const [settingsRes, tablesRes, slotsRes, overridesRes, reservationsRes] = await Promise.all([
      supabaseStaff.from('reservation_settings').select('*').eq('venue_id', venueId).maybeSingle(),
      supabaseStaff.from('venue_zones').select('id, name, shape, reservation_capacity, is_reservable').eq('venue_id', venueId).eq('type', 'mesa').eq('is_active', true).order('sort_order'),
      supabaseStaff.from('reservation_weekly_slots').select('*').eq('venue_id', venueId).order('day_of_week').order('start_time'),
      supabaseStaff.from('reservation_date_overrides').select('*').eq('venue_id', venueId).gte('date', new Date().toISOString().slice(0, 10)).order('date'),
      supabaseStaff.from('reservations').select('*').eq('venue_id', venueId).gte('date', new Date().toISOString().slice(0, 10)).order('date').order('slot_time').limit(100),
    ])
    if (settingsRes.data) setSettings(s => ({ ...s, ...settingsRes.data }))
    setTables(tablesRes.data || [])
    setWeeklySlots(slotsRes.data || [])
    setOverrides(overridesRes.data || [])
    setReservations(reservationsRes.data || [])
    setLoading(false)
  }

  async function toggleEnabled() {
    const newVal = !settings.enabled
    setSettings(s => ({ ...s, enabled: newVal }))
    await supabaseStaff.from('reservation_settings').upsert({ venue_id: venueId, ...settings, enabled: newVal }, { onConflict: 'venue_id' })
  }

  async function saveConfig() {
    setSavingConfig(true)
    await supabaseStaff.from('reservation_settings').upsert({ venue_id: venueId, ...settings }, { onConflict: 'venue_id' })
    setSavingConfig(false)
    setSavedConfig(true)
    setTimeout(() => setSavedConfig(false), 2000)
  }

  async function toggleTableReservable(table) {
    const newVal = !table.is_reservable
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_reservable: newVal } : t))
    await supabaseStaff.from('venue_zones').update({ is_reservable: newVal }).eq('id', table.id)
  }

  async function setTableCapacity(table, capacity) {
    const val = parseInt(capacity) || null
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, reservation_capacity: val } : t))
    await supabaseStaff.from('venue_zones').update({ reservation_capacity: val }).eq('id', table.id)
  }

  async function addWeeklySlot() {
    const { data } = await supabaseStaff.from('reservation_weekly_slots')
      .insert({ venue_id: venueId, ...newSlot })
      .select().single()
    if (data) setWeeklySlots(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
  }

  async function toggleWeeklySlot(slot) {
    const newVal = !slot.is_active
    setWeeklySlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_active: newVal } : s))
    await supabaseStaff.from('reservation_weekly_slots').update({ is_active: newVal }).eq('id', slot.id)
  }

  async function deleteWeeklySlot(id) {
    setWeeklySlots(prev => prev.filter(s => s.id !== id))
    await supabaseStaff.from('reservation_weekly_slots').delete().eq('id', id)
  }

  async function toggleDateBlocked(dateStr) {
    const existing = overrides.find(o => o.date === dateStr)
    if (existing) {
      setOverrides(prev => prev.filter(o => o.date !== dateStr))
      await supabaseStaff.from('reservation_date_overrides').delete().eq('id', existing.id)
    } else {
      const { data } = await supabaseStaff.from('reservation_date_overrides')
        .upsert({ venue_id: venueId, date: dateStr, is_blocked: true }, { onConflict: 'venue_id,date' })
        .select().single()
      if (data) setOverrides(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    }
  }

  async function updateReservationStatus(id, status) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    await supabaseStaff.from('reservations').update({ status }).eq('id', id)
  }

  // Calendar helpers
  const blockedDates = new Set(overrides.filter(o => o.is_blocked).map(o => o.date))
  const activeDows = new Set(weeklySlots.filter(s => s.is_active).map(s => s.day_of_week))

  function calDays() {
    const { year, month } = calMonth
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today); maxDate.setDate(today.getDate() + settings.max_advance_days)
    const days = []
    for (let i = 0; i < (first.getDay() || 7) - 1; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d)
      const dateStr = date.toISOString().slice(0, 10)
      const isBlocked = blockedDates.has(dateStr)
      const isPast = date < today
      const isBeyondMax = date > maxDate
      const hasSlot = activeDows.has(date.getDay())
      days.push({ d, dateStr, isBlocked, isPast, isBeyondMax, hasSlot })
    }
    return days
  }

  const filteredReservations = resFilter === 'upcoming'
    ? reservations.filter(r => r.status === 'confirmed')
    : reservations

  function fmtDate(dateStr) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function fmtTime(timeStr) {
    return timeStr?.slice(0, 5) || ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">RESERVAS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: 'config', label: 'Configuración' },
          { key: 'mesas', label: 'Mesas' },
          { key: 'horarios', label: 'Horarios' },
          { key: 'calendario', label: 'Calendario' },
          { key: 'reservas', label: 'Reservas' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border transition-colors flex-shrink-0 ${
              tab === t.key
                ? 'bg-ember-500 text-white border-ember-500'
                : 'bg-carbon-900 text-smoke-400 border-carbon-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="px-4 mt-4 space-y-4">

        {/* ── TAB: Configuración ── */}
        {tab === 'config' && (
          <>
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-smoke-300 font-semibold text-sm">Sistema de reservas</p>
                  <p className="text-smoke-500 text-xs mt-0.5">Aparece el botón de reserva en la home del local</p>
                </div>
                <Toggle value={settings.enabled} onChange={toggleEnabled} />
              </div>
            </div>

            {settings.enabled && tables.filter(t => t.is_reservable && t.reservation_capacity).length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div className="flex-1">
                  <p className="text-amber-700 text-xs font-semibold">Falta configurar las mesas</p>
                  <p className="text-amber-700/80 text-xs mt-0.5">El sistema está activo pero no hay mesas habilitadas para reservar. Los clientes verán "No hay mesas disponibles".</p>
                  <button onClick={() => setTab('mesas')} className="text-amber-700 text-xs font-semibold underline mt-1.5">
                    Ir a Mesas →
                  </button>
                </div>
              </div>
            )}

            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
              <SectionLabel>Parámetros</SectionLabel>

              <div>
                <p className="text-smoke-400 text-xs mb-1.5">Duración de cada turno</p>
                <select
                  value={settings.slot_duration_minutes}
                  onChange={e => setSettings(s => ({ ...s, slot_duration_minutes: parseInt(e.target.value) }))}
                  className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2.5"
                >
                  {[60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} min ({Math.floor(m/60)}h{m%60 ? ` ${m%60}min` : ''})</option>)}
                </select>
              </div>

              <div>
                <p className="text-smoke-400 text-xs mb-1.5">Días de anticipación máximos</p>
                <select
                  value={settings.max_advance_days}
                  onChange={e => setSettings(s => ({ ...s, max_advance_days: parseInt(e.target.value) }))}
                  className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2.5"
                >
                  {[7, 14, 21, 30, 60, 90].map(d => <option key={d} value={d}>{d} días</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-smoke-400 text-xs mb-1.5">Mín. personas</p>
                  <input type="number" min="1" max="20" value={settings.min_guests}
                    onChange={e => setSettings(s => ({ ...s, min_guests: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2.5" />
                </div>
                <div className="flex-1">
                  <p className="text-smoke-400 text-xs mb-1.5">Máx. personas</p>
                  <input type="number" min="1" max="100" value={settings.max_guests}
                    onChange={e => setSettings(s => ({ ...s, max_guests: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2.5" />
                </div>
              </div>

              <div>
                <p className="text-smoke-400 text-xs mb-1.5">Nota para el cliente (opcional)</p>
                <textarea
                  value={settings.booking_notes || ''}
                  onChange={e => setSettings(s => ({ ...s, booking_notes: e.target.value }))}
                  placeholder="Ej: Confirmamos la reserva por WhatsApp..."
                  rows={2}
                  className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2.5 resize-none placeholder-smoke-600"
                />
              </div>
            </div>

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
            >
              {savingConfig ? 'Guardando...' : savedConfig ? '✓ Guardado' : 'Guardar configuración'}
            </button>
          </>
        )}

        {/* ── TAB: Mesas ── */}
        {tab === 'mesas' && (
          <>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <p className="text-amber-700 text-xs leading-snug">
                Marcá las mesas disponibles para reservar y definí cuántas personas admite cada una.
                El cliente verá los tipos de mesa disponibles (redonda, cuadrada, etc.) sin ver las ubicaciones exactas.
              </p>
            </div>

            {tables.length === 0 ? (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
                <p className="text-smoke-400 text-sm">No hay mesas configuradas.</p>
                <Link to="/admin/ubicaciones" className="text-ember-500 text-xs underline mt-2 block">
                  Ir a Ubicaciones →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {tables.map(table => (
                  <div key={table.id} className={`bg-carbon-900 border rounded-2xl p-4 ${table.is_reservable ? 'border-ember-500/40' : 'border-carbon-700'}`}>
                    <div className="flex items-center gap-3">
                      <Toggle value={table.is_reservable} onChange={() => toggleTableReservable(table)} />
                      <div className="flex-1">
                        <p className="text-smoke-200 font-semibold text-sm">{table.name}</p>
                        {table.shape && (
                          <p className="text-smoke-500 text-xs capitalize">{SHAPE_LABELS[table.shape] || table.shape}</p>
                        )}
                      </div>
                      {table.is_reservable && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={table.reservation_capacity || ''}
                            onChange={e => setTableCapacity(table, e.target.value)}
                            placeholder="Pers."
                            className="w-16 bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-lg px-2 py-1.5 text-center"
                          />
                          <span className="text-smoke-500 text-xs">pers.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Horarios ── */}
        {tab === 'horarios' && (
          <>
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 space-y-3">
              <SectionLabel>Agregar turno recurrente</SectionLabel>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-smoke-500 text-xs mb-1">Día</p>
                  <select
                    value={newSlot.day_of_week}
                    onChange={e => setNewSlot(s => ({ ...s, day_of_week: parseInt(e.target.value) }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2"
                  >
                    {DAYS.map(d => <option key={d.dow} value={d.dow}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-smoke-500 text-xs mb-1">Nombre del turno (opcional)</p>
                  <input
                    type="text"
                    value={newSlot.label}
                    onChange={e => setNewSlot(s => ({ ...s, label: e.target.value }))}
                    placeholder="Ej: Cena, Almuerzo"
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2 placeholder-smoke-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-smoke-500 text-xs mb-1">Desde</p>
                  <input
                    type="time"
                    value={newSlot.start_time}
                    onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <p className="text-smoke-500 text-xs mb-1">Hasta</p>
                  <input
                    type="time"
                    value={newSlot.end_time}
                    onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <p className="text-smoke-500 text-xs mb-1">Cubiertos</p>
                  <input
                    type="number"
                    min="1"
                    value={newSlot.max_covers}
                    onChange={e => setNewSlot(s => ({ ...s, max_covers: parseInt(e.target.value) || 30 }))}
                    className="w-full bg-carbon-800 border border-carbon-700 text-smoke-300 text-sm rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <button
                onClick={addWeeklySlot}
                className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                + Agregar turno
              </button>
            </div>

            {weeklySlots.length === 0 ? (
              <p className="text-smoke-500 text-xs text-center py-4">No hay turnos configurados todavía.</p>
            ) : (
              <div className="space-y-2">
                {DAYS.map(day => {
                  const daySlots = weeklySlots.filter(s => s.day_of_week === day.dow)
                  if (daySlots.length === 0) return null
                  return (
                    <div key={day.dow}>
                      <p className="text-smoke-400 text-xs font-bold uppercase tracking-wide px-1 mb-1.5">{day.label}</p>
                      {daySlots.map(slot => (
                        <div key={slot.id} className={`bg-carbon-900 border rounded-xl px-4 py-3 flex items-center gap-3 mb-1.5 ${slot.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'}`}>
                          <Toggle value={slot.is_active} onChange={() => toggleWeeklySlot(slot)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-smoke-200 text-sm font-semibold tabular-nums">
                              {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                              {slot.label && <span className="text-smoke-500 font-normal ml-2">· {slot.label}</span>}
                            </p>
                            <p className="text-smoke-500 text-xs">{slot.max_covers} cubiertos máx.</p>
                          </div>
                          <button
                            onClick={() => deleteWeeklySlot(slot.id)}
                            className="text-smoke-600 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Calendario ── */}
        {tab === 'calendario' && (
          <>
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
                  className="w-8 h-8 rounded-lg bg-carbon-800 text-smoke-300 flex items-center justify-center"
                >
                  ‹
                </button>
                <p className="text-smoke-200 font-semibold text-sm">
                  {new Date(calMonth.year, calMonth.month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </p>
                <button
                  onClick={() => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
                  className="w-8 h-8 rounded-lg bg-carbon-800 text-smoke-300 flex items-center justify-center"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                  <p key={d} className="text-center text-[10px] font-bold text-smoke-600 uppercase">{d}</p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calDays().map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const isBlocked = day.isBlocked
                  const canInteract = !day.isPast && !day.isBeyondMax && day.hasSlot
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => canInteract && toggleDateBlocked(day.dateStr)}
                      disabled={!canInteract}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                        day.isPast || day.isBeyondMax ? 'text-smoke-700 cursor-default' :
                        isBlocked ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                        day.hasSlot ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 cursor-pointer' :
                        'text-smoke-600 cursor-default'
                      }`}
                    >
                      {day.d}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-carbon-700">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  <span className="text-smoke-500 text-[10px]">Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                  <span className="text-smoke-500 text-[10px]">Bloqueado (clic para desbloquear)</span>
                </div>
              </div>
              <p className="text-smoke-600 text-[10px] mt-2">Hacé clic en un día verde para bloquearlo. Los días sin turno configurado no son reservables.</p>
            </div>
          </>
        )}

        {/* ── TAB: Reservas ── */}
        {tab === 'reservas' && (
          <>
            <div className="flex gap-2">
              {[{ key: 'upcoming', label: 'Próximas' }, { key: 'all', label: 'Todas' }].map(f => (
                <button
                  key={f.key}
                  onClick={() => setResFilter(f.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    resFilter === f.key ? 'bg-ember-500 text-white border-ember-500' : 'bg-carbon-900 text-smoke-400 border-carbon-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredReservations.length === 0 ? (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
                <p className="text-smoke-400 text-sm">No hay reservas para mostrar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReservations.map(r => (
                  <div key={r.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-smoke-200 font-bold text-sm">{r.guest_name}</p>
                        <p className="text-smoke-500 text-xs">{r.guest_phone}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLORS[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-smoke-400 mb-3">
                      <span>{fmtDate(r.date)}</span>
                      <span>·</span>
                      <span>{fmtTime(r.slot_time)}</span>
                      <span>·</span>
                      <span>{r.guests} pers.</span>
                      {r.table_shape && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{SHAPE_LABELS[r.table_shape] || r.table_shape}{r.table_capacity ? ` (${r.table_capacity}p)` : ''}</span>
                        </>
                      )}
                    </div>
                    {r.notes && <p className="text-smoke-500 text-xs italic mb-3">{r.notes}</p>}
                    {r.status === 'confirmed' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateReservationStatus(r.id, 'completed')}
                          className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 font-medium">
                          Completada
                        </button>
                        <button onClick={() => updateReservationStatus(r.id, 'no_show')}
                          className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-600 font-medium">
                          No se presentó
                        </button>
                        <button onClick={() => updateReservationStatus(r.id, 'cancelled')}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 font-medium">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
