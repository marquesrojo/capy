import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseStaff, setActiveVenueId, clearActiveVenueId } from '../lib/supabase'

// Autenticacion del STAFF (camarero/admin). Los clientes finales no usan
// este hook - ver useCustomer.jsx para la identidad sin login.
const AuthContext = createContext(null)

const SUPERADMIN_VENUE_KEY = 'capy-superadmin-venue'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [venueOverride, setVenueOverride] = useState(
    () => localStorage.getItem(SUPERADMIN_VENUE_KEY) || null
  )

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
          // Don't auto-create propietario for camaut registrations
          if (localStorage.getItem('capy-post-auth') === 'camaut') {
            setProfileLoading(false)
            return
          }
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
    localStorage.removeItem(SUPERADMIN_VENUE_KEY)
    await supabaseStaff.auth.signOut()
  }

  function enterVenue(id) {
    setVenueOverride(id)
    localStorage.setItem(SUPERADMIN_VENUE_KEY, id)
    setActiveVenueId(id)
  }

  function exitVenue() {
    setVenueOverride(null)
    localStorage.removeItem(SUPERADMIN_VENUE_KEY)
    clearActiveVenueId()
  }

  const isSuperAdmin = profile?.role === 'superadmin'
  const isImpersonating = isSuperAdmin && !!venueOverride
  const effectiveVenueId = isImpersonating ? venueOverride : (profile?.venue_id || null)

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    profileLoading,
    venueId: effectiveVenueId,
    isSuperAdmin,
    isImpersonating,
    isStaff: profile?.role === 'admin' || profile?.role === 'camarero' || profile?.role === 'propietario' || profile?.role === 'superadmin',
    isAdmin: profile?.role === 'admin' || profile?.role === 'propietario' || isImpersonating,
    isPropietario: profile?.role === 'propietario' || isImpersonating,
    enterVenue,
    exitVenue,
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
