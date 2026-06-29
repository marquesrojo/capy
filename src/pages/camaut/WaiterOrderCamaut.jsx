import { useEffect, useRef, useState } from 'react'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import { awardXP } from '../../lib/xpUtils'

export default function WaiterOrderCamaut({ venueId, linkedVenues = [] }) {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [zones, setZones] = useState([])
  const [quickNotes, setQuickNotes] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({}) // { productId: { product, qty, notes } }
  const [selectedZone, setSelectedZone] = useState(null)
  const [location, setLocation] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [activeVenueId, setActiveVenueId] = useState(venueId)
  const activeVenueIdRef = useRef(venueId)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [staffId, setStaffId] = useState(null)
  const [step, setStep] = useState('carta') // 'carta' | 'confirmar'

  function updateActiveVenue(id) {
    setActiveVenueId(id)
    activeVenueIdRef.current = id
  }

  useEffect(() => {
    activeVenueIdRef.current = activeVenueId
    if (activeVenueId) loadCarta()
  }, [activeVenueId])

  async function loadCarta() {
    setLoading(true)
    const [catRes, prodRes, venueRes, staffRes, zoneRes, notesRes] = await Promise.all([
      supabaseStaff.from('categories').select('id, name').eq('venue_id', activeVenueId).order('sort_order'),
      supabaseStaff.from('products').select('id, name, price, category_id').eq('venue_id', activeVenueId).eq('is_available', true),
      supabaseStaff.from('venues').select('whatsapp_number').eq('id', activeVenueId).single(),
      supabaseStaff.from('staff_names').select('id').eq('venue_id', venueId).single(),
      supabaseStaff.from('venue_zones').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order'),
      supabaseStaff.from('quick_notes').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order')
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setStaffId(staffRes.data?.id || null)
    setZones(zoneRes.data || [])
    setQuickNotes(notesRes.data || [])
    if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
    setLoading(false)
  }

  function changeQty(productId, delta) {
    const product = products.find(p => p.id === productId)
    setCart(prev => {
      const current = prev[productId]
      const currentQty = current?.qty || 0
      const next = currentQty + delta
      if (next <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: { product, qty: next, notes: current?.notes || '' } }
    })
  }

  function setItemNote(productId, note) {
    setCart(prev => ({
      ...prev,
      [productId]: { ...prev[productId], notes: note }
    }))
  }

  const cartItems = Object.values(cart).filter(i => i.product && i.qty > 0)
  const total = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0)
  const locationLabel = (selectedZone && selectedZone.id !== 'otra') ? selectedZone.name : location.trim()

  async function handleSubmit() {
    if (!cartItems.length || !locationLabel) return
    setSubmitting(true)
    const currentVenueId = activeVenueIdRef.current

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          venueId: currentVenueId,
          locationLabel,
          staffId: staffId || null,
          total,
          notes: generalNotes.trim() || null,
          items: cartItems.map(i => ({
            product_id: i.product.id,
            product_name: i.product.name,
            quantity: i.qty,
            unit_price: i.product.price,
            item_notes: i.notes || null
          }))
        })
      })

      const result = await res.json()
      if (result.success) {
        if (staffId) await awardXP(staffId, 'send_order')
        setLastOrder({ order: result.order, items: cartItems, location: locationLabel, total })
        setCart({})
        setLocation('')
        setSelectedZone(null)
        setGeneralNotes('')
        setStep('carta')
      }
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  // Pantalla de confirmación exitosa
  if (lastOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="font-bold text-[#1A2A3A] text-xl mb-1">¡Pedido enviado!</p>
        <p className="text-[#8896A5] text-sm mb-1">
          #{lastOrder.order?.daily_number} · 📍 {lastOrder.location}
        </p>
        <p className="font-mono font-bold text-[#008080] text-lg mb-6">{formatPrice(lastOrder.total)}</p>
        <button
          onClick={() => setLastOrder(null)}
          className="bg-[#008080] text-white font-bold px-8 py-3 rounded-2xl text-sm"
        >
          Nuevo pedido
        </button>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando carta...</p>
    </div>
  )

  // Sin carta — modo ingreso manual
  if (products.length === 0 && linkedVenues.length === 0) {
    return <CartaVacia venueId={activeVenueId} onProductsCreated={() => loadCarta()} />
  }

  // PASO 2 — Confirmación con notas y edición
  if (step === 'confirmar') {
    return (
      <div className="bg-[#F0F4F8] min-h-screen pb-32">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setStep('carta')} className="text-[#8896A5] text-sm">← Volver</button>
          <p className="font-bold text-[#1A2A3A] text-base">Confirmar pedido</p>
        </div>

        <div className="px-4 space-y-3">
          {/* Ítems editables */}
          {cartItems.map(item => (
            <div key={item.product.id} className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1A2A3A]">{item.product.name}</p>
                  <p className="text-xs text-[#8896A5]">{formatPrice(item.product.price)} c/u</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => changeQty(item.product.id, -1)}
                    className="w-9 h-9 rounded-full bg-[#F0F4F8] text-[#3A4A5A] flex items-center justify-center text-lg font-bold"
                  >−</button>
                  <span className="text-[#1A2A3A] font-semibold w-5 text-center">{item.qty}</span>
                  <button
                    onClick={() => changeQty(item.product.id, 1)}
                    className="w-9 h-9 rounded-full bg-[#008080] text-white flex items-center justify-center text-lg font-bold"
                  >+</button>
                </div>
                <span className="font-mono text-[#008080] font-semibold text-sm flex-shrink-0">
                  {formatPrice(item.product.price * item.qty)}
                </span>
              </div>

              {/* Notas por ítem */}
              {quickNotes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickNotes.map(qn => {
                    const active = (item.notes || '').includes(qn.label)
                    return (
                      <button
                        key={qn.id}
                        onClick={() => {
                          const current = item.notes || ''
                          const next = active
                            ? current.replace(qn.label, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                            : current ? `${current}, ${qn.label}` : qn.label
                          setItemNote(item.product.id, next)
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          active ? 'bg-[#008080] text-white border-[#008080]' : 'border-black/10 text-[#8896A5]'
                        }`}
                      >
                        {qn.label}
                      </button>
                    )
                  })}
                </div>
              )}
              <input
                type="text"
                value={item.notes || ''}
                onChange={e => setItemNote(item.product.id, e.target.value)}
                placeholder="Nota libre para este ítem..."
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-xs text-[#1A2A3A] bg-[#F8FAFC]"
              />
            </div>
          ))}

          {/* Nota general */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold mb-2">Nota general del pedido</p>
            <textarea
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Ej: alergia a mariscos, pedir rápido..."
              className="w-full border border-black/10 rounded-xl px-3 py-2 text-xs text-[#1A2A3A] bg-[#F8FAFC] resize-none"
              rows={2}
            />
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-[#8896A5]">📍 {locationLabel}</span>
              <span className="font-mono font-bold text-[#008080]">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Agregar más */}
          <button
            onClick={() => setStep('carta')}
            className="w-full border-2 border-dashed border-[#008080]/30 text-[#008080] text-sm font-semibold py-3 rounded-2xl"
          >
            + Agregar más ítems
          </button>
        </div>

        {/* Botón confirmar fijo */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-4 py-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || cartItems.length === 0}
            className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {submitting ? 'Enviando...' : `Confirmar pedido · ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    )
  }

  // PASO 1 — Carta
  return (
    <div className="bg-[#F0F4F8] pb-32">

      {/* Selector de carta si hay venues vinculados */}
      {linkedVenues.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Carta</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { updateActiveVenue(venueId); setCart({}); setSelectedZone(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                activeVenueId === venueId
                  ? 'bg-[#008080] text-white border-[#008080]'
                  : 'bg-white border-black/10 text-[#3A4A5A]'
              }`}
            >
              Mi Carta
            </button>
            {linkedVenues.map(v => (
              <button
                key={v.id}
                onClick={() => { updateActiveVenue(v.id); setCart({}); setSelectedZone(null) }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                  activeVenueId === v.id
                    ? 'bg-[#008080] text-white border-[#008080]'
                    : 'bg-white border-black/10 text-[#3A4A5A]'
                }`}
              >
                {v.name.replace(' — Capy', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ubicación */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Ubicación</p>
        {zones.length > 0 ? (
          <ZoneSelector
            zones={zones}
            selectedZone={selectedZone}
            onSelect={(zone) => { setSelectedZone(zone); setLocation('') }}
            location={location}
            onLocationChange={setLocation}
          />
        ) : (
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Ej: Mesa 4, Barra, Terraza..."
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
          />
        )}
      </div>

      {/* Categorías */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border ${
              activeCategory === cat.id
                ? 'bg-[#008080] text-white border-[#008080]'
                : 'bg-white border-black/10 text-[#3A4A5A]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Productos */}
      <div className="px-4 space-y-2 mt-1">
        {visibleProducts.map(product => {
          const item = cart[product.id]
          const qty = item?.qty || 0
          return (
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
                <span className="font-bold text-[#1A2A3A] text-sm w-5 text-center">{qty}</span>
                <button
                  onClick={() => changeQty(product.id, 1)}
                  className="w-7 h-7 rounded-lg bg-[#4DD0E1] text-white font-bold text-sm flex items-center justify-center"
                >+</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer con botón ir a confirmar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[#8896A5] text-xs">{cartItems.length} producto{cartItems.length !== 1 ? 's' : ''}</p>
              <p className="font-mono font-bold text-[#008080] text-lg">{formatPrice(total)}</p>
            </div>
            <button
              onClick={() => setStep('confirmar')}
              disabled={!locationLabel}
              className="bg-[#008080] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm"
            >
              Revisar →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ZoneSelector({ zones, selectedZone, onSelect, location, onLocationChange }) {
  const [open, setOpen] = useState(false)

  const displayLabel = selectedZone?.id === 'otra'
    ? location || 'Escribí la ubicación...'
    : selectedZone?.name || 'Seleccioná una ubicación'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold ${
          selectedZone && selectedZone.id !== 'otra'
            ? 'bg-[#008080] text-white border-[#008080]'
            : 'bg-white border-black/10 text-[#3A4A5A]'
        }`}
      >
        <span>{displayLabel}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto divide-y divide-black/5">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => { onSelect(zone); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm ${
                  selectedZone?.id === zone.id ? 'bg-[#008080]/10 text-[#008080] font-semibold' : 'text-[#3A4A5A]'
                }`}
              >
                {zone.name}
              </button>
            ))}
            <button
              onClick={() => { onSelect({ id: 'otra', name: null }); setOpen(false) }}
              className="w-full text-left px-4 py-3 text-sm text-[#8896A5]"
            >
              Otra ubicación...
            </button>
          </div>
        </div>
      )}

      {selectedZone?.id === 'otra' && (
        <input
          type="text"
          value={location}
          onChange={e => onLocationChange(e.target.value)}
          placeholder="Escribí la ubicación..."
          className="w-full mt-2 border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
          autoFocus
        />
      )}
    </div>
  )
}

function CartaVacia({ venueId, onProductsCreated }) {
  const [location, setLocation] = useState('')
  const [items, setItems] = useState([{ name: '', price: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)

  function addItem() {
    setItems(prev => [...prev, { name: '', price: '' }])
  }

  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const validItems = items.filter(i => i.name.trim() && parseFloat(i.price) > 0)
  const total = validItems.reduce((sum, i) => sum + parseFloat(i.price), 0)

  async function handleSubmit() {
    if (!validItems.length || !location.trim()) return
    setSubmitting(true)

    // Crear zona si no existe
    if (location.trim()) {
      const { data: existingZone } = await supabaseStaff
        .from('venue_zones')
        .select('id')
        .eq('venue_id', venueId)
        .eq('name', location.trim())
        .maybeSingle()

      if (!existingZone) {
        await supabaseStaff
          .from('venue_zones')
          .insert({ venue_id: venueId, name: location.trim(), is_active: true, sort_order: 0 })
      }
    }

    // Crear categoría "General" si no existe
    let categoryId = null
    const { data: existingCat } = await supabaseStaff
      .from('categories')
      .select('id')
      .eq('venue_id', venueId)
      .eq('name', 'General')
      .maybeSingle()

    if (existingCat) {
      categoryId = existingCat.id
    } else {
      const { data: newCat } = await supabaseStaff
        .from('categories')
        .insert({ venue_id: venueId, name: 'General', sort_order: 0 })
        .select('id')
        .single()
      categoryId = newCat?.id
    }

    // Crear productos nuevos
    const productIds = []
    for (const item of validItems) {
      const price = parseFloat(item.price)
      // Buscar si ya existe
      const { data: existing } = await supabaseStaff
        .from('products')
        .select('id')
        .eq('venue_id', venueId)
        .eq('name', item.name.trim())
        .maybeSingle()

      if (existing) {
        productIds.push({ id: existing.id, name: item.name.trim(), price })
      } else {
        const { data: newProd } = await supabaseStaff
          .from('products')
          .insert({ venue_id: venueId, name: item.name.trim(), price, category_id: categoryId, is_available: true })
          .select('id')
          .single()
        productIds.push({ id: newProd?.id, name: item.name.trim(), price })
      }
    }

    // Crear pedido via Edge Function
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        venueId,
        locationLabel: location.trim(),
        total,
        items: productIds.map(p => ({
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
          unit_price: p.price
        }))
      })
    })

    const result = await res.json()
    if (result.success) {
      setLastOrder({ order: result.order, location: location.trim(), total })
      setItems([{ name: '', price: '' }])
      setLocation('')
      onProductsCreated()
    }
    setSubmitting(false)
  }

  if (lastOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="font-bold text-[#1A2A3A] text-xl mb-1">¡Pedido enviado!</p>
        <p className="text-[#8896A5] text-sm mb-1">#{lastOrder.order?.daily_number} · 📍 {lastOrder.location}</p>
        <p className="font-mono font-bold text-[#008080] text-lg mb-2">{formatPrice(lastOrder.total)}</p>
        <p className="text-[#8896A5] text-xs mb-6">Los productos quedaron guardados en tu carta.</p>
        <button
          onClick={() => setLastOrder(null)}
          className="bg-[#008080] text-white font-bold px-8 py-3 rounded-2xl text-sm"
        >
          Nuevo pedido
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#F0F4F8] min-h-screen pb-32 px-4 pt-4">
      <p className="text-[#8896A5] text-xs mb-4">
        Todavía no tenés carta. Agregá los productos de este pedido y quedarán guardados para la próxima vez.
      </p>

      {/* Ubicación */}
      <div className="mb-4">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Ubicación</p>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Ej: Mesa 4, Barra, Terraza..."
          className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
        />
      </div>

      {/* Productos */}
      <div className="mb-3">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Productos</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-black/5 shadow-sm">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(i, 'name', e.target.value)}
                  placeholder="Nombre del producto"
                  className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(i, 'price', e.target.value)}
                  placeholder="Precio"
                  className="w-24 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
                  min="0"
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 text-lg px-1">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="w-full border-2 border-dashed border-[#008080]/30 text-[#008080] text-sm font-semibold py-3 rounded-2xl mt-2"
        >
          + Agregar producto
        </button>
      </div>

      {/* Total */}
      {validItems.length > 0 && (
        <div className="bg-white rounded-xl px-4 py-3 border border-black/5 flex justify-between mb-4">
          <span className="text-[#8896A5] text-sm">Total</span>
          <span className="font-mono font-bold text-[#008080]">{formatPrice(total)}</span>
        </div>
      )}

      {/* Botón confirmar fijo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-4 py-4">
        <button
          onClick={handleSubmit}
          disabled={submitting || !validItems.length || !location.trim()}
          className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
        >
          {submitting ? 'Enviando...' : `Confirmar pedido · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  )
}
