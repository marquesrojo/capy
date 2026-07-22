import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'
import { PinIcon } from '../../components/Icons'

const ACTIVE_STATUSES = ['pendiente_aprobacion', 'pendiente_pago', 'recibido', 'en_preparacion', 'listo']
const CLOSED_STATUSES = ['entregado', 'cerrado', 'cancelado']

export default function OrdersPage() {
  const { customer, loading: customerLoading } = useCustomer()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (customerLoading) return
    async function load() {
      const { data } = await supabaseCustomer
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    if (customer) load()
    else setLoading(false)
  }, [customer, customerLoading])

  // Group orders by session_id; orders without one are standalone
  function groupBySession(orderList) {
    const seen = new Map()
    const groups = []
    orderList.forEach(order => {
      const key = order.session_id || `solo_${order.id}`
      if (seen.has(key)) {
        groups[seen.get(key)].push(order)
      } else {
        seen.set(key, groups.length)
        groups.push([order])
      }
    })
    return groups
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const closedOrders = orders.filter(o => CLOSED_STATUSES.includes(o.status))
  const activeGroups = groupBySession(activeOrders)
  const closedGroups = groupBySession(closedOrders)

  return (
    <div className="min-h-screen bg-carbon-950 pb-24">
      <header className="px-5 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
      </header>

      <main className="px-5 space-y-6">
        {loading && <p className="text-smoke-500 text-sm text-center py-10">Cargando...</p>}

        {!loading && orders.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">Todavía no hiciste ningún pedido.</p>
        )}

        {!loading && activeOrders.some(o => o.waiter_called_at) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div>
              <p className="text-amber-700 text-sm font-semibold">Camarero/a en camino</p>
              <p className="text-amber-600/80 text-xs mt-0.5">Ya saben dónde estás, ¡ya van!</p>
            </div>
          </div>
        )}

        {!loading && activeGroups.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">En curso</p>
            <div className="space-y-2">
              {activeGroups.map((group, i) =>
                group.length === 1 ? (
                  <OrderRow key={group[0].id} order={group[0]} onClick={() => navigate(`/pedido/${group[0].id}`)} />
                ) : (
                  <SessionGroup key={group[0].session_id || i} group={group} onNavigate={id => navigate(`/pedido/${id}`)} />
                )
              )}
            </div>
          </div>
        )}

        {!loading && closedGroups.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">Históricos</p>
            <div className="space-y-2">
              {closedGroups.map((group, i) =>
                group.length === 1 ? (
                  <OrderRow key={group[0].id} order={group[0]} onClick={() => navigate(`/pedido/${group[0].id}`)} />
                ) : (
                  <SessionGroup key={group[0].session_id || i} group={group} onNavigate={id => navigate(`/pedido/${id}`)} />
                )
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function SessionGroup({ group, onNavigate }) {
  const totalAmount = group.reduce((sum, o) => sum + (o.total || 0), 0)
  const worstStatus = (() => {
    const priority = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado', 'cerrado', 'cancelado']
    return group.map(o => o.status).sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0]
  })()

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-carbon-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PinIcon size={12} className="text-smoke-500" />
          <span className="text-smoke-300 text-xs font-semibold">{group[0].location_label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[worstStatus]}`}>
            {STATUS_LABELS[worstStatus]}
          </span>
        </div>
        <span className="font-mono text-ember-400 text-xs font-semibold">{formatPrice(totalAmount)}</span>
      </div>
      <div className="divide-y divide-carbon-800">
        {group.map((order, i) => (
          <button
            key={order.id}
            onClick={() => onNavigate(order.id)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-carbon-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-ember-500 text-xs font-bold">
                {order.daily_number ? `#${order.daily_number}` : `Pedido ${i + 1}`}
              </span>
              {order.is_addition && (
                <span className="text-[10px] text-violet-400 font-medium">+ adición</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
              <span className="font-mono text-smoke-400 text-xs">{formatPrice(order.total)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderRow({ order, onClick }) {
  const date = new Date(order.created_at)
  const dateLabel = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <button
      onClick={onClick}
      className="w-full bg-carbon-900 border border-carbon-700 hover:border-ember-500 rounded-2xl p-4 flex items-center justify-between text-left transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="text-smoke-300 text-sm font-medium flex items-center gap-1"><PinIcon size={14} /> {order.location_label}</p>
        <p className="text-smoke-500 text-xs mt-0.5">{dateLabel} · {timeLabel}</p>
      </div>
      <span className="font-mono text-ember-400 text-sm whitespace-nowrap ml-3">
        {formatPrice(order.total)}
      </span>
    </button>
  )
}
