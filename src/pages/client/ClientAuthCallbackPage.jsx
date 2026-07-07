import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'

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

export default function ClientAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState('loading') // 'loading' | 'retry' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handle() {
      try {
        // Query-string params (PKCE flow: ?code=... or ?error=...)
        const errorParam = searchParams.get('error')
        const errorDesc = searchParams.get('error_description') || ''
        const code = searchParams.get('code')

        // Hash-fragment params (implicit flow fallback: #access_token=... or #error=...)
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const hashError = hashParams.get('error') || ''
        const hashErrorDesc = hashParams.get('error_description') || ''
        const hashAccessToken = hashParams.get('access_token') || ''
        const hashRefreshToken = hashParams.get('refresh_token') || ''

        // ── Error handling ──────────────────────────────────────────────
        const anyErrorDesc = errorDesc || hashErrorDesc
        if ((errorParam || hashError) && anyErrorDesc.toLowerCase().includes('already linked')) {
          setState('retry')
          return
        }

        if (errorParam) {
          localStorage.removeItem('capy-customer-return-to')
          setErrorMsg(errorDesc || errorParam)
          setState('error')
          return
        }

        if (hashError) {
          localStorage.removeItem('capy-customer-return-to')
          setErrorMsg(hashErrorDesc || hashError)
          setState('error')
          return
        }

        // ── Session establishment ────────────────────────────────────────
        let userId = null

        if (code) {
          // PKCE flow
          const { data, error: authError } = await supabaseCustomer.auth.exchangeCodeForSession(code)
          if (authError) {
            localStorage.removeItem('capy-customer-return-to')
            setErrorMsg(authError.message)
            setState('error')
            return
          }
          userId = data?.session?.user?.id
        } else if (hashAccessToken && hashRefreshToken) {
          // Implicit flow fallback (linkIdentity in some Supabase configs returns tokens in hash)
          const { data, error: sessionError } = await supabaseCustomer.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          })
          if (sessionError) {
            localStorage.removeItem('capy-customer-return-to')
            setErrorMsg(sessionError.message)
            setState('error')
            return
          }
          userId = data?.session?.user?.id
        }

        // ── Redirect ─────────────────────────────────────────────────────
        // If the authenticated user has no customers record (first-time Google
        // user, or staff account used as customer), send them to the venue home
        // so they can register name/whatsapp when they place their first order.
        if (userId) {
          const { data: existing } = await supabaseCustomer
            .from('customers')
            .select('id')
            .eq('id', userId)
            .maybeSingle()
          if (!existing) {
            const fallback = localStorage.getItem('capy-customer-return-to') || '/identificacion'
            localStorage.removeItem('capy-customer-return-to')
            const venueHome = fallback.replace(/\/(carta|pedidos|pedido\/.*)$/, '') || '/identificacion'
            window.location.replace(venueHome)
            return
          }
        }

        const returnTo = localStorage.getItem('capy-customer-return-to') || '/identificacion'
        localStorage.removeItem('capy-customer-return-to')
        window.location.replace(returnTo)
      } catch (err) {
        localStorage.removeItem('capy-customer-return-to')
        setErrorMsg(err?.message || 'Error inesperado al verificar la cuenta')
        setState('error')
      }
    }
    handle()
  }, [])

  async function retryWithOAuth() {
    const redirectTo = `${window.location.origin}/cliente/callback`
    setState('loading')
    const { error } = await supabaseCustomer.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-5">
      <div className="text-center max-w-xs">
        {state === 'loading' && (
          <>
            <div className="w-10 h-10 mx-auto mb-5 rounded-full border-2 border-[#1A2332]/10 border-t-[#1A2332] animate-spin" />
            <p className="text-[#9DAAB8] text-sm">Verificando cuenta...</p>
          </>
        )}

        {state === 'retry' && (
          <>
            <p className="text-[#1A2332] text-sm font-semibold mb-1">Tu cuenta ya existe</p>
            <p className="text-[#9DAAB8] text-xs mb-5">Esta cuenta de Google ya está registrada. Tocá para iniciar sesión.</p>
            <button
              onClick={retryWithOAuth}
              className="flex items-center gap-2.5 mx-auto bg-white border border-black/10 text-[#1A2332] font-semibold text-sm px-5 py-3 rounded-xl shadow-sm"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <p className="text-red-500 text-sm font-semibold mb-2">Error al iniciar sesión</p>
            <p className="text-[#9DAAB8] text-xs mb-4">{errorMsg}</p>
            <button
              onClick={() => window.location.replace('/identificacion')}
              className="text-[#1A2332] text-sm font-semibold underline"
            >
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  )
}
