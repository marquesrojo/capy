import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCustomer } from '../../hooks/useCustomer'
import { useClientBase } from '../../hooks/useVenue'
import { accentColor } from '../../lib/utils'

export default function OrderConfirmedPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const base = useClientBase()
  const { customer } = useCustomer()
  const [order, setOrder] = useState(null)
  const [venueWhatsapp, setVenueWhatsapp] = useState(null)
  const [accent, setAccent] = useState('#1A3A6B')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [orderRes, venueRes] = await Promise.all([
        supabaseCustomer
          .from('orders')
          .select('id, status, location_label, location_type, daily_number')
          .eq('id', orderId)
          .single(),
        supabaseCustomer
          .from('venues')
          .select('whatsapp_number, header_bg_color')
          .eq('id', ACTIVE_VENUE_ID)
          .single()
      ])
      setOrder(orderRes.data)
      setVenueWhatsapp(venueRes.data?.whatsapp_number)
      if (venueRes.data?.header_bg_color) setAccent(accentColor(venueRes.data.header_bg_color))
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

  const isRetiro = order?.location_type === 'retiro'
  const isZona = order?.location_type === 'zona'
  const needsWhatsapp = (isRetiro || isZona) && venueWhatsapp

  if (needsWhatsapp) {
    const ticketNum = order.daily_number ? `#${order.daily_number}` : `#${orderId.slice(0, 4).toUpperCase()}`
    const who = customer?.full_name || 'un cliente'
    const message = isRetiro
      ? `Hola! Soy ${who}, confirmo mi pedido de retiro ${ticketNum}`
      : `Hola! Soy ${who}, confirmo mi pedido ${ticketNum} — estoy en ${order.location_label}`
    const waLink = `https://wa.me/${venueWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          {isRetiro ? (
            <>
              <div className="text-5xl mb-4">🛍️</div>
              <h1 className="font-display text-3xl tracking-wide mb-2" style={{ color: accent }}>
                PEDIDO LISTO
              </h1>
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 mb-5">
                <p className="text-smoke-500 text-xs mb-1">Tu número de retiro</p>
                <p className="font-display text-5xl tracking-wider" style={{ color: accent }}>{ticketNum}</p>
                <p className="text-smoke-500 text-xs mt-2">{order.location_label}</p>
              </div>
              <p className="text-smoke-300 text-sm mb-6">
                Confirmá por WhatsApp para que tu pedido entre en preparación. Guardá tu número de retiro.
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">📲</div>
              <h1 className="font-display text-3xl tracking-wide mb-2" style={{ color: accent }}>
                FALTA VALIDAR
              </h1>
              <p className="text-smoke-300 text-sm mb-8">
                Para que tu pedido entre en preparación, confirmalo por WhatsApp. Es rápido.
              </p>
            </>
          )}

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
        <h1 className="font-display text-3xl tracking-wide mb-2" style={{ color: accent }}>
          ¡PEDIDO ENVIADO!
        </h1>
        <p className="text-smoke-300 text-sm mb-8">
          Tu pedido fue enviado. En la sección Pedidos vas a poder ver su estado.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(`${base}/pedidos`)}
            className="w-full text-white font-semibold py-3.5 rounded-xl"
            style={{ backgroundColor: accent }}
          >
            Ver mis pedidos
          </button>
          <button
            onClick={() => navigate(`${base}/carta`)}
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
