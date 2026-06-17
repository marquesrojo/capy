import { useParams, Link } from 'react-router-dom'
import { useOrderPolling } from '../../hooks/useOrderPolling'
import { formatPrice, STATUS_LABELS, STATUS_FLOW, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../lib/utils'
import OrderFeedback from '../../components/OrderFeedback'
import BillRequest from '../../components/BillRequest'

export default function OrderStatusPage() {
  const { orderId } = useParams()
  const { order, items, loading, setOrder } = useOrderPolling(orderId)

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
      <Link to="/pedidos" className="text-smoke-500 text-xs underline">
        ← Volver a Pedidos
      </Link>
      <h1 className="font-display text-3xl text-ember-500 tracking-wide mt-2">TU PEDIDO</h1>
      <p className="text-smoke-400 text-sm mt-1">📍 {order.location_label}</p>
      {order.assigned_staff?.full_name && (
        <p className="text-smoke-500 text-xs mt-1">🧑‍🍳 Te atiende {order.assigned_staff.full_name}</p>
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

      {!isCancelado && (
        <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <div className="flex justify-between">
            {STATUS_FLOW.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 top-2.5 h-0.5 w-full -z-10 ${
                      i <= currentStepIndex ? 'bg-ember-500' : 'bg-carbon-700'
                    }`}
                  />
                )}
                <div
                  className={`w-5 h-5 rounded-full border-2 z-10 ${
                    i <= currentStepIndex
                      ? 'bg-ember-500 border-ember-500'
                      : 'bg-carbon-900 border-carbon-700'
                  }`}
                />
                <span
                  className={`text-[10px] mt-2 text-center ${
                    i <= currentStepIndex ? 'text-ember-400' : 'text-smoke-500'
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex justify-between"
          >
            <span className="text-smoke-300 text-sm">
              {item.quantity}× {item.product_name}
            </span>
            <span className="font-mono text-ember-400 text-sm">{formatPrice(item.line_total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between text-smoke-300 px-1">
        <span className="font-medium">Total</span>
        <span className="font-mono text-ember-400">{formatPrice(order.total)}</span>
      </div>

      {!isCancelado && (
        <BillRequest order={order} onUpdated={updated => setOrder(prev => ({ ...prev, ...updated }))} />
      )}

      {order.status === 'entregado' && <OrderFeedback orderId={order.id} />}
    </div>
  )
}
