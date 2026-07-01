import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomer } from '../hooks/useCustomer'
import AdminHeader from './AdminHeader'

// Para pantallas del cliente: requiere solo una sesion anonima activa
// (creada automaticamente por CustomerProvider). El nombre+whatsapp se
// piden recien al momento de confirmar el pedido, no antes.
export function RequireCustomer({ children }) {
  const { loading, hasSession } = useCustomer()
  if (loading) return <FullScreenLoader />
  if (!hasSession) return <FullScreenLoader />
  return children
}

// Para pantallas de staff: requiere sesion real de Supabase Auth con rol
// admin o camarero.
export function RequireStaff({ children }) {
  const { user, profile, loading, profileLoading, isStaff, isAdmin, venueId } = useAuth()
  const location = useLocation()
  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && !isStaff) return <Navigate to="/identificacion" replace />
  if (profile && isAdmin && !venueId) return <Navigate to="/admin/onboarding" replace />
  // Camareros van siempre a /admin/tomar, no al dashboard completo
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

// Para pantallas exclusivas de admin: requiere rol 'admin' o 'propietario'.
export function RequireAdmin({ children }) {
  const { user, profile, loading, profileLoading, isAdmin, venueId } = useAuth()
  if (loading || profileLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && !isAdmin) return <Navigate to="/admin" replace />
  if (profile && isAdmin && !venueId) return <Navigate to="/admin/onboarding" replace />
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
