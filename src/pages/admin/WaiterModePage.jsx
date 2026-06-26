import { Component, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import WaiterOrderPage from './WaiterOrderPage'
import WaiterTrackingPage from './WaiterTrackingPage'
import ShiftSummaryPage from './ShiftSummaryPage'

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
  const [tab, setTab] = useState('tomar')

  return (
    <div className="min-h-screen bg-carbon-950">
      <header className="px-5 pt-4 pb-3 border-b border-carbon-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-2xl text-ember-500 tracking-wide">CAPY</h1>
            {profile?.full_name && (
              <p className="text-smoke-500 text-xs mt-0.5">{profile.full_name}</p>
            )}
          </div>
          <button onClick={signOut} className="text-smoke-500 text-xs underline">
            Salir
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('tomar')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border ${
              tab === 'tomar' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
            }`}
          >
            Tomar pedido
          </button>
          <button
            onClick={() => setTab('seguimiento')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border ${
              tab === 'seguimiento' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
            }`}
          >
            Seguimiento
          </button>
          <button
            onClick={() => setTab('turno')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border ${
              tab === 'turno' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
            }`}
          >
            Mi turno
          </button>
        </div>
      </header>

      <ErrorBoundary>
        {tab === 'tomar' ? <WaiterOrderPage /> : tab === 'seguimiento' ? <WaiterTrackingPage /> : <ShiftSummaryPage embedded />}
      </ErrorBoundary>
    </div>
  )
}
