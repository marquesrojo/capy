import { useState, useEffect, useRef } from 'react'
import { supabaseCustomer } from '../lib/supabase'
import { useCustomer } from '../hooks/useCustomer'
import EmailLoginModal from './EmailLoginModal'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

const BENEFITS = [
  'Este pedido queda en tu historial, aunque lo haya cargado el camarero',
  'Tus datos guardados: la próxima pedís sin volver a escribirlos',
  'Sumás pedidos para el programa de rangos del local',
  'Entrás desde cualquier celular, aunque cambies de teléfono',
]

// Invitación a crear la cuenta desde una página pública (el link que comparte
// el camarero). Al identificarse, los pedidos que el camarero cargó sin dueño
// pasan a ser del cliente vía claim_session_orders / claim_order.
export default function AccountInvite({ sessionId, orderId, onClaimed }) {
  const { isAnonymous, customer, loading } = useCustomer()
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [error, setError] = useState('')
  // idle → todavía no se intentó · done → quedó asignado · none → ya tenía dueño
  const [claimState, setClaimState] = useState('idle')
  const claimingRef = useRef(false)

  const returnTo = window.location.pathname

  async function claim() {
    if (claimingRef.current) return
    claimingRef.current = true
    const { data, error: err } = sessionId
      ? await supabaseCustomer.rpc('claim_session_orders', { p_session_id: sessionId })
      : await supabaseCustomer.rpc('claim_order', { p_order_id: orderId })
    claimingRef.current = false
    if (err) { setError('No pudimos vincular el pedido. Probá de nuevo.'); return }
    setClaimState(data > 0 ? 'done' : 'none')
    if (data > 0) onClaimed?.(data)
  }

  // Al volver del login la adopción es automática: el cliente ya dijo que sí
  // al crear la cuenta, no tiene sentido pedirle un segundo toque.
  useEffect(() => {
    if (loading || isAnonymous || claimState !== 'idle') return
    if (!sessionId && !orderId) return
    claim()
  }, [loading, isAnonymous, sessionId, orderId])

  async function handleGoogle() {
    setError('')
    // linkIdentity sobre la sesión anónima actual: conserva el mismo uid, así
    // los pedidos ya adoptados no se pierden al crear la cuenta
    const redirectTo = `${window.location.origin}/cliente/callback`
    localStorage.setItem('capy-customer-return-to', returnTo)
    const { data: { session } } = await supabaseCustomer.auth.getSession()
    const { error: err } = session?.user?.is_anonymous
      ? await supabaseCustomer.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
      : await supabaseCustomer.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (err) {
      localStorage.removeItem('capy-customer-return-to')
      setError(err.message)
    }
  }

  if (loading) return null

  // Ya tiene cuenta: el pedido se adopta solo, acá solo se informa
  if (!isAnonymous) {
    if (claimState === 'done') {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-4 text-center">
          <p className="text-emerald-500 text-sm font-semibold">✓ Guardado en tu cuenta</p>
          <p className="text-smoke-500 text-xs mt-0.5">
            Lo vas a encontrar en Mi cuenta{customer?.full_name ? `, ${customer.full_name.split(' ')[0]}` : ''}.
          </p>
        </div>
      )
    }
    return error ? <p className="text-red-500 text-xs mb-4 text-center">{error}</p> : null
  }

  return (
    <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl p-4 mb-4">
      <p className="text-smoke-200 font-bold text-base">Creá tu cuenta</p>
      <p className="text-smoke-500 text-xs mt-1">Es gratis y toma un toque.</p>

      <ul className="mt-3 space-y-2">
        {BENEFITS.map(b => (
          <li key={b} className="flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 flex-shrink-0 mt-0.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-smoke-400 text-xs leading-snug">{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-2.5 w-full bg-white text-[#1A2332] font-semibold text-sm py-3 rounded-xl"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
        <button
          onClick={() => setShowEmailLogin(true)}
          className="w-full border border-carbon-600 text-smoke-400 text-sm font-semibold py-3 rounded-xl"
        >
          Usar mi email
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      {showEmailLogin && (
        <EmailLoginModal
          onClose={() => setShowEmailLogin(false)}
          onSuccess={claim}
          accent="#E8772A"
        />
      )}
    </div>
  )
}
