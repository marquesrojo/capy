import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'
import { fetchVenueWaiters } from '../../lib/staff'
import FloorPlanViewer from '../../components/FloorPlanViewer'
import { ChefHatIcon, CheckCircleIcon, FileTextIcon } from '../../components/Icons'

// Pantalla de toma de pedido para camareros.
// - Si el perfil es "cuenta compartida" (is_shared_account = true), pide
//   elegir un nombre de staff_names antes de empezar.
// - Si tiene login propio, usa profile.full_name para buscar/crear su
//   staff_names y va directo al menú.
// El pedido se crea en estado "recibido" (bypass de pendiente_aprobacion)
// con assigned_staff_id ya seteado.

export default function WaiterOrderPage({ venueId: propVenueId }) {
  const { profile, venueId: authVenueId } = useAuth()
  const activeVenueId = propVenueId || authVenueId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefillZoneId = searchParams.get('zone_id')
  const prefillZoneLabel = searchParams.get('location_label')
  const prefillSessionId = searchParams.get('session_id') || null
  const prefillLocationType = searchParams.get('location_type') || null
  const returnToDashboard = searchParams.get('return_to') === 'dashboard'
  const [step, setStep] = useState('loading') // loading | choose_waiter | menu | confirm | done
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({}) // { productId: { product, qty, notes } }
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lastOrder, setLastOrder] = useState(null)
  const [venueWhatsapp, setVenueWhatsapp] = useState('')
  const [quickNotes, setQuickNotes] = useState([])
  const [activeNoteProduct, setActiveNoteProduct] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [discounts, setDiscounts] = useState([])
  const [selectedDiscount, setSelectedDiscount] = useState(null)

  useEffect(() => {
    if (!profile) return // esperar a que cargue el profile
    async function init() {
      const [staffData, zoneRes, catRes, prodRes, venueRes, notesRes, discountsRes] = await Promise.all([
        fetchVenueWaiters(activeVenueId),
        supabaseStaff.from('venue_zones').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: true }).order('name'),
        supabaseStaff.from('categories').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('products').select('*').eq('venue_id', activeVenueId).eq('is_available', true).order('sort_order'),
        supabaseStaff.from('venues').select('whatsapp_number').eq('id', activeVenueId).single(),
        supabaseStaff.from('quick_notes').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('sort_order'),
        supabaseStaff.from('venue_discounts').select('*').eq('venue_id', activeVenueId).eq('is_active', true).order('created_at')
      ])
      const zonesData = zoneRes.data || []
      setStaffList(staffData || [])
      setZones(zonesData)
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
      setQuickNotes(notesRes.data || [])
      setDiscounts(discountsRes.data || [])
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
      if (venueRes.data?.whatsapp_number) setVenueWhatsapp(venueRes.data.whatsapp_number)

      if (prefillZoneId) {
        const preZone = zonesData.find(z => z.id === prefillZoneId)
          || { id: prefillZoneId, name: prefillZoneLabel || 'Mesa', type: 'zona' }
        setSelectedZone(preZone)
      } else if (prefillLocationType === 'retiro' && prefillZoneLabel) {
        const retiroZone = zonesData.find(z => z.type === 'retiro')
        setSelectedZone(retiroZone || { id: 'otra', name: prefillZoneLabel, type: 'retiro' })
      }

      if (profile?.is_shared_account) {
        setStep('choose_waiter')
      } else {
        // Buscar o crear el staff_name correspondiente a este perfil
        const profileName = (profile?.full_name || '').trim()
        const existing = (staffData || []).find(s =>
          s.full_name.toLowerCase().trim() === profileName.toLowerCase()
        )
        if (existing) {
          setSelectedStaff(existing)
        } else {
          // Double-check DB before creating to avoid duplicates on concurrent logins
          const { data: dbCheck } = await supabaseStaff
            .from('staff_names')
            .select('*')
            .eq('venue_id', activeVenueId)
            .ilike('full_name', profileName)
            .maybeSingle()
          if (dbCheck) {
            setSelectedStaff(dbCheck)
          } else {
            const { data: created } = await supabaseStaff
              .from('staff_names')
              .insert({ venue_id: activeVenueId, full_name: profileName || 'Camarero' })
              .select().single()
            if (created) setSelectedStaff(created)
          }
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
  const discountAmount = selectedDiscount ? Math.round(subtotal * selectedDiscount.percent / 100) : 0
  const total = subtotal - discountAmount

  async function handleConfirm() {
    if (!selectedZone) { setError('Elegí una ubicación.'); return }
    if (cartItems.length === 0) { setError('El carrito está vacío.'); return }

    setSubmitting(true)
    setError('')

    try {
      const [{ data: openShift }] = await Promise.all([
        supabaseStaff.from('shifts').select('id').eq('venue_id', activeVenueId).eq('status', 'open').maybeSingle()
      ])

      // Create a session if none exists (so the floor map can track the table)
      let activeSessionId = prefillSessionId
      if (!activeSessionId && selectedZone.id !== 'otra' && selectedZone.type !== 'retiro') {
        const { data: existingSession } = await supabaseStaff
          .from('table_sessions')
          .select('id')
          .eq('zone_id', selectedZone.id)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existingSession) {
          activeSessionId = existingSession.id
        } else {
          const { data: newSession } = await supabaseStaff
            .from('table_sessions')
            .insert({
              venue_id: activeVenueId,
              zone_id: selectedZone.id,
              location_label: selectedZone.name,
              location_type: selectedZone.type || 'mesa',
            })
            .select('id')
            .single()
          activeSessionId = newSession?.id || null
        }
      }

      const { data: order, error: orderError } = await supabaseStaff
        .from('orders')
        .insert({
          venue_id: activeVenueId,
          customer_id: null,
          status: 'recibido',
          location_type: prefillLocationType || selectedZone.type,
          zone_id: selectedZone.id !== 'otra' ? selectedZone.id : null,
          location_label: selectedZone.name,
          notes: notes.trim() || null,
          subtotal,
          discount_amount: discountAmount || null,
          discount_code: selectedDiscount?.code || null,
          total,
          payment_method: 'Efectivo',
          assigned_staff_id: selectedStaff?.id || null,
          created_by_staff: true,
          shift_id: openShift?.id || null,
          session_id: activeSessionId,
        })
        .select().single()

      if (orderError) throw orderError

      const orderItems = cartItems.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.qty,
        item_notes: i.notes || null,
        line_total: i.product.price * i.qty
      }))

      const { error: itemsError } = await supabaseStaff.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      setLastOrder({ order, items: cartItems, zone: selectedZone, staff: selectedStaff })
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
        <p className="text-[#8896A5] text-sm">Cargando...</p>
      </div>
    )
  }

  if (step === 'choose_waiter') {
    return (
      <div className="px-5 py-6">
        <p className="text-[#3A4A5A] font-medium text-sm mb-4">¿Quién está tomando el pedido?</p>
        <div className="space-y-2">
          {staffList.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedStaff(s); setStep('menu') }}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-left text-[#1A2A3A] font-medium"
            >
              {s.full_name}
            </button>
          ))}
        </div>
        {staffList.length === 0 && (
          <p className="text-[#8896A5] text-sm">No hay camareros activos. Agregalos desde "Gestionar camareros".</p>
        )}
      </div>
    )
  }

  if (step === 'done') {
    // Armar mensaje de WhatsApp con la comanda
    const waMessage = lastOrder ? [
      `🧾 COMANDA - ${lastOrder.zone?.name || 'Sin ubicación'}`,
      `👤 ${lastOrder.staff?.full_name || 'Camarero'}`,
      '',
      ...(lastOrder.items || []).map(i => `• ${i.qty}x ${i.product.name}`),
      '',
      `💰 Total: ${formatPrice(lastOrder.items?.reduce((s, i) => s + i.product.price * i.qty, 0) || 0)}`
    ].join('\n') : ''

    const waLink = venueWhatsapp
      ? `https://wa.me/${venueWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`
      : null

    return (
      <div className={`px-5 py-10 text-center ${returnToDashboard ? 'pb-28' : ''}`}>
        <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
          <CheckCircleIcon size={40} className="text-[#008080]" />
        </div>
        <p className="text-[#1A2A3A] font-semibold text-lg mb-1">¡Pedido enviado a cocina!</p>
        {lastOrder?.order?.daily_number && (
          <div className="my-4 bg-white border border-black/10 rounded-2xl py-4 px-6 inline-block">
            <p className="text-[#8896A5] text-xs mb-1">Número de pedido</p>
            <p className="font-mono text-[#008080] text-5xl font-bold">#{lastOrder.order.daily_number}</p>
            <p className="text-[#8896A5] text-xs mt-1">Decíselo al cliente para que siga su pedido</p>
          </div>
        )}

        {lastOrder?.order?.id && (
          <OrderQR orderId={lastOrder.order.id} />
        )}
        <p className="text-[#8896A5] text-sm mb-6">El pedido entró directo a preparación.</p>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl mb-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2"/>
            </svg>
            Enviar comanda por WhatsApp
          </a>
        )}

        {returnToDashboard ? (
          /* Barra fija: siempre visible sin scrollear, en pantalla completa */
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F0F4F8] border-t border-black/10 px-5 py-4">
            <button
              onClick={() => navigate('/admin')}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#008080] hover:bg-[#006666] text-white font-bold text-lg py-4 rounded-2xl shadow-lg"
            >
              ← Volver al dashboard
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStep('menu')}
            className="w-full bg-[#008080] hover:bg-[#006666] text-white font-semibold py-3.5 rounded-xl mb-2"
          >
            Tomar otro pedido
          </button>
        )}
        {profile?.is_shared_account && (
          <button
            onClick={() => { setSelectedStaff(null); setStep('choose_waiter') }}
            className="w-full border border-black/10 text-[#8896A5] py-3 rounded-xl text-sm"
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
      {/* Modal mapa de mesas */}
      {showMap && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-carbon-700">
            <p className="text-smoke-200 text-sm font-semibold">Seleccionar mesa</p>
            <button onClick={() => setShowMap(false)} className="text-smoke-400 hover:text-smoke-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FloorPlanViewer
              zones={zones}
              venueId={activeVenueId}
              selectedZone={selectedZone}
              onSelect={zone => { setSelectedZone(zone); setShowMap(false) }}
              supabaseClient={supabaseStaff}
            />
          </div>
          {selectedZone && (
            <div className="px-4 py-3 border-t border-carbon-700">
              <p className="text-smoke-400 text-xs mb-2">Mesa seleccionada: <span className="text-smoke-200 font-medium">{selectedZone.name}</span></p>
              <button
                onClick={() => setShowMap(false)}
                className="w-full bg-[#008080] hover:bg-[#006666] text-white font-semibold py-3 rounded-xl text-sm"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>
      )}
      {/* Header con camarero seleccionado y ubicación */}
      <div className="px-4 pt-3 pb-2 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHatIcon size={14} className="text-[#8896A5]" />
          <span className="text-[#3A4A5A] text-xs font-medium">{selectedStaff?.full_name || 'Sin asignar'}</span>
          {profile?.is_shared_account && (
            <button
              onClick={() => { setSelectedStaff(null); setStep('choose_waiter') }}
              className="text-[#8896A5] text-[10px] underline"
            >
              cambiar
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedZone?.id || ''}
            onChange={e => {
              const z = zones.find(z => z.id === e.target.value) || null
              setSelectedZone(z)
            }}
            className="input text-xs py-1 max-w-[120px]"
          >
            <option value="">Elegir mesa...</option>
            {zones.filter(z => z.type !== 'decor').map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowMap(true)}
            className="w-8 h-8 border border-black/10 rounded-lg flex items-center justify-center text-[#8896A5] hover:text-[#008080] hover:border-[#008080] transition-colors flex-shrink-0"
            title="Ver mapa"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Filtro de categorías */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 border-b border-black/10">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border flex-shrink-0 ${
              activeCategory === cat.id
                ? 'bg-[#008080] text-white border-[#008080]'
                : 'border-black/10 text-[#8896A5]'
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
          const itemNotes = cart[product.id]?.notes || ''
          const isNoteOpen = activeNoteProduct === product.id
          return (
            <div key={product.id} className="py-2 border-b border-carbon-800">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-[#1A2A3A] text-sm font-medium truncate">{product.name}</p>
                  <p className="font-mono text-[#008080] text-xs">{formatPrice(product.price)}</p>
                  {itemNotes && <p className="text-[#8896A5] text-[10px] italic mt-0.5">{itemNotes}</p>}
                </div>
                {qty === 0 ? (
                  <button
                    onClick={() => { addToCart(product); setActiveNoteProduct(product.id) }}
                    className="w-8 h-8 bg-[#008080] hover:bg-[#006666] text-white rounded-full text-lg font-bold flex items-center justify-center flex-shrink-0"
                  >
                    +
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { removeFromCart(product); if (qty <= 1) setActiveNoteProduct(null) }}
                      className="w-8 h-8 border border-black/10 text-[#3A4A5A] rounded-full text-lg font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-[#1A2A3A] text-sm font-semibold w-4 text-center">{qty}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="w-8 h-8 bg-[#008080] hover:bg-[#006666] text-white rounded-full text-lg font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setActiveNoteProduct(isNoteOpen ? null : product.id)}
                      className="w-8 h-8 border border-black/10 text-[#8896A5] rounded-full flex items-center justify-center"
                    >
                      <FileTextIcon size={14} />
                    </button>
                  </div>
                )}
              </div>
              {isNoteOpen && qty > 0 && quickNotes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickNotes.map(qn => {
                    const active = itemNotes.includes(qn.label)
                    return (
                      <button
                        key={qn.id}
                        onClick={() => {
                          setCart(prev => {
                            const current = prev[product.id] || { product, qty: 1 }
                            const currentNotes = current.notes || ''
                            const newNotes = active
                              ? currentNotes.replace(qn.label, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                              : currentNotes ? `${currentNotes}, ${qn.label}` : qn.label
                            return { ...prev, [product.id]: { ...current, notes: newNotes } }
                          })
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          active
                            ? 'bg-[#008080] text-white border-[#008080]'
                            : 'border-black/10 text-[#8896A5]'
                        }`}
                      >
                        {qn.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen y confirmar */}
      {cartItems.length > 0 && (
        <div className="px-4 pt-3 pb-4 border-t border-black/10 space-y-3">
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {cartItems.map(i => (
              <div key={i.product.id} className="flex justify-between text-xs text-[#8896A5]">
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
          <div>
            <p className="text-[#8896A5] text-[10px] mb-1">Descuento</p>
            {discounts.length > 0 ? (
              <select
                value={selectedDiscount?.id || ''}
                onChange={e => setSelectedDiscount(discounts.find(d => d.id === e.target.value) || null)}
                className="input text-xs py-1.5 w-full"
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
          {error && <p className="text-red-700 text-xs">{error}</p>}
          <div className="flex items-center justify-between">
            <div>
              {discountAmount > 0 ? (
                <>
                  <p className="text-[#8896A5] text-xs line-through font-mono">{formatPrice(subtotal)}</p>
                  <p className="font-mono text-[#008080] font-semibold">{formatPrice(total)}</p>
                </>
              ) : (
                <span className="font-mono text-[#008080] font-semibold">{formatPrice(subtotal)}</span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={submitting || !selectedZone}
              className="bg-[#008080] hover:bg-[#006666] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              {submitting ? 'Enviando...' : 'Enviar a cocina →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderQR({ orderId }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    const url = `https://capyapp.co/ver-pedido/${orderId}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 180,
        margin: 2,
        color: { dark: '#1A2A3A', light: '#FFFFFF' }
      }, (err) => { if (!err) setReady(true) })
    })
  }, [orderId])

  return (
    <div className="my-4">
      <p className="text-[#8896A5] text-xs mb-2">O escaneá el QR con el celular</p>
      <div className="inline-block bg-white border border-black/10 rounded-2xl p-3">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
        {!ready && <div className="w-[180px] h-[180px] bg-[#F0F4F8] rounded-xl flex items-center justify-center">
          <p className="text-[#8896A5] text-xs">Generando QR...</p>
        </div>}
      </div>
    </div>
  )
}
