import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

const CustomerContext = createContext(null)

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      let { data: sessionData } = await supabaseCustomer.auth.getSession()

      if (!sessionData.session) {
        const { error: signInError } = await supabaseCustomer.auth.signInAnonymously()
        if (signInError) {
          console.error('Error creando sesion anonima:', signInError)
          setLoading(false)
          return
        }
        const refreshed = await supabaseCustomer.auth.getSession()
        sessionData = refreshed.data
      }

      const userId = sessionData.session?.user?.id
      if (!userId) {
        setLoading(false)
        return
      }

      const { data: existing } = await supabaseCustomer
        .from('customers')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (existing) setCustomer(existing)
      setLoading(false)
    }
    init()
  }, [])

  async function registerCustomer(fullName, whatsapp) {
    const { data: sessionData } = await supabaseCustomer.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return { error: new Error('Sin sesion activa') }

    const { data, error } = await supabaseCustomer
      .from('customers')
      .insert({ id: userId, full_name: fullName, whatsapp })
      .select()
      .single()

    if (error) return { error }

    setCustomer(data)
    return { data }
  }

  async function forgetCustomer() {
    await supabaseCustomer.auth.signOut()
    setCustomer(null)
  }

  const value = {
    customer,
    loading,
    isIdentified: !!customer,
    registerCustomer,
    forgetCustomer
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer debe usarse dentro de CustomerProvider')
  return ctx
}
