import { useEffect, useRef, useState } from 'react'
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

export default function WaiterTrackingPage({ venueId: propVenueId }) {
  const activeVenueId = propVenueId || ACTIVE_VENUE_ID
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [qrOrder, setQrOrder] = useState(null)

  useEffect(() => {
    loadOrders()
    loadStaff()
    const channel = supabaseStaff
      .channel('waiter-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${activeVenueId}` }, () => loadOrders())
      .subscribe()
    return () => supabaseStaff.removeChannel(channel)
  }, [])

  async function loadOrders() {
    const { data: ordersData } = await supabaseStaff
      .from('orders')
      .select('id, status, location_label, total, created_at, waiter_called_at, daily_number, assigned_staff:staff_names!orders_assigned_staff_id_fkey(full_name)')
      .eq('venue_id', activeVenueId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })

    if (!ordersData?.length) { setOrders([]); setLoading(false); return }

    const orderIds = ordersData.map(o => o.id)
    const { data: itemsData } = await supabaseStaff
      .from('order_items')
      .select('id, order_id, product_id, product_name, quantity, unit_price, item_notes')
      .in('order_id', orderIds)

    const itemsByOrder = (itemsData || []).reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = []
      acc[item.order_id].push(item)
      return acc
    }, {})

    const combined = ordersData.map(o => ({
      ...o,
      order_items: itemsByOrder[o.id] || []
    }))

    setOrders(combined)
    setLoading(false)
  }

  async function loadStaff() {
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('id, full_name')
      .eq('venue_id', activeVenueId)
      .eq('is_active', true)
      .order('full_name')
    setStaffList(data || [])
  }

  async function assignStaff(orderId, staffId) {
    await supabaseStaff
      .from('orders')
      .update({ assigned_staff_id: staffId })
      .eq('id', orderId)
    setAssigningOrder(null)
    loadOrders()
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
        venueId={activeVenueId}
        onClose={async () => {
          await loadOrders()
          setEditingOrder(null)
        }}
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
      {/* Modal QR */}
      {qrOrder && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setQrOrder(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 text-center max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-[#1A2A3A] text-lg mb-1">
              #{qrOrder.daily_number || qrOrder.id.slice(0, 6)}
            </p>
            <p className="text-[#8896A5] text-xs mb-4">📍 {qrOrder.location_label}</p>
            <OrderQRCode orderId={qrOrder.id} />
            <p className="text-[#8896A5] text-xs mt-3">El cliente escanea y sigue su pedido</p>
            <button
              onClick={() => setQrOrder(null)}
              className="mt-4 w-full border border-black/10 text-[#8896A5] py-2.5 rounded-xl text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
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
                      {order.assigned_staff?.full_name ? (
                        <span className="text-[#8896A5] text-[10px]">🧑‍🍳 {order.assigned_staff.full_name}</span>
                      ) : (
                        <button
                          onClick={() => setAssigningOrder(order.id)}
                          className="border border-[#008080]/50 text-[#008080] text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          + Asignarme
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="border border-[#008080] text-[#008080] text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => setQrOrder(order)}
                        className="border border-black/10 text-[#8896A5] text-xs font-semibold px-3 py-1 rounded-full"
                      >
                        QR
                      </button>
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

                  {/* Selector de camarero */}
                  {assigningOrder === order.id && (
                    <div className="mt-2 bg-[#F8FAFC] border border-black/10 rounded-xl p-2">
                      <p className="text-[10px] text-[#8896A5] mb-2">¿Quién sos?</p>
                      <div className="space-y-1">
                        {staffList.map(s => (
                          <button
                            key={s.id}
                            onClick={() => assignStaff(order.id, s.id)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1A2A3A] hover:bg-[#008080]/10"
                          >
                            {s.full_name}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setAssigningOrder(null)}
                        className="w-full text-center text-[#8896A5] text-xs underline mt-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function EditOrderPage({ order, onClose, venueId: propVenueId }) {
  const activeVenueId = propVenueId || ACTIVE_VENUE_ID
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
      supabaseStaff.from('categories').select('id, name').eq('venue_id', activeVenueId).order('sort_order'),
      supabaseStaff.from('products').select('id, name, price, category_id').eq('venue_id', activeVenueId).eq('is_available', true)
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

    const originalIds = order.order_items.map(i => i.id)
    const editedIds = items.filter(i => !i.id.startsWith('new-')).map(i => i.id)

    // 1. Borrar ítems que se quitaron
    const deletedIds = originalIds.filter(id => !editedIds.includes(id))
    if (deletedIds.length > 0) {
      await supabaseStaff.from('order_items').delete().in('id', deletedIds)
    }

    // 2. Actualizar cantidades de los existentes
    for (const item of items.filter(i => !i.id.startsWith('new-'))) {
      await supabaseStaff
        .from('order_items')
        .update({ quantity: item.quantity })
        .eq('id', item.id)
    }

    // 3. Insertar los nuevos
    const newItems = items.filter(i => i.id.startsWith('new-')).map(i => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.unit_price * i.quantity,
      item_notes: i.item_notes || null
    }))
    if (newItems.length > 0) {
      await supabaseStaff.from('order_items').insert(newItems)
    }

    // 4. Actualizar total
    await supabaseStaff.from('orders').update({ total: newTotal }).eq('id', order.id)

    setSaving(false)
    await new Promise(r => setTimeout(r, 500))
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
function OrderQRCode({ orderId }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    const url = `https://capyapp.co/pedido/${orderId}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1A2A3A', light: '#FFFFFF' }
      }, (err) => { if (!err) setReady(true) })
    })
  }, [orderId])

  return (
    <div className="flex justify-center">
      <div className="bg-white border border-black/8 rounded-2xl p-3 inline-block">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
        {!ready && (
          <div className="w-[200px] h-[200px] bg-[#F0F4F8] rounded-xl flex items-center justify-center">
            <p className="text-[#8896A5] text-xs">Generando QR...</p>
          </div>
        )}
      </div>
    </div>
  )
}
