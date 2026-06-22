import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'

// Forma de pago elegida aca = solo una PREFERENCIA declarada por el
// cliente. No dispara ninguna accion de cobro todavia. El pedido entra
// directo a 'recibido' y sigue su flujo normal de cocina. El cobro real
// se gestiona despues, cuando el cliente toca "La cuenta por favor"
// desde el detalle de su pedido (ver OrderStatusPage / BillRequest).

export default function PaymentPage() {
  const { items, subtotal, location, updateQuantity, clearCart, itemCount } = useCart()
  const { customer, registerCustomer } = useCustomer()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentOptions, setPaymentOptions] = useState([])
  const [guestName, setGuestName] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(false)

  useEffect(() => {
    if (itemCount === 0) navigate('/carta')
    if (!location) navigate('/ubicacion')
  }, [itemCount, location, navigate])

  useEffect(() => {
    async function loadMethods() {
      const { data } = await supabaseCustomer
        .from('payment_methods')
        .select('id, name')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('is_active', true)
        .order('sort_order')
      if (data?.length) {
        setPaymentOptions(data)
        setPaymentMethod(data[0].id)
      }
    }
    loadMethods()
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
          payment_method: paymentOptions.find(o => o.id === paymentMethod)?.name || paymentMethod
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
      navigate(`/pedido-enviado/${order.id}`)
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
            onClick={() => navigate('/carta')}
            className="text-pucara-blue-500 text-xs font-medium underline"
          >
            ← Agregar más
          </button>
        </div>
        <p className="text-smoke-400 text-sm">📍 {location.label}</p>
      </header>

      <main className="px-5 space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex items-center justify-between gap-3"
          >
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
        </label>

        <div className="pt-4">
          <span className="text-smoke-400 text-xs mb-2 block">
            ¿Cómo pensás pagar? (podés confirmarlo después al pedir la cuenta)
          </span>
          <div className="space-y-2">
            {paymentOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPaymentMethod(option.id)}
                className={`w-full text-left rounded-xl p-3 border transition-colors ${
                  paymentMethod === option.id
                    ? 'border-pucara-blue-500 bg-pucara-blue-500/10'
                    : 'border-carbon-700 bg-carbon-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${
                    paymentMethod === option.id ? 'text-pucara-blue-400' : 'text-smoke-300'
                  }`}>
                    {option.name}
                  </p>
                  {paymentMethod === option.id && (
                    <span className="text-pucara-red-500 text-sm font-bold">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

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
