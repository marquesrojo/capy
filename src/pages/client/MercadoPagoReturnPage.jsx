import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'

export default function MercadoPagoReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')

  const orderId = searchParams.get('order')
  const mpStatus = searchParams.get('status')

  useEffect(() => {
    async function handleReturn() {
      if (!orderId) { setStatus('error'); return }

      if (mpStatus === 'success') {
        // Marcar el pedido como aprobado
        await supabaseCustomer
          .from('orders')
          .update({
            payment_status: 'aprobado',
            payment_method: 'Mercado Pago',
            payment_confirmed_at: new Date().toISOString()
          })
          .eq('id', orderId)
        setStatus('success')
        // Redirigir al pedido después de 2 segundos
        setTimeout(() => navigate(`/pedido/${orderId}`), 2000)
      } else if (mpStatus === 'pending') {
        setStatus('pending')
        setTimeout(() => navigate(`/pedido/${orderId}`), 2000)
      } else {
        setStatus('failure')
        setTimeout(() => navigate(`/pedido/${orderId}`), 2000)
      }
    }
    handleReturn()
  }, [orderId, mpStatus])

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <p className="text-smoke-400 text-sm">Procesando tu pago...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-5xl mb-4">✅</p>
            <p className="text-smoke-200 font-semibold text-xl mb-2">¡Pago recibido!</p>
            <p className="text-smoke-400 text-sm">Tu pedido está confirmado. Te redirigimos...</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <p className="text-5xl mb-4">⏳</p>
            <p className="text-smoke-200 font-semibold text-xl mb-2">Pago en proceso</p>
            <p className="text-smoke-400 text-sm">Tu pago está siendo procesado. Te avisamos cuando se confirme.</p>
          </>
        )}
        {status === 'failure' && (
          <>
            <p className="text-5xl mb-4">❌</p>
            <p className="text-smoke-200 font-semibold text-xl mb-2">Pago no completado</p>
            <p className="text-smoke-400 text-sm">Podés intentar de nuevo o elegir otro método de pago.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-5xl mb-4">⚠️</p>
            <p className="text-smoke-200 font-semibold text-xl mb-2">Algo salió mal</p>
            <p className="text-smoke-400 text-sm">No pudimos identificar tu pedido.</p>
          </>
        )}
      </div>
    </div>
  )
}
