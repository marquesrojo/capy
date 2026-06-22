import { Component } from 'react'
import { useAuth } from '../../hooks/useAuth'
import WaiterOrderPage from './WaiterOrderPage'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="px-5 py-10">
          <p className="text-red-700 text-sm font-medium mb-2">Error al cargar</p>
          <p className="text-smoke-400 text-xs break-all">{this.state.error?.message || String(this.state.error)}</p>
        </div>
      )
    }
    return this.props.children
  }
}

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
        <button onClick={signOut} className="text-smoke-500 text-xs underline">
          Salir
        </button>
      </header>

      <ErrorBoundary>
        <WaiterOrderPage />
      </ErrorBoundary>
    </div>
  )
}
