import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'

const ACTIVE_STATUSES = ['pendiente_pago', 'recibido', 'en_preparacion', 'listo']
const CLOSED_STATUSES = ['entregado', 'cancelado']

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

export default function OrdersPage() {
  const { customer, loading: customerLoading, isAnonymous, signInWithGoogle } = useCustomer()
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

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const closedOrders = orders.filter(o => CLOSED_STATUSES.includes(o.status))

  return (
    <div className="min-h-screen bg-carbon-950 pb-24">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
        <p className="text-smoke-400 text-sm mt-1">Tus pedidos en este dispositivo</p>
      </header>

      <main className="px-5 space-y-6">
        {isAnonymous && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4">
            <p className="text-smoke-300 text-sm font-semibold mb-0.5">Guardá tu historial</p>
            <p className="text-smoke-500 text-xs mb-3">Iniciá sesión con Google para acceder a tus pedidos desde cualquier dispositivo.</p>
            <button
              onClick={() => signInWithGoogle(window.location.pathname)}
              className="flex items-center gap-2.5 bg-white text-[#1A2332] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </div>
        )}

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
