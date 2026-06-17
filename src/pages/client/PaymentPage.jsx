import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'

// Formas de pago del MVP. El cliente elige una al confirmar su pedido.
//  - 'transferencia' -> transfiere por alias y sube foto del comprobante;
//                        el cajero la revisa y confirma a mano
//  - 'efectivo'      -> paga en persona; el mozo se acerca a cobrar y
//                        marca el pedido como pagado desde el panel admin
//  - 'tarjeta'       -> igual que efectivo, pero con posnet en mano del mozo
const PAYMENT_OPTIONS = [
  {
    id: 'transferencia',
    label: 'Transferencia',
    description: 'Transferís por alias y subís el comprobante'
  },
  {
    id: 'efectivo',
    label: 'Efectivo',
    description: 'El mozo se acerca a cobrar a tu ubicación'
  },
  {
    id: 'tarjeta',
    label: 'Tarjeta',
    description: 'El mozo se acerca con el posnet'
  }
]

const MAX_PROOF_SIZE_MB = 8

export default function PaymentPage() {
  const { items, subtotal, location, updateQuantity, clearCart, itemCount } = useCart()
  const { customer } = useCustomer()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)

  const transferAlias = import.meta.env.VITE_TRANSFER_ALIAS || ''
  const availableOptions = transferAlias
    ? PAYMENT_OPTIONS
    : PAYMENT_OPTIONS.filter(o => o.id !== 'transferencia')

  const [paymentMethod, setPaymentMethod] = useState(availableOptions[0]?.id || 'efectivo')

  useEffect(() => {
    if (itemCount === 0) navigate('/carta')
    if (!location) navigate('/ubicacion')
  }, [itemCount, location, navigate])

  if (!location || itemCount === 0) return null

  function handleProofChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('El comprobante debe ser una imagen (foto o captura de pantalla).')
      return
    }
    if (file.size > MAX_PROOF_SIZE_MB * 1024 * 1024) {
      setError(`La imagen no puede pesar más de ${MAX_PROOF_SIZE_MB}MB.`)
      return
    }

    setError('')
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  async function handleConfirm() {
    if (paymentMethod === 'transferencia' && !proofFile) {
      setError('Adjuntá la foto del comprobante de transferencia para continuar.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // 1. Crear el pedido en estado pendiente_pago
      const { data: order, error: orderError } = await supabaseCustomer
        .from('orders')
        .insert({
          venue_id: ACTIVE_VENUE_ID,
          customer_id: customer.id,
          status: 'pendiente_pago',
          location_type: location.type,
          zone_id: location.zoneId,
          map_x: location.mapX,
          map_y: location.mapY,
          location_label: location.label,
          notes,
          subtotal,
          total: subtotal,
          payment_method: paymentMethod
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Insertar los items del pedido
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

      // 3a. Transferencia: subir comprobante, queda en revisión para el cajero
      if (paymentMethod === 'transferencia') {
        const ext = proofFile.name.split('.').pop()
        const path = `${customer.id}/${order.id}.${ext}`

        const { error: uploadError } = await supabaseCustomer.storage
          .from('payment-proofs')
          .upload(path, proofFile, { upsert: true })

        if (uploadError) throw uploadError

        const { error: updateError } = await supabaseCustomer
          .from('orders')
          .update({
            payment_status: 'en_revision',
            payment_proof_url: path
          })
          .eq('id', order.id)

        if (updateError) throw updateError

        clearCart()
        navigate(`/pedido-enviado/${order.id}`)
        return
      }

      // 3b. Efectivo o tarjeta: el pedido queda esperando que el mozo/cajero
      // cobre en persona y lo marque como pagado desde el panel admin.
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
          <span className="text-smoke-400 text-xs mb-2 block">Forma de pago</span>
          <div className="space-y-2">
            {availableOptions.map(option => (
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
                <p
                  className={`text-sm font-medium ${
                    paymentMethod === option.id ? 'text-ember-400' : 'text-smoke-300'
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-smoke-500 text-xs mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'transferencia' && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mt-2">
            <p className="text-smoke-400 text-xs mb-3">
              Transferí el total a este alias y subí la foto del comprobante. El cajero lo va a revisar
              antes de confirmar tu pedido.
            </p>
            <div className="bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 flex items-center justify-between mb-4">
              <span className="font-mono text-ember-400 text-sm">{transferAlias}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(transferAlias)}
                className="text-smoke-400 text-xs underline"
              >
                Copiar
              </button>
            </div>

            {!proofPreview ? (
              <label className="flex items-center justify-center gap-2 border border-dashed border-carbon-600 rounded-xl py-6 text-smoke-400 text-sm cursor-pointer">
                <span>📎 Adjuntar foto del comprobante</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleProofChange} className="hidden" />
              </label>
            ) : (
              <div className="relative">
                <img src={proofPreview} alt="Comprobante" className="w-full rounded-xl max-h-64 object-contain bg-carbon-950" />
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null)
                    setProofPreview(null)
                  }}
                  className="absolute top-2 right-2 bg-carbon-950/90 text-smoke-300 text-xs px-2.5 py-1 rounded-full border border-carbon-700"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>
        )}

        {(paymentMethod === 'efectivo' || paymentMethod === 'tarjeta') && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mt-2">
            <p className="text-smoke-400 text-xs">
              {paymentMethod === 'efectivo'
                ? 'Un mozo se va a acercar a tu ubicación a cobrar en efectivo.'
                : 'Un mozo se va a acercar a tu ubicación con el posnet.'}
            </p>
          </div>
        )}
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
          {submitting
            ? 'Procesando...'
            : paymentMethod === 'transferencia'
            ? 'Enviar pedido y comprobante →'
            : 'Confirmar pedido →'}
        </button>
      </div>
    </div>
  )
}
