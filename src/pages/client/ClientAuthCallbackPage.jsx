import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'

export default function ClientAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handle() {
      // Detect OAuth error returned in URL params
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      if (errorParam) {
        localStorage.removeItem('capy-customer-return-to')
        setError(errorDesc || errorParam)
        return
      }

      const code = searchParams.get('code')
      if (code) {
        const { error: authError } = await supabaseCustomer.auth.exchangeCodeForSession(code)
        if (authError) {
          localStorage.removeItem('capy-customer-return-to')
          setError(authError.message)
          return
        }
      }
      const returnTo = localStorage.getItem('capy-customer-return-to') || '/identificacion'
      localStorage.removeItem('capy-customer-return-to')
      window.location.replace(returnTo)
    }
    handle()
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-5">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-500 text-sm font-semibold mb-2">Error al iniciar sesión</p>
            <p className="text-[#9DAAB8] text-xs mb-4">{error}</p>
            <button
              onClick={() => window.location.replace('/identificacion')}
              className="text-[#1A2332] text-sm font-semibold underline"
            >
              Volver
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 mx-auto mb-5 rounded-full border-2 border-[#1A2332]/10 border-t-[#1A2332] animate-spin" />
            <p className="text-[#9DAAB8] text-sm">Verificando cuenta...</p>
          </>
        )}
      </div>
    </div>
  )
}
