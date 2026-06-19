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
  const { customer } = useCustomer()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentOptions, setPaymentOptions] = useState([])

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
    setSubmitting(true)
    setError('')

    try {
      const { data: order, error: orderError } = await supabaseCustomer
        .from('orders')
        .insert({
          venue_id: ACTIVE_VENUE_ID,
          customer_id: customer.id,
          status: 'recibido',
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
      setError('Hubo un problema al procesar tu pedido. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-40">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">TU PEDIDO</h1>
        <p className="text-smoke-400 text-sm mt-1">📍 {location.label}</p>
      </header>

      <main className="px-5 space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-smoke-300 font-medium">{item.product.name}</p>
              <p className="font-mono text-ember-400 text-xs mt-0.5">
                {formatPrice(item.product.price)} c/u
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateQuantity(index, item.quantity - 1)}
                className="w-7 h-7 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-smoke-300 w-5 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(index, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
              >
                +
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
                    ? 'border-ember-500 bg-ember-500/10'
                    : 'border-carbon-700 bg-carbon-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${
                    paymentMethod === option.id ? 'text-ember-400' : 'text-smoke-300'
                  }`}>
                    {option.name}
                  </p>
                  {paymentMethod === option.id && (
                    <span className="text-ember-500 text-sm font-bold">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-carbon-950 border-t border-carbon-700 px-5 py-4 space-y-3">
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <div className="flex items-center justify-between text-smoke-300">
          <span className="font-medium">Total</span>
          <span className="font-mono text-ember-400 text-lg">{formatPrice(subtotal)}</span>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl"
        >
          {submitting ? 'Procesando...' : 'Confirmar pedido →'}
        </button>
      </div>
    </div>
  )
}
