import { useEffect, useState } from 'react'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../lib/supabase'
import { formatPrice, accentColor } from '../lib/utils'

const MAX_PROOF_SIZE_MB = 8

export default function BillRequest({ order, onUpdated, venueColor = '#002F6C' }) {
  const [mpEnabled, setMpEnabled] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])

  useEffect(() => {
    async function loadVenue() {
      const [venueRes, methodsRes] = await Promise.all([
        supabaseCustomer.from('venues').select('mp_enabled').eq('id', ACTIVE_VENUE_ID).single(),
        supabaseCustomer.from('payment_methods').select('id, name').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order')
      ])
      if (venueRes.data) setMpEnabled(venueRes.data.mp_enabled || false)
      setPaymentMethods(methodsRes.data || [])
    }
    loadVenue()
  }, [])

  if (order.payment_status === 'aprobado') return null

  const method = (order.payment_method || '').toLowerCase()
  const isTransfer = method.includes('transfer')
  const isCashMethod = method.includes('efectivo')

  if (order.payment_status === 'en_revision') {
    return (
      <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5 text-center">
        <p className="text-smoke-300">El cajero está revisando tu comprobante...</p>
        <p className="text-smoke-500 text-xs mt-1">Te confirmamos apenas lo validen.</p>
      </div>
    )
  }

  if (order.payment_status === 'cuenta_solicitada') {
    if (isTransfer && !order.payment_proof_url) {
      return <UploadProof order={order} onUpdated={onUpdated} />
    }
    const isPickup = order.location_type === 'retiro'
    return (
      <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5 text-center">
        <p className="text-smoke-300">
          {isPickup
            ? `Retirá y pagá en ${order.location_label}`
            : isCashMethod
              ? 'Un camarero/a se está acercando a cobrar en efectivo'
              : 'Un camarero/a se está acercando con el posnet'}
        </p>
      </div>
    )
  }

  return (
    <RequestBillForm
      order={order}
      onUpdated={onUpdated}
      mpEnabled={mpEnabled}
      paymentMethods={paymentMethods}
      venueColor={venueColor}
    />
  )
}

const ICON = {
  mp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2"/><path d="M10 15h4"/></svg>,
  cash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>,
  posnet: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 14h4"/></svg>,
  bill: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>,
}

function getMethodIcon(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('efectivo') || n.includes('cash')) return ICON.cash
  if (n.includes('posnet') || n.includes('tarjeta') || n.includes('débito') || n.includes('crédito') || n.includes('debito') || n.includes('credito')) return ICON.posnet
  return ICON.mp
}

function RequestBillForm({ order, onUpdated, mpEnabled, paymentMethods, venueColor = '#002F6C' }) {
  const accent = accentColor(venueColor)
  const [showOptions, setShowOptions] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [cashAmount, setCashAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payingWithMP, setPayingWithMP] = useState(false)
  const [error, setError] = useState('')

  // Fallback if no methods configured in DB
  const methods = paymentMethods.length > 0
    ? paymentMethods
    : [{ id: 'efectivo', name: 'Efectivo' }, { id: 'posnet', name: 'Posnet / Tarjeta' }]

  async function handleRequestBill(method) {
    setSubmitting(true)
    setError('')
    try {
      const updates = {
        payment_status: 'cuenta_solicitada',
        payment_method: method,
        bill_requested_at: new Date().toISOString()
      }
      if (method === 'Efectivo' && cashAmount) {
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
      if (order.assigned_staff_id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            staff_id: order.assigned_staff_id,
            title: '💳 La cuenta',
            body: `${order.location_label} pide la cuenta (${method}).`,
          }),
        }).catch(() => {})
      }
    } catch (err) {
      setError('No pudimos pedir la cuenta. Intentá de nuevo.')
      setSubmitting(false)
    }
  }

  async function handlePayWithMP() {
    setPayingWithMP(true)
    try {
      const { data: { session } } = await supabaseCustomer.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          orderId: order.id,
          total: order.total,
          orderNumber: order.daily_number
        })
      })
      const data = await res.json()
      if (data.sandbox_init_point) {
        window.location.href = data.sandbox_init_point
      } else if (data.init_point) {
        window.location.href = data.init_point
      } else {
        throw new Error('No se pudo generar el link de pago')
      }
    } catch (err) {
      setError('Error al conectar con Mercado Pago. Intentá de nuevo.')
      setPayingWithMP(false)
    }
  }

  if (!showOptions) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setShowOptions(true)}
          className="w-full font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 border"
          style={{ borderColor: accent, color: accent }}
        >
          {ICON.bill}
          La cuenta, por favor
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-2">
      <p className="text-smoke-300 font-medium text-sm mb-3">¿Cómo vas a pagar?</p>

      {mpEnabled && (
        <button
          onClick={handlePayWithMP}
          disabled={payingWithMP}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-carbon-700 text-smoke-300 text-sm font-medium disabled:opacity-50 bg-carbon-800"
        >
          {ICON.mp}
          {payingWithMP ? 'Conectando con Mercado Pago...' : 'Mercado Pago'}
        </button>
      )}

      {methods.map(method => {
        const isCash = method.name.toLowerCase().includes('efectivo')
        const isSelected = selectedMethod === method.id
        return (
          <div key={method.id}>
            <button
              onClick={() => {
                if (isCash) {
                  setSelectedMethod(isSelected ? null : method.id)
                } else {
                  handleRequestBill(method.name)
                }
              }}
              disabled={submitting && !isCash}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium bg-carbon-800 disabled:opacity-50 ${
                isSelected ? 'border-ember-500 text-smoke-200' : 'border-carbon-700 text-smoke-300'
              }`}
            >
              {getMethodIcon(method.name)}
              {method.name}
            </button>

            {isCash && isSelected && (
              <div className="space-y-2 px-1 mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  placeholder={`Mínimo ${formatPrice(order.total)}`}
                  className="input text-sm"
                />
                {cashAmount && Number(cashAmount) >= order.total && (
                  <p className="text-smoke-500 text-xs">
                    Vuelto: {formatPrice(Number(cashAmount) - order.total)}
                  </p>
                )}
                <button
                  onClick={() => handleRequestBill(method.name)}
                  disabled={submitting}
                  className="w-full bg-ember-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : `Confirmar — cobran en ${method.name.toLowerCase()}`}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {error && <p className="text-red-700 text-xs">{error}</p>}

      <button
        onClick={() => setShowOptions(false)}
        className="w-full text-smoke-500 text-xs underline pt-1"
      >
        Cancelar
      </button>
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
      setError('No pudimos subir el comprobante. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-pucara-blue-500/40 rounded-2xl p-5">
      <p className="text-smoke-300 font-medium text-sm mb-1">Total a pagar</p>
      <p className="font-mono text-pucara-blue-400 text-2xl mb-4">{formatPrice(order.total)}</p>

      <p className="text-smoke-400 text-xs mb-3">
        Transferí el total a este alias y subí la foto del comprobante.
      </p>
      {transferAlias && (
        <div className="bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 flex items-center justify-between mb-3">
          <span className="font-mono text-pucara-blue-400 text-sm">{transferAlias}</span>
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
        className="w-full mt-4 bg-pucara-blue-500 hover:bg-pucara-blue-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
      >
        {submitting ? 'Enviando...' : 'Enviar comprobante'}
      </button>
    </div>
  )
}
