import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseStaff } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // Dar tiempo a Supabase para procesar el token del hash
      await new Promise(r => setTimeout(r, 1000))

      const { data: { session }, error } = await supabaseStaff.auth.getSession()

      if (error || !session) {
        // Verificar si hay error en el hash
        const hash = window.location.hash
        if (hash.includes('error=access_denied')) {
          setError('El link expiró. Registrate de nuevo.')
        } else {
          setError('No pudimos verificar tu cuenta. Intentá de nuevo.')
        }
        setTimeout(() => navigate('/camaut/login'), 3000)
        return
      }

      const { data: profile } = await supabaseStaff
        .from('profiles')
        .select('role, is_autonomous')
        .eq('id', session.user.id)
        .single()

      if (profile?.is_autonomous) {
        navigate('/camaut/app')
      } else if (profile?.role === 'admin' || profile?.role === 'camarero') {
        navigate('/admin')
      } else {
        navigate('/camaut/app')
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
          <>
            <p className="text-smoke-400 text-sm">Verificando tu cuenta...</p>
          </>
        )}
      </div>
    </div>
  )
}
