import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

// Pantalla de toma de pedido para camareros.
// - Si el perfil es "cuenta compartida" (is_shared_account = true), pide
//   elegir un nombre de staff_names antes de empezar.
// - Si tiene login propio, usa profile.full_name para buscar/crear su
//   staff_names y va directo al menú.
// El pedido se crea en estado "recibido" (bypass de pendiente_aprobacion)
// con assigned_staff_id ya seteado.

export default function WaiterOrderPage() {
  const { profile } = useAuth()
  const [step, setStep] = useState('loading') // loading | choose_waiter | menu | confirm | done
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({}) // { productId: { product, qty } }
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return // esperar a que cargue el profile
    async function init() {
      const [staffRes, zoneRes, catRes, prodRes] = await Promise.all([
        supabaseStaff.from('staff_names').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('full_name'),
        supabaseStaff.from('venue_zones').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('categories').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('products').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_available', true).order('sort_order')
      ])
      setStaffList(staffRes.data || [])
      setZones(zoneRes.data || [])
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id)

      if (profile?.is_shared_account) {
        setStep('choose_waiter')
      } else {
        // Buscar o crear el staff_name correspondiente a este perfil
        const existing = (staffRes.data || []).find(s =>
          s.full_name.toLowerCase().trim() === (profile?.full_name || '').toLowerCase().trim()
        )
        if (existing) {
          setSelectedStaff(existing)
        } else {
          // Crear entrada en staff_names si no existe
          const { data: created } = await supabaseStaff
            .from('staff_names')
            .insert({ venue_id: ACTIVE_VENUE_ID, full_name: profile?.full_name || 'Camarero' })
            .select().single()
          if (created) setSelectedStaff(created)
        }
        setStep('menu')
      }
    }
    init()
  }, [profile])

  function addToCart(product) {
    setCart(prev => ({
      ...prev,
      [product.id]: { product, qty: (prev[product.id]?.qty || 0) + 1 }
    }))
  }

  function removeFromCart(product) {
    setCart(prev => {
      const current = prev[product.id]?.qty || 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[product.id]
        return next
      }
      return { ...prev, [product.id]: { product, qty: current - 1 } }
    })
  }

  const cartItems = Object.values(cart).filter(i => i.qty > 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0)

  async function handleConfirm() {
    if (!selectedZone) { setError('Elegí una ubicación.'); return }
    if (cartItems.length === 0) { setError('El carrito está vacío.'); return }

    setSubmitting(true)
    setError('')

    try {
      const { data: order, error: orderError } = await supabaseStaff
        .from('orders')
        .insert({
          venue_id: ACTIVE_VENUE_ID,
          customer_id: null,
          status: 'recibido',
          location_type: selectedZone.type,
          zone_id: selectedZone.id,
          location_label: selectedZone.name,
          notes: notes.trim() || null,
          subtotal,
          total: subtotal,
          payment_method: 'Efectivo',
          assigned_staff_id: selectedStaff?.id || null,
          created_by_staff: true
        })
        .select().single()

      if (orderError) throw orderError

      const orderItems = cartItems.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.qty,
        line_total: i.product.price * i.qty
      }))

      const { error: itemsError } = await supabaseStaff.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      setCart({})
      setNotes('')
      setSelectedZone(null)
      setStep('done')
    } catch (err) {
      setError(`Error: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- RENDERS ----

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  if (step === 'choose_waiter') {
    return (
      <div className="px-5 py-6">
        <p className="text-smoke-300 font-medium text-sm mb-4">¿Quién está tomando el pedido?</p>
        <div className="space-y-2">
          {staffList.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedStaff(s); setStep('menu') }}
              className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 text-left text-smoke-200 font-medium"
            >
              {s.full_name}
            </button>
          ))}
        </div>
        {staffList.length === 0 && (
          <p className="text-smoke-500 text-sm">No hay camareros activos. Agregalos desde "Gestionar camareros".</p>
        )}
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-smoke-200 font-semibold text-lg mb-1">¡Pedido enviado a cocina!</p>
        <p className="text-smoke-400 text-sm mb-6">El pedido entró directo a preparación.</p>
        <button
          onClick={() => setStep('menu')}
          className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3.5 rounded-xl"
        >
          Tomar otro pedido
        </button>
        {profile?.is_shared_account && (
          <button
            onClick={() => { setSelectedStaff(null); setStep('choose_waiter') }}
            className="w-full mt-2 border border-carbon-700 text-smoke-400 py-3 rounded-xl text-sm"
          >
            Cambiar camarero
          </button>
        )}
      </div>
    )
  }

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  return (
    <div>
      {/* Header con camarero seleccionado y ubicación */}
      <div className="px-4 pt-3 pb-2 border-b border-carbon-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-smoke-400 text-xs">🧑‍🍳</span>
          <span className="text-smoke-300 text-xs font-medium">{selectedStaff?.full_name || 'Sin asignar'}</span>
          {profile?.is_shared_account && (
            <button
              onClick={() => { setSelectedStaff(null); setStep('choose_waiter') }}
              className="text-smoke-500 text-[10px] underline"
            >
              cambiar
            </button>
          )}
        </div>
        <select
          value={selectedZone?.id || ''}
          onChange={e => {
            const z = zones.find(z => z.id === e.target.value) || null
            setSelectedZone(z)
          }}
          className="input text-xs py-1 max-w-[140px]"
        >
          <option value="">📍 Elegir mesa...</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      {/* Filtro de categorías */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 border-b border-carbon-700">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border flex-shrink-0 ${
              activeCategory === cat.id
                ? 'bg-ember-500 text-white border-ember-500'
                : 'border-carbon-700 text-smoke-400'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Lista de productos compacta */}
      <div className="px-4 py-2 space-y-1 max-h-[45vh] overflow-y-auto">
        {visibleProducts.map(product => {
          const qty = cart[product.id]?.qty || 0
          return (
            <div key={product.id} className="flex items-center justify-between py-2 border-b border-carbon-800">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-smoke-200 text-sm font-medium truncate">{product.name}</p>
                <p className="font-mono text-ember-400 text-xs">{formatPrice(product.price)}</p>
              </div>
              {qty === 0 ? (
                <button
                  onClick={() => addToCart(product)}
                  className="w-8 h-8 bg-ember-500 hover:bg-ember-600 text-white rounded-full text-lg font-bold flex items-center justify-center flex-shrink-0"
                >
                  +
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => removeFromCart(product)}
                    className="w-8 h-8 border border-carbon-700 text-smoke-300 rounded-full text-lg font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-smoke-200 text-sm font-semibold w-4 text-center">{qty}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="w-8 h-8 bg-ember-500 hover:bg-ember-600 text-white rounded-full text-lg font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen y confirmar */}
      {cartItems.length > 0 && (
        <div className="px-4 pt-3 pb-4 border-t border-carbon-700 space-y-3">
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {cartItems.map(i => (
              <div key={i.product.id} className="flex justify-between text-xs text-smoke-400">
                <span>{i.qty}× {i.product.name}</span>
                <span className="font-mono">{formatPrice(i.product.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas del pedido (opcional)"
            className="input resize-none text-xs py-2"
            rows={2}
          />
          {error && <p className="text-red-700 text-xs">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="font-mono text-ember-400 font-semibold">{formatPrice(subtotal)}</span>
            <button
              onClick={handleConfirm}
              disabled={submitting || !selectedZone}
              className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              {submitting ? 'Enviando...' : 'Enviar a cocina →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
