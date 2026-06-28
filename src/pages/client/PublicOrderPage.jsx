import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const STATUS_INFO = {
  pendiente_aprobacion: { label: 'Esperando confirmación', color: 'text-amber-500', icon: '⏳' },
  recibido: { label: 'Recibido', color: 'text-blue-500', icon: '📥' },
  en_preparacion: { label: 'En preparación', color: 'text-[#008080]', icon: '👨‍🍳' },
  listo: { label: '¡Listo!', color: 'text-emerald-500', icon: '✅' },
  entregado: { label: 'Entregado', color: 'text-smoke-400', icon: '🎉' },
}

export default function PublicOrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  async function loadOrder() {
    const { data: orderData } = await supabaseCustomer
      .from('orders')
      .select('id, status, location_label, total, daily_number, created_at')
      .eq('id', id)
      .single()

    if (!orderData) { setNotFound(true); setLoading(false); return }

    const { data: itemsData } = await supabaseCustomer
      .from('order_items')
      .select('product_name, quantity, unit_price')
      .eq('order_id', id)

    setOrder(orderData)
    setItems(itemsData || [])
    setLoading(false)

    // Polling cada 10 segundos
    const interval = setInterval(async () => {
      const { data } = await supabaseCustomer
        .from('orders')
        .select('status')
        .eq('id', id)
        .single()
      if (data) setOrder(prev => ({ ...prev, status: data.status }))
    }, 10000)

    return () => clearInterval(interval)
  }

  if (loading) return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando pedido...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-4">🔍</p>
      <p className="text-smoke-200 font-bold text-lg mb-2">Pedido no encontrado</p>
      <p className="text-smoke-500 text-sm">El link puede haber expirado o el pedido no existe.</p>
    </div>
  )

  const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.recibido

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <img
          src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
          alt="Capy" className="w-14 h-14 mx-auto mb-3 rounded-xl"
        />
        <p className="font-display text-3xl text-ember-500 tracking-wide">CAPY</p>
      </div>

      {/* Estado */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center mb-4">
        <p className="text-4xl mb-2">{statusInfo.icon}</p>
        <p className={`font-bold text-lg ${statusInfo.color}`}>{statusInfo.label}</p>
        <p className="text-smoke-500 text-xs mt-1">
          Pedido #{order.daily_number} · 📍 {order.location_label}
        </p>
      </div>

      {/* Ítems */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-carbon-700">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">Tu pedido</p>
        </div>
        <div className="divide-y divide-carbon-700">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-ember-500 font-bold text-sm">{item.quantity}×</span>
                <span className="text-smoke-300 text-sm">{item.product_name}</span>
              </div>
              <span className="text-smoke-400 text-sm font-mono">{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-carbon-700 flex justify-between">
          <span className="text-smoke-400 text-sm">Total</span>
          <span className="font-mono font-bold text-smoke-200">{formatPrice(order.total)}</span>
        </div>
      </div>

      <p className="text-smoke-600 text-xs text-center">Se actualiza automáticamente cada 10 segundos</p>
    </div>
  )
}
