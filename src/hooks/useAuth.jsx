import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseStaff, setActiveVenueId, clearActiveVenueId } from '../lib/supabase'

// Autenticacion del STAFF (camarero/admin). Los clientes finales no usan
// este hook - ver useCustomer.jsx para la identidad sin login.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    supabaseStaff.auth.getSession().then(({ data }) => {
      // Si hay usuario, activar profileLoading en el mismo batch que loading=false
      // para que ProtectedRoute nunca vea un render con loading=false pero sin profile
      if (data.session?.user) setProfileLoading(true)
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabaseStaff.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) setProfileLoading(true)
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setProfileLoading(false)
      clearActiveVenueId()
      return
    }
    supabaseStaff
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(async ({ data, error }) => {
        if (!error && data) {
          setProfile(data)
          if (data?.venue_id) setActiveVenueId(data.venue_id)
          setProfileLoading(false)
          return
        }
        // PGRST116 = no rows — trigger may have failed to create the profile
        if (error?.code === 'PGRST116') {
          const { data: created } = await supabaseStaff
            .from('profiles')
            .insert({ id: session.user.id, role: 'propietario' })
            .select()
            .single()
          if (created) setProfile(created)
        }
        setProfileLoading(false)
      })
      .catch(() => {
        setProfileLoading(false)
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
    profileLoading,
    venueId: profile?.venue_id || null,
    isSuperAdmin: profile?.role === 'superadmin',
    isStaff: profile?.role === 'admin' || profile?.role === 'camarero' || profile?.role === 'propietario' || profile?.role === 'superadmin',
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
