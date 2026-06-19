import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'

export default function OrderConfirmedPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { customer } = useCustomer()
  const [order, setOrder] = useState(null)
  const [venueWhatsapp, setVenueWhatsapp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [orderRes, venueRes] = await Promise.all([
        supabaseCustomer
          .from('orders')
          .select('id, status, location_label')
          .eq('id', orderId)
          .single(),
        supabaseCustomer
          .from('venues')
          .select('whatsapp_number')
          .eq('id', ACTIVE_VENUE_ID)
          .single()
      ])
      setOrder(orderRes.data)
      setVenueWhatsapp(venueRes.data?.whatsapp_number)
      setLoading(false)
    }
    load()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const needsValidation = order?.status === 'pendiente_aprobacion'

  if (needsValidation && venueWhatsapp) {
    const shortId = orderId.slice(0, 4).toUpperCase()
    const message = `Hola! Soy ${customer?.full_name || 'un cliente'}, valido mi pedido #${shortId} para ${order.location_label}`
    const waLink = `https://wa.me/${venueWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📲</div>
          <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-2">
            FALTA VALIDAR
          </h1>
          <p className="text-smoke-300 text-sm mb-8">
            Para que tu pedido entre en preparación, confirmalo por WhatsApp. Es rápido.
          </p>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl mb-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2"/>
            </svg>
            Confirmar por WhatsApp
          </a>

          <button
            onClick={() => navigate(`/pedido/${orderId}`)}
            className="w-full border border-carbon-700 text-smoke-300 font-medium py-3.5 rounded-xl"
          >
            Ver detalle del pedido
          </button>
        </div>
      </div>
    )
  }

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
