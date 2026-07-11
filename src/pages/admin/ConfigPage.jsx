import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

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
    to: '/admin/configuracion/local', label: 'Datos del local', desc: 'WhatsApp y ajustes',
    icon: <svg {...ICON_PROPS}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2" fill="none"/></svg>
  },
  {
    to: '/admin/usuarios', label: 'Usuarios', desc: 'Admins y camareros vinculados',
    icon: <svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    to: '/admin/descuentos', label: 'Descuentos', desc: 'Códigos de descuento para clientes',
    icon: <svg {...ICON_PROPS}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
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
    to: '/admin/rangos', label: 'Programa de rangos', desc: 'Niveles y premios por fidelidad',
    icon: <svg {...ICON_PROPS}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  },
  {
    to: '/admin/encuestas', label: 'Encuestas', desc: 'Calificaciones de clientes',
    icon: <svg {...ICON_PROPS}><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8L2.2 8.9l6.9-.6L12 2Z"/></svg>
  },
  {
    to: '/admin/kpis', label: 'KPIs', desc: 'Facturación y rendimiento', adminOnly: true,
    icon: <svg {...ICON_PROPS}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
  },
  {
    to: '/admin/consumo', label: 'Consumo', desc: 'Materia prima por día', adminOnly: true,
    icon: <svg {...ICON_PROPS}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
  },
]

export default function ConfigPage() {
  const { profile, venueId } = useAuth()
  const [hasProducts, setHasProducts] = useState(true)
  const [hasLocations, setHasLocations] = useState(true)
  const [hasCamautStaff, setHasCamautStaff] = useState(true)

  useEffect(() => {
    if (!venueId) return
    async function checkSetup() {
      const [prodRes, zoneRes, staffRes] = await Promise.all([
        supabaseStaff.from('products').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
        supabaseStaff.from('venue_zones').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
        supabaseStaff.from('venue_staff').select('id', { count: 'exact', head: true }).eq('venue_id', venueId)
      ])
      setHasProducts((prodRes.count || 0) > 0)
      setHasLocations((zoneRes.count || 0) > 0)
      setHasCamautStaff((staffRes.count || 0) > 0)
    }
    checkSetup()
  }, [venueId])

  const items = MI_LOCAL_ITEMS.filter(item => !item.adminOnly || profile?.role === 'admin')
  const setupIncomplete = !hasProducts || !hasLocations || !hasCamautStaff

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">MI LOCAL</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      {setupIncomplete && (
        <div className="px-4 pt-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <p className="text-amber-700 font-semibold text-sm">Configuración inicial</p>
            {!hasProducts && (
              <div className="flex items-center justify-between">
                <span className="text-smoke-400 text-xs">Carta de productos</span>
                <Link to="/admin/carta" className="text-amber-600 text-xs font-medium underline">Crear →</Link>
              </div>
            )}
            {!hasLocations && (
              <div className="flex items-center justify-between">
                <span className="text-smoke-400 text-xs">Ubicaciones del local</span>
                <Link to="/admin/ubicaciones" className="text-amber-600 text-xs font-medium underline">Crear →</Link>
              </div>
            )}
            {!hasCamautStaff && (
              <div className="flex items-center justify-between">
                <span className="text-smoke-400 text-xs">App Camarero vinculada</span>
                <Link to="/admin/qr" className="text-amber-600 text-xs font-medium underline">Ver QR →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="px-4 mt-4 space-y-4">
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

        {venueId && (
          <a
            href={`/display/${venueId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-carbon-900 border border-carbon-700 rounded-2xl p-4 active:opacity-70 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-smoke-200 font-bold text-sm leading-tight">Pantalla de retiro</p>
              <p className="text-smoke-500 text-[11px] mt-0.5 leading-tight">Abrí en una TV para mostrar el estado de pedidos</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-smoke-600 flex-shrink-0">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </main>
    </div>
  )
}
