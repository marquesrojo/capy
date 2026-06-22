import { useParams, Link } from 'react-router-dom'
import { useOrderPolling } from '../../hooks/useOrderPolling'
import { formatPrice, STATUS_LABELS, STATUS_FLOW, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../lib/utils'
import OrderFeedback from '../../components/OrderFeedback'
import BillRequest from '../../components/BillRequest'
import SplitCalculator from '../../components/SplitCalculator'

export default function OrderStatusPage() {
  const { orderId } = useParams()
  const { order, items, loading, refreshing, setOrder, refetch } = useOrderPolling(orderId)

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
      <div className="flex items-center justify-between mt-2">
        <h1 className="font-display text-3xl text-pucara-blue-500 tracking-wide">TU PEDIDO</h1>
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

      <div className="mt-6 space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex justify-between"
          >
            <span className="text-smoke-300 text-sm">
              {item.quantity}× {item.product_name}
            </span>
            <span className="font-mono text-pucara-blue-400 text-sm">{formatPrice(item.line_total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between text-smoke-300 px-1">
        <span className="font-medium">Total</span>
        <span className="font-mono text-pucara-blue-400">{formatPrice(order.total)}</span>
      </div>

      <SplitCalculator total={order.total} assignedStaff={order.assigned_staff} />

      {!isCancelado && (
        <BillRequest order={order} onUpdated={updated => setOrder(prev => ({ ...prev, ...updated }))} />
      )}

      {order.status === 'entregado' && <OrderFeedback orderId={order.id} />}
    </div>
  )
}
