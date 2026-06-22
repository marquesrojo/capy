import { Navigate } from 'react-router-dom'
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
  const { user, profile, loading, isStaff } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && !isStaff) return <Navigate to="/identificacion" replace />
  // Camareros van siempre a /admin/tomar, no al dashboard completo
  if (profile?.role === 'camarero' && typeof window !== 'undefined') {
    const path = window.location.pathname
    if (path === '/admin' || path === '/admin/') {
      return <Navigate to="/admin/tomar" replace />
    }
  }
  return (
    <>
      <AdminHeader />
      {children}
    </>
  )
}

// Para pantallas exclusivas de admin: requiere rol 'admin' especificamente.
export function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/admin" replace />
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
