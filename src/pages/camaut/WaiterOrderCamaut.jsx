import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabaseStaff } from '../../lib/supabase'
import { PinIcon } from '../../components/Icons'
import { formatPrice } from '../../lib/utils'
import { awardXP } from '../../lib/xpUtils'
import FloorPlanViewer from '../../components/FloorPlanViewer'

export default function WaiterOrderCamaut({ venueId, linkedVenues = [], prefillLocation = null, onPrefillUsed, onXPUpdate }) {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [zones, setZones] = useState([])
  const [quickNotes, setQuickNotes] = useState([])
  const [menus, setMenus] = useState([])
  const [activeMenuId, setActiveMenuId] = useState('all') // 'all' o menu_id
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({}) // { productId: { product, qty, notes } }
  const [selectedZone, setSelectedZone] = useState(null)
  const [location, setLocation] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [activeVenueId, setActiveVenueId] = useState(() => {
    if (linkedVenues.length === 0) return venueId
    return localStorage.getItem(`capy_ctx_${venueId}`) || venueId
  })
  const activeVenueIdRef = useRef(venueId)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [staffId, setStaffId] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [step, setStep] = useState('carta') // 'carta' | 'confirmar'
  const [searchQuery, setSearchQuery] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [menuQrModal, setMenuQrModal] = useState(null) // { slug, name }
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [discounts, setDiscounts] = useState([])
  const [selectedDiscount, setSelectedDiscount] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [cashDiscount, setCashDiscount] = useState({ enabled: false, percent: 0 })
  const [contextReady, setContextReady] = useState(() => {
    if (linkedVenues.length === 0) return true
    return !!localStorage.getItem(`capy_ctx_${venueId}`)
  })

  function updateActiveVenue(id) {
    setActiveVenueId(id)
    activeVenueIdRef.current = id
    setShowMap(false)
    setSelectedZone(null)
    localStorage.setItem(`capy_ctx_${venueId}`, id)
  }

  useEffect(() => {
    activeVenueIdRef.current = activeVenueId
    if (activeVenueId) loadCarta()
  }, [activeVenueId])

  useEffect(() => {
    if (prefillLocation) {
      setLocation(prefillLocation)
      setSelectedZone({ id: 'otra', name: null })
      onPrefillUsed?.()
    }
  }, [prefillLocation])

  async function loadCarta() {
    setLoading(true)
    try {
      const [catRes, prodRes, staffRes, zoneRes, notesRes, menuRes, discountsRes, payMethodsRes] = await Promise.all([
        supabaseStaff.from('categories').select('id, name, menu_id').eq('venue_id', activeVenueId).order('sort_order'),
        supabaseStaff.from('products').select('id, name, price, category_id, is_daily_special').eq('venue_id', activeVenueId).eq('is_available', true),
        supabaseStaff.from('staff_names').select('id').eq('venue_id', venueId).limit(1).maybeSingle(),
        supabaseStaff.from('venue_zones').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('quick_notes').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('staff_menus').select('*').eq('venue_id', activeVenueId).order('created_at'),
        supabaseStaff.from('venue_discounts').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('created_at'),
        supabaseStaff.from('payment_methods').select('id, name').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order')
      ])
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
      setStaffId(staffRes.data?.id || null)
      setZones(zoneRes.data || [])
      setQuickNotes(notesRes.data || [])
      setMenus(menuRes.data || [])
      const allDiscounts = discountsRes.data || []
      const cashEntry = allDiscounts.find(d => d.is_cash_discount)
      setDiscounts(allDiscounts.filter(d => !d.is_cash_discount))
      setCashDiscount({ enabled: !!cashEntry, percent: cashEntry?.percent || 0 })
      setPaymentMethods(payMethodsRes.data || [])
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
    } catch (err) {
      console.error('loadCarta error:', err)
    } finally {
      setLoading(false)
    }
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
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0)
  const discountAmount = selectedDiscount ? Math.round(subtotal * selectedDiscount.percent / 100) : 0
  const selectedPaymentName = selectedPaymentMethod?.name || ''
  const isEfectivo = selectedPaymentName.toLowerCase().includes('efectivo')
  const cashDiscountAmt = (isEfectivo && cashDiscount.enabled && cashDiscount.percent > 0)
    ? Math.round(subtotal * cashDiscount.percent / 100) : 0
  const total = subtotal - discountAmount - cashDiscountAmt
  const locationLabel = (selectedZone && selectedZone.id !== 'otra') ? selectedZone.name : location.trim()

  async function handleSubmit() {
    if (!cartItems.length || !locationLabel) return
    setSubmitting(true)
    setSubmitError(null)
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

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setSubmitError(`Error ${res.status}: ${text.slice(0, 120) || 'Sin detalle'}`)
        setSubmitting(false)
        return
      }

      const result = await res.json()
      if (result.success) {
        if (staffId) {
          const newXP = await awardXP(staffId, 'send_order', activeVenueId)
          if (newXP !== null && onXPUpdate) onXPUpdate(newXP)
        }
        if (result.order?.id) {
          const updates = {}
          if (activeVenueId === venueId && activeMenuId && activeMenuId !== 'all') {
            updates.menu_id = activeMenuId
          }
          const { data: openShift } = await supabaseStaff
            .from('shifts').select('id')
            .eq('venue_id', currentVenueId).eq('status', 'open').maybeSingle()
          if (openShift?.id) updates.shift_id = openShift.id
          if (selectedDiscount) {
            updates.discount_amount = discountAmount
            updates.discount_code = selectedDiscount.code
            updates.subtotal = subtotal
          }
          if (selectedPaymentMethod) {
            updates.payment_method = selectedPaymentMethod.name
          }
          if (isEfectivo && cashDiscountAmt > 0) {
            updates.cash_discount_amount = cashDiscountAmt
          }
          if (Object.keys(updates).length) {
            await supabaseStaff.from('orders').update(updates).eq('id', result.order.id)
          }
        }
        setLastOrder({ order: result.order, items: cartItems, location: locationLabel, total })
        setCart({})
        setLocation('')
        setSelectedZone(null)
        setGeneralNotes('')
        setSelectedDiscount(null)
        setSelectedPaymentMethod(null)
        setStep('carta')
      } else {
        setSubmitError(result.error || 'Error al enviar el pedido. Intentá de nuevo.')
      }
    } catch (err) {
      console.error(err)
      setSubmitError(`Error de red: ${err?.message || 'desconocido'}`)
    }
    setSubmitting(false)
  }

  const filteredCategories = activeVenueId === venueId && activeMenuId !== 'all'
    ? categories.filter(c => c.menu_id === activeMenuId)
    : categories

  const mesaZones = zones.filter(z => z.type === 'mesa')
  const activeMenu = menus.find(m => m.id === activeMenuId)
  const menuZoneId = activeMenu?.zone_id ?? null

  const filteredZones = activeVenueId === venueId && activeMenuId !== 'all'
    ? (menuZoneId
        ? mesaZones.filter(z => z.parent_zone_id === menuZoneId)
        : mesaZones.filter(z => z.menu_id === activeMenuId))
    : mesaZones

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const q = searchQuery.trim().toLowerCase()
  const searchResults = q
    ? (() => {
        const words = q.split(/\s+/)
        return products
          .filter(p => {
            const haystack = `${p.name} ${categoryMap[p.category_id] || ''}`.toLowerCase()
            return words.every(w => haystack.includes(w))
          })
          .sort((a, b) => {
            const aExact = a.name.toLowerCase().startsWith(q) ? 0 : 1
            const bExact = b.name.toLowerCase().startsWith(q) ? 0 : 1
            return aExact - bExact
          })
      })()
    : null

  // Pantalla de confirmación exitosa
  if (lastOrder) {
    const orderId = lastOrder.order?.id
    const orderUrl = `https://capyapp.co/ver-pedido/${orderId}`
    return (
      <div className="flex flex-col items-center px-6 pt-10 pb-10 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="font-bold text-[#1A2A3A] text-xl mb-0.5">¡Pedido enviado!</p>
        <p className="text-[#8896A5] text-sm mb-0.5 flex items-center gap-1">
          #{lastOrder.order?.daily_number} · <PinIcon size={11} /> {lastOrder.location}
        </p>
        <p className="font-mono font-bold text-[#008080] text-lg mb-5">{formatPrice(lastOrder.total)}</p>

        {/* Tiempo de preparación */}
        {orderId && (
          <div className="w-full mb-4">
            {lastOrder.prepMins ? (
              <PrepTimerDisplay prepStartedAt={lastOrder.prepStartedAt} prepMins={lastOrder.prepMins} />
            ) : (
              <div className="bg-[#F0F4F8] rounded-2xl p-4 text-left">
                <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">¿Cuánto tiempo tarda?</p>
                <div className="flex gap-2 justify-center">
                  {[5, 10, 15, 20, 30].map(min => (
                    <button
                      key={min}
                      onClick={async () => {
                        const startedAt = new Date().toISOString()
                        await supabaseStaff.from('orders').update({
                          prep_time_minutes: min,
                          prep_started_at: startedAt,
                          status: 'en_preparacion'
                        }).eq('id', orderId)
                        setLastOrder(prev => ({ ...prev, prepMins: min, prepStartedAt: startedAt }))
                      }}
                      className="w-12 h-12 rounded-xl bg-white border border-black/10 text-sm font-bold text-[#3A4A5A] active:bg-[#008080] active:text-white"
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {orderId && (
          <div className="w-full mb-5">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">
              Compartí el seguimiento con el cliente
            </p>
            <QRCanvas orderId={orderId} />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigator.clipboard.writeText(orderUrl)}
                className="flex-1 border border-[#008080] text-[#008080] font-semibold py-2.5 rounded-xl text-sm"
              >
                Copiar link
              </button>
              {navigator.share && (
                <button
                  onClick={() => navigator.share({ url: orderUrl })}
                  className="flex-1 bg-[#008080] text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  Compartir
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setLastOrder(null)}
          className="w-full bg-[#1A2A3A] text-white font-bold px-8 py-3 rounded-2xl text-sm"
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

  // Selector de contexto (cuando hay venues vinculados y no eligió todavía)
  if (!contextReady) {
    return (
      <div className="px-4 pt-5 pb-8 bg-[#F0F4F8] min-h-screen">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-4 px-1">¿Desde qué carta trabajás hoy?</p>
        <div className="space-y-3">
          <button
            onClick={() => { updateActiveVenue(venueId); setContextReady(true) }}
            className="w-full bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-left flex items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E8F5F5] flex items-center justify-center text-[#008080] flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-base">Mis Cartas</p>
              <p className="text-[#8896A5] text-sm">Tus menúes personales</p>
            </div>
          </button>
          {linkedVenues.map(v => (
            <button
              key={v.id}
              onClick={() => { updateActiveVenue(v.id); setContextReady(true) }}
              className="w-full bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-left flex items-center gap-4 active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FFF3E8] flex items-center justify-center flex-shrink-0" style={{ color: '#E07A30' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <p className="font-bold text-[#1A2A3A] text-base">{v.name.replace(' — Capy', '')}</p>
                <p className="text-[#8896A5] text-sm">Restaurante vinculado</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

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

          {/* Descuento */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold mb-2">Descuento</p>
            {discounts.length > 0 ? (
              <select
                value={selectedDiscount?.id || ''}
                onChange={e => setSelectedDiscount(discounts.find(d => d.id === e.target.value) || null)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-[#1A2A3A] bg-[#F8FAFC]"
              >
                <option value="">Sin descuento</option>
                {discounts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.percent}%{d.label ? ` (${d.label})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[#8896A5] text-xs italic">No hay descuentos configurados</p>
            )}
          </div>

          {/* Medio de pago */}
          {paymentMethods.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
              <p className="text-[#8896A5] text-xs font-semibold mb-2">Medio de pago</p>
              <select
                value={selectedPaymentMethod?.id || ''}
                onChange={e => setSelectedPaymentMethod(paymentMethods.find(m => m.id === e.target.value) || null)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm text-[#1A2A3A] bg-[#F8FAFC]"
              >
                <option value="">Sin especificar</option>
                {paymentMethods.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {isEfectivo && cashDiscount.enabled && cashDiscount.percent > 0 && (
                <p className="text-emerald-600 text-xs mt-1.5 font-medium">
                  Se aplica {cashDiscount.percent}% de descuento por pago en efectivo
                </p>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#8896A5] flex items-center gap-1"><PinIcon size={11} /> {locationLabel}</span>
              {(discountAmount > 0 || cashDiscountAmt > 0) ? (
                <span className="font-mono text-[#8896A5] line-through text-xs">{formatPrice(subtotal)}</span>
              ) : (
                <span className="font-mono font-bold text-[#008080]">{formatPrice(total)}</span>
              )}
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm mb-0.5">
                <span className="text-emerald-600 text-xs font-semibold">Descuento {selectedDiscount.percent}%</span>
                <span className="font-mono text-sm text-[#3A4A5A]">−{formatPrice(discountAmount)}</span>
              </div>
            )}
            {cashDiscountAmt > 0 && (
              <div className="flex justify-between text-sm mb-0.5">
                <span className="text-emerald-600 text-xs font-semibold">Efectivo {cashDiscount.percent}%</span>
                <span className="font-mono text-sm text-[#3A4A5A]">−{formatPrice(cashDiscountAmt)}</span>
              </div>
            )}
            {(discountAmount > 0 || cashDiscountAmt > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-[#8896A5] text-xs font-semibold">Total</span>
                <span className="font-mono font-bold text-[#008080]">{formatPrice(total)}</span>
              </div>
            )}
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
          {submitError && (
            <p className="text-red-500 text-xs text-center mb-2">{submitError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || cartItems.length === 0}
            className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {submitting ? 'Enviando...' : cashDiscountAmt > 0
              ? `Confirmar · ${formatPrice(total)} (${cashDiscount.percent}% off efectivo)`
              : `Confirmar pedido · ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    )
  }

  // PASO 1 — Carta
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F0F4F8]" style={{ minHeight: '420px' }}>

      {/* Modal QR carta para el cliente */}
      {menuQrModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setMenuQrModal(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center" onClick={e => e.stopPropagation()}>
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-1">Carta digital</p>
            <p className="font-bold text-[#1A2A3A] text-base mb-4">{menuQrModal.name}</p>
            <MenuQRCanvas slug={menuQrModal.slug} />
            <p className="text-[#8896A5] text-xs mt-3 mb-4">El cliente escanea esto para ver la carta</p>
            <button onClick={() => setMenuQrModal(null)} className="text-[#8896A5] text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {/* Indicador de carta activa */}
      {linkedVenues.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 pb-3 flex items-center justify-between bg-white border-b border-black/5">
          <div>
            <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide">Carta activa</p>
            <p className="font-bold text-[#1A2A3A] text-sm">
              {activeVenueId === venueId ? 'Mis Cartas' : linkedVenues.find(v => v.id === activeVenueId)?.name?.replace(' — Capy', '')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeVenueId !== venueId && (() => {
              const av = linkedVenues.find(v => v.id === activeVenueId)
              if (!av) return null
              return (
                <button
                  onClick={() => setMenuQrModal({ slug: av.slug || null, name: av.name.replace(' — Capy', '').replace(' - Capy', '') })}
                  className="flex items-center gap-1.5 text-[#008080] text-xs font-semibold border border-[#008080]/30 px-3 py-1.5 rounded-xl"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                    <rect x="3" y="16" width="5" height="5"/>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M7 17H4a1 1 0 0 1-1-1v-3"/>
                  </svg>
                  QR carta
                </button>
              )
            })()}
            <button
              onClick={() => { setContextReady(false); setCart({}); setSelectedZone(null); setShowMap(false); localStorage.removeItem(`capy_ctx_${venueId}`) }}
              className="text-[#008080] text-xs font-semibold border border-[#008080]/30 px-3 py-1.5 rounded-xl"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Mis Cartas (venue propio): selector de carta/menú */}
      {activeVenueId === venueId && menus.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 pb-1">
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Seleccioná tu carta</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setActiveMenuId('all'); setActiveCategory(categories[0]?.id || null) }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                activeMenuId === 'all' ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white border-black/10 text-[#3A4A5A]'
              }`}
            >
              Todos
            </button>
            {categories.filter(c => !c.menu_id).length > 0 && (
              <button
                onClick={() => {
                  setActiveMenuId(null)
                  const first = categories.find(c => !c.menu_id)
                  setActiveCategory(first?.id || null)
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  activeMenuId === null ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white border-black/10 text-[#3A4A5A]'
                }`}
              >
                General
              </button>
            )}
            {menus.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMenuId(m.id)
                  const first = categories.find(c => c.menu_id === m.id)
                  setActiveCategory(first?.id || null)
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  activeMenuId === m.id ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white border-black/10 text-[#3A4A5A]'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ubicación */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Ubicación</p>
        {activeVenueId !== venueId ? (
          zones.some(z => z.pos_x != null) ? (
            <div>
              <button
                onClick={() => setShowMap(p => !p)}
                className="w-full flex items-center justify-between bg-white border border-black/10 rounded-xl px-4 py-3 text-sm mb-2"
              >
                <span className={`font-semibold ${selectedZone ? 'text-[#008080]' : 'text-[#3A4A5A]'}`}>
                  {selectedZone ? <><PinIcon size={11} /> {selectedZone.name}</> : 'Seleccionar mesa'}
                </span>
                <span className="text-[#8896A5] text-xs">{showMap ? 'Ocultar ↑' : 'Ver mapa ↓'}</span>
              </button>
              {showMap && (
                <FloorPlanViewer
                  zones={zones}
                  venueId={activeVenueId}
                  selectedZone={selectedZone}
                  onSelect={zone => { setSelectedZone(zone); setLocation(''); setShowMap(false) }}
                  supabaseClient={supabaseStaff}
                />
              )}
            </div>
          ) : zones.filter(z => z.type === 'mesa').length > 0 ? (
            <ZoneSelector
              zones={zones.filter(z => z.type === 'mesa')}
              selectedZone={selectedZone}
              onSelect={zone => { setSelectedZone(zone); setLocation('') }}
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
          )
        ) : mesaZones.length > 0 ? (
          <ZoneSelector
            zones={filteredZones.length > 0 ? filteredZones : mesaZones}
            selectedZone={selectedZone}
            onSelect={zone => { setSelectedZone(zone); setLocation('') }}
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

      {/* Buscador + botón de categorías */}
      <div className="flex-shrink-0 px-4 pt-2 pb-2 flex gap-2 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0BEC5]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en la carta..."
            className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-[#1A2A3A] placeholder-[#B0BEC5]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0BEC5] text-lg leading-none"
            >×</button>
          )}
        </div>
        <button
          onClick={() => setShowCategorySheet(true)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
            activeCategory
              ? 'bg-[#008080] text-white border-[#008080]'
              : 'bg-white text-[#3A4A5A] border-black/10'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Categoría
        </button>
      </div>

      {/* Bottom sheet de categorías */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setShowCategorySheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 z-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#D0D9E0] rounded-full mx-auto mb-4" />
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Categorías</p>
            <div className="grid grid-cols-3 gap-2">
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setShowCategorySheet(false) }}
                  className={`py-3 px-2 rounded-xl border-2 text-center text-xs font-semibold leading-tight transition-all ${
                    activeCategory === cat.id
                      ? 'border-[#008080] bg-[#008080]/5 text-[#005f5f]'
                      : 'border-[#E4EBF0] text-[#3A4A5A]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {searchResults ? (
        /* Resultados de búsqueda — scrollable */
        <div className="flex-1 overflow-y-auto px-4 pt-1 pb-4 space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-[#8896A5] text-sm text-center py-6">Sin resultados para "{searchQuery}"</p>
          ) : (
            searchResults.map(product => {
              const item = cart[product.id]
              const qty = item?.qty || 0
              return (
                <div key={product.id} className={`bg-white rounded-xl px-4 py-3 flex items-center justify-between border shadow-sm ${product.is_daily_special ? 'border-amber-300 bg-amber-50' : 'border-black/5'}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#1A2A3A]">{product.name}</p>
                      {product.is_daily_special && <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full leading-none">HOY</span>}
                    </div>
                    <p className="text-xs text-[#8896A5]">{categoryMap[product.category_id] || ''} · <span className="text-[#008080] font-semibold">{formatPrice(product.price)}</span></p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <button onClick={() => changeQty(product.id, -1)} className="w-11 h-11 rounded-xl border border-black/10 bg-[#F8FAFC] text-[#3A4A5A] font-bold text-lg flex items-center justify-center">−</button>
                    <span className="font-bold text-[#1A2A3A] text-base w-6 text-center">{qty}</span>
                    <button onClick={() => changeQty(product.id, 1)} className="w-11 h-11 rounded-xl bg-[#4DD0E1] text-white font-bold text-lg flex items-center justify-center">+</button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* Lista de productos con categoría activa */
        <div className="flex-1 overflow-y-auto pt-1 pb-4 px-4 space-y-2">
          {visibleProducts.map(product => {
            const item = cart[product.id]
            const qty = item?.qty || 0
            return (
              <div key={product.id} className={`bg-white rounded-xl px-3 py-3 flex items-center justify-between border shadow-sm ${product.is_daily_special ? 'border-amber-300 bg-amber-50' : 'border-black/5'}`}>
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[#1A2A3A] leading-snug">{product.name}</p>
                    {product.is_daily_special && <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full leading-none">HOY</span>}
                  </div>
                  <p className="text-xs text-[#008080] font-semibold mt-0.5">{formatPrice(product.price)}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <button onClick={() => changeQty(product.id, -1)} className="w-11 h-11 rounded-xl border border-black/10 bg-[#F8FAFC] text-[#3A4A5A] font-bold text-lg flex items-center justify-center">−</button>
                  <span className="font-bold text-[#1A2A3A] text-base w-6 text-center">{qty}</span>
                  <button onClick={() => changeQty(product.id, 1)} className="w-11 h-11 rounded-xl bg-[#4DD0E1] text-white font-bold text-lg flex items-center justify-center">+</button>
                </div>
              </div>
            )
          })}
          <NuevoProductoInline venueId={activeVenueId} categoryId={activeCategory || categories[0]?.id} onAdded={loadCarta} />
        </div>
      )}

      {/* Barra del carrito */}
      {cartItems.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-black/10 px-4 py-4">
          <div className="flex items-center justify-between">
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
      if (result.order?.id) {
        const { data: openShift } = await supabaseStaff
          .from('shifts').select('id')
          .eq('venue_id', venueId).eq('status', 'open').maybeSingle()
        if (openShift?.id) {
          await supabaseStaff.from('orders').update({ shift_id: openShift.id }).eq('id', result.order.id)
        }
      }
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
        <p className="text-[#8896A5] text-sm mb-1 flex items-center gap-1">#{lastOrder.order?.daily_number} · <PinIcon size={11} /> {lastOrder.location}</p>
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

function NuevoProductoInline({ venueId, categoryId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim() || !parseFloat(price)) return
    setSaving(true)

    let catId = categoryId
    if (!catId) {
      const { data: newCat } = await supabaseStaff
        .from('categories')
        .insert({ venue_id: venueId, name: 'General', sort_order: 0 })
        .select('id')
        .single()
      catId = newCat?.id
    }

    await supabaseStaff
      .from('products')
      .insert({ venue_id: venueId, name: name.trim(), price: parseFloat(price), category_id: catId, is_available: true })

    setName('')
    setPrice('')
    setOpen(false)
    setSaving(false)
    onAdded()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-[#008080]/30 text-[#008080] text-sm font-semibold py-3 rounded-2xl"
      >
        + Agregar producto nuevo
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-3 border border-[#008080]/20 shadow-sm space-y-2">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre del producto"
        className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="Precio"
          className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
          min="0"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !name.trim() || !parseFloat(price)}
          className="bg-[#008080] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          {saving ? '...' : 'Agregar'}
        </button>
        <button
          onClick={() => { setOpen(false); setName(''); setPrice('') }}
          className="border border-black/10 text-[#8896A5] px-3 py-2 rounded-lg text-sm"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function PrepTimerDisplay({ prepStartedAt, prepMins }) {
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!prepStartedAt || !prepMins) return
    function calc() {
      const start = new Date(prepStartedAt).getTime()
      const total = prepMins * 60 * 1000
      const elapsed = Date.now() - start
      const remaining = Math.max(0, total - elapsed)
      const percent = Math.min(100, (elapsed / total) * 100)
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setProgress({ percent, mins, secs, done: remaining === 0 })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [prepStartedAt, prepMins])

  if (!progress) return null

  return (
    <div className={`w-full rounded-2xl p-4 border text-left ${progress.done ? 'bg-emerald-50 border-emerald-200' : 'bg-[#F0F4F8] border-black/10'}`}>
      <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">⏱ En preparación</p>
      <p className={`font-mono text-3xl font-bold mb-2 ${progress.done ? 'text-emerald-600' : 'text-[#008080]'}`}>
        {progress.done ? '¡Listo!' : `${String(progress.mins).padStart(2, '0')}:${String(progress.secs).padStart(2, '0')}`}
      </p>
      <div className="w-full bg-white rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${progress.done ? 'bg-emerald-500' : 'bg-[#008080]'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {!progress.done && (
        <p className="text-[#8896A5] text-[10px] mt-1 text-right">{prepMins} min estimados</p>
      )}
    </div>
  )
}

function QRCanvas({ orderId }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    QRCode.toCanvas(canvasRef.current, `https://capyapp.co/ver-pedido/${orderId}`, {
      width: 200,
      margin: 2,
      color: { dark: '#1A2A3A', light: '#FFFFFF' }
    })
  }, [orderId])

  return (
    <div className="flex justify-center">
      <div className="bg-white p-3 rounded-2xl border border-black/5 shadow-sm">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

function MenuQRCanvas({ slug }) {
  const canvasRef = useRef(null)
  const url = slug ? `https://capyapp.co/r/${slug}/carta` : null

  useEffect(() => {
    if (!canvasRef.current || !url) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 220,
      margin: 2,
      color: { dark: '#1A2A3A', light: '#FFFFFF' }
    })
  }, [url])

  if (!url) return (
    <p className="text-[#8896A5] text-xs text-center py-4">Este local no tiene carta digital configurada</p>
  )

  return (
    <div className="flex justify-center">
      <div className="bg-white p-3 rounded-2xl border border-black/5 inline-block">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
