import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomer } from '../hooks/useCustomer'

// Para pantallas del cliente: requiere que ya haya dado nombre+whatsapp
// en este dispositivo (sin login real, ver useCustomer).
export function RequireCustomer({ children }) {
  const { isIdentified, loading } = useCustomer()
  if (loading) return <FullScreenLoader />
  if (!isIdentified) return <Navigate to="/identificacion" replace />
  return children
}

// Para pantallas de staff: requiere sesion real de Supabase Auth con rol
// admin o camarero.
export function RequireStaff({ children }) {
  const { user, profile, loading, isStaff } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && !isStaff) return <Navigate to="/identificacion" replace />
  return children
}

// Para pantallas exclusivas de admin: requiere rol 'admin' especificamente.
export function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/admin" replace />
  return children
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando...</p>
    </div>
  )
}
