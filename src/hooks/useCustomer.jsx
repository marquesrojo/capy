import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

// Identidad del CLIENTE final, sin login visible. Por debajo usa una
// sesion anonima de Supabase Auth (signInAnonymously) para tener un
// auth.uid() real con el que las politicas de RLS pueden trabajar sin
// depender de headers custom. La primera vez que alguien pide algo, se
// le pregunta nombre + whatsapp y se guarda un registro en "customers"
// vinculado a ese auth.uid(). En visitas siguientes desde el mismo
// dispositivo, la sesion ya esta guardada y no se le vuelve a preguntar.
//
// CAMINO FUTURO (no implementado): si se quiere ofrecer una cuenta real
// (email+password) para que el cliente mantenga su historial entre
// dispositivos, Supabase soporta convertir esta MISMA sesion anonima en
// una cuenta permanente sin perder datos ni duplicar el customer_id:
//   1. supabaseCustomer.auth.updateUser({ email })
//   2. verificar el email con el OTP de 6 digitos que Supabase envia
//   3. supabaseCustomer.auth.updateUser({ password })
// El auth.uid() no cambia en este proceso, asi que todos los pedidos ya
// asociados a este customer.id siguen funcionando igual, ahora accesibles
// tambien desde otro dispositivo iniciando sesion con ese email+password.
const CustomerContext = createContext(null)

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [userEmail, setUserEmail] = useState(null)

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
      setHasSession(true)
      setIsAnonymous(sessionData.session.user.is_anonymous ?? true)
      setUserEmail(sessionData.session.user.email || null)

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

  // "Olvidarse" en este dispositivo: cierra la sesion anonima actual.
  // La proxima vez que entre, se crea una sesion anonima nueva y se le
  // vuelve a pedir nombre+whatsapp.
  async function updateCustomer(fullName, whatsapp) {
    const { data: sessionData } = await supabaseCustomer.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return { error: new Error('Sin sesion activa') }

    const { data, error } = await supabaseCustomer
      .from('customers')
      .update({ full_name: fullName, whatsapp })
      .eq('id', userId)
      .select()
      .single()

    if (error) return { error }
    setCustomer(data)
    return { data }
  }

  async function forgetCustomer() {
    await supabaseCustomer.auth.signOut()
    setCustomer(null)
    setUserEmail(null)
    setIsAnonymous(true)
  }

  // Inicia sesion con Google. Si la sesion actual es anonima, vincula Google
  // al mismo UID (preserva pedidos). Si no hay sesion anonima (ej. nuevo
  // dispositivo), usa OAuth normal para recuperar la cuenta previamente vinculada.
  async function signInWithGoogle(returnTo) {
    const redirectTo = `${window.location.origin}/cliente/callback`
    if (returnTo) localStorage.setItem('capy-customer-return-to', returnTo)

    const { data: { session } } = await supabaseCustomer.auth.getSession()

    if (session?.user?.is_anonymous) {
      const { error } = await supabaseCustomer.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
      if (error) {
        console.error('[signInWithGoogle] linkIdentity error:', error)
        localStorage.removeItem('capy-customer-return-to')
        return { error }
      }
    } else {
      const { error } = await supabaseCustomer.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (error) {
        console.error('[signInWithGoogle] signInWithOAuth error:', error)
        localStorage.removeItem('capy-customer-return-to')
        return { error }
      }
    }
  }

  // Login directo con Google (siempre OAuth, sin linkIdentity).
  // Usar desde la home donde queremos recuperar una cuenta existente,
  // no vincular al anonimo actual.
  async function loginWithGoogle(returnTo) {
    const redirectTo = `${window.location.origin}/cliente/callback`
    if (returnTo) localStorage.setItem('capy-customer-return-to', returnTo)
    const { error } = await supabaseCustomer.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) {
      localStorage.removeItem('capy-customer-return-to')
      return { error }
    }
  }

  const value = {
    customer,
    loading,
    hasSession,
    isIdentified: !!customer,
    isAnonymous,
    userEmail,
    registerCustomer,
    updateCustomer,
    forgetCustomer,
    signInWithGoogle,
    loginWithGoogle,
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer debe usarse dentro de CustomerProvider')
  return ctx
}
