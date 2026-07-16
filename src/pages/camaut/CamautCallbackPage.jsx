import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'

export default function CamautCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // Clear any staff session that may have auto-captured the OAuth code
      await supabaseStaff.auth.signOut({ scope: 'local' })

      // Exchange the PKCE code with the Camaut client
      let session = null
      let err = null

      const { data, error: sessionError } = await supabaseCamaut.auth.getSession()
      session = data?.session ?? null
      err = sessionError

      if (!session) {
        const code = new URL(window.location.href).searchParams.get('code')
        if (code) {
          const result = await supabaseCamaut.auth.exchangeCodeForSession(code)
          session = result.data?.session ?? null
          err = result.error ?? null
        }
      }

      if (err || !session) {
        setError('No pudimos verificar tu cuenta. Intentá de nuevo.')
        setTimeout(() => navigate('/camareroa/login'), 3000)
        return
      }

      navigate('/camareroa/app')
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
