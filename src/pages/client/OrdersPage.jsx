import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'

const ACTIVE_STATUSES = ['pendiente_pago', 'recibido', 'en_preparacion', 'listo']
const CLOSED_STATUSES = ['entregado', 'cancelado']

export default function OrdersPage() {
  const { customer } = useCustomer()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [customer])

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const closedOrders = orders.filter(o => CLOSED_STATUSES.includes(o.status))

  return (
    <div className="min-h-screen bg-carbon-950 pb-24">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
        <p className="text-smoke-400 text-sm mt-1">Tus pedidos en este dispositivo</p>
      </header>

      <main className="px-5 space-y-6">
        {loading && <p className="text-smoke-500 text-sm text-center py-10">Cargando...</p>}

        {!loading && orders.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">Todavía no hiciste ningún pedido.</p>
        )}

        {!loading && activeOrders.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
              En curso
            </p>
            <div className="space-y-2">
              {activeOrders.map(order => (
                <OrderRow key={order.id} order={order} onClick={() => navigate(`/pedido/${order.id}`)} />
              ))}
            </div>
          </div>
        )}

        {!loading && closedOrders.length > 0 && (
          <div>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
              Históricos
            </p>
            <div className="space-y-2">
              {closedOrders.map(order => (
                <OrderRow key={order.id} order={order} onClick={() => navigate(`/pedido/${order.id}`)} />
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
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
        <p className="text-smoke-300 text-sm font-medium">📍 {order.location_label}</p>
        <p className="text-smoke-500 text-xs mt-0.5">{dateLabel} · {timeLabel}</p>
      </div>
      <span className="font-mono text-ember-400 text-sm whitespace-nowrap ml-3">
        {formatPrice(order.total)}
      </span>
    </button>
  )
}
