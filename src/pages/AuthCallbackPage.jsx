import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseStaff } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      let session = null
      let authError = null

      const dbg = {
        search: window.location.search || '(vacío)',
        hash: window.location.hash ? window.location.hash.slice(0, 60) + '...' : '(vacío)',
        postAuth: localStorage.getItem('capy-post-auth') || '(no está)',
        verifier: !!localStorage.getItem('sb-staff-auth-code-verifier'),
      }

      // 1. Already authenticated (e.g., returning user)
      const { data: { session: existing } } = await supabaseStaff.auth.getSession()
      session = existing
      dbg.existingSession = !!session

      // 2. Email confirmation via token_hash (Supabase PKCE email OTP)
      if (!session) {
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash && type) {
          const result = await supabaseStaff.auth.verifyOtp({ token_hash: tokenHash, type })
          session = result.data?.session ?? null
          authError = result.error ?? null
        }
      }

      // 3. OAuth PKCE: code in query param
      if (!session) {
        const code = searchParams.get('code')
        if (code) {
          const result = await supabaseStaff.auth.exchangeCodeForSession(code)
          session = result.data?.session ?? null
          authError = result.error ?? null
          dbg.exchangeError = authError?.message || (session ? 'ok' : 'null session, null error')
        }
      }

      // 4. Implicit flow: tokens in URL hash
      if (!session) {
        const hash = window.location.hash
        if (hash.includes('access_token=')) {
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
        }
      }

      if (authError || !session) {
        const hash = window.location.hash
        const postAuth = localStorage.getItem('capy-post-auth')
        localStorage.removeItem('capy-post-auth')
        setDebugInfo(dbg)
        if (hash.includes('error=access_denied')) {
          setError('El link expiró. Registrate de nuevo.')
        } else {
          setError(authError?.message || 'No pudimos verificar tu cuenta. Intentá de nuevo.')
        }
        setTimeout(() => navigate(postAuth === 'camaut' ? '/camaut/login' : '/admin/login'), 8000)
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
      } else if (!profile?.venue_id) {
        navigate('/admin/onboarding')
      } else {
        navigate('/admin')
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
            {debugInfo && (
              <pre className="text-left text-[10px] text-smoke-400 bg-carbon-900 rounded p-3 mt-3 max-w-xs break-all whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
            <p className="text-smoke-500 text-xs mt-2">Redirigiendo al login...</p>
          </>
        ) : (
          <p className="text-smoke-400 text-sm">Verificando tu cuenta...</p>
        )}
        <p className="text-smoke-700 text-[9px] mt-4">v4</p>
      </div>
    </div>
  )
}
