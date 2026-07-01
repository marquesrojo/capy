import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import { useClientBase } from '../../hooks/useVenue'

// Forma de pago elegida aca = solo una PREFERENCIA declarada por el
// cliente. No dispara ninguna accion de cobro todavia. El pedido entra
// directo a 'recibido' y sigue su flujo normal de cocina. El cobro real
// se gestiona despues, cuando el cliente toca "La cuenta por favor"
// desde el detalle de su pedido (ver OrderStatusPage / BillRequest).

export default function PaymentPage() {
  const { items, subtotal, location, updateQuantity, updateItemNotes, clearCart, itemCount, sessionId, setSessionId } = useCart()
  const { customer, registerCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentOptions, setPaymentOptions] = useState([])
  const [guestName, setGuestName] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [quickNotes, setQuickNotes] = useState([])

  useEffect(() => {
    if (itemCount === 0) navigate(`${base}/carta`)
    if (!location) navigate(`${base}/ubicacion`)
  }, [itemCount, location, navigate])

  useEffect(() => {
    async function loadData() {
      const [methodsRes, notesRes] = await Promise.all([
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
          .order('sort_order')
      ])
      if (methodsRes.data?.length) {
        setPaymentOptions(methodsRes.data)
        setPaymentMethod(methodsRes.data[0].id)
      }
      setQuickNotes(notesRes.data || [])
    }
    loadData()
  }, [])

  if (!location || itemCount === 0) return null

  async function handleConfirm() {
    setError('')

    // Si todavía no completó nombre+whatsapp, mostrar el formulario primero
    if (!customer && !showGuestForm) {
      setShowGuestForm(true)
      return
    }

    let activeCustomer = customer
    if (!activeCustomer) {
      if (!guestName.trim()) {
        setError('Contanos tu nombre para continuar.')
        return
      }
      setSubmitting(true)
      // Asegurar sesión anónima activa antes de registrar
      const { data: sessionData } = await supabaseCustomer.auth.getSession()
      if (!sessionData.session) {
        await supabaseCustomer.auth.signInAnonymously()
      }
      const { data, error: registerError } = await registerCustomer(guestName.trim(), null)
      if (registerError) {
        setError(`Error al guardar tus datos: ${registerError?.message || JSON.stringify(registerError)}`)
        setSubmitting(false)
        return
      }
      activeCustomer = data
    }

    setSubmitting(true)

    try {
      // Si no hay session activa, crear una nueva para este cliente en esta mesa
      let activeSessionId = sessionId
      if (!activeSessionId) {
        const { data: session, error: sessionError } = await supabaseCustomer
          .from('table_sessions')
          .insert({
            venue_id: ACTIVE_VENUE_ID,
            customer_id: activeCustomer.id,
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
          customer_id: activeCustomer.id,
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
    <div className="min-h-screen bg-carbon-950 pb-40">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-3xl text-pucara-blue-500 tracking-wide">TU PEDIDO</h1>
          <button
            onClick={() => navigate(`${base}/carta`)}
            className="text-pucara-blue-500 text-xs font-medium underline"
          >
            ← Agregar más
          </button>
        </div>
        <p className="text-smoke-400 text-sm">📍 {location.label}</p>
      </header>

      <main className="px-5 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-smoke-300 font-medium text-sm">{item.product.name}</p>
                <p className="font-mono text-smoke-500 text-xs mt-0.5">
                  {formatPrice(item.product.price)} c/u
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  className="w-11 h-11 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center text-lg font-bold active:bg-carbon-600"
                >
                  −
                </button>
                <span className="text-smoke-300 w-5 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className="w-11 h-11 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center text-lg font-bold active:bg-carbon-600"
                >
                  +
                </button>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-mono text-pucara-blue-400 font-semibold text-sm">
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

        <label className="block pt-2">
          <span className="text-smoke-400 text-xs mb-1.5 block">Notas para tu pedido (opcional)</span>
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
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      active
                        ? 'bg-pucara-blue-500 text-white border-pucara-blue-500'
                        : 'border-carbon-600 text-smoke-500'
                    }`}
                  >
                    {qn.label}
                  </button>
                )
              })}
            </div>
          )}
        </label>

        {!customer && showGuestForm && (
          <div className="pt-4 bg-carbon-900 border border-carbon-700 rounded-2xl p-4 space-y-3">
            <p className="text-smoke-300 text-sm font-medium">Antes de confirmar, contanos quién pide</p>
            <p className="text-smoke-500 text-xs">Así armamos tu mensaje de validación por WhatsApp.</p>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Tu nombre"
              className="input"
              autoFocus
            />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-carbon-950 border-t border-carbon-700 px-5 py-4 space-y-3">
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <p className="text-smoke-500 text-xs">
          📲 Después de confirmar vas a validar tu pedido por WhatsApp para que entre en preparación.
        </p>
        <div className="flex items-center justify-between text-smoke-300">
          <span className="font-medium">Total</span>
          <span className="font-mono text-pucara-blue-400 text-lg">{formatPrice(subtotal)}</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full bg-pucara-blue-500 hover:bg-pucara-blue-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl"
        >
          {submitting
            ? 'Procesando...'
            : !customer && showGuestForm
              ? 'Confirmar pedido →'
              : 'Siguiente paso →'}
        </button>
      </div>
    </div>
  )
}
