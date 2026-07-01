import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

const PERIODS = [
  { id: '1d', label: 'Hoy', days: 1 },
  { id: '7d', label: '7 días', days: 7 },
  { id: '30d', label: '30 días', days: 30 },
  { id: 'all', label: 'Todo', days: null }
]

const PAYMENT_COLORS = ['#E8772A', '#5B8DEF', '#4ADE80', '#FACC15', '#A78BFA']

export default function KpisPage() {
  const { venueId } = useAuth()
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [feedback, setFeedback] = useState([])

  useEffect(() => {
    if (!venueId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, venueId])

  async function loadData() {
    setLoading(true)
    const periodDef = PERIODS.find(p => p.id === period)
    const since = periodDef.days
      ? new Date(Date.now() - periodDef.days * 24 * 60 * 60 * 1000).toISOString()
      : null

    let orderQuery = supabaseStaff
      .from('orders')
      .select('id, status, payment_status, payment_method, total, created_at')
      .eq('venue_id', venueId)
      .eq('payment_status', 'aprobado')
    if (since) orderQuery = orderQuery.gte('created_at', since)

    const { data: orderData } = await orderQuery
    const orderIds = (orderData || []).map(o => o.id)
    setOrders(orderData || [])

    if (orderIds.length > 0) {
      const [{ data: itemsData }, { data: historyData }, { data: feedbackData }] = await Promise.all([
        supabaseStaff
          .from('order_items')
          .select('order_id, product_name, quantity')
          .in('order_id', orderIds),
        supabaseStaff
          .from('order_status_history')
          .select('order_id, status, changed_at')
          .in('order_id', orderIds),
        supabaseStaff
          .from('order_feedback')
          .select('rating')
          .in('order_id', orderIds)
      ])
      setOrderItems(itemsData || [])
      setStatusHistory(historyData || [])
      setFeedback(feedbackData || [])
    } else {
      setOrderItems([])
      setStatusHistory([])
      setFeedback([])
    }
    setLoading(false)
  }

  // ---- Calculos ----
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const avgTicket = orders.length ? totalRevenue / orders.length : 0

  const paymentBreakdown = Object.entries(
    orders.reduce((acc, o) => {
      const method = o.payment_method || 'Sin especificar'
      acc[method] = (acc[method] || 0) + Number(o.total || 0)
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  function avgDurationMinutes(fromStatus, toStatus) {
    const byOrder = {}
    for (const h of statusHistory) {
      if (!byOrder[h.order_id]) byOrder[h.order_id] = {}
      if (h.status === fromStatus || h.status === toStatus) {
        byOrder[h.order_id][h.status] = new Date(h.changed_at)
      }
    }
    const durations = []
    for (const times of Object.values(byOrder)) {
      if (times[fromStatus] && times[toStatus] && times[toStatus] > times[fromStatus]) {
        durations.push((times[toStatus] - times[fromStatus]) / 60000)
      }
    }
    if (!durations.length) return null
    return durations.reduce((a, b) => a + b, 0) / durations.length
  }

  const kitchenSla = avgDurationMinutes('en_preparacion', 'listo')
  const approvalSla = avgDurationMinutes('pendiente_aprobacion', 'recibido')

  const productTotals = orderItems.reduce((acc, item) => {
    acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity
    return acc
  }, {})
  const sortedProducts = Object.entries(productTotals).sort((a, b) => b[1] - a[1])
  const topProducts = sortedProducts.slice(0, 5).map(([name, qty]) => ({ name, qty }))
  const slowProducts = sortedProducts.slice(-5).reverse().map(([name, qty]) => ({ name, qty }))

  const avgRating = feedback.length
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : null

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
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">KPIS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                period === p.id
                  ? 'bg-ember-500 text-white border-ember-500'
                  : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        {orders.length === 0 ? (
          <p className="text-smoke-500 text-sm text-center py-10">
            No hay pedidos pagados en este período todavía.
          </p>
        ) : (
          <>
            {/* Facturación y ticket */}
            <div className="grid grid-cols-2 gap-3">
              <BigNumberCard label="Facturación bruta" value={formatPrice(totalRevenue)} />
              <BigNumberCard label="Ticket promedio" value={formatPrice(avgTicket)} />
            </div>

            {/* Desglose de pago */}
            {paymentBreakdown.length > 0 && (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
                <p className="text-smoke-300 text-sm font-medium mb-3">Métodos de pago</p>
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart>
                      <Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60}>
                        {paymentBreakdown.map((entry, i) => (
                          <Cell key={entry.name} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => formatPrice(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {paymentBreakdown.map((entry, i) => (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                        <span className="text-smoke-300 flex-1 truncate">{entry.name}</span>
                        <span className="text-smoke-500 font-mono">{((entry.value / totalRevenue) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLAs */}
            <div className="grid grid-cols-2 gap-3">
              <BigNumberCard
                label="SLA cocina (promedio)"
                value={kitchenSla !== null ? `${kitchenSla.toFixed(0)} min` : '—'}
                sub="En preparación → Listo"
              />
              <BigNumberCard
                label="SLA validación WhatsApp"
                value={approvalSla !== null ? `${approvalSla.toFixed(0)} min` : '—'}
                sub="Por aprobar → Recibido"
              />
            </div>

            {/* Satisfacción */}
            <BigNumberCard
              label="Calificación promedio"
              value={avgRating !== null ? `${avgRating.toFixed(1)} / 5` : 'Sin datos'}
              sub={`${feedback.length} encuestas respondidas`}
            />

            {/* Top productos */}
            {topProducts.length > 0 && (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
                <p className="text-smoke-300 text-sm font-medium mb-3">Top 5 productos más vendidos</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: '#8A8478', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#E8772A" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Clavados */}
            {slowProducts.length > 0 && (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
                <p className="text-smoke-300 text-sm font-medium mb-3">Menor rotación</p>
                <div className="space-y-1.5">
                  {slowProducts.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="text-smoke-400">{p.name}</span>
                      <span className="text-smoke-500 font-mono">{p.qty} {p.qty === 1 ? 'unidad' : 'unidades'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function BigNumberCard({ label, value, sub }) {
  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
      <p className="text-smoke-500 text-xs mb-1">{label}</p>
      <p className="font-mono text-ember-500 text-xl font-semibold">{value}</p>
      {sub && <p className="text-smoke-500 text-[10px] mt-1">{sub}</p>}
    </div>
  )
}
