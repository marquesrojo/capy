import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice, STATUS_LABELS } from '../../lib/utils'

const ACTIVE_STATUSES = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo']
const EDITABLE_STATUSES = ['recibido', 'en_preparacion']

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
  const [editingOrder, setEditingOrder] = useState(null)

  useEffect(() => {
    loadOrders()
    const channel = supabaseStaff
      .channel('waiter-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${ACTIVE_VENUE_ID}` }, () => loadOrders())
      .subscribe()
    return () => supabaseStaff.removeChannel(channel)
  }, [])

  async function loadOrders() {
    const { data } = await supabaseStaff
      .from('orders')
      .select('id, status, location_label, total, created_at, waiter_called_at, daily_number, assigned_staff:staff_names!orders_assigned_staff_id_fkey(full_name), order_items(id, product_id, product_name, quantity, unit_price, item_notes)')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  async function approveOrder(orderId) {
    setApproving(orderId)
    await supabaseStaff.from('orders').update({ status: 'recibido' }).eq('id', orderId)
    setApproving(null)
    loadOrders()
  }

  async function dismissCall(orderId) {
    await supabaseStaff.from('orders').update({ waiter_called_at: null }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, waiter_called_at: null } : o))
  }

  if (editingOrder) {
    return (
      <EditOrderPage
        order={editingOrder}
        onClose={() => { setEditingOrder(null); loadOrders() }}
      />
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando...</p>
    </div>
  )

  if (orders.length === 0) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">No hay pedidos activos.</p>
    </div>
  )

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
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide">
              {STATUS_LABELS[status]} · {items.length}
            </p>
          </div>
          <div className="space-y-2">
            {items.map(order => {
              const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
              const canEdit = EDITABLE_STATUSES.includes(order.status)
              return (
                <div key={order.id} className={`bg-white border rounded-xl px-3 py-3 ${order.waiter_called_at ? 'border-[#008080]/30' : 'border-black/10'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#008080] font-bold text-sm">
                        #{order.daily_number || order.id.slice(0, 6)}
                      </span>
                      <span className="text-[#8896A5] text-xs">📍 {order.location_label}</span>
                    </div>
                    <span className={`text-xs ${elapsedMin > 15 ? 'text-red-600' : 'text-[#8896A5]'}`}>
                      {elapsedMin} min
                    </span>
                  </div>

                  {order.waiter_called_at && (
                    <div className="flex items-center justify-between mb-1.5 bg-[#008080]/10 rounded-lg px-2 py-1">
                      <span className="text-[#008080] text-xs font-semibold">🔔 Te están llamando</span>
                      <button onClick={() => dismissCall(order.id)} className="text-[#8896A5] text-[10px] underline">
                        Atendido
                      </button>
                    </div>
                  )}

                  <div className="text-[#8896A5] text-xs space-y-0.5 mb-2">
                    {(order.order_items || []).map((item, i) => (
                      <p key={i}>{item.quantity}× {item.product_name}
                        {item.item_notes && <span className="text-[#008080]"> — {item.item_notes}</span>}
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#1A2A3A] text-sm font-semibold">{formatPrice(order.total)}</span>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="border border-[#008080] text-[#008080] text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          Editar
                        </button>
                      )}
                      {order.status === 'pendiente_aprobacion' && (
                        <button
                          onClick={() => approveOrder(order.id)}
                          disabled={approving === order.id}
                          className="bg-[#4DD0E1] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-full"
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

function EditOrderPage({ order, onClose }) {
  const [items, setItems] = useState(order.order_items.map(i => ({ ...i })))
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showCarta, setShowCarta] = useState(false)

  useEffect(() => {
    loadCarta()
  }, [])

  async function loadCarta() {
    const [catRes, prodRes] = await Promise.all([
      supabaseStaff.from('categories').select('id, name').eq('venue_id', ACTIVE_VENUE_ID).order('sort_order'),
      supabaseStaff.from('products').select('id, name, price, category_id').eq('venue_id', ACTIVE_VENUE_ID).eq('is_available', true)
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
  }

  function changeQty(itemId, delta) {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i
      const newQty = i.quantity + delta
      if (newQty <= 0) return null
      return { ...i, quantity: newQty }
    }).filter(Boolean))
  }

  function addProduct(product) {
    const existing = items.find(i => i.product_id === product.id)
    if (existing) {
      setItems(prev => prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems(prev => [...prev, {
        id: `new-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        item_notes: null
      }])
    }
  }

  const newTotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)

  async function handleSave() {
    setSaving(true)

    // Borrar todos los order_items actuales
    await supabaseStaff.from('order_items').delete().eq('order_id', order.id)

    // Insertar los nuevos
    const newItems = items.map(i => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      item_notes: i.item_notes || null
    }))

    await supabaseStaff.from('order_items').insert(newItems)
    await supabaseStaff.from('orders').update({ total: newTotal }).eq('id', order.id)

    setSaving(false)
    onClose()
  }

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  return (
    <div className="bg-[#F0F4F8] min-h-screen pb-32">
      {/* Header */}
      <div className="bg-white border-b border-black/10 px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-[#8896A5] text-sm">← Volver</button>
        <p className="font-bold text-[#1A2A3A] text-sm">
          Editando #{order.daily_number || order.id.slice(0, 6)}
        </p>
        <p className="text-[#8896A5] text-xs">📍 {order.location_label}</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Ítems actuales */}
        <div>
          <p className="text-[11px] font-semibold text-[#8896A5] uppercase tracking-wide mb-2">Ítems del pedido</p>
          {items.length === 0 ? (
            <p className="text-[#8896A5] text-sm text-center py-4">No hay ítems — agregá algo desde la carta</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-xl px-4 py-3 border border-black/8 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A2A3A]">{item.product_name}</p>
                    <p className="text-xs text-[#008080]">{formatPrice(item.unit_price)} c/u</p>
                    {item.item_notes && <p className="text-xs text-[#8896A5] italic">{item.item_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-7 h-7 rounded-lg border border-black/10 bg-[#F8FAFC] text-[#3A4A5A] font-bold text-sm flex items-center justify-center"
                    >−</button>
                    <span className="font-bold text-[#1A2A3A] text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-[#4DD0E1] text-white font-bold text-sm flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agregar desde carta */}
        <button
          onClick={() => setShowCarta(v => !v)}
          className="w-full border-2 border-dashed border-[#008080]/30 text-[#008080] text-sm font-semibold py-3 rounded-xl"
        >
          {showCarta ? '− Cerrar carta' : '+ Agregar ítem de la carta'}
        </button>

        {showCarta && (
          <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
            {/* Categorías */}
            <div className="flex gap-2 overflow-x-auto px-3 py-2 border-b border-black/8">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold ${
                    activeCategory === cat.id ? 'bg-[#008080] text-white' : 'text-[#8896A5]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {/* Productos */}
            <div className="divide-y divide-black/5">
              {visibleProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1A2A3A]">{product.name}</p>
                    <p className="text-xs text-[#008080]">{formatPrice(product.price)}</p>
                  </div>
                  <button
                    onClick={() => addProduct(product)}
                    className="w-7 h-7 rounded-lg bg-[#4DD0E1] text-white font-bold text-sm flex items-center justify-center"
                  >+</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con total y guardar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#8896A5] text-sm">Nuevo total</span>
          <span className="font-mono font-bold text-[#008080] text-lg">{formatPrice(newTotal)}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm"
        >
          {saving ? 'Guardando...' : 'Confirmar cambios →'}
        </button>
      </div>
    </div>
  )
}
