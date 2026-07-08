import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice, accentColor } from '../../lib/utils'
import { useClientBase } from '../../hooks/useVenue'

// Payment method chosen here is a PREFERENCE declared by the customer.
// No payment action is triggered. The order goes to 'recibido' and follows
// its normal kitchen flow. Actual billing is handled later when the customer
// requests the bill from their order detail (OrderStatusPage / BillRequest).

export default function PaymentPage() {
  const { items, subtotal, location, updateQuantity, clearCart, itemCount, sessionId, setSessionId } = useCart()
  const { customer, loading: customerLoading } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentOptions, setPaymentOptions] = useState([])
  const [quickNotes, setQuickNotes] = useState([])
  const [venueColor, setVenueColor] = useState('#1A3A6B')

  useEffect(() => {
    if (itemCount === 0) navigate(`${base}/carta`)
    if (!location) navigate(`${base}/ubicacion`)
  }, [itemCount, location, navigate])

  useEffect(() => {
    if (!customerLoading && !customer) navigate(base || '/identificacion')
  }, [customerLoading, customer, navigate])

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
          .select('header_bg_color, mp_enabled')
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
    }
    loadData()
  }, [])

  if (!location || itemCount === 0) return null

  const accent = accentColor(venueColor)

  async function handleConfirm() {
    setError('')
    if (!customer) return

    setSubmitting(true)

    try {
      let activeSessionId = sessionId
      if (!activeSessionId) {
        const { data: session, error: sessionError } = await supabaseCustomer
          .from('table_sessions')
          .insert({
            venue_id: ACTIVE_VENUE_ID,
            customer_id: customer.id,
            zone_id: location.zoneId || null,
            location_label: location.label,
            location_type: location.type
          })
          .select()
          .single()
        if (sessionError) throw sessionError
        activeSessionId = session.id
        setSessionId(session.id)
      }

      const { data: order, error: orderError } = await supabaseCustomer
        .from('orders')
        .insert({
          venue_id: ACTIVE_VENUE_ID,
          customer_id: customer.id,
          status: 'pendiente_aprobacion',
          location_type: location.type,
          zone_id: location.zoneId,
          map_x: location.mapX,
          map_y: location.mapY,
          location_label: location.label,
          notes,
          subtotal,
          total: subtotal,
          payment_method: paymentOptions.find(o => o.id === paymentMethod)?.name || paymentMethod,
          session_id: activeSessionId,
          is_addition: !!sessionId
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
      <header className="px-5 pt-6 pb-4" style={{ backgroundColor: venueColor }}>
        <h1 className="font-display text-3xl text-white tracking-wide">TU PEDIDO</h1>
        <p className="text-white/70 text-sm">📍 {location.label}</p>
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
                  className="w-9 h-9 rounded-full bg-[#F0F4F8] text-[#1A2332] flex items-center justify-center text-lg font-bold active:opacity-70"
                >
                  −
                </button>
                <span className="text-[#1A2332] w-5 text-center font-semibold text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center text-lg font-bold active:opacity-70"
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

        {paymentOptions.length > 0 && (
          <div>
            <span className="text-smoke-500 text-xs mb-2 block">Forma de pago</span>
            <div className="flex flex-wrap gap-2">
              {paymentOptions.map(opt => {
                const active = paymentMethod === opt.id
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
                    {opt.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] px-5 py-4 space-y-3">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex items-center justify-between text-[#1A2332]">
          <span className="font-medium">Total</span>
          <span className="font-mono font-bold text-lg" style={{ color: accent }}>{formatPrice(subtotal)}</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full disabled:opacity-50 text-white font-semibold py-4 rounded-xl"
          style={{ backgroundColor: accent }}
        >
          {submitting ? 'Procesando...' : 'Confirmar pedido →'}
        </button>
      </div>
    </div>
  )
}
