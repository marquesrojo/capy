import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePlan } from '../../hooks/usePlan'
import { supabaseStaff } from '../../lib/supabase'

const ICON_PROPS = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

// El orden es el mismo para todos los planes: lo que un local free no tiene
// queda al final y grisado, así el menú no se le mueve de lugar al pasar a Pro.
const MI_LOCAL_ITEMS = [
  {
    to: '/admin/configuracion/local', label: 'Datos del local', desc: 'WhatsApp y ajustes',
    icon: <svg {...ICON_PROPS}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2" fill="none"/></svg>
  },
  {
    to: '/admin/historial', label: 'Historial', desc: 'Todos los pedidos del local',
    icon: <svg {...ICON_PROPS}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
  },
  {
    to: '/admin/carta', label: 'Carta', desc: 'Productos, categorías y cartas especiales',
    icon: <svg {...ICON_PROPS}><path d="M3 3v18M3 3h12a3 3 0 0 1 0 6H3M21 3v18" /></svg>
  },
  {
    to: '/admin/grupos', label: 'Grupos de clientes', desc: 'Jugadores, socios: quién ve qué carta',
    icon: <svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="M19 8v6"/></svg>
  },
  {
    to: '/admin/ubicaciones', label: 'Ubicaciones', desc: 'Mesas, zonas y retiro',
    icon: <svg {...ICON_PROPS}><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
  },
  {
    to: '/admin/usuarios', label: 'Usuarios', desc: 'Admins y camareros vinculados',
    icon: <svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    to: '/admin/descuentos', label: 'Medios de pago y descuentos', desc: 'Cómo cobrás y qué descuentos hacés',
    icon: <svg {...ICON_PROPS}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>
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
    to: '/admin/reservas', label: 'Reservas', desc: 'Reservas de mesas para clientes',
    icon: <svg {...ICON_PROPS}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  },
  // ── Desde acá, solo Pro ──
  {
    to: '/admin/configuracion/medios-pago', label: 'Facturación y MP', pro: true, desc: 'Factura electrónica y cobro con Mercado Pago',
    icon: <svg {...ICON_PROPS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  },
  {
    to: '/admin/rangos', label: 'Programa de rangos', pro: true, desc: 'Niveles y premios por fidelidad',
    icon: <svg {...ICON_PROPS}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  },
  {
    to: '/admin/insumos', label: 'Insumos', pro: true, desc: 'Qué lleva cada plato',
    icon: <svg {...ICON_PROPS}><path d="M12 2v6"/><path d="M8.5 4.5 12 8l3.5-3.5"/><path d="M5 12h14l-1.2 8.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/></svg>
  },
  {
    to: '/admin/inventario', label: 'Inventario', pro: true, desc: 'Stock de insumos y materias primas',
    icon: <svg {...ICON_PROPS}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  },
  {
    to: '/admin/whatsapp', label: 'WhatsApp', pro: true, desc: 'Alertas automáticas y campañas',
    icon: <svg {...ICON_PROPS}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2" fill="none"/></svg>
  },
  {
    to: '/admin/kpis', label: 'KPIs', pro: true, desc: 'Facturación y rendimiento', adminOnly: true,
    icon: <svg {...ICON_PROPS}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
  },
  {
    to: '/admin/consumo', label: 'Consumo', pro: true, desc: 'Materia prima por día', adminOnly: true,
    icon: <svg {...ICON_PROPS}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
  },
]

export default function ConfigPage() {
  const { profile, venueId, user } = useAuth()
  const { isPro, loading: planLoading } = usePlan(venueId)
  const [hasProducts, setHasProducts] = useState(true)
  const [hasLocations, setHasLocations] = useState(true)
  const [venueName, setVenueName] = useState('')
  const [showProForm, setShowProForm] = useState(false)

  useEffect(() => {
    if (!venueId) return
    async function checkSetup() {
      const [prodRes, zoneRes, venueRes] = await Promise.all([
        supabaseStaff.from('products').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
        supabaseStaff.from('venue_zones').select('id', { count: 'exact', head: true }).eq('venue_id', venueId),
        supabaseStaff.from('venues').select('name').eq('id', venueId).single()
      ])
      setHasProducts((prodRes.count || 0) > 0)
      setHasLocations((zoneRes.count || 0) > 0)
      setVenueName(venueRes.data?.name || '')
    }
    checkSetup()
  }, [venueId])

  const items = MI_LOCAL_ITEMS.filter(item => !item.adminOnly || profile?.role === 'admin')
  // En un local free las secciones Pro se muestran, pero apagadas: que se vea
  // qué hay del otro lado sin dejar entrar
  // Mientras carga el plan no se apaga nada: evita el parpadeo de ver las
  // secciones grisadas y que vuelvan a encenderse un segundo después
  const showLocked = !planLoading && !isPro
  const freeItems = showLocked ? items.filter(i => !i.pro) : items
  const lockedItems = showLocked ? items.filter(i => i.pro) : []
  const setupIncomplete = !hasProducts || !hasLocations

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
          </div>
        </div>
      )}

      <main className="px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {freeItems.map(item => (
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

        {lockedItems.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-carbon-700" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-smoke-600">Con CAPY Pro</span>
              <div className="flex-1 h-px bg-carbon-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {lockedItems.map(item => (
                <div
                  key={item.to}
                  aria-disabled="true"
                  className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 flex flex-col gap-2 opacity-40 cursor-not-allowed select-none"
                >
                  <div className="w-10 h-10 rounded-xl bg-carbon-800 flex items-center justify-center text-smoke-500 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-smoke-300 font-bold text-sm leading-tight">{item.label}</p>
                    <p className="text-smoke-500 text-[11px] mt-0.5 leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowProForm(true)}
              className="w-full mt-3 bg-ember-500 hover:bg-ember-600 text-white text-sm font-bold py-3.5 rounded-2xl transition-colors"
            >
              Quiero CAPY Pro
            </button>
            <p className="text-smoke-600 text-[11px] text-center mt-2">
              Dejanos tus datos y te contamos cómo activarlo.
            </p>
          </div>
        )}
      </main>

      {showProForm && (
        <ProLeadForm
          venueName={venueName}
          defaultEmail={user?.email || ''}
          defaultName={profile?.full_name || ''}
          onClose={() => setShowProForm(false)}
        />
      )}
    </div>
  )
}

