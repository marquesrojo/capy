import { useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'
import { formatPrice } from '../lib/utils'

const MAX_PROOF_SIZE_MB = 8

// "La cuenta por favor" ahora son dos pasos separados, como en la
// practica real de un local:
//  1. Pedir la cuenta (un toque). Para efectivo se puede indicar con
//     cuanto se va a pagar (vuelto); para tarjeta/transferencia no hace
//     falta nada mas en este paso.
//  2. Solo si es transferencia: una vez pedida la cuenta, aparece un
//     paso aparte para subir el comprobante (despues de transferir).
export default function BillRequest({ order, onUpdated }) {
  if (order.payment_status === 'aprobado') return null

  if (order.payment_status === 'en_revision') {
    return (
      <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5 text-center">
        <p className="text-smoke-300">El cajero está revisando tu comprobante...</p>
        <p className="text-smoke-500 text-xs mt-1">Te confirmamos apenas lo validen.</p>
      </div>
    )
  }

  if (order.payment_status === 'cuenta_solicitada') {
    if (order.payment_method === 'transferencia' && !order.payment_proof_url) {
      return <UploadProof order={order} onUpdated={onUpdated} />
    }
    return (
      <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5 text-center">
        <p className="text-smoke-300">
          {order.payment_method === 'efectivo'
            ? 'Un mozo se está acercando a cobrar en efectivo'
            : 'Un mozo se está acercando con el posnet/QR'}
        </p>
      </div>
    )
  }

  // payment_status === 'pendiente' o 'rechazado': todavia no pidio la cuenta
  return <RequestBillForm order={order} onUpdated={onUpdated} />
}

function RequestBillForm({ order, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleRequestBill() {
    if (order.payment_method === 'efectivo' && cashAmount && Number(cashAmount) < order.total) {
      setError('El monto con el que pagás no puede ser menor al total.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const updates = {
        payment_status: 'cuenta_solicitada',
        bill_requested_at: new Date().toISOString()
      }
      if (order.payment_method === 'efectivo' && cashAmount) {
        updates.cash_amount = Number(cashAmount)
      }

      const { data, error: updateError } = await supabaseCustomer
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select()
        .single()

      if (updateError) throw updateError
      onUpdated(data)
    } catch (err) {
      console.error(err)
      setError('No pudimos pedir la cuenta. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  // Tarjeta y transferencia: un solo toque, sin formulario intermedio
  if (order.payment_method !== 'efectivo' && !open) {
    return (
      <div className="mt-6">
        {error && <p className="text-red-700 text-xs mb-2">{error}</p>}
        <button
          onClick={handleRequestBill}
          disabled={submitting}
          className="w-full border border-ember-500 text-ember-500 disabled:opacity-50 font-semibold py-3.5 rounded-xl"
        >
          {submitting ? 'Enviando...' : '🧾 La cuenta, por favor'}
        </button>
      </div>
    )
  }

  // Efectivo: mismo boton, pero abre el campo opcional de vuelto antes de confirmar
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

function UploadProof({ order, onUpdated }) {
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const transferAlias = import.meta.env.VITE_TRANSFER_ALIAS || ''

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

  async function handleUpload() {
    if (!proofFile) {
      setError('Adjuntá la foto del comprobante para continuar.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const ext = proofFile.name.split('.').pop()
      const path = `${order.customer_id}/${order.id}.${ext}`
      const { error: uploadError } = await supabaseCustomer.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: true })
      if (uploadError) throw uploadError

      const { data, error: updateError } = await supabaseCustomer
        .from('orders')
        .update({ payment_status: 'en_revision', payment_proof_url: path })
        .eq('id', order.id)
        .select()
        .single()

      if (updateError) throw updateError
      onUpdated(data)
    } catch (err) {
      console.error(err)
      setError(`No pudimos subir el comprobante: ${err.message || JSON.stringify(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-ember-500/40 rounded-2xl p-5">
      <p className="text-smoke-300 font-medium text-sm mb-1">Total a pagar</p>
      <p className="font-mono text-ember-400 text-2xl mb-4">{formatPrice(order.total)}</p>

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
          <input type="file" accept="image/*" onChange={handleProofChange} className="hidden" />
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

      {error && <p className="text-red-700 text-xs mt-3">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={submitting}
        className="w-full mt-4 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
      >
        {submitting ? 'Enviando...' : 'Enviar comprobante'}
      </button>
    </div>
  )
}
