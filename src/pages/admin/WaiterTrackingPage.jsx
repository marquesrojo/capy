import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'

const ACTIVE_STATUSES = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo']

const STATUS_EMOJI = {
  pendiente_aprobacion: '⏳',
  recibido: '📥',
  en_preparacion: '👨‍🍳',
  listo: '✅'
}

export default function WaiterTrackingPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)

  useEffect(() => {
    loadOrders()

    const channel = supabaseStaff
      .channel('waiter-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `venue_id=eq.${ACTIVE_VENUE_ID}`
      }, () => loadOrders())
      .subscribe()

    return () => supabaseStaff.removeChannel(channel)
  }, [])

  async function loadOrders() {
    const { data } = await supabaseStaff
      .from('orders')
      .select('id, status, location_label, total, created_at, assigned_staff:staff_names!orders_assigned_staff_id_fkey(full_name), order_items(product_name, quantity)')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  async function approveOrder(orderId) {
    setApproving(orderId)
    await supabaseStaff
      .from('orders')
      .update({ status: 'recibido' })
      .eq('id', orderId)
    setApproving(null)
    loadOrders()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-smoke-500 text-sm">No hay pedidos activos en este momento.</p>
      </div>
    )
  }

  // Agrupar por status en el orden del flujo
  const grouped = ACTIVE_STATUSES.reduce((acc, status) => {
    const items = orders.filter(o => o.status === status)
    if (items.length > 0) acc[status] = items
    return acc
  }, {})

  return (
    <div className="px-4 py-4 space-y-4">
      {Object.entries(grouped).map(([status, items]) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <span>{STATUS_EMOJI[status]}</span>
            <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">
              {STATUS_LABELS[status]} · {items.length}
            </p>
          </div>
          <div className="space-y-2">
            {items.map(order => {
              const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
              return (
                <div key={order.id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-3 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-ember-400 text-xs">#{order.id.slice(0, 6)}</span>
                      <span className="text-smoke-400 text-xs">📍 {order.location_label}</span>
                    </div>
                    <span className={`text-xs ${elapsedMin > 15 ? 'text-red-700' : 'text-smoke-500'}`}>
                      {elapsedMin} min
                    </span>
                  </div>
                  <div className="text-smoke-400 text-xs space-y-0.5">
                    {(order.order_items || []).map((item, i) => (
                      <p key={i}>{item.quantity}× {item.product_name}</p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-smoke-400 text-xs">{formatPrice(order.total)}</span>
                    <div className="flex items-center gap-2">
                      {order.assigned_staff?.full_name && (
                        <span className="text-smoke-500 text-[10px]">🧑‍🍳 {order.assigned_staff.full_name}</span>
                      )}
                      {order.status === 'pendiente_aprobacion' && (
                        <button
                          onClick={() => approveOrder(order.id)}
                          disabled={approving === order.id}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          {approving === order.id ? '...' : 'Aprobar ✓'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
