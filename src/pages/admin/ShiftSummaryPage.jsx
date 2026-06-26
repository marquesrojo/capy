import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

export default function ShiftSummaryPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [staffId, setStaffId] = useState(null)

  useEffect(() => {
    if (!profile) return
    loadStaffAndSummary()
  }, [profile])

  async function loadStaffAndSummary() {
    setLoading(true)

    // Buscar el staff_names del camarero logueado por nombre
    const { data: staffData } = await supabaseStaff
      .from('staff_names')
      .select('id')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .ilike('full_name', profile.full_name?.trim() || '')
      .single()

    const sid = staffData?.id || null
    setStaffId(sid)

    if (!sid) {
      setStats({ totalOrders: 0, totalAmount: 0, avgRating: null, ratingsCount: 0 })
      setLoading(false)
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [ordersRes, ratingsRes] = await Promise.all([
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
        .order('created_at', { ascending: false })
    ])

    const orders = ordersRes.data || []
    const ratings = ratingsRes.data || []

    setStats({
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      avgRating: ratings.length
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : null,
      ratingsCount: ratings.length
    })
    setFeedback(ratings)
    setLoading(false)
  }

  const FACE_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
  const FACE_COLORS = ['', 'text-red-700', 'text-orange-600', 'text-amber-600', 'text-emerald-600', 'text-emerald-500']

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando resumen...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-smoke-500 text-sm">← Volver</Link>
      </div>

      <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-1">MI TURNO</h1>
      <p className="text-smoke-500 text-xs mb-1">{profile?.full_name}</p>
      <p className="text-smoke-600 text-xs mb-6">
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
          <p className="text-smoke-500 text-xs mb-1">Pedidos</p>
          <p className="font-mono text-ember-500 font-bold text-3xl">{stats.totalOrders}</p>
        </div>
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
          <p className="text-smoke-500 text-xs mb-1">Total</p>
          <p className="font-mono text-smoke-200 font-bold text-lg">{formatPrice(stats.totalAmount)}</p>
        </div>
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 col-span-2">
          <p className="text-smoke-500 text-xs mb-1">Calificación promedio</p>
          {stats.avgRating ? (
            <div className="flex items-center gap-2">
              <p className="font-mono text-pucara-blue-400 font-bold text-3xl">{stats.avgRating}</p>
              <p className="text-smoke-400 text-sm">/ 5 · {stats.ratingsCount} {stats.ratingsCount === 1 ? 'opinión' : 'opiniones'}</p>
            </div>
          ) : (
            <p className="text-smoke-500 text-sm">Sin calificaciones todavía</p>
          )}
        </div>
      </div>

      {feedback.length > 0 && (
        <div>
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Opiniones de hoy
          </p>
          <div className="space-y-2">
            {feedback.map((f, i) => (
              <div key={i} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className={`text-sm font-semibold ${FACE_COLORS[f.rating]}`}>
                  {FACE_LABELS[f.rating]}
                </span>
                {f.notes && <p className="text-smoke-400 text-sm italic flex-1">"{f.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalOrders === 0 && (
        <div className="text-center py-12">
          <p className="text-smoke-500 text-sm">Todavía no tomaste pedidos hoy.</p>
        </div>
      )}
    </div>
  )
}

