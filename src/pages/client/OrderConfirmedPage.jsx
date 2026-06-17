import { useNavigate, useParams } from 'react-router-dom'

export default function OrderConfirmedPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-2">
          ¡PEDIDO ENVIADO!
        </h1>
        <p className="text-smoke-300 text-sm mb-8">
          Tu pedido fue enviado. En la sección Pedidos vas a poder ver su estado.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/pedidos')}
            className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3.5 rounded-xl"
          >
            Ver mis pedidos
          </button>
          <button
            onClick={() => navigate('/carta')}
            className="w-full border border-carbon-700 text-smoke-300 font-medium py-3.5 rounded-xl"
          >
            Seguir pidiendo
          </button>
        </div>

        <button
          onClick={() => navigate(`/pedido/${orderId}`)}
          className="text-smoke-500 text-xs underline mt-6"
        >
          Ver detalle de este pedido
        </button>
      </div>
    </div>
  )
}
