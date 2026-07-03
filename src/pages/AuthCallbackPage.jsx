import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseStaff } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      await new Promise(r => setTimeout(r, 500))

      let { data: { session }, error } = await supabaseStaff.auth.getSession()

      if (!session) {
        // Email confirmation via token_hash (Supabase PKCE email OTP flow)
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        if (tokenHash && type) {
          const result = await supabaseStaff.auth.verifyOtp({ token_hash: tokenHash, type })
          session = result.data?.session ?? null
          error = result.error ?? null
        }
      }

      if (!session) {
        // OAuth PKCE flow: code in query param
        const code = searchParams.get('code')
        if (code) {
          const result = await supabaseStaff.auth.exchangeCodeForSession(code)
          session = result.data?.session ?? null
          error = result.error ?? null
        }
      }

      if (!session) {
        // Implicit flow: tokens in URL hash
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
            error = result.error ?? null
          }
        }
      }

      if (error || !session) {
        const hash = window.location.hash
        const postAuth = localStorage.getItem('capy-post-auth')
        localStorage.removeItem('capy-post-auth')
        if (hash.includes('error=access_denied')) {
          setError('El link expiró. Registrate de nuevo.')
        } else {
          setError(error?.message || 'No pudimos verificar tu cuenta. Intentá de nuevo.')
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
            <p className="text-smoke-500 text-xs">Redirigiendo al login...</p>
          </>
        ) : (
          <p className="text-smoke-400 text-sm">Verificando tu cuenta...</p>
        )}
      </div>
    </div>
  )
}
