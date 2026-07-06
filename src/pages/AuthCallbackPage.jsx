import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseStaff } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      let session = null
      let authError = null

      const tokenHash = searchParams.get('token_hash')
      const tokenType = searchParams.get('type')
      const code = searchParams.get('code')
      const hash = window.location.hash

      if (tokenHash && tokenType) {
        // 1. Email OTP: token_hash in URL (email confirmation, password recovery)
        // Must run BEFORE existing-session check — a recovery link must always be
        // processed even if the user has another session open.
        const result = await supabaseStaff.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
        session = result.data?.session ?? null
        authError = result.error ?? null
      } else if (code) {
        // 2. OAuth PKCE: code in query param (Google sign-in)
        // onAuthStateChange may have already consumed the code, so fall back to
        // getSession() if exchange fails — don't surface the "code used" error.
        const result = await supabaseStaff.auth.exchangeCodeForSession(code)
        if (result.error) {
          const { data: { session: existing } } = await supabaseStaff.auth.getSession()
          session = existing ?? null
          if (!session) authError = result.error
        } else {
          session = result.data?.session ?? null
        }
      } else if (hash.includes('access_token=')) {
        // 3. Implicit flow: tokens in URL hash (legacy)
        const hashParams = new URLSearchParams(hash.slice(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken) {
          const result = await supabaseStaff.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          session = result.data?.session ?? null
          authError = result.error ?? null
        }
      } else {
        // 4. No URL tokens — OAuth already handled by onAuthStateChange internally
        const { data: { session: existing } } = await supabaseStaff.auth.getSession()
        session = existing
      }

      if (authError || !session) {
        const hash = window.location.hash
        const postAuth = localStorage.getItem('capy-post-auth')
        localStorage.removeItem('capy-post-auth')
        if (hash.includes('error=access_denied')) {
          setError('El link expiró. Registrate de nuevo.')
        } else {
          setError(authError?.message || 'No pudimos verificar tu cuenta. Intentá de nuevo.')
        }
        setTimeout(() => navigate(postAuth === 'camaut' ? '/camaut/login' : '/admin/login'), 3000)
        return
      }

      // Camaut flow: always go to camaut app
      const postAuth = localStorage.getItem('capy-post-auth')
      if (postAuth === 'camaut') {
        localStorage.removeItem('capy-post-auth')
        navigate('/camaut/app')
        return
      }

      // Admin/staff flow
      const { data: profile } = await supabaseStaff
        .from('profiles')
        .select('role, venue_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'camarero') {
        navigate('/admin/tomar')
      } else if (profile?.role === 'superadmin' || profile?.venue_id) {
        navigate('/admin')
      } else {
        navigate('/admin/onboarding')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <p className="text-smoke-500 text-xs">Redirigiendo al login...</p>
          </>
        ) : (
          <p className="text-smoke-400 text-sm">Verificando tu cuenta...</p>
        )}
      </div>
    </div>
  )
}
