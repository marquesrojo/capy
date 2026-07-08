import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const ICON_PROPS = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

const MI_LOCAL_ITEMS = [
  {
    to: '/admin/historial', label: 'Historial', desc: 'Todos los pedidos del local',
    icon: <svg {...ICON_PROPS}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
  },
  {
    to: '/admin/carta', label: 'Carta', desc: 'Productos y categorías',
    icon: <svg {...ICON_PROPS}><path d="M3 3v18M3 3h12a3 3 0 0 1 0 6H3M21 3v18" /></svg>
  },
  {
    to: '/admin/ubicaciones', label: 'Ubicaciones', desc: 'Mesas, zonas y retiro',
    icon: <svg {...ICON_PROPS}><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
  },
  {
    to: '/admin/configuracion/medios-pago', label: 'Medios de pago', desc: 'Métodos para clientes',
    icon: <svg {...ICON_PROPS}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
  },
  {
    to: '/admin/configuracion/local', label: 'Datos del local', desc: 'WhatsApp, ajustes y rangos',
    icon: <svg {...ICON_PROPS}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2" fill="none"/></svg>
  },
  {
    to: '/admin/camareros', label: 'Usuarios', desc: 'Admins y camareros vinculados',
    icon: <svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    to: '/admin/notas-rapidas', label: 'Notas rápidas', desc: 'Chips de aclaraciones',
    icon: <svg {...ICON_PROPS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  {
    to: '/admin/qr', label: 'Códigos QR', desc: 'QR para clientes y camareros',
    icon: <svg {...ICON_PROPS}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 21h3M21 14v3M21 21h.01"/></svg>
  },
  {
    to: '/admin/encuestas', label: 'Encuestas', desc: 'Calificaciones de clientes',
    icon: <svg {...ICON_PROPS}><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8L2.2 8.9l6.9-.6L12 2Z"/></svg>
  },
  {
    to: '/admin/kpis', label: 'KPIs', desc: 'Facturación y rendimiento', adminOnly: true,
    icon: <svg {...ICON_PROPS}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
  },
]

export default function ConfigPage() {
  const { profile } = useAuth()
  const items = MI_LOCAL_ITEMS.filter(item => !item.adminOnly || profile?.role === 'admin')

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">MI LOCAL</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex flex-col gap-2 active:opacity-70 transition-opacity"
            >
              <div className="w-10 h-10 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-smoke-200 font-bold text-sm leading-tight">{item.label}</p>
                <p className="text-smoke-500 text-[11px] mt-0.5 leading-tight">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
