import { useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'
import { formatPrice } from '../lib/utils'

const MAX_PROOF_SIZE_MB = 8

export default function BillRequest({ order, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [splitCount, setSplitCount] = useState(1)
  const [cashAmount, setCashAmount] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const transferAlias = import.meta.env.VITE_TRANSFER_ALIAS || ''
  const perPerson = order.total / Math.max(1, splitCount)

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

  async function handleRequestBill() {
    if (order.payment_method === 'transferencia' && !proofFile) {
      setError('Adjuntá la foto del comprobante de transferencia para continuar.')
      return
    }
    if (order.payment_method === 'efectivo' && cashAmount && Number(cashAmount) < order.total) {
      setError('El monto con el que pagás no puede ser menor al total.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const updates = {
        payment_status: order.payment_method === 'transferencia' ? 'en_revision' : 'cuenta_solicitada',
        bill_requested_at: new Date().toISOString()
      }

      if (order.payment_method === 'efectivo' && cashAmount) {
        updates.cash_amount = Number(cashAmount)
      }

      if (order.payment_method === 'transferencia') {
        const ext = proofFile.name.split('.').pop()
        const path = `${order.customer_id}/${order.id}.${ext}`
        const { error: uploadError } = await supabaseCustomer.storage
          .from('payment-proofs')
          .upload(path, proofFile, { upsert: true })
        if (uploadError) throw uploadError
        updates.payment_proof_url = path
      }

      const { data, error: updateError } = await supabaseCustomer
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select()
        .single()

      if (updateError) throw updateError

      onUpdated(data)
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('No pudimos pedir la cuenta. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // Ya se pidió la cuenta: mostrar estado, sin permitir volver a abrir el formulario
  if (['cuenta_solicitada', 'en_revision', 'aprobado'].includes(order.payment_status)) {
    return null
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-6 border border-ember-500 text-ember-500 font-semibold py-3.5 rounded-xl"
      >
        🧾 La cuenta, por favor
      </button>
    )
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-ember-500/40 rounded-2xl p-5">
      <p className="text-smoke-300 font-medium text-sm mb-1">Total a pagar</p>
      <p className="font-mono text-ember-400 text-2xl mb-4">{formatPrice(order.total)}</p>

      <div className="mb-4">
        <span className="text-smoke-400 text-xs mb-1.5 block">¿Dividir entre cuántas personas?</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSplitCount(n => Math.max(1, n - 1))}
            className="w-8 h-8 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-smoke-300 w-6 text-center">{splitCount}</span>
          <button
            type="button"
            onClick={() => setSplitCount(n => n + 1)}
            className="w-8 h-8 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center"
          >
            +
          </button>
          {splitCount > 1 && (
            <span className="text-smoke-400 text-xs ml-2">
              {formatPrice(perPerson)} c/u
            </span>
          )}
        </div>
      </div>

      {order.payment_method === 'efectivo' && (
        <label className="block mb-4">
          <span className="text-smoke-400 text-xs mb-1.5 block">
            ¿Con cuánto pagás? (para que te lleven el vuelto exacto, opcional)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={cashAmount}
            onChange={e => setCashAmount(e.target.value)}
            placeholder={`Mínimo ${formatPrice(order.total)}`}
            className="input"
          />
          {cashAmount && Number(cashAmount) >= order.total && (
            <p className="text-smoke-500 text-xs mt-1">
              Vuelto: {formatPrice(Number(cashAmount) - order.total)}
            </p>
          )}
        </label>
      )}

      {order.payment_method === 'tarjeta' && (
        <p className="text-smoke-400 text-xs mb-4">Un mozo se va a acercar con el posnet.</p>
      )}

      {order.payment_method === 'transferencia' && (
        <div className="mb-4">
          <p className="text-smoke-400 text-xs mb-3">
            Transferí el total a este alias y subí la foto del comprobante.
          </p>
          {transferAlias && (
            <div className="bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 flex items-center justify-between mb-3">
              <span className="font-mono text-ember-400 text-sm">{transferAlias}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(transferAlias)}
                className="text-smoke-400 text-xs underline"
              >
                Copiar
              </button>
            </div>
          )}

          {!proofPreview ? (
            <label className="flex items-center justify-center gap-2 border border-dashed border-carbon-600 rounded-xl py-6 text-smoke-400 text-sm cursor-pointer">
              <span>📎 Adjuntar foto del comprobante</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleProofChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={proofPreview}
                alt="Comprobante"
                className="w-full rounded-xl max-h-64 object-contain bg-carbon-950"
              />
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

      {error && <p className="text-red-700 text-xs mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 border border-carbon-700 text-smoke-300 text-sm font-medium py-2.5 rounded-xl"
        >
          Cancelar
        </button>
        <button
          onClick={handleRequestBill}
          disabled={submitting}
          className="flex-1 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
        >
          {submitting ? 'Enviando...' : 'Pedir la cuenta'}
        </button>
      </div>
    </div>
  )
}
