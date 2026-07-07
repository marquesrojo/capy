import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useOrderPolling } from '../../hooks/useOrderPolling'
import { useTableSession } from '../../hooks/useTableSession'
import { supabaseCustomer } from '../../lib/supabase'
import { formatPrice, STATUS_LABELS, STATUS_FLOW, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../lib/utils'
import OrderFeedback from '../../components/OrderFeedback'
import BillRequest from '../../components/BillRequest'
import SplitCalculator from '../../components/SplitCalculator'
import { useClientBase } from '../../hooks/useVenue'

function PrepCountdown({ prepStartedAt, prepTimeMinutes }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    function calc() {
      const started = new Date(prepStartedAt).getTime()
      const totalMs = prepTimeMinutes * 60 * 1000
      const elapsed = Date.now() - started
      const left = Math.max(0, Math.ceil((totalMs - elapsed) / 1000))
      setRemaining(left)
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [prepStartedAt, prepTimeMinutes])

  if (remaining === null) return null

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = Math.max(0, Math.min(100, ((prepTimeMinutes * 60 - remaining) / (prepTimeMinutes * 60)) * 100))
  const isDone = remaining === 0

  return (
    <div className={`rounded-2xl p-4 border ${isDone ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-carbon-900 border-carbon-700'}`}>
      <p className="text-smoke-400 text-xs mb-2">⏱ Tiempo estimado de preparación</p>
      <div className="flex items-center justify-between mb-3">
        <p className={`font-mono text-3xl font-bold ${isDone ? 'text-emerald-600' : 'text-ember-500'}`}>
          {isDone ? '¡Listo pronto!' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
        </p>
        <p className="text-smoke-500 text-xs">{prepTimeMinutes} min estimados</p>
      </div>
      <div className="w-full bg-carbon-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-ember-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function OrderStatusPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const base = useClientBase()
  const { order, items, loading, refreshing, setOrder, refetch } = useOrderPolling(orderId)
  const { consumedItems, activeItems, total_spent, orders: sessionOrders } = useTableSession(order?.session_id)
  const [cancelling, setCancelling] = useState(false)
  const [calling, setCalling] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const prevStatusRef = useState(null)

  function handleAddMore() {
    const params = new URLSearchParams({
      zone_id: order.zone_id || '',
      location_label: order.location_label || '',
      location_type: order.location_type || 'zona'
    })
    if (order.session_id) params.set('session_id', order.session_id)
    navigate(`${base}/carta?${params.toString()}`)
  }

  // Sonido + vibración cuando el pedido pasa a "Listo"
  useEffect(() => {
    if (!order) return
    const prevStatus = prevStatusRef[0]
    if (prevStatus && prevStatus !== 'listo' && order.status === 'listo') {
      // Vibración
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
      // Sonido con Web Audio API (sin archivo externo)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const playBeep = (freq, start, duration) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = freq
          osc.type = 'sine'
          gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
          osc.start(ctx.currentTime + start)
          osc.stop(ctx.currentTime + start + duration)
        }
        playBeep(880, 0, 0.15)
        playBeep(1100, 0.2, 0.15)
        playBeep(1320, 0.4, 0.3)
      } catch {}
    }
    prevStatusRef[0] = order.status
  }, [order?.status])

  async function handleCancel() {
    if (!confirm('¿Querés anular este pedido?')) return
    setCancelling(true)
    const { error } = await supabaseCustomer
      .from('orders')
      .update({ status: 'cancelado' })
      .eq('id', orderId)
    setCancelling(false)
    if (!error) setOrder(prev => ({ ...prev, status: 'cancelado' }))
  }

  async function handleCallWaiter() {
    setCalling(true)
    const { error } = await supabaseCustomer
      .from('orders')
      .update({ waiter_called_at: new Date().toISOString() })
      .eq('id', orderId)
    setCalling(false)
    if (!error) {
      setOrder(prev => ({ ...prev, waiter_called_at: new Date().toISOString() }))
      if (order.assigned_staff_id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            staff_id: order.assigned_staff_id,
            title: '🔔 Te llaman',
            body: `${order.location_label} te está llamando.`,
          }),
        }).catch(() => {})
      }
    }
  }

  async function handleCancelCall() {
    await supabaseCustomer
      .from('orders')
      .update({ waiter_called_at: null })
      .eq('id', orderId)
    setOrder(prev => ({ ...prev, waiter_called_at: null }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando pedido...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
        <p className="text-smoke-400 text-sm text-center">
          No encontramos este pedido desde este dispositivo. Si lo hiciste desde otro
          celular, pedile a alguien en el local que consulte el número de pedido.
        </p>
      </div>
    )
  }

  const isCancelado = order.status === 'cancelado'
  const currentStepIndex = STATUS_FLOW.indexOf(order.status)

  return (
    <div className="min-h-screen bg-carbon-950 px-5 pt-6 pb-10">
      <Link
        to={order.session_id
          ? `${base}/carta?session_id=${order.session_id}&zone_id=${order.zone_id || ''}&location_label=${encodeURIComponent(order.location_label || '')}&location_type=${order.location_type || 'zona'}`
          : '/'}
        className="text-smoke-500 text-xs underline"
      >
        ← {order.session_id ? 'Carta' : 'Inicio'}
      </Link>
      <div className="flex items-center justify-between mt-2">
        <div>
          <h1 className="font-display text-3xl text-pucara-blue-500 tracking-wide">TU PEDIDO</h1>
          {order.daily_number && (
            <p className="text-smoke-500 text-xs mt-0.5">Número <span className="font-mono text-ember-500 font-semibold">#{order.daily_number}</span></p>
          )}
          {order.is_addition && (
            <span className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-600 px-2 py-0.5 rounded-full">Adición</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="text-smoke-400 text-xs border border-carbon-700 rounded-full px-3 py-1.5"
          >
            QR
          </button>
          <button
            onClick={refetch}
            disabled={refreshing}
            className="flex items-center gap-1 text-smoke-400 text-xs border border-carbon-700 rounded-full px-3 py-1.5 disabled:opacity-50"
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round"/>
              <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {showQR && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-carbon-900 border border-carbon-700 rounded-3xl p-6 text-center max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-smoke-200 text-base mb-1">Compartí tu pedido</p>
            <p className="text-smoke-500 text-xs mb-4">Mostráselo al camarero/a o compartilo</p>
            <ClientQRCode orderId={order.id} />
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full border border-carbon-700 text-smoke-400 py-2.5 rounded-xl text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      <p className="text-smoke-400 text-sm mt-1">📍 {order.location_label}</p>
      {order.assigned_staff?.full_name && (
        <p className="text-smoke-500 text-xs mt-1">🧑‍🍳 Te atiende {order.assigned_staff.full_name}</p>
      )}

      {order.status === 'en_preparacion' && order.prep_started_at && order.prep_time_minutes && (
        <div className="mt-3">
          <PrepCountdown
            prepStartedAt={order.prep_started_at}
            prepTimeMinutes={order.prep_time_minutes}
          />
        </div>
      )}

      <div className="mt-3">
        <span
          className={`text-xs px-2.5 py-1 rounded-full border ${PAYMENT_STATUS_COLORS[order.payment_status]}`}
        >
          {PAYMENT_STATUS_LABELS[order.payment_status]}
        </span>
      </div>

      {isCancelado && (
        <div className="mt-6 bg-red-500/10 border border-red-500/40 rounded-2xl p-5 text-center">
          <p className="text-red-700 font-medium">Este pedido fue cancelado</p>
        </div>
      )}

      {!isCancelado && order.location_type === 'retiro' && order.status === 'listo' && (
        <div className="mt-6 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-5 text-center">
          <p className="text-emerald-700 font-semibold text-lg">¡Ya podés venir a buscarlo!</p>
          <p className="text-smoke-400 text-xs mt-1">📍 {order.location_label}</p>
        </div>
      )}

      {!isCancelado && (
        <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <div className="flex justify-between">
            {STATUS_FLOW.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 top-2.5 h-0.5 w-full -z-10 ${
                      i <= currentStepIndex ? 'bg-pucara-blue-500' : 'bg-carbon-700'
                    }`}
                  />
                )}
                <div
                  className={`w-5 h-5 rounded-full border-2 z-10 ${
                    i <= currentStepIndex
                      ? 'bg-pucara-blue-500 border-pucara-blue-500'
                      : 'bg-carbon-900 border-carbon-700'
                  }`}
                />
                <span
                  className={`text-[10px] mt-2 text-center ${
                    i <= currentStepIndex ? 'text-pucara-blue-400' : 'text-smoke-500'
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista de sesión: comandas consolidadas */}
      {order.session_id && sessionOrders.length > 1 ? (
        <div className="mt-6 space-y-4">
          {consumedItems.length > 0 && (
            <div>
              <p className="text-smoke-500 text-xs uppercase tracking-wide font-semibold mb-2">Ya pedido · consumiendo</p>
              <div className="space-y-1.5 opacity-60">
                {consumedItems.map(item => (
                  <div key={item.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex justify-between">
                    <span className="text-smoke-400 text-sm">{item.quantity}× {item.product_name}</span>
                    <span className="font-mono text-smoke-500 text-sm">{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeItems.length > 0 && (
            <div>
              <p className="text-smoke-500 text-xs uppercase tracking-wide font-semibold mb-2">En preparación</p>
              <div className="space-y-1.5">
                {activeItems.map(item => (
                  <div key={item.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex justify-between">
                    <span className="text-smoke-300 text-sm">{item.quantity}× {item.product_name}</span>
                    <span className="font-mono text-pucara-blue-400 text-sm">{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between text-smoke-300 px-1 pt-1 border-t border-carbon-700">
            <span className="font-medium text-sm">Total de la visita</span>
            <span className="font-mono text-pucara-blue-400">{formatPrice(total_spent)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex justify-between">
              <span className="text-smoke-300 text-sm">{item.quantity}× {item.product_name}</span>
              <span className="font-mono text-pucara-blue-400 text-sm">{formatPrice(item.line_total)}</span>
            </div>
          ))}
          <div className="flex justify-between text-smoke-300 px-1 pt-1">
            <span className="font-medium">Total</span>
            <span className="font-mono text-pucara-blue-400">{formatPrice(order.total)}</span>
          </div>
        </div>
      )}

      <SplitCalculator total={order.total} assignedStaff={order.assigned_staff} />

      {!isCancelado && order.session_id && (
        <button
          onClick={handleAddMore}
          className="w-full mt-4 bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2"
        >
          + Agregar más ítems
        </button>
      )}

      {!isCancelado && (
        <BillRequest order={order} onUpdated={updated => setOrder(prev => ({ ...prev, ...updated }))} />
      )}

      <div className="mt-4">
        {order.waiter_called_at ? (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 flex-shrink-0">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p className="text-amber-700 text-sm font-medium">Camarero/a en camino...</p>
            </div>
            <button
              onClick={handleCancelCall}
              className="text-smoke-500 text-xs underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={handleCallWaiter}
            disabled={calling}
            className="w-full border border-coral-500 text-coral-500 font-medium py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Solicitar atención
          </button>
        )}
      </div>

      {['pendiente_aprobacion', 'recibido'].includes(order.status) && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full mt-2 text-red-700 text-xs underline disabled:opacity-50"
        >
          {cancelling ? 'Anulando...' : 'Anular pedido'}
        </button>
      )}

      {!isCancelado && (
        <OrderFeedback orderId={order.id} staffId={order.assigned_staff_id} />
      )}
    </div>
  )
}

function ClientQRCode({ orderId }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    const url = `https://capyapp.co/ver-pedido/${orderId}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#F5F0EB' }
      }, (err) => { if (!err) setReady(true) })
    })
  }, [orderId])

  return (
    <div className="flex justify-center">
      <div className="bg-[#F5F0EB] rounded-2xl p-3 inline-block">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
        {!ready && (
          <div className="w-[200px] h-[200px] bg-carbon-800 rounded-xl flex items-center justify-center">
            <p className="text-smoke-500 text-xs">Generando QR...</p>
          </div>
        )}
      </div>
    </div>
  )
}