// El lead va por send-lead-email, la misma edge del formulario de las landings:
// ya escribe a capy@bravosm.com y responde al mail que dejó el interesado.
function ProLeadForm({ venueName, defaultEmail, defaultName, onClose }) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [whatsapp, setWhatsapp] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | error

  async function send() {
    if (!name.trim() || !email.trim()) return
    setState('sending')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          // La edge imprime el valor tal cual cuando no lo conoce: así el mail
          // llega diciendo de qué local salió sin tener que redeployarla
          page: `Upgrade a Pro — ${venueName || 'local sin nombre'}`,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-carbon-900 border border-carbon-700 rounded-3xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        {state === 'sent' ? (
          <div className="text-center py-6">
            <p className="text-smoke-100 font-bold text-lg">¡Gracias!</p>
            <p className="text-smoke-500 text-sm mt-1">Te escribimos a la brevedad.</p>
            <button onClick={onClose} className="mt-5 text-ember-400 text-sm font-semibold underline">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-smoke-100 font-bold text-lg leading-tight">Quiero CAPY Pro</p>
              <button onClick={onClose} aria-label="Cerrar" className="text-smoke-500 text-sm p-1 -mr-1">✕</button>
            </div>
            <p className="text-smoke-500 text-xs mb-4">
              Dejanos tus datos y te contamos cómo activar las secciones Pro en {venueName || 'tu local'}.
            </p>

            <div className="space-y-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
              />
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
              />
            </div>

            {state === 'error' && (
              <p className="text-red-500 text-xs mt-2">No se pudo enviar. Probá de nuevo en un momento.</p>
            )}

            <button
              onClick={send}
              disabled={!name.trim() || !email.trim() || state === 'sending'}
              className="w-full mt-3 bg-ember-500 hover:bg-ember-600 disabled:opacity-40 text-white text-sm font-bold py-3.5 rounded-2xl transition-colors"
            >
              {state === 'sending' ? 'Enviando...' : 'Enviar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
