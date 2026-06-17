import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

// Identidad del CLIENTE final, sin login visible. Por debajo usa una
// sesion anonima de Supabase Auth (signInAnonymously) para tener un
// auth.uid() real con el que las politicas de RLS pueden trabajar sin
// depender de headers custom. La primera vez que alguien pide algo, se
// le pregunta nombre + whatsapp y se guarda un registro en "customers"
// vinculado a ese auth.uid(). En visitas siguientes desde el mismo
// dispositivo, la sesion ya esta guardada y no se le vuelve a preguntar.
const CustomerContext = createContext(null)

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      // 1. Asegurar que haya una sesion (anonima o ya existente)
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

      // 2. Ver si ya completo nombre+whatsapp antes (registro en customers)
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
    const { data: sessionData } = await supabaseCustomer.aut
