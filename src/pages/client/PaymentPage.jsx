import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice, accentColor } from '../../lib/utils'
import { useClientBase } from '../../hooks/useVenue'
import { PinIcon } from '../../components/Icons'

// Payment method chosen here is a PREFERENCE declared by the customer.
// No payment action is triggered. The order goes to 'recibido' and follows
// its normal kitchen flow. Actual billing is handled later when the customer
// requests the bill from their order detail (OrderStatusPage / BillRequest).

export default function PaymentPage() {
  const { items, subtotal, location, updateQuantity, clearCart, itemCount, sessionId, setSessionId } = useCart()
  const { customer, loading: customerLoading, registerCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentOptions, setPaymentOptions] = useState([])
  const [guestName, setGuestName] = useState('')
  const [quickNotes, setQuickNotes] = useState([])
  const [venueColor, setVenueColor] = useState('#1A3A6B')
  const [pickupTime, setPickupTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [cashDiscount, setCashDiscount] = useState({ enabled: false, percent: 0 })

  useEffect(() => {
    if (itemCount === 0) navigate(`${base}/carta`)
    if (!location) navigate(`${base}/ubicacion`)
  }, [itemCount, location, navigate])

  useEffect(() => {
    async function loadData() {
      const [methodsRes, notesRes, venueRes] = await Promise.all([
        supabaseCustomer
          .from('payment_methods')
          .select('id, name')
          .eq('venue_id', ACTIVE_VENUE_ID)
          .eq('is_active', true)
          .order('sort_order'),
        supabaseCustomer
          .from('quick_notes')
          .select('id, label')
          .eq('venue_id', ACTIVE_VENUE_ID)
          .eq('is_active', true)
          .order('sort_order'),
        supabaseCustomer
          .from('venues')
          .select('header_bg_color, mp_enabled, cash_discount_enabled, cash_discount_percent')
          .eq('id', ACTIVE_VENUE_ID)
          .single()
      ])
      const dbMethods = methodsRes.data || []
      const mpEntry = venueRes.data?.mp_enabled ? [{ id: 'mercadopago', name: 'Mercado Pago' }] : []
      const allMethods = [...mpEntry, ...dbMethods]
      if (allMethods.length) {
        setPaymentOptions(allMethods)
        setPaymentMethod(allMethods[0].id)
      }
      setQuickNotes(notesRes.data || [])
      if (venueRes.data?.header_bg_color) setVenueColor(venueRes.data.header_bg_color)
      if (venueRes.data) {
        setCashDiscount({
          enabled: venueRes.data.cash_discount_enabled || false,
          percent: venueRes.data.cash_discount_percent || 0,
        })
      }
    }
    loadData()
  }, [])

  if (!location || itemCount === 0) return null

  const accent = accentColor(venueColor)
  const headerTextColor = (() => {
    const hex = venueColor.replace('#', '')
    if (hex.length !== 6) return 'white'
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
    return (0.299*r + 0.587*g + 0.114*b)/255 > 0.6 ? '#1A2332' : 'white'
  })()
  const discountAmount = appliedDiscount ? Math.round(subtotal * appliedDiscount.percent / 100) : 0
  const selectedMethodName = paymentOptions.find(o => o.id === paymentMethod)?.name || ''
  const isEfectivo = selectedMethodName.toLowerCase().includes('efectivo')
  const cashDiscountAmt = (isEfectivo && cashDiscount.enabled && cashDiscount.percent > 0)
    ? Math.round(subtotal * cashDiscount.percent / 100)
    : 0
  const total = subtotal - discountAmount - cashDiscountAmt

  async function applyDiscount() {
    if (!discountCode.trim()) return
    setDiscountLoading(true)
    setDiscountError('')
    const { data } = await supabaseCustomer
      .from('venue_discounts')
      .select('*')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .eq('code', discountCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
    if (!data) {
      setDiscountError('Código inválido o inactivo.')
      setAppliedDiscount(null)
    } else {
      setAppliedDiscount(data)
      setDiscountError('')
    }
    setDiscountLoading(false)
  }

  function buildLocationLabel() {
    if (location.type === 'retiro_externo') return `Retiro · ${pickupTime}`
    if (location.type === 'delivery') return `Delivery · ${deliveryAddress.trim()}`
    return location.label
  }

  function buildPickupISO(timeStr) {
    if (!timeStr) return null
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  async function handleConfirm() {
    setError('')
    if (location.type === 'retiro_externo' && !pickupTime) {
      setError('Indicá a qué hora pasás a buscar tu pedido.')
      return
    }
    if (location.type === 'delivery' && !deliveryAddress.trim()) {
      setError('Ingresá la dirección de entrega.')
      return
    }

    let activeCustomer = customer
    if (!activeCustomer) {
      setSubmitting(true)
      const { data, error: registerError } = await registerCustomer(guestName.trim() || null, null)
      if (registerError) {
        setError(`Error al guardar tus datos: ${registerError?.message || JSON.stringify(registerError)}`)
        setSubmitting(false)
        return
      }
      activeCustomer = data
    }

    setSubmitting(true)

    try {
      const locationLabel = buildLocationLabel()

      let activeSessionId = sessionId
      if (!activeSessionId) {
        const { data: session, error: sessionError } = await supabaseCustomer
          .from('table_sessions')
          .insert({
            venue_id: ACTIVE_VENUE_ID,
            customer_id: activeCustomer.id,
            zone_id: location.zoneId || null,
            location_label: locationLabel,
            location_type: location.type
          })
          .select()
          .single()
        if (sessionError) throw sessionError
        activeSessionId = session.id
        setSessionId(session.id)
      }

      const { data: openShift } = await supabaseCustomer
        .from('shifts')
        .select('id')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('status', 'open')
        .maybeSingle()

      const { data: order, error: orderError } = await supabaseCustomer
        .from('orders')
        .insert({
          venue_id: ACTIVE_VENUE_ID,
          customer_id: activeCustomer.id,
          status: location.mostrador ? 'en_preparacion' : 'pendiente_aprobacion',
          created_by_staff: location.mostrador || false,
          location_type: location.type,
          zone_id: location.zoneId || null,
          map_x: location.mapX,
          map_y: location.mapY,
          location_label: locationLabel,
          pickup_time: buildPickupISO(pickupTime),
          delivery_address: location.type === 'delivery' ? deliveryAddress.trim() : null,
          notes,
          subtotal,
          discount_amount: discountAmount || null,
          discount_code: appliedDiscount?.code || null,
          cash_discount_amount: cashDiscountAmt || null,
          total,
          payment_method: paymentOptions.find(o => o.id === paymentMethod)?.name || paymentMethod,
          session_id: activeSessionId,
          is_addition: !!sessionId,
          shift_id: openShift?.id || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = items.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity,
        item_notes: i.notes || null,
        line_total: i.product.price * i.quantity
      }))

      const { error: itemsError } = await supabaseCustomer.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // best-effort WA notification — don't block navigation on failure
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ order_id: order.id, event_type: 'created' }),
      }).then(r => r.json().then(d => console.log('[notify-order]', r.status, d))).catch(e => console.error('[notify-order] fetch error:', e))

      clearCart()
      navigate(`${base}/pedido-enviado/${order.id}`)
    } catch (err) {
      console.error(err)
      setError(`Error: ${err?.message || JSON.stringify(err)}`)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-40" style={{ '--input-focus-color': accent }}>
      <header className="px-5 pt-6 pb-4" style={{ backgroundColor: venueColor, color: headerTextColor }}>
        <h1 className="font-display text-3xl tracking-wide">TU PEDIDO</h1>
        <p className="text-sm flex items-center gap-1" style={{ opacity: 0.7 }}><PinIcon size={14} /> {location.label}</p>
      </header>

      <main className="px-5 pt-4 space-y-3">
        {items.map((item, index) => (
          <div key={index} className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[#1A2332] font-medium text-sm">{item.product.name}</p>
                <p className="font-mono text-smoke-500 text-xs mt-0.5">
                  {formatPrice(item.product.price)} c/u
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  aria-label={`Quitar ${item.product.name}`}
                  className="w-10 h-10 rounded-full bg-[#F0F4F8] text-[#1A2332] flex items-center justify-center text-lg font-bold active:opacity-70"
                >
                  −
                </button>
                <span className="text-[#1A2332] w-5 text-center font-semibold text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  aria-label={`Agregar ${item.product.name}`}
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center text-lg font-bold active:opacity-70"
                  style={{ backgroundColor: accent }}
                >
                  +
                </button>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-mono font-semibold text-sm" style={{ color: accent }}>
                  {formatPrice(item.product.price * item.quantity)}
                </span>
                <button
                  onClick={() => updateQuantity(index, 0)}
                  className="text-smoke-500 text-[10px] underline"
                >
                  quitar
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => navigate(`${base}/carta?location_label=${encodeURIComponent(location.label)}&zone_id=${location.zoneId || ''}&location_type=${location.type || 'zona'}`)}
          className="w-full border-2 border-dashed text-sm font-semibold py-3 rounded-2xl"
          style={{ borderColor: `${accent}50`, color: accent }}
        >
          + Agregar más ítems
        </button>

        {!customerLoading && !customer && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[#1A2332] text-sm font-medium">¿Cómo te llamás?</p>
              <span className="text-[10px] text-[#C0CBDA] font-medium">opcional</span>
            </div>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Tu nombre"
              className="input"
            />
          </div>
        )}

        {location.type === 'retiro_externo' && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm space-y-2">
            <p className="text-[#1A2332] text-sm font-medium">¿A qué hora venís a buscar?</p>
            <input
              type="time"
              value={pickupTime}
              onChange={e => setPickupTime(e.target.value)}
              className="input text-lg font-mono text-center"
            />
          </div>
        )}

        {location.type === 'delivery' && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm space-y-2">
            <p className="text-[#1A2332] text-sm font-medium">¿A qué dirección lo llevamos?</p>
            <input
              type="text"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Calle, número, piso, depto..."
              className="input"
            />
          </div>
        )}

        <label className="block">
          <span className="text-smoke-500 text-xs mb-1.5 block">Notas para tu pedido (opcional)</span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ej: sin hielo, alergia a frutos secos..."
            className="input resize-none"
            rows={2}
          />
          {quickNotes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickNotes.map(qn => {
                const active = notes.includes(qn.label)
                return (
                  <button
                    key={qn.id}
                    type="button"
                    onClick={() => {
                      const newNotes = active
                        ? notes.replace(qn.label, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
                        : notes ? `${notes}, ${qn.label}` : qn.label
                      setNotes(newNotes)
                    }}
                    className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                    style={active
                      ? { backgroundColor: accent, color: 'white', borderColor: accent }
                      : { borderColor: '#D1D9E0', color: '#8896A5' }
                    }
                  >
                    {qn.label}
                  </button>
                )
              })}
            </div>
          )}
        </label>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm space-y-2">
          {appliedDiscount ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#1A2332] text-sm font-medium">Descuento aplicado</p>
                <p className="text-emerald-600 text-xs font-semibold mt-0.5">{appliedDiscount.code} — {appliedDiscount.percent}% off{appliedDiscount.label ? ` · ${appliedDiscount.label}` : ''}</p>
              </div>
              <button
                onClick={() => { setAppliedDiscount(null); setDiscountCode('') }}
                className="text-smoke-500 text-xs underline"
              >
                Quitar
              </button>
            </div>
          ) : (
            <>
              <p className="text-[#1A2332] text-sm font-medium">¿Tenés un código de descuento?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError('') }}
                  onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                  placeholder="Ej: DESCUENTO10"
                  className="input flex-1 uppercase font-mono text-sm"
                />
                <button
                  onClick={applyDiscount}
                  disabled={discountLoading || !discountCode.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  {discountLoading ? '...' : 'Aplicar'}
                </button>
              </div>
              {discountError && <p className="text-red-500 text-xs">{discountError}</p>}
            </>
          )}
        </div>

        {paymentOptions.length > 0 && (
          <div>
            <span className="text-smoke-500 text-xs mb-2 block">Forma de pago</span>
            <div className="flex flex-wrap gap-2">
              {paymentOptions.map(opt => {
                const active = paymentMethod === opt.id
                const isCashOpt = opt.name.toLowerCase().includes('efectivo')
                const showCashBadge = isCashOpt && cashDiscount.enabled && cashDiscount.percent > 0
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className="px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                    style={active
                      ? { backgroundColor: accent, color: 'white', borderColor: accent }
                      : { borderColor: '#D1D9E0', color: '#4A5568' }
                    }
                  >
                    {showCashBadge ? `${opt.name} · ${cashDiscount.percent}% off` : opt.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-5 py-4 space-y-3">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-[#1A2332]">
            <span className="text-sm text-smoke-500">Subtotal</span>
            <span className="font-mono text-sm text-smoke-500">{formatPrice(subtotal)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-sm font-medium">Descuento {appliedDiscount.percent}%</span>
            <span className="font-mono text-sm font-semibold">−{formatPrice(discountAmount)}</span>
          </div>
        )}
        {cashDiscountAmt > 0 && (
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-sm font-medium">Descuento efectivo {cashDiscount.percent}%</span>
            <span className="font-mono text-sm font-semibold">−{formatPrice(cashDiscountAmt)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[#1A2332]">
          <span className="font-medium">Total</span>
          <span className="font-mono font-bold text-lg" style={{ color: accent }}>{formatPrice(total)}</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full disabled:opacity-50 text-white font-semibold py-4 rounded-xl"
          style={{ backgroundColor: accent }}
        >
          {submitting
            ? 'Procesando...'
            : cashDiscountAmt > 0
              ? `Confirmar — ${cashDiscount.percent}% off en efectivo →`
              : 'Confirmar pedido →'}
        </button>
      </div>
    </div>
  )
}
