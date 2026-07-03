import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'venues', label: 'Venues' },
  { id: 'camaut', label: 'Camaut' },
  { id: 'soporte', label: 'Soporte' },
]

export default function SuperAdminPage() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState('stats')

  return (
    <div className="min-h-screen bg-carbon-950">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">SUPERADMIN</h1>
          <p className="text-smoke-500 text-xs mt-0.5">Panel de administración global</p>
        </div>
        <button onClick={signOut} className="text-smoke-500 text-xs underline">
          Salir
        </button>
      </header>

      <div className="flex gap-1 px-5 pt-4 pb-0 border-b border-carbon-700 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-ember-500 text-ember-500'
                : 'border-transparent text-smoke-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        {tab === 'stats' && <StatsTab />}
        {tab === 'venues' && <VenuesTab />}
        {tab === 'camaut' && <CamautTab />}
        {tab === 'soporte' && <SoporteTab />}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
      <p className="text-smoke-500 text-xs mb-1">{label}</p>
      <p className="font-mono text-smoke-100 text-2xl font-bold">{value}</p>
      {sub && <p className="text-smoke-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function StatsTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const [venuesRes, staffRes, ordersRes, ticketsRes] = await Promise.all([
        supabaseStaff.from('venues').select('id', { count: 'exact', head: true }),
        supabaseStaff.from('venue_staff').select('id', { count: 'exact', head: true }),
        supabaseStaff.from('orders').select('total').gte('created_at', todayISO),
        supabaseStaff.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      const ordersToday = ordersRes.data || []
      const revenueToday = ordersToday.reduce((sum, o) => sum + (o.total || 0), 0)

      setStats({
        venues: venuesRes.count ?? 0,
        camautUsers: staffRes.count ?? 0,
        ordersToday: ordersToday.length,
        revenueToday,
        openTickets: ticketsRes.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard label="Locales activos" value={stats.venues} />
      <StatCard label="Usuarios Camaut" value={stats.camautUsers} />
      <StatCard label="Pedidos hoy" value={stats.ordersToday} />
      <StatCard label="Facturación hoy" value={formatPrice(stats.revenueToday)} sub="todos los locales" />
      <StatCard label="Tickets abiertos" value={stats.openTickets} />
    </div>
  )
}

function VenuesTab() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('id, name, slug, is_active, created_at, mp_enabled')
        .order('created_at', { ascending: false })
      setVenues(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-2">
      <p className="text-smoke-500 text-xs mb-3">{venues.length} locales registrados</p>
      {venues.map(v => (
        <div key={v.id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-smoke-200 font-medium text-sm truncate">{v.name}</p>
            <p className="text-smoke-500 text-xs font-mono">/r/{v.slug}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {v.mp_enabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-500">MP</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              v.is_active
                ? 'border-emerald-500/40 text-emerald-500'
                : 'border-carbon-600 text-smoke-500'
            }`}>
              {v.is_active ? 'activo' : 'inactivo'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CamautTab() {
  const [staff, setStaff] = useState([])
  const [venues, setVenues] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [staffRes, venuesRes] = await Promise.all([
        supabaseStaff
          .from('staff_names')
          .select('id, full_name, alias, xp, total_orders, is_active, profile_id, venue_id')
          .eq('is_active', true)
          .order('xp', { ascending: false }),
        supabaseStaff.from('venues').select('id, name'),
      ])
      setStaff(staffRes.data || [])
      const vmap = {}
      for (const v of venuesRes.data || []) vmap[v.id] = v.name
      setVenues(vmap)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-2">
      <p className="text-smoke-500 text-xs mb-3">{staff.length} camareros activos</p>
      {staff.map(s => (
        <div key={s.id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-smoke-200 font-medium text-sm truncate">{s.full_name}</p>
            <p className="text-smoke-500 text-xs">{venues[s.venue_id] || '—'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-ember-400 text-sm">{s.xp ?? 0} XP</p>
            <p className="text-smoke-500 text-xs">{s.total_orders ?? 0} pedidos</p>
          </div>
          <div className="flex-shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              s.profile_id
                ? 'border-emerald-500/40 text-emerald-500'
                : 'border-carbon-600 text-smoke-500'
            }`}>
              {s.profile_id ? 'vinculado' : 'sin cuenta'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SoporteTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabaseStaff
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function resolve(id, response) {
    const updates = { status: 'resolved', responded_at: new Date().toISOString() }
    if (response?.trim()) updates.response = response.trim()
    await supabaseStaff.from('support_tickets').update(updates).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  const open = tickets.filter(t => t.status === 'open')
  const resolved = tickets.filter(t => t.status !== 'open')

  return (
    <div className="space-y-4">
      {open.length === 0 && (
        <p className="text-smoke-500 text-sm text-center py-4">No hay tickets abiertos.</p>
      )}
      {open.length > 0 && (
        <div className="space-y-2">
          <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide">Abiertos · {open.length}</p>
          {open.map(t => (
            <TicketCard key={t.id} ticket={t} onResolve={(response) => resolve(t.id, response)} />
          ))}
        </div>
      )}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide mt-4">Resueltos · {resolved.length}</p>
          {resolved.map(t => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, onResolve }) {
  const [response, setResponse] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [saving, setSaving] = useState(false)

  const elapsed = Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60000)
  const timeLabel = elapsed < 60
    ? `${elapsed}m`
    : elapsed < 1440
      ? `${Math.round(elapsed / 60)}h`
      : `${Math.round(elapsed / 1440)}d`

  async function handleResolve() {
    setSaving(true)
    await onResolve(response)
    setSaving(false)
    setShowReply(false)
  }

  return (
    <div className={`bg-carbon-900 border rounded-xl px-4 py-3 ${
      ticket.status === 'open' ? 'border-ember-500/40' : 'border-carbon-700 opacity-60'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-smoke-300 text-sm font-medium">{ticket.staff_name || 'Anónimo'}</p>
          {ticket.staff_email && (
            <p className="text-smoke-500 text-xs font-mono">{ticket.staff_email}</p>
          )}
        </div>
        <span className="text-smoke-500 text-xs">{timeLabel}</span>
      </div>

      <p className="text-smoke-400 text-sm whitespace-pre-wrap mt-1">{ticket.message}</p>

      {ticket.response && (
        <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <p className="text-emerald-500 text-[10px] font-semibold uppercase mb-1">Respuesta</p>
          <p className="text-smoke-300 text-sm whitespace-pre-wrap">{ticket.response}</p>
        </div>
      )}

      {ticket.status === 'open' && onResolve && (
        <div className="mt-2">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-500"
            >
              Responder y resolver
            </button>
          ) : (
            <div className="space-y-2 mt-1">
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Escribí tu respuesta (opcional)..."
                rows={3}
                className="w-full bg-carbon-800 border border-carbon-600 rounded-xl px-3 py-2 text-sm text-smoke-200 resize-none focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleResolve}
                  disabled={saving}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Resolver'}
                </button>
                <button
                  onClick={() => setShowReply(false)}
                  className="px-3 py-1.5 border border-carbon-600 text-smoke-400 text-xs rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
