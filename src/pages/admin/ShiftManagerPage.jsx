import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

const STEP = { IDLE: 'idle', OPENING: 'opening', OPEN: 'open', CLOSING_BLIND: 'closing_blind', CLOSING_REVIEW: 'closing_review' }

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ShiftManagerPage() {
  const { profile, venueId } = useAuth()
  const [step, setStep] = useState(STEP.IDLE)
  const [shift, setShift] = useState(null)
  const [shiftStats, setShiftStats] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Open shift form
  const [openingCash, setOpeningCash] = useState('')

  // Close shift
  const [declaredCash, setDeclaredCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

  async function loadAll() {
    setLoading(true)
    const [shiftRes, methodsRes, historyRes] = await Promise.all([
      supabaseStaff
        .from('shifts')
        .select('*, opened_profile:profiles!shifts_opened_by_fkey(full_name), closed_profile:profiles!shifts_closed_by_fkey(full_name)')
        .eq('venue_id', venueId)
        .eq('status', 'open')
        .maybeSingle(),
      supabaseStaff
        .from('payment_methods')
        .select('id, name, is_cash')
        .eq('venue_id', venueId)
        .eq('is_active', true),
      supabaseStaff
        .from('shifts')
        .select('*, opened_profile:profiles!shifts_opened_by_fkey(full_name), closed_profile:profiles!shifts_closed_by_fkey(full_name)')
        .eq('venue_id', venueId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(5),
    ])

    const openShift = shiftRes.data
    setShift(openShift)
    setPaymentMethods(methodsRes.data || [])
    setHistory(historyRes.data || [])

    if (openShift) {
      await loadShiftStats(openShift.id)
      setStep(STEP.OPEN)
    } else {
      setStep(STEP.IDLE)
    }
    setLoading(false)
  }

  async function loadShiftStats(shiftId) {
    const { data: orders } = await supabaseStaff
      .from('orders')
      .select('total, payment_method, payment_status, status')
      .eq('venue_id', venueId)
      .eq('shift_id', shiftId)
      .neq('status', 'cancelado')

    if (!orders) return

    const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0)
    const totalOrders = orders.length

    // Agrupar ventas por método de pago
    const byMethod = {}
    for (const o of orders) {
      const key = o.payment_method || 'Sin especificar'
      byMethod[key] = (byMethod[key] || 0) + (o.total || 0)
    }

    setShiftStats({ totalSales, totalOrders, byMethod })
  }

  async function handleOpenShift() {
    if (!venueId || !profile) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabaseStaff
      .from('shifts')
      .insert({
        venue_id: venueId,
        opened_by: profile.id,
        opening_cash: parseFloat(openingCash) || 0,
        status: 'open',
      })
      .select('*, opened_profile:profiles!shifts_opened_by_fkey(full_name)')
      .single()

    if (err) { setError('Error al abrir el turno.'); setSaving(false); return }
    setShift(data)
    setShiftStats({ totalSales: 0, totalOrders: 0, byMethod: {} })
    setStep(STEP.OPEN)
    setOpeningCash('')
    setSaving(false)
  }

  async function handleStartClose() {
    await loadShiftStats(shift.id)
    setDeclaredCash('')
    setCloseNotes('')
    setStep(STEP.CLOSING_BLIND)
  }

  function handleBlindSubmit() {
    if (!declaredCash.trim()) return
    setStep(STEP.CLOSING_REVIEW)
  }

  async function handleConfirmClose() {
    if (!shift || !profile) return
    setSaving(true)
    setError('')

    // Calcular efectivo esperado: opening_cash + ventas en métodos "is_cash"
    const cashMethodNames = paymentMethods.filter(m => m.is_cash).map(m => m.name)
    const { data: cashOrders } = await supabaseStaff
      .from('orders')
      .select('total, payment_method')
      .eq('venue_id', venueId)
      .eq('shift_id', shift.id)
      .neq('status', 'cancelado')

    const cashSales = (cashOrders || [])
      .filter(o => cashMethodNames.includes(o.payment_method))
      .reduce((s, o) => s + (o.total || 0), 0)

    const expected = (shift.opening_cash || 0) + cashSales
    const declared = parseFloat(declaredCash) || 0
    const discrepancy = declared - expected

    const { error: err } = await supabaseStaff
      .from('shifts')
      .update({
        status: 'closed',
        closed_by: profile.id,
        closed_at: new Date().toISOString(),
        declared_cash: declared,
        expected_cash: expected,
        discrepancy,
        notes: closeNotes.trim() || null,
      })
      .eq('id', shift.id)

    if (err) { setError('Error al cerrar el turno.'); setSaving(false); return }

    // Refrescar
    setShift(null)
    setShiftStats(null)
    setSaving(false)
    await loadAll()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-[#8896A5] text-sm">Cargando...</p>
      </div>
    )
  }

  const declared = parseFloat(declaredCash) || 0
  const cashMethodNames = paymentMethods.filter(m => m.is_cash).map(m => m.name)
  const cashSalesInShift = shiftStats
    ? Object.entries(shiftStats.byMethod)
        .filter(([name]) => cashMethodNames.includes(name))
        .reduce((s, [, v]) => s + v, 0)
    : 0
  const expectedCash = (shift?.opening_cash || 0) + cashSalesInShift
  const discrepancy = declared - expectedCash
  const discrepancyOk = Math.abs(discrepancy) < 1

  return (
    <div className="min-h-screen bg-[#F0F4F8] px-5 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-[#8896A5] text-sm">← Volver</Link>
      </div>

      <h1 className="font-display text-3xl text-[#008080] tracking-wide mb-6">TURNO</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── IDLE: sin turno activo ── */}
      {step === STEP.IDLE && (
        <div className="space-y-4">
          <div className="bg-white border border-black/10 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F0F4F8] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8896A5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="text-[#1A2A3A] font-semibold mb-1">No hay turno activo</p>
            <p className="text-[#8896A5] text-sm">Abrí un turno para registrar ventas y control de caja.</p>
          </div>

          <button
            onClick={() => setStep(STEP.OPENING)}
            className="w-full bg-[#008080] text-white font-bold py-4 rounded-2xl text-base"
          >
            Abrir turno →
          </button>
        </div>
      )}

      {/* ── OPENING: formulario apertura ── */}
      {step === STEP.OPENING && (
        <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-4">
          <p className="text-[#1A2A3A] font-semibold">Apertura de turno</p>
          <div>
            <label className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-1 block">
              Efectivo en caja al inicio
            </label>
            <div className="flex items-center gap-2 bg-[#F0F4F8] rounded-xl px-3 py-3">
              <span className="text-[#3A4A5A] font-semibold">$</span>
              <input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="0"
                min="0"
                autoFocus
                className="flex-1 bg-transparent text-[#1A2A3A] font-mono text-xl focus:outline-none"
              />
            </div>
            <p className="text-[#8896A5] text-xs mt-1">Podés dejarlo en 0 si arrancás sin fondo de caja.</p>
          </div>
          <button
            onClick={handleOpenShift}
            disabled={saving}
            className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-4 rounded-2xl"
          >
            {saving ? 'Abriendo...' : 'Confirmar apertura →'}
          </button>
          <button onClick={() => setStep(STEP.IDLE)} className="w-full text-[#8896A5] text-sm text-center">
            Cancelar
          </button>
        </div>
      )}

      {/* ── OPEN: turno activo ── */}
      {step === STEP.OPEN && shift && shiftStats && (
        <div className="space-y-4">
          {/* Estado del turno */}
          <div className="bg-white border border-black/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span className="text-[#1A2A3A] font-semibold text-sm">Turno activo</span>
              </div>
              <span className="text-[#8896A5] text-xs">{formatTime(shift.opened_at)}</span>
            </div>
            <p className="text-[#8896A5] text-xs capitalize">{formatDate(shift.opened_at)}</p>
            {shift.opened_profile?.full_name && (
              <p className="text-[#8896A5] text-xs">Abierto por {shift.opened_profile.full_name}</p>
            )}
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-[#8896A5] text-xs">Fondo inicial</span>
              <span className="font-mono text-[#1A2A3A] font-semibold text-sm">{formatPrice(shift.opening_cash)}</span>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-black/10 rounded-2xl p-4">
              <p className="text-[#8896A5] text-xs mb-1">Pedidos</p>
              <p className="font-mono text-[#008080] font-bold text-3xl">{shiftStats.totalOrders}</p>
            </div>
            <div className="bg-white border border-black/10 rounded-2xl p-4">
              <p className="text-[#8896A5] text-xs mb-1">Total vendido</p>
              <p className="font-mono text-[#1A2A3A] font-bold text-lg">{formatPrice(shiftStats.totalSales)}</p>
            </div>
          </div>

          {/* Desglose por método de pago */}
          {Object.keys(shiftStats.byMethod).length > 0 && (
            <div className="bg-white border border-black/10 rounded-2xl p-4">
              <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Por método de pago</p>
              <div className="space-y-2">
                {Object.entries(shiftStats.byMethod).map(([method, total]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#3A4A5A] text-sm">{method}</span>
                      {cashMethodNames.includes(method) && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">efectivo</span>
                      )}
                    </div>
                    <span className="font-mono text-[#1A2A3A] font-semibold text-sm">{formatPrice(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStartClose}
            className="w-full bg-[#1A2A3A] text-white font-bold py-4 rounded-2xl text-base"
          >
            Cerrar turno →
          </button>
        </div>
      )}

      {/* ── CLOSING BLIND: ingreso ciego de efectivo ── */}
      {step === STEP.CLOSING_BLIND && (
        <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-[#1A2A3A] font-semibold mb-1">Cierre de caja</p>
            <p className="text-[#8896A5] text-sm">
              Contá el efectivo en caja y escribí el total. No veas el sistema todavía.
            </p>
          </div>

          <div>
            <label className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-1 block">
              Efectivo contado en caja
            </label>
            <div className="flex items-center gap-2 bg-[#F0F4F8] rounded-xl px-3 py-3">
              <span className="text-[#3A4A5A] font-semibold">$</span>
              <input
                type="number"
                value={declaredCash}
                onChange={e => setDeclaredCash(e.target.value)}
                placeholder="0"
                min="0"
                autoFocus
                className="flex-1 bg-transparent text-[#1A2A3A] font-mono text-2xl focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleBlindSubmit}
            disabled={!declaredCash.trim()}
            className="w-full bg-[#1A2A3A] disabled:opacity-40 text-white font-bold py-4 rounded-2xl"
          >
            Ver resultado →
          </button>
          <button onClick={() => setStep(STEP.OPEN)} className="w-full text-[#8896A5] text-sm text-center">
            Cancelar
          </button>
        </div>
      )}

      {/* ── CLOSING REVIEW: resumen y confirmación ── */}
      {step === STEP.CLOSING_REVIEW && (
        <div className="space-y-4">
          <div className="bg-white border border-black/10 rounded-2xl p-5">
            <p className="text-[#1A2A3A] font-semibold mb-4">Resumen del cierre</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#8896A5] text-sm">Fondo inicial</span>
                <span className="font-mono text-[#3A4A5A] font-semibold">{formatPrice(shift?.opening_cash || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8896A5] text-sm">Ventas en efectivo</span>
                <span className="font-mono text-[#3A4A5A] font-semibold">{formatPrice(cashSalesInShift)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-black/5 pt-3">
                <span className="text-[#3A4A5A] font-semibold text-sm">Esperado en caja</span>
                <span className="font-mono text-[#1A2A3A] font-bold">{formatPrice(expectedCash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#3A4A5A] font-semibold text-sm">Declarado</span>
                <span className="font-mono text-[#1A2A3A] font-bold">{formatPrice(declared)}</span>
              </div>

              {/* Discrepancia */}
              <div className={`flex justify-between items-center rounded-xl px-3 py-2.5 border ${
                discrepancyOk
                  ? 'bg-emerald-50 border-emerald-200'
                  : discrepancy > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <span className={`font-semibold text-sm ${discrepancyOk ? 'text-emerald-700' : discrepancy > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {discrepancyOk ? 'Sin diferencia' : discrepancy > 0 ? 'Sobrante' : 'Faltante'}
                </span>
                <span className={`font-mono font-bold ${discrepancyOk ? 'text-emerald-700' : discrepancy > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {discrepancyOk ? '—' : formatPrice(Math.abs(discrepancy))}
                </span>
              </div>
            </div>
          </div>

          {/* Ventas totales del turno */}
          {shiftStats && Object.keys(shiftStats.byMethod).length > 0 && (
            <div className="bg-white border border-black/10 rounded-2xl p-4">
              <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Ventas por método</p>
              <div className="space-y-2">
                {Object.entries(shiftStats.byMethod).map(([method, total]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="text-[#3A4A5A]">{method}</span>
                    <span className="font-mono text-[#1A2A3A] font-semibold">{formatPrice(total)}</span>
                  </div>
                ))}
                <div className="border-t border-black/5 pt-2 flex justify-between">
                  <span className="text-[#3A4A5A] font-semibold text-sm">Total</span>
                  <span className="font-mono text-[#1A2A3A] font-bold">{formatPrice(shiftStats.totalSales)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-black/10 rounded-2xl p-4">
            <label className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2 block">Observaciones (opcional)</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              placeholder="Ej: Faltaban $500 — se revisó y era del vuelto de mesa 7"
              rows={2}
              className="w-full bg-[#F0F4F8] rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleConfirmClose}
            disabled={saving}
            className="w-full bg-[#1A2A3A] disabled:opacity-50 text-white font-bold py-4 rounded-2xl"
          >
            {saving ? 'Cerrando...' : 'Confirmar cierre del turno'}
          </button>
          <button onClick={() => setStep(STEP.CLOSING_BLIND)} className="w-full text-[#8896A5] text-sm text-center">
            ← Corregir monto
          </button>
        </div>
      )}

      {/* ── Historial de turnos cerrados ── */}
      {history.length > 0 && (step === STEP.IDLE || step === STEP.OPENING) && (
        <div className="mt-8">
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Últimos turnos</p>
          <div className="space-y-2">
            {history.map(h => {
              const disc = h.discrepancy ?? 0
              return (
                <div key={h.id} className="bg-white border border-black/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#1A2A3A] font-semibold text-sm capitalize">{formatDate(h.opened_at)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      Math.abs(disc) < 1 ? 'bg-emerald-100 text-emerald-700' :
                      disc > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {Math.abs(disc) < 1 ? 'OK' : disc > 0 ? `+${formatPrice(disc)}` : formatPrice(disc)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-[#8896A5]">
                    <span>{formatTime(h.opened_at)} – {formatTime(h.closed_at)}</span>
                    {h.closed_profile?.full_name && <span>Cerrado por {h.closed_profile.full_name}</span>}
                  </div>
                  {h.notes && <p className="text-[#8896A5] text-xs mt-1 italic">"{h.notes}"</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
