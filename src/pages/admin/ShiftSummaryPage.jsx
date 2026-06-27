import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

export default function ShiftSummaryPage({ embedded }) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [staffId, setStaffId] = useState(null)
  const [tips, setTips] = useState([])
  const [tipAmount, setTipAmount] = useState('')
  const [tipNotes, setTipNotes] = useState('')
  const [addingTip, setAddingTip] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadStaffAndSummary()
  }, [profile])

  async function loadStaffAndSummary() {
    setLoading(true)

    const { data: staffData } = await supabaseStaff
      .from('staff_names')
      .select('id')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .ilike('full_name', profile.full_name?.trim() || '')
      .single()

    const sid = staffData?.id || null
    setStaffId(sid)

    if (!sid) {
      setStats({ totalOrders: 0, totalAmount: 0, avgRating: null, ratingsCount: 0, totalTips: 0 })
      setLoading(false)
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [ordersRes, ratingsRes, tipsRes] = await Promise.all([
      supabaseStaff
        .from('orders')
        .select('id, total, status, payment_status, created_at')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('assigned_staff_id', sid)
        .gte('created_at', startOfDay.toISOString()),
      supabaseStaff
        .from('order_feedback')
        .select('rating, notes, created_at')
        .eq('staff_id', sid)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false }),
      supabaseStaff
        .from('waiter_tips')
        .select('id, amount, notes, created_at')
        .eq('staff_id', sid)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
    ])

    const orders = ordersRes.data || []
    const ratings = ratingsRes.data || []
    const tipsData = tipsRes.data || []

    setStats({
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      avgRating: ratings.length
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : null,
      ratingsCount: ratings.length,
      totalTips: tipsData.reduce((sum, t) => sum + (t.amount || 0), 0)
    })
    setFeedback(ratings)
    setTips(tipsData)
    setLoading(false)
  }

  async function handleAddTip() {
    if (!tipAmount || !staffId) return
    setAddingTip(true)
    const { data } = await supabaseStaff
      .from('waiter_tips')
      .insert({
        venue_id: ACTIVE_VENUE_ID,
        staff_id: staffId,
        amount: Number(tipAmount),
        notes: tipNotes.trim() || null
      })
      .select()
      .single()
    if (data) {
      setTips(prev => [data, ...prev])
      setStats(prev => ({ ...prev, totalTips: prev.totalTips + data.amount }))
      setTipAmount('')
      setTipNotes('')
    }
    setAddingTip(false)
  }

  async function handleDeleteTip(tip) {
    await supabaseStaff.from('waiter_tips').delete().eq('id', tip.id)
    setTips(prev => prev.filter(t => t.id !== tip.id))
    setStats(prev => ({ ...prev, totalTips: prev.totalTips - tip.amount }))
  }

  const FACE_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
  const FACE_COLORS = ['', 'text-red-700', 'text-orange-600', 'text-amber-600', 'text-[#4DD0E1]', 'text-emerald-500']

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-[#8896A5] text-sm">Cargando resumen...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] px-5 py-8">
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="text-[#8896A5] text-sm">← Volver</Link>
        </div>
      )}

      <h1 className="font-display text-3xl text-[#008080] tracking-wide mb-1">MI TURNO</h1>
      <p className="text-[#8896A5] text-xs mb-1">{profile?.full_name}</p>
      <p className="text-smoke-600 text-xs mb-6">
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <p className="text-[#8896A5] text-xs mb-1">Pedidos</p>
          <p className="font-mono text-[#008080] font-bold text-3xl">{stats.totalOrders}</p>
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <p className="text-[#8896A5] text-xs mb-1">Total</p>
          <p className="font-mono text-[#1A2A3A] font-bold text-lg">{formatPrice(stats.totalAmount)}</p>
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <p className="text-[#8896A5] text-xs mb-1">Calificación</p>
          {stats.avgRating ? (
            <div className="flex items-baseline gap-1">
              <p className="font-mono text-[#008080] font-bold text-3xl">{stats.avgRating}</p>
              <p className="text-[#8896A5] text-xs">/ 5</p>
            </div>
          ) : (
            <p className="text-[#8896A5] text-sm">—</p>
          )}
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <p className="text-[#8896A5] text-xs mb-1">Propinas</p>
          <p className="font-mono text-[#4DD0E1] font-bold text-2xl">{formatPrice(stats.totalTips)}</p>
        </div>
      </div>

      {/* Registro de propinas */}
      <div className="bg-white border border-black/10 rounded-2xl p-4 mb-6">
        <p className="text-[#3A4A5A] font-medium text-sm mb-3">Registrar propina</p>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            inputMode="decimal"
            value={tipAmount}
            onChange={e => setTipAmount(e.target.value)}
            placeholder="Monto"
            className="input flex-1"
          />
          <button
            onClick={handleAddTip}
            disabled={addingTip || !tipAmount}
            className="bg-[#4DD0E1] hover:bg-[#00B0C8] disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
          >
            + Agregar
          </button>
        </div>
        <input
          type="text"
          value={tipNotes}
          onChange={e => setTipNotes(e.target.value)}
          placeholder="Nota opcional (ej: Mesa 4)"
          className="input text-sm"
        />

        {tips.length > 0 && (
          <div className="mt-3 space-y-2">
            {tips.map(tip => (
              <div key={tip.id} className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-3 py-2">
                <div>
                  <span className="font-mono text-[#4DD0E1] font-semibold text-sm">{formatPrice(tip.amount)}</span>
                  {tip.notes && <span className="text-[#8896A5] text-xs ml-2">{tip.notes}</span>}
                </div>
                <button
                  onClick={() => handleDeleteTip(tip)}
                  className="text-smoke-600 text-xs underline"
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calificaciones */}
      {feedback.length > 0 && (
        <div>
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">
            Opiniones de hoy
          </p>
          <div className="space-y-2">
            {feedback.map((f, i) => (
              <div key={i} className="bg-white border border-black/10 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className={`text-sm font-semibold ${FACE_COLORS[f.rating]}`}>
                  {FACE_LABELS[f.rating]}
                </span>
                {f.notes && <p className="text-[#8896A5] text-sm italic flex-1">"{f.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalOrders === 0 && tips.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#8896A5] text-sm">Todavía no tomaste pedidos hoy.</p>
        </div>
      )}
    </div>
  )
}

