import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomer } from '../hooks/useCustomer'
import { setActiveVenueId } from '../lib/supabase'
import AdminHeader from './AdminHeader'

export function RequireCustomer({ children }) {
  const { loading, hasSession } = useCustomer()
  if (loading) return <FullScreenLoader />
  if (!hasSession) return <FullScreenLoader />
  return children
}

export function RequireStaff({ children }) {
  const { user, profile, loading, profileLoading, isStaff, isAdmin, isSuperAdmin, venueId } = useAuth()
  const location = useLocation()

  useEffect(() => { if (venueId) setActiveVenueId(venueId) }, [venueId])

  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!profile) return <Navigate to="/admin/login" replace />
  if (!isStaff) return <Navigate to="/identificacion" replace />
  if (isSuperAdmin && (location.pathname === '/admin' || location.pathname === '/admin/')) {
    return <Navigate to="/admin/superadmin" replace />
  }
  if (isAdmin && !venueId) return <Navigate to="/admin/onboarding" replace />
  if (profile?.role === 'camarero' && (location.pathname === '/admin' || location.pathname === '/admin/')) {
    return <Navigate to="/admin/tomar" replace />
  }
  return (
    <>
      <AdminHeader />
      {children}
    </>
  )
}

export function RequireSuperAdmin({ children }) {
  const { user, profile, loading, profileLoading, isSuperAdmin } = useAuth()

  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!profile) return <Navigate to="/admin/login" replace />
  if (!isSuperAdmin) return <Navigate to="/admin" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { user, profile, loading, profileLoading, isAdmin, venueId } = useAuth()

  useEffect(() => { if (venueId) setActiveVenueId(venueId) }, [venueId])

  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!profile) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/admin" replace />
  if (isAdmin && !venueId) return <Navigate to="/admin/onboarding" replace />
  return (
    <>
      <AdminHeader />
      {children}
    </>
  )
}

export function RequirePropietario({ children }) {
  const { user, profile, loading, profileLoading, isPropietario, venueId } = useAuth()

  useEffect(() => { if (venueId) setActiveVenueId(venueId) }, [venueId])

  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!profile) return <Navigate to="/admin/login" replace />
  if (!isPropietario) return <Navigate to="/admin" replace />
  if (!venueId) return <Navigate to="/admin/onboarding" replace />
  return (
    <>
      <AdminHeader />
      {children}
    </>
  )
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando...</p>
    </div>
  )
}
