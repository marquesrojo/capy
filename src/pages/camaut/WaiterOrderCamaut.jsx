import { useEffect, useState } from 'react'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { awardXP } from '../../lib/xpUtils'

export default function WaiterOrderCamaut({ venueId }) {
  const { profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({})
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [staffId, setStaffId] = useState(null)

  useEffect(() => {
    if (venueId) loadCarta()
  }, [venueId])

  async function loadCarta() {
    setLoading(true)
    const [catRes, prodRes, venueRes, staffRes] = await Promise.all([
      supabaseStaff.from('categories').select('id, name').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('products').select('id, name, price, category_id').eq('venue_id', venueId).eq('is_available', true),
      supabaseStaff.from('venues').select('whatsapp_number').eq('id', venueId).single(),
      supabaseStaff.from('staff_names').select('id').eq('venue_id', venueId).single()
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setWhatsapp(venueRes.data?.whatsapp_number || '')
    setStaffId(staffRes.data?.id || null)
    if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
    setLoading(false)
  }

  function changeQty(productId, delta) {
    setCart(prev => {
      const current = prev[productId] || 0
      const next = current + delta
      if (next <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: next }
    })
  }

  const cartItems = Object.entries(cart).map(([productId, qty]) => {
    const product = products.find(p => p.id === productId)
    return { product, qty }
  }).filter(i => i.product)

  const total = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0)

  async function handleSubmit() {
    if (!cartItems.length || !location.trim()) return
    setSubmitting(true)

    const { data: { session } } = await supabaseStaff.auth.getSession()

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        venueId,
        locationLabel: location.trim(),
        staffId: staffId || null,
        total,
        items: cartItems.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.qty,
          unit_price: i.product.price
        }))
      })
    })

    const result = await res.json()

    if (result.success) {
      if (staffId) await awardXP(staffId, 'send_order')
      setLastOrder({ order: result.order, items: cartItems, location: location.trim(), total })
      setCart({})
      setLocation('')
      setNotes('')
    }

    setSubmitting(false)
  }

  function sendWhatsApp() {
    if (!whatsapp || !lastOrder) return
    const lines = [
      `🧾 COMANDA`,
      `📍 ${lastOrder.location}`,
      ...lastOrder.items.map(i => `• ${i.qty}x ${i.product.name}`),
      `💰 Total: ${formatPrice(lastOrder.total)}`
    ]
    if (notes.trim()) lines.push(`📝 ${notes}`)
    const msg = encodeURIComponent(lines.join('\n'))
    const phone = whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  // Pantalla de confirmación
  if (lastOrder) {
    return (
      <div className="bg-[#F0F4F8] min-h-screen px-5 py-8 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-[#008080]/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-1">Pedido registrado</p>
        <p className="font-mono text-[#008080] text-5xl font-bold mb-1">
          #{lastOrder.order.daily_number}
        </p>
        <p className="text-[#8896A5] text-sm mb-1">📍 {lastOrder.location}</p>
        <p className="font-mono text-[#1A2A3A] font-bold text-lg mb-6">{formatPrice(lastOrder.total)}</p>

        <div className="w-full space-y-3">
          {whatsapp && (
            <button
              onClick={sendWhatsApp}
              className="w-full bg-[#4DD0E1] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Enviar a cocina por WhatsApp
            </button>
          )}
          <button
            onClick={() => setLastOrder(null)}
            className="w-full bg-[#008080] text-white font-bold py-3.5 rounded-2xl"
          >
            Tomar otro pedido
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando carta...</p>
    </div>
  )

  // Carta vacía
  if (categories.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B0BEC5" strokeWidth="1.5" className="mb-4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
      </svg>
      <p className="text-[#1A2A3A] font-semibold text-base mb-2">Tu carta está vacía</p>
      <p className="text-[#8896A5] text-sm">Agregá productos desde <strong>Config → Carta</strong> para empezar a tomar pedidos.</p>
    </div>
  )

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  return (
    <div className="bg-[#F0F4F8] pb-32">
      {/* Ubicación */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Ubicación</p>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Ej: Mesa 4, Barra, Terraza..."
          className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
        />
      </div>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold ${
              activeCategory === cat.id
                ? 'bg-[#008080] text-white'
                : 'bg-white border border-black/10 text-[#8896A5]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Productos */}
      <div className="px-4 space-y-2 mt-1">
        {visibleProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-black/5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#1A2A3A]">{product.name}</p>
              <p className="text-xs text-[#008080] font-semibold">{formatPrice(product.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeQty(product.id, -1)}
                className="w-7 h-7 rounded-lg border border-black/10 bg-[#F8FAFC] text-[#3A4A5A] font-bold text-sm flex items-center justify-center"
              >−</button>
              <span className="font-bold text-[#1A2A3A] text-sm w-5 text-center">
                {cart[product.id] || 0}
              </span>
              <button
                onClick={() => changeQty(product.id, 1)}
                className="w-7 h-7 rounded-lg bg-[#4DD0E1] text-white font-bold text-sm flex items-center justify-center"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer con total */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[#8896A5] text-xs">{cartItems.length} producto{cartItems.length !== 1 ? 's' : ''}</p>
              <p className="font-mono font-bold text-[#008080] text-lg">{formatPrice(total)}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !location.trim()}
              className="bg-[#008080] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm"
            >
              {submitting ? 'Enviando...' : 'Confirmar →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
