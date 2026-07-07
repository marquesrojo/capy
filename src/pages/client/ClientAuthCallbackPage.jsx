import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'

export default function ClientAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handle() {
      const code = searchParams.get('code')
      if (code) {
        const { error: authError } = await supabaseCustomer.auth.exchangeCodeForSession(code)
        if (authError) {
          setError(authError.message)
          setTimeout(() => { window.location.replace('/identificacion') }, 3000)
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
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <p className="text-[#9DAAB8] text-xs">Redirigiendo...</p>
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
