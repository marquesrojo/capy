import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseCustomer, getOrCreateDeviceToken } from '../lib/supabase'

// Identidad del CLIENTE final, sin login. La primera vez que pide algo,
// se le pregunta nombre + whatsapp, se crea un registro en "customers"
// vinculado al device_token de su navegador, y se recuerda en visitas
// siguientes desde el mismo dispositivo (no requiere volver a escribirlo).
const CustomerContext = createContext(null)

const CUSTOMER_ID_KEY = 'customer_id'

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const storedId = localStorage.getItem(CUSTOMER_ID_KEY)
      if (storedId) {
        const { data, error } = await supabaseCustomer
          .from('customers')
          .select('*')
          .eq('id', storedId)
          .single()
        if (!error && data) {
          setCustomer(data)
        } else {
          // El registro ya no existe o el token no matchea: limpiar y
          // pedir los datos de nuevo.
          localStorage.removeItem(CUSTOMER_ID_KEY)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function registerCustomer(fullName, whatsapp) {
    const deviceToken = getOrCreateDeviceToken()
    const { data, error } = await supabaseCustomer
      .from('customers')
      .insert({ full_name: fullName, whatsapp, device_token: deviceToken })
      .select()
      .single()

    if (error) return { error }

    localStorage.setItem(CUSTOMER_ID_KEY, data.id)
    setCustomer(data)
    return { data }
  }

  function forgetCustomer() {
    localStorage.removeItem(CUSTOMER_ID_KEY)
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
