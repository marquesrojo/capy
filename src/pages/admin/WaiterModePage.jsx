import { useAuth } from '../../hooks/useAuth'
import WaiterOrderPage from './WaiterOrderPage'

// Pantalla exclusiva para camareros: solo toma de pedido, sin kanban ni
// configuracion. El camarero llega aqui directamente al loguearse.
export default function WaiterModePage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-carbon-950">
      <header className="px-5 pt-4 pb-3 border-b border-carbon-700 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ember-500 tracking-wide">TOMAR PEDIDO</h1>
          {profile?.full_name && (
            <p className="text-smoke-500 text-xs mt-0.5">{profile.full_name}</p>
          )}
        </div>
        <button
          onClick={signOut}
          className="text-smoke-500 text-xs underline"
        >
          Salir
        </button>
      </header>

      <WaiterOrderPage />
    </div>
  )
}
