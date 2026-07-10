import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'

const LIVE_STATUSES = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo']

export default function OrderAuditorPage() {
  const { profile, venueId } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasons, setReasons] = useState([])
  const [cancelModal, setCancelModal] = useState(null) // { item, order }
  const [selectedReason, setSelectedReason] = useState(null)
  const [cancelNotes, setCancelNotes] = useState('')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!venueId) return
    const { data } = await supabaseStaff
      .from('orders')
      .select('id, status, location_label, subtotal, total, created_at, customers(full_name), order_items(id, product_name, quantity, unit_price, line_total, is_cancelled, item_notes)')
      .eq('venue_id', venueId)
      .in('status', LIVE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(60)
    setOrders(data || [])
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    loadOrders()
    const sub = supabaseStaff
      .channel('auditor-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` }, loadOrders)
      .subscribe()
    return () => supabaseStaff.removeChannel(sub)
  }, [venueId, loadOrders])

  useEffect(() => {
    if (!venueId) return
    supabaseStaff
      .from('cancellation_reasons')
      .select('id, label')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setReasons(data || [])
        if (data?.length) setSelectedReason(data[0].id)
      })
  }, [venueId])

  function openCancelModal(item, order) {
    setCancelModal({ item, order })
    setPin('')
    setPinError('')
    setCancelNotes('')
    if (reasons.length) setSelectedReason(reasons[0].id)
  }

  function closeModal() {
    setCancelModal(null)
    setPin('')
    setPinError('')
    setCancelNotes('')
  }

  function appendPin(digit) {
    if (pin.length < 4) setPin(p => p + digit)
  }

  function clearPin() {
    setPin('')
    setPinError('')
  }

  async function handleConfirmCancel() {
    if (!selectedReason) { setPinError('Elegí un motivo.'); return }
    if (pin.length !== 4) { setPinError('Ingresá el PIN de 4 dígitos.'); return }

    setConfirming(true)
    setPinError('')

    // Verify manager PIN
    const { data: manager } = await supabaseStaff
      .from('profiles')
      .select('id, full_name')
      .eq('venue_id', venueId)
      .eq('manager_pin', pin)
      .in('role', ['admin', 'propietario'])
      .maybeSingle()

    if (!manager) {
      setPinError('PIN incorrecto o sin permisos.')
      setPin('')
      setConfirming(false)
      return
    }

    const { item, order } = cancelModal

    // Mark item cancelled
    const { error: updateError } = await supabaseStaff
      .from('order_items')
      .update({ is_cancelled: true, cancelled_at: new Date().toISOString() })
      .eq('id', item.id)

    if (updateError) {
      setPinError('Error al anular: ' + updateError.message)
      setConfirming(false)
      return
    }

    // Recalculate order total excluding all cancelled items
    const newTotal = order.order_items
      .filter(i => !i.is_cancelled && i.id !== item.id)
      .reduce((sum, i) => sum + (i.line_total || 0), 0)

    await supabaseStaff
      .from('orders')
      .update({ subtotal: newTotal, total: newTotal })
      .eq('id', order.id)

    // Log cancellation
    await supabaseStaff
      .from('order_item_cancellations')
      .insert({
        order_item_id: item.id,
        cancelled_by: profile?.id || null,
        authorized_by: manager.id,
        reason_id: selectedReason,
        quantity_cancelled: item.quantity,
        notes: cancelNotes.trim() || null
      })

    setConfirming(false)
    closeModal()
    loadOrders()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando pedidos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">AUDITOR</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <p className="text-smoke-500 text-xs mt-1">Pedidos activos · PIN de manager para anular ítems</p>
      </header>

      <main className="px-5 mt-4 space-y-3">
        {orders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-smoke-500 text-sm">Sin pedidos activos ahora.</p>
          </div>
        )}

        {orders.map(order => {
          const activeItems = order.order_items?.filter(i => !i.is_cancelled) || []
          const cancelledItems = order.order_items?.filter(i => i.is_cancelled) || []
          return (
            <div key={order.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-carbon-700 flex items-center justify-between">
                <div>
                  <p className="text-smoke-300 text-sm font-medium">{order.customers?.full_name || 'Pedido'}</p>
                  <p className="text-smoke-500 text-xs mt-0.5">{order.location_label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] || ''}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <span className="font-mono text-smoke-400 text-xs">{formatPrice(order.total)}</span>
                </div>
              </div>

              <div className="divide-y divide-carbon-800">
                {activeItems.map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-smoke-300 text-sm">{item.quantity}× {item.product_name}</p>
                      {item.item_notes && <p className="text-smoke-500 text-xs italic">{item.item_notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-smoke-400 text-xs">{formatPrice(item.line_total)}</span>
                      <button
                        onClick={() => openCancelModal(item, order)}
                        className="text-red-600 text-xs underline"
                      >
                        Anular
                      </button>
                    </div>
                  </div>
                ))}

                {cancelledItems.map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3 opacity-40">
                    <div className="flex-1 min-w-0">
                      <p className="text-smoke-500 text-sm line-through">{item.quantity}× {item.product_name}</p>
                    </div>
                    <span className="text-red-700 text-[10px] px-2 py-0.5 rounded-full border border-red-700/40">Anulado</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </main>

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-carbon-900 border-t border-carbon-700 rounded-t-2xl px-5 py-6 space-y-4">
            <div>
              <p className="text-smoke-300 font-semibold">Anular ítem</p>
              <p className="text-ember-500 text-sm font-medium mt-0.5">
                {cancelModal.item.quantity}× {cancelModal.item.product_name}
              </p>
            </div>

            {/* Reason selector */}
            <div>
              <p className="text-smoke-500 text-xs mb-2 uppercase tracking-wide font-semibold">Motivo</p>
              <div className="flex flex-wrap gap-2">
                {reasons.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedReason === r.id
                        ? 'bg-ember-500 text-white border-ember-500'
                        : 'border-carbon-600 text-smoke-400'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional notes */}
            <input
              type="text"
              value={cancelNotes}
              onChange={e => setCancelNotes(e.target.value)}
              placeholder="Nota adicional (opcional)"
              className="input w-full text-sm"
            />

            {/* PIN keypad */}
            <div>
              <p className="text-smoke-500 text-xs mb-2 uppercase tracking-wide font-semibold">PIN de manager</p>
              <div className="flex justify-center gap-3 mb-3">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-colors ${
                      pin.length > i ? 'border-ember-500 bg-ember-500/10' : 'border-carbon-600'
                    }`}
                  >
                    {pin.length > i && <div className="w-2.5 h-2.5 rounded-full bg-ember-500" />}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button
                    key={d}
                    onClick={() => appendPin(String(d))}
                    className="bg-carbon-800 text-smoke-300 font-semibold text-lg py-3 rounded-xl active:bg-carbon-700"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={clearPin}
                  className="bg-carbon-800 text-smoke-500 text-sm py-3 rounded-xl active:bg-carbon-700"
                >
                  Borrar
                </button>
                <button
                  onClick={() => appendPin('0')}
                  className="bg-carbon-800 text-smoke-300 font-semibold text-lg py-3 rounded-xl active:bg-carbon-700"
                >
                  0
                </button>
                <div />
              </div>
            </div>

            {pinError && <p className="text-red-600 text-xs">{pinError}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={closeModal} className="flex-1 border border-carbon-600 text-smoke-400 py-3 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={confirming || pin.length !== 4}
                className="flex-1 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
              >
                {confirming ? 'Verificando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
