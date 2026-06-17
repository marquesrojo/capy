import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice, STATUS_LABELS, STATUS_COLORS, PAYMENT_STATUS_LABELS } from '../../lib/utils'

export default function HistoryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [history, setHistory] = useState({})
  const [filterStatus, setFilterStatus] = useState('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('orders')
        .select('*, order_items(*), customers(full_name, whatsapp)')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .order('created_at', { ascending: false })
        .limit(200)
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggleExpand(orderId) {
    if (expandedId === orderId) {
      setExpandedId(null)
      return
    }
    setExpandedId(orderId)
    if (!history[orderId]) {
      const { data } = await supabaseStaff
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true })
      setHistory(prev => ({ ...prev, [orderId]: data || [] }))
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const normalizedSearchDigits = normalizedSearch.replace(/\D/g, '')

  const filtered = orders.filter(order => {
    const matchesStatus = filterStatus === 'todos' || order.status === filterStatus

    if (!normalizedSearch) return matchesStatus

    const name = (order.customers?.full_name || '').toLowerCase()
    const whatsapp = order.customers?.whatsapp || ''
    const whatsappDigits = whatsapp.replace(/\D/g, '')

    const matchesName = name.includes(normalizedSearch)
    const matchesWhatsapp =
      normalizedSearchDigits.length > 0 && whatsappDigits.includes(normalizedSearchDigits)

    return matchesStatus && (matchesName || matchesWhatsapp)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando historial...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">HISTORIAL</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">
            ← Volver
          </Link>
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o WhatsApp..."
            className="input flex-1"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input max-w-[150px]"
          >
            <option value="todos">Todos</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-2">
        {filtered.map(order => (
          <div key={order.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleExpand(order.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ember-400 text-xs">#{order.id.slice(0, 6)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-smoke-400 text-xs mt-1">
                  {order.customers?.full_name && (
                    <span className="text-smoke-300">{order.customers.full_name} · </span>
                  )}
                  📍 {order.location_label} · {new Date(order.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
            </button>

            {expandedId === order.id && (
              <div className="px-4 pb-4 border-t border-carbon-700 pt-3">
                <p className="text-smoke-500 text-xs mb-1.5 font-medium">Cliente</p>
                <p className="text-smoke-400 text-xs mb-3">
                  {order.customers?.full_name || 'Sin datos'}
                  {order.customers?.whatsapp ? ` · ${order.customers.whatsapp}` : ''}
                </p>

                <p className="text-smoke-500 text-xs mb-1.5 font-medium">Items</p>
                <ul className="space-y-1 mb-3">
                  {order.order_items.map(item => (
                    <li key={item.id} className="text-smoke-400 text-xs">
                      {item.quantity}× {item.product_name} — {formatPrice(item.line_total)}
                    </li>
                  ))}
                </ul>

                <p className="text-smoke-500 text-xs mb-1.5 font-medium">Pago</p>
                <p className="text-smoke-400 text-xs mb-3">
                  Pago: {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}{' '}
                  {order.payment_method ? `· ${order.payment_method}` : ''}
                </p>

                <p className="text-smoke-500 text-xs mb-1.5 font-medium">Línea de tiempo</p>
                <ul className="space-y-1">
                  {(history[order.id] || []).map(h => (
                    <li key={h.id} className="text-smoke-400 text-xs">
                      {new Date(h.changed_at).toLocaleTimeString('es-AR')} — {STATUS_LABELS[h.status]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">No hay pedidos con este filtro.</p>
        )}
      </div>
    </div>
  )
}
