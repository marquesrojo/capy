import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseStaff, setActiveVenueId, clearActiveVenueId } from '../lib/supabase'

// Autenticacion del STAFF (camarero/admin). Los clientes finales no usan
// este hook - ver useCustomer.jsx para la identidad sin login.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseStaff.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabaseStaff.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      clearActiveVenueId()
      return
    }
    supabaseStaff
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error) {
          setProfile(data)
          if (data?.venue_id) setActiveVenueId(data.venue_id)
        }
      })
  }, [session])

  async function signInWithEmail(email, password) {
    return supabaseStaff.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    await supabaseStaff.auth.signOut()
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    venueId: profile?.venue_id || null,
    isStaff: profile?.role === 'admin' || profile?.role === 'camarero' || profile?.role === 'propietario',
    isAdmin: profile?.role === 'admin' || profile?.role === 'propietario',
    signInWithEmail,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
