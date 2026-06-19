import { Link } from 'react-router-dom'

const CONFIG_ITEMS = [
  { to: '/admin/carta', icon: '🍽️', label: 'Carta', desc: 'Productos y categorías' },
  { to: '/admin/ubicaciones', icon: '📍', label: 'Ubicaciones', desc: 'Mesas, zonas y retiro' },
  { to: '/admin/configuracion/medios-pago', icon: '💳', label: 'Medios de pago', desc: 'Métodos disponibles para clientes' },
  { to: '/admin/usuarios', icon: '👤', label: 'Usuarios', desc: 'Staff y administradores' },
  { to: '/admin/encuestas', icon: '⭐', label: 'Encuestas', desc: 'Calificaciones de clientes' },
]

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">CONFIGURACIÓN</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-2">
        {CONFIG_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 active:opacity-70"
          >
            <span className="text-2xl w-8 text-center">{item.icon}</span>
            <div>
              <p className="text-smoke-200 font-medium text-sm">{item.label}</p>
              <p className="text-smoke-500 text-xs mt-0.5">{item.desc}</p>
            </div>
            <span className="ml-auto text-smoke-500 text-lg">›</span>
          </Link>
        ))}
      </main>
    </div>
  )
}
