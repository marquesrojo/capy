import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      await new Promise(r => setTimeout(r, 1000))

      const isAdmin = searchParams.get('type') === 'admin'
      const client = isAdmin ? supabaseStaff : supabaseCamaut

      let { data: { session }, error } = await client.auth.getSession()

      // supabaseCamaut has detectSessionInUrl:false so it won't auto-exchange the OAuth code.
      // Explicitly exchange it here so Google OAuth works for the Camaut flow.
      if (!session && !isAdmin) {
        const code = searchParams.get('code')
        if (code) {
          const result = await supabaseCamaut.auth.exchangeCodeForSession(window.location.href)
          session = result.data?.session ?? null
          error = result.error ?? null
        }
      }

      if (error || !session) {
        const hash = window.location.hash
        if (hash.includes('error=access_denied')) {
          setError('El link expiró. Registrate de nuevo.')
        } else {
          setError('No pudimos verificar tu cuenta. Intentá de nuevo.')
        }
        setTimeout(() => navigate(isAdmin ? '/admin/login' : '/camaut/login'), 3000)
        return
      }

      const { data: profile } = await client
        .from('profiles')
        .select('role, is_autonomous, venue_id')
        .eq('id', session.user.id)
        .single()

      if (isAdmin) {
        if (profile?.role === 'camarero') {
          navigate('/admin/tomar')
        } else if (!profile?.venue_id) {
          navigate('/admin/onboarding')
        } else {
          navigate('/admin')
        }
      } else {
        if (profile?.is_autonomous) {
          navigate('/camaut/app')
        } else if (['admin', 'camarero', 'propietario', 'superadmin', 'cocina'].includes(profile?.role)) {
          navigate('/admin')
        } else {
          navigate('/camaut/app')
        }
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
