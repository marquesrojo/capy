import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'venues', label: 'Venues' },
  { id: 'camaut', label: 'Camarero/a' },
  { id: 'soporte', label: 'Soporte' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'docs', label: 'Docs Capy' },
]

export default function SuperAdminPage() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState('stats')

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col">
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

      <div className="px-5 py-5 flex-1">
        {tab === 'stats' && <StatsTab />}
        {tab === 'venues' && <VenuesTab />}
        {tab === 'camaut' && <CamautTab />}
        {tab === 'soporte' && <SoporteTab />}
        {tab === 'pagos' && <PagosTab />}
        {tab === 'docs' && <DocsTab />}
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
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  useEffect(() => {
    async function load() {
      // Día de hoy en hora Argentina (UTC-3)
      const now = new Date()
      const arOffset = -3 * 60
      const arNow = new Date(now.getTime() + arOffset * 60000)
      const dayStart = new Date(arNow)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(arNow)
      dayEnd.setUTCHours(23, 59, 59, 999)
      const startUTC = new Date(dayStart.getTime() - arOffset * 60000).toISOString()
      const endUTC   = new Date(dayEnd.getTime()   - arOffset * 60000).toISOString()
      const weekStartUTC = new Date(new Date(startUTC).getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

      const [venuesRes, camautRes, ordersHoyRes, weekOrdersRes, ticketsRes] = await Promise.all([
        supabaseStaff.from('venues').select('id', { count: 'exact', head: true }).not('slug', 'like', 'camaut-%'),
        supabaseStaff.from('staff_names').select('id', { count: 'exact', head: true }).not('profile_id', 'is', null),
        supabaseStaff.from('orders').select('total, payment_status').gte('created_at', startUTC).lte('created_at', endUTC).neq('status', 'cancelado'),
        supabaseStaff.from('orders').select('total, payment_status').gte('created_at', weekStartUTC).lte('created_at', endUTC).neq('status', 'cancelado'),
        supabaseStaff.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      const ordersHoy  = ordersHoyRes.data  || []
      const weekOrders = weekOrdersRes.data || []
      const revenueHoy  = ordersHoy.filter(o => o.payment_status === 'aprobado').reduce((s, o) => s + (o.total || 0), 0)
      const revenueWeek = weekOrders.filter(o => o.payment_status === 'aprobado').reduce((s, o) => s + (o.total || 0), 0)

      setStats({
        venues:      venuesRes.count ?? 0,
        camautUsers: camautRes.count ?? 0,
        ordersHoy:   ordersHoy.length,
        revenueHoy,
        revenueWeek,
        openTickets: ticketsRes.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function sendReport() {
    setSending(true)
    setSendResult(null)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const r = await fetch(`${url}/functions/v1/daily-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({}),
      })
      const data = await r.json()
      setSendResult(r.ok ? 'ok' : 'error')
    } catch {
      setSendResult('error')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Locales activos" value={stats.venues} />
        <StatCard label="Camareros/as" value={stats.camautUsers} sub="con cuenta" />
        <StatCard label="Pedidos hoy" value={stats.ordersHoy} />
        <StatCard label="Facturación hoy" value={formatPrice(stats.revenueHoy)} sub="pagos aprobados" />
        <StatCard label="Últ. 7 días" value={formatPrice(stats.revenueWeek)} sub="pagos aprobados" />
        <StatCard label="Tickets abiertos" value={stats.openTickets} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={sendReport}
          disabled={sending}
          className="bg-carbon-800 hover:bg-carbon-700 disabled:opacity-50 border border-carbon-600 text-smoke-300 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          {sending ? 'Enviando...' : '📧 Enviar reporte ahora'}
        </button>
        {sendResult === 'ok' && <span className="text-emerald-400 text-xs">✓ Enviado a matias@bravosm.com</span>}
        {sendResult === 'error' && <span className="text-red-400 text-xs">Error al enviar</span>}
      </div>
      <p className="text-smoke-600 text-[10px]">El reporte también se envía automáticamente a las 23:00 ART.</p>
    </div>
  )
}

function VenuesTab() {
  const { enterVenue } = useAuth()
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [ordersToday, setOrdersToday] = useState({}) // venueId → count
  const [loading, setLoading] = useState(true)
  const [creditInputs, setCreditInputs] = useState({})

  useEffect(() => {
    async function load() {
      const now = new Date()
      const arOffset = -3 * 60
      const arNow = new Date(now.getTime() + arOffset * 60000)
      const dayStart = new Date(arNow); dayStart.setUTCHours(0, 0, 0, 0)
      const startUTC = new Date(dayStart.getTime() - arOffset * 60000).toISOString()

      const [venuesRes, todayRes] = await Promise.all([
        supabaseStaff
          .from('venues')
          .select('id, name, slug, is_active, created_at, mp_enabled, extra_image_credits')
          .not('slug', 'like', 'camaut-%')
          .order('created_at', { ascending: false }),
        supabaseStaff
          .from('orders')
          .select('venue_id')
          .gte('created_at', startUTC)
          .neq('status', 'cancelado'),
      ])

      const countMap = {}
      for (const o of todayRes.data || []) {
        countMap[o.venue_id] = (countMap[o.venue_id] || 0) + 1
      }
      setOrdersToday(countMap)
      setVenues(venuesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function addCredits(venueId, amount) {
    const venue = venues.find(v => v.id === venueId)
    if (!venue) return
    const newTotal = (venue.extra_image_credits || 0) + amount
    const { error } = await supabaseStaff.from('venues').update({ extra_image_credits: newTotal }).eq('id', venueId)
    if (error) { alert('Error al cargar créditos: ' + error.message); return }
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, extra_image_credits: newTotal } : v))
    setCreditInputs(prev => ({ ...prev, [venueId]: '' }))
  }

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-2">
      <p className="text-smoke-500 text-xs mb-3">{venues.length} locales registrados</p>
      {venues.map(v => (
        <div key={v.id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-smoke-200 font-medium text-sm truncate">{v.name}</p>
              <p className="text-smoke-500 text-xs font-mono">/r/{v.slug}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {ordersToday[v.id] > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-ember-500/40 text-ember-400 font-mono">
                  {ordersToday[v.id]} hoy
                </span>
              )}
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
          <div className="flex items-center gap-2">
            <span className="text-smoke-500 text-[11px]">Créditos img:</span>
            <span className={`font-mono text-xs font-semibold ${(v.extra_image_credits || 0) > 0 ? 'text-emerald-400' : 'text-smoke-600'}`}>
              {v.extra_image_credits || 0}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min="1"
                placeholder="cantidad"
                value={creditInputs[v.id] || ''}
                onChange={e => setCreditInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                className="w-20 bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1 text-xs text-smoke-300 text-center"
              />
              <button
                onClick={() => {
                  const n = parseInt(creditInputs[v.id])
                  if (n > 0) addCredits(v.id, n)
                }}
                className="bg-ember-500 hover:bg-ember-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              >
                + Cargar
              </button>
              {(v.extra_image_credits || 0) > 0 && (
                <button
                  onClick={() => {
                    supabaseStaff.from('venues').update({ extra_image_credits: 0 }).eq('id', v.id)
                    setVenues(prev => prev.map(x => x.id === v.id ? { ...x, extra_image_credits: 0 } : x))
                  }}
                  className="text-smoke-600 text-[11px] underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => { enterVenue(v.id); navigate('/admin') }}
            className="w-full text-center text-[11px] font-semibold text-ember-400 border border-ember-500/30 rounded-lg py-1.5 hover:bg-ember-500/10 transition-colors"
          >
            Ingresar como propietario →
          </button>
        </div>
      ))}
    </div>
  )
}

function CamautTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [staffRes, venuesRes] = await Promise.all([
        supabaseStaff
          .from('staff_names')
          .select('id, full_name, xp, total_orders, is_active, profile_id, venue_id')
          .eq('is_active', true),
        supabaseStaff.from('venues').select('id, name, slug'),
      ])
      const rows = staffRes.data || []
      const vmap = {}
      for (const v of venuesRes.data || []) vmap[v.id] = v

      // Deduplicate by profile_id — keep best XP row, aggregate venue names
      const byProfile = {}
      const noProfile = []
      for (const r of rows) {
        const venue = vmap[r.venue_id]
        const isAutonomous = venue?.slug?.startsWith('camaut-')
        if (r.profile_id) {
          if (!byProfile[r.profile_id]) {
            byProfile[r.profile_id] = { ...r, venues: [], totalXP: 0, totalOrders: 0, staffId: null, venueId: null }
          }
          const entry = byProfile[r.profile_id]
          entry.totalXP += r.xp || 0
          entry.totalOrders += r.total_orders || 0
          if (!isAutonomous && venue) {
            entry.venues.push(venue.name)
            if (!entry.staffId) { entry.staffId = r.id; entry.venueId = r.venue_id }
          } else if (isAutonomous && !entry.staffId) {
            // Autonomous user: use this row as fallback so the button still appears
            entry.staffId = r.id
            entry.venueId = r.venue_id
          }
        } else {
          if (!isAutonomous) noProfile.push({ ...r, venueName: venue?.name })
        }
      }

      const withAccount = Object.values(byProfile).sort((a, b) => b.totalXP - a.totalXP)
      const withoutAccount = noProfile.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
      setUsers([...withAccount, ...withoutAccount])
      setLoading(false)
    }
    load()
  }, [])

  function enterCamaut(s) {
    localStorage.setItem('capy-superadmin-camaut', JSON.stringify({
      staffId: s.staffId,
      staffName: s.full_name,
      venueId: s.venueId,
      xp: s.totalXP,
      profileId: s.profile_id,
    }))
    navigate('/camareroa/app')
  }

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  const withAccount = users.filter(u => u.profile_id)
  const withoutAccount = users.filter(u => !u.profile_id)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide">{withAccount.length} con cuenta</p>
        {withAccount.map(s => (
          <div key={s.profile_id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-smoke-200 font-medium text-sm truncate">{s.full_name}</p>
                <p className="text-smoke-500 text-xs truncate">
                  {s.venues.length ? s.venues.join(', ') : 'Autónomo'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono text-ember-400 text-sm">{s.totalXP} XP</p>
                <p className="text-smoke-500 text-xs">{s.totalOrders} pedidos</p>
              </div>
            </div>
            {s.staffId && (
              <button
                onClick={() => enterCamaut(s)}
                className="w-full text-center text-[11px] font-semibold text-ember-400 border border-ember-500/30 rounded-lg py-1.5 hover:bg-ember-500/10 transition-colors"
              >
                Ingresar como camarero →
              </button>
            )}
          </div>
        ))}
      </div>
      {withoutAccount.length > 0 && (
        <div className="space-y-2">
          <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide">{withoutAccount.length} sin cuenta</p>
          {withoutAccount.map(s => (
            <div key={s.id} className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 opacity-60">
              <div className="min-w-0">
                <p className="text-smoke-200 font-medium text-sm truncate">{s.full_name}</p>
                <p className="text-smoke-500 text-xs">{s.venueName || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
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

function PagosTab() {
  const [mpToken, setMpToken] = useState('')
  const [photoPackPrice, setPhotoPackPrice] = useState('')
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('')
  const [waAccessToken, setWaAccessToken] = useState('')
  const [waEnabled, setWaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [savedPrice, setSavedPrice] = useState(false)
  const [savingWa, setSavingWa] = useState(false)
  const [savedWa, setSavedWa] = useState(false)
  const [waTestLoading, setWaTestLoading] = useState(false)
  const [waTestResult, setWaTestResult] = useState(null)
  const [waTestOrderId, setWaTestOrderId] = useState('')

  useEffect(() => {
    supabaseStaff
      .from('capy_settings')
      .select('mp_access_token, photo_pack_price, wa_phone_number_id, wa_access_token, wa_enabled')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.mp_access_token) setMpToken(data.mp_access_token)
        if (data?.photo_pack_price != null) setPhotoPackPrice(String(data.photo_pack_price))
        if (data?.wa_phone_number_id) setWaPhoneNumberId(data.wa_phone_number_id)
        if (data?.wa_access_token) setWaAccessToken(data.wa_access_token)
        if (data?.wa_enabled != null) setWaEnabled(data.wa_enabled)
        setLoading(false)
      })
  }, [])

  async function save() {
    setSaving(true)
    await supabaseStaff
      .from('capy_settings')
      .upsert({ id: 1, mp_access_token: mpToken.trim(), updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function savePrice() {
    const val = parseInt(photoPackPrice, 10)
    if (!val || val < 0) return
    setSavingPrice(true)
    await supabaseStaff
      .from('capy_settings')
      .upsert({ id: 1, photo_pack_price: val, updated_at: new Date().toISOString() })
    setSavingPrice(false)
    setSavedPrice(true)
    setTimeout(() => setSavedPrice(false), 2000)
  }

  async function saveWa() {
    setSavingWa(true)
    await supabaseStaff
      .from('capy_settings')
      .upsert({
        id: 1,
        wa_phone_number_id: waPhoneNumberId.trim(),
        wa_access_token: waAccessToken.trim(),
        wa_enabled: waEnabled,
        updated_at: new Date().toISOString(),
      })
    setSavingWa(false)
    setSavedWa(true)
    setTimeout(() => setSavedWa(false), 2000)
  }

  async function testWa() {
    setWaTestLoading(true)
    setWaTestResult(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ to: '5491122497772', message: '✅ Test de WA desde Capy SuperAdmin — configuración OK.' }),
      })
      const data = await res.json()
      setWaTestResult({ ok: res.ok, status: res.status, data })
    } catch (e) {
      setWaTestResult({ ok: false, error: e.message })
    }
    setWaTestLoading(false)
  }

  async function testNotifyOrder() {
    if (!waTestOrderId.trim()) return
    setWaTestLoading(true)
    setWaTestResult(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ order_id: waTestOrderId.trim(), event_type: 'created' }),
      })
      const data = await res.json()
      setWaTestResult({ ok: res.ok, status: res.status, data })
    } catch (e) {
      setWaTestResult({ ok: false, error: e.message })
    }
    setWaTestLoading(false)
  }

  if (loading) return <p className="text-smoke-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-5">
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-smoke-300 font-medium text-sm">Token de Mercado Pago — Capy</p>
          <p className="text-smoke-500 text-xs mt-0.5">
            Se usa para cobrar upgrades premium a los locales (importación con IA, créditos, etc.)
          </p>
        </div>
        <div className="space-y-2 pt-1 border-t border-carbon-700">
          <p className="text-smoke-400 text-xs">Access Token</p>
          <p className="text-smoke-500 text-[11px]">Encontralo en tu cuenta MP → Tu negocio → Credenciales</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={mpToken}
              onChange={e => { setMpToken(e.target.value); setSaved(false) }}
              placeholder="APP_USR-..."
              className="input flex-1 font-mono text-xs"
            />
            <button
              onClick={save}
              disabled={saving || !mpToken.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm flex-shrink-0"
            >
              {saving ? '...' : saved ? '✓' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
        <p className="text-smoke-300 font-medium text-sm">Upgrades — Precios</p>
        <div className="border border-carbon-700 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-smoke-300 text-sm font-medium">Pack de fotos IA</p>
            <p className="text-smoke-500 text-xs mt-0.5">25 créditos adicionales para búsqueda automática de fotos</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-smoke-500 text-sm">$</span>
            <input
              type="number"
              min={0}
              value={photoPackPrice}
              onChange={e => { setPhotoPackPrice(e.target.value); setSavedPrice(false) }}
              placeholder="10000"
              className="input flex-1 text-sm"
            />
            <button
              onClick={savePrice}
              disabled={savingPrice || !photoPackPrice}
              className="bg-ember-500 hover:bg-ember-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm flex-shrink-0"
            >
              {savingPrice ? '...' : savedPrice ? '✓' : 'Guardar'}
            </button>
          </div>
        </div>
        <div className="border border-carbon-700 rounded-xl px-4 py-3 opacity-40">
          <p className="text-smoke-300 text-sm font-medium">Importación con IA</p>
          <p className="text-smoke-500 text-xs mt-0.5">Próximamente</p>
        </div>
      </div>

      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-smoke-300 font-medium text-sm">WhatsApp Business API</p>
            <p className="text-smoke-500 text-xs mt-0.5">Notificaciones automáticas a clientes y locales</p>
          </div>
          <button
            onClick={async () => {
              const next = !waEnabled
              setWaEnabled(next)
              await supabaseStaff.from('capy_settings').upsert({ id: 1, wa_enabled: next, updated_at: new Date().toISOString() })
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${waEnabled ? 'bg-emerald-500' : 'bg-carbon-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${waEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="space-y-3 pt-1 border-t border-carbon-700">
          <div>
            <p className="text-smoke-400 text-xs mb-1">Phone Number ID</p>
            <input
              type="text"
              value={waPhoneNumberId}
              onChange={e => { setWaPhoneNumberId(e.target.value); setSavedWa(false) }}
              placeholder="1049361104917181"
              className="input w-full font-mono text-xs"
            />
          </div>
          <div>
            <p className="text-smoke-400 text-xs mb-1">Access Token</p>
            <p className="text-smoke-500 text-[11px] mb-1">Meta Developers → CAPY app → WhatsApp → API Setup → Generate access token</p>
            <input
              type="password"
              value={waAccessToken}
              onChange={e => { setWaAccessToken(e.target.value); setSavedWa(false) }}
              placeholder="EAAxxxxxxxxx..."
              className="input w-full font-mono text-xs"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={saveWa}
              disabled={savingWa || (!waPhoneNumberId.trim() && !waAccessToken.trim())}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            >
              {savingWa ? 'Guardando...' : savedWa ? '✓ Guardado' : 'Guardar configuración WA'}
            </button>
            <button
              onClick={testWa}
              disabled={waTestLoading}
              className="bg-carbon-700 hover:bg-carbon-600 disabled:opacity-40 text-smoke-300 font-semibold px-4 py-2 rounded-xl text-sm"
            >
              {waTestLoading ? 'Probando...' : 'Probar WA'}
            </button>
          </div>
          <div className="pt-1 border-t border-carbon-700">
            <p className="text-smoke-400 text-xs mb-1">Probar notify-order con un pedido real</p>
            <p className="text-smoke-500 text-[11px] mb-2">Supabase → Table Editor → orders → copiar un ID de pedido reciente</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={waTestOrderId}
                onChange={e => setWaTestOrderId(e.target.value)}
                placeholder="uuid del pedido..."
                className="input flex-1 font-mono text-xs"
              />
              <button
                onClick={testNotifyOrder}
                disabled={waTestLoading || !waTestOrderId.trim()}
                className="bg-carbon-700 hover:bg-carbon-600 disabled:opacity-40 text-smoke-300 font-semibold px-3 py-2 rounded-xl text-sm whitespace-nowrap"
              >
                {waTestLoading ? '...' : 'Probar pedido'}
              </button>
            </div>
          </div>
          {waTestResult && (
            <div className={`rounded-xl p-3 text-xs font-mono whitespace-pre-wrap break-all ${waTestResult.ok ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
              {waTestResult.status && <p className="mb-1 font-sans text-smoke-400">HTTP {waTestResult.status}</p>}
              {JSON.stringify(waTestResult.data ?? waTestResult.error, null, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SEED_DOCS = [
  {
    title: 'Mapa de secciones y navegación de Capy App',
    type: 'instruction',
    content: `SECCIONES DE CAPY APP — NOMBRES EXACTOS (usá siempre estos nombres, nunca inventes otros)

PANEL PRINCIPAL (/admin)
- Dashboard: vista principal con kanban de pedidos del día. Columnas: Pendiente, En preparación, Listo, Entregado.
- Tomar pedido: botón en el dashboard para que el admin tome un pedido directamente (mostrador / take away).

SECCIÓN MI LOCAL — accesible desde el menú lateral o ícono de configuración
- Carta (/admin/carta): se editan los productos y categorías del menú. Acá se agregan productos con nombre, descripción, precio y foto. También está el botón Importar con IA y Fotos con IA. NO se llama "Productos", se llama "Carta".
- Ubicaciones (/admin/ubicaciones): se crean las zonas (Salón, Terraza, Barra) y las mesas dentro de cada zona. También se activa la opción de Retiro en local.
- Medios de pago (/admin/configuracion/medios-pago): se activan efectivo, MercadoPago u otros métodos.
- Datos del local (/admin/configuracion/local): nombre del local, WhatsApp de contacto y ajustes generales.
- Usuarios (/admin/usuarios): se agregan admins y camareros vinculados al local.
- Descuentos (/admin/descuentos): códigos de descuento para clientes.
- Notas rápidas (/admin/notas-rapidas): chips de aclaraciones predefinidas (sin sal, sin cebolla, etc.).
- Códigos QR (/admin/qr): QR de cada mesa para clientes y QR de camarero. Se descargan acá.
- Programa de rangos (/admin/rangos): sistema de puntos y niveles de fidelidad de clientes.
- Encuestas (/admin/encuestas): calificaciones dejadas por clientes.
- Inventario (/admin/inventario): stock de insumos y materias primas.
- Reservas (/admin/reservas): reservas de mesas hechas por clientes.
- WhatsApp (/admin/whatsapp): alertas automáticas y campañas.
- KPIs (/admin/kpis): facturación y rendimiento del local.
- Consumo (/admin/consumo): reporte de materia prima consumida por día.
- Historial (/admin/historial): historial completo de pedidos.

TOMAR PEDIDOS (/admin/tomar)
- Modo camarero: el camarero selecciona una mesa y toma el pedido en nombre del cliente. Tiene botón de micrófono con IA para dictar el pedido por voz.

CAPY CAMARERO/A APP (/camareroa/app)
- App de camareros: secciones Home, Pedidos, Mesas, Ranking, Perfil.`,
    tags: ['navegación', 'secciones', 'mapa', 'carta', 'configuración'],
  },
  {
    title: 'Primeros pasos: orden de configuración inicial',
    content: `Al empezar con Capy, el orden recomendado es:
1. Configurar los datos del local: ir a Mi Local → Datos del local. Ahí se carga el nombre, WhatsApp de contacto y ajustes generales.
2. Crear la carta: ir a Mi Local → Carta. Primero crear las categorías (Entradas, Platos principales, Bebidas, etc.) y luego agregar los productos dentro de cada una con nombre, descripción, precio y foto.
3. Configurar las ubicaciones: ir a Mi Local → Ubicaciones. Crear las zonas (Salón, Terraza, Barra) y dentro de cada zona agregar las mesas con su nombre o número. También se puede activar la opción de Retiro en local.
4. Configurar los métodos de pago: ir a Mi Local → Medios de pago. Activar efectivo, MercadoPago u otros métodos disponibles.
5. Generar los QR: ir a Mi Local → Códigos QR. Descargar el QR de cada mesa para imprimir y poner en las mesas.
6. Hacer una prueba: escanear el QR de una mesa, hacer un pedido de prueba como cliente y verificar que llega al panel del admin.`,
    tags: ['onboarding', 'setup', 'primeros pasos', 'configuración'],
  },
  {
    title: 'Configurar la carta: categorías y productos',
    content: `Para armar la carta en Capy, ir a Mi Local → Carta.
Primero crear las categorías: tocar el botón + Categoría, poner el nombre (ej: Entradas, Pizzas, Bebidas) y guardar. Las categorías se pueden reordenar arrastrándolas.
Luego agregar productos dentro de cada categoría: tocar + Producto, completar nombre, descripción (opcional pero recomendada), precio y foto. La foto se puede subir manualmente o buscar con el botón IA que sugiere una imagen de Unsplash.
Para importar una carta completa de golpe, usar el botón Importar con IA: pegar el texto del menú (foto, PDF escaneado, texto libre) y Capy genera todos los productos y categorías automáticamente con fotos incluidas.
Los productos se pueden activar o desactivar sin borrarlos (útil para productos de temporada o agotados).
Cada producto tiene un panel de ingredientes donde se puede cargar la materia prima para el reporte de consumo diario.`,
    tags: ['carta', 'productos', 'categorías', 'menú', 'importar'],
  },
  {
    title: 'Configurar ubicaciones: zonas, mesas y retiro',
    content: `Las ubicaciones en Capy representan dónde está sentado el cliente cuando hace el pedido. Ir a Mi Local → Ubicaciones.
Crear zonas primero: son agrupaciones de mesas (Salón, Terraza, Barra, Patio). Cada zona tiene un nombre.
Dentro de cada zona, agregar las mesas con su nombre o número (Mesa 1, Mesa 2, Barra 1, etc.).
También existe la opción Retiro en local: cuando está activa, el cliente puede pedir sin estar en una mesa y retirar el pedido en la barra o mostrador. Se activa desde el panel de ubicaciones.
Cada mesa genera su propio QR individual. Los QR se descargan desde Mi Local → Códigos QR, donde se puede bajar el de cada mesa por separado o todos juntos.`,
    tags: ['ubicaciones', 'mesas', 'zonas', 'retiro', 'qr'],
  },
  {
    title: 'Códigos QR: tipos y cómo usarlos',
    content: `En Mi Local → Códigos QR hay dos tipos de QR:
QR de mesa: el cliente lo escanea con la cámara del celular, entra a la carta de Capy, elige su nombre y ya puede pedir desde su mesa. Cada mesa tiene su QR único. Se deben imprimir y colocar en cada mesa.
QR de camarero: sirve para que el camarero tome pedidos en nombre de una mesa usando su celular. El camarero escanea el QR del cliente o usa el modo camarero desde /admin/tomar.
Para imprimir los QR: descargar desde Mi Local → Códigos QR, se puede bajar cada uno individualmente o todos juntos en un ZIP. Se recomiendan en tamaño mínimo 5x5cm para que sean fáciles de escanear.`,
    tags: ['qr', 'códigos qr', 'mesas', 'imprimir'],
  },
  {
    title: 'Métodos de pago disponibles',
    content: `En Mi Local → Medios de pago se configuran los métodos que el cliente puede usar al momento de pagar.
Efectivo: siempre disponible, el cliente indica que va a pagar en efectivo y el admin confirma el cobro.
MercadoPago: permite que el cliente pague online con tarjeta o billetera virtual. Para activarlo se debe vincular la cuenta de MercadoPago del local desde la configuración.
Los métodos activos se muestran al cliente en la pantalla de pago. Se pueden activar o desactivar en cualquier momento.`,
    tags: ['pagos', 'mercadopago', 'efectivo', 'medios de pago'],
  },
  {
    title: 'Agregar camareros y usuarios',
    content: `En Mi Local → Usuarios se gestionan los camareros y administradores vinculados al local.
Para agregar un camarero: ir a Usuarios y tocar + Agregar. El camarero recibe un link para crear su cuenta en Camaut (la plataforma de camareros de Capy). Una vez que acepta, queda vinculado al local.
Roles disponibles: admin (acceso total al panel) y camarero (acceso solo al modo tomar pedidos y ver historial).
El camarero puede tomar pedidos desde su celular usando /admin/tomar — ve las mesas disponibles, elige una y toma el pedido como si fuera el cliente.
Los camareros también acumulan XP y suben de rango en el programa de fidelización de Camaut.`,
    tags: ['camareros', 'usuarios', 'staff', 'roles', 'camaut'],
  },
  {
    title: 'Gestión de pedidos: estados y flujo',
    content: `Cuando un cliente hace un pedido, aparece en el panel del admin en /admin (el dashboard principal).
Estados de un pedido:
- Pendiente: recién llegó, todavía no fue confirmado.
- En preparación: el admin o cocina lo confirmó y está siendo preparado.
- Listo: el pedido está listo para entregar.
- Entregado: fue entregado al cliente.
- Cancelado: el pedido fue cancelado.
El admin puede cambiar el estado tocando el pedido. También puede ver el historial completo de pedidos del día en Mi Local → Historial.
Los pedidos pagados con MercadoPago se confirman automáticamente cuando el pago es aprobado.`,
    tags: ['pedidos', 'estados', 'historial', 'kitchen', 'cocina'],
  },
  {
    title: 'Notas rápidas: aclaraciones predefinidas',
    content: `Las notas rápidas son chips de texto que el cliente puede agregar a su pedido como aclaraciones (sin sal, sin cebolla, bien cocido, sin gluten, etc.).
Se configuran en Mi Local → Notas rápidas. Se agregan como chips de texto y el cliente los puede seleccionar al hacer el pedido, o también escribir una nota libre.
Son útiles para evitar que el cliente tenga que escribir siempre las mismas aclaraciones y para estandarizar las solicitudes que llegan a cocina.`,
    tags: ['notas rápidas', 'aclaraciones', 'chips', 'pedidos'],
  },
  {
    title: 'Qué es Camaut y para qué sirve',
    content: `Camaut es la app de Capy para camareros. Permite al camarero tomar pedidos digitalmente, ver el estado de los pedidos en tiempo real, llevar un registro de su carrera y acumular XP por turno.
Camaut tiene dos modos:
1. Camarero vinculado a un local: trabaja en un restaurante o bar que usa Capy. El dueño lo agrega desde Mi Local → Usuarios. El camarero recibe un link para crear su cuenta y queda vinculado al local.
2. Camarero autónomo: trabaja freelance o en varios locales. Se registra en camaut.app y puede vincularse a múltiples locales.
Los camareros acceden a su app en /camareroa/app o desde el panel de admin en /admin/tomar si están vinculados a un local.`,
    tags: ['camaut', 'camarero', 'app', 'registro'],
  },
  {
    title: 'Cómo registrarse en Camaut',
    content: `Para crear una cuenta en Camaut:
1. Ir a camaut.app o escanear el QR de camarero del local.
2. Tocar Crear cuenta, ingresar nombre, email y contraseña.
3. Si el dueño del local ya envió una invitación, al entrar al link de invitación el camarero queda vinculado automáticamente al local.
4. Si es autónomo, puede vincularse a locales desde la app usando el código o link que le da el dueño.
Una vez registrado, el camarero accede a su perfil con historial de pedidos, XP acumulado, ranking y su CV digital.`,
    tags: ['camaut', 'registro', 'cuenta', 'camarero', 'vincular'],
  },
  {
    title: 'Tomar pedidos como camarero',
    content: `El camarero puede tomar pedidos desde dos lugares:
1. Panel admin en /admin/tomar: si está logueado como camarero en el panel, ve las mesas disponibles del local, elige una mesa y puede hacer el pedido en nombre del cliente.
2. App Camaut (/camaut/app): tiene 5 secciones accesibles desde la barra inferior:
   - Comanda: tomar un pedido nuevo seleccionando mesa y productos de la carta.
   - Pedidos: ver todos los pedidos activos y su estado (pendiente, en preparación, listo, entregado).
   - Turno: resumen del turno actual — pedidos tomados, XP ganado en el turno.
   - Carrera: historial acumulado de XP, rango actual, logros desbloqueados.
   - Ranking: posición del camarero comparado con otros camareros de la zona.
El camarero también recibe notificaciones push cuando un pedido cambia de estado.`,
    tags: ['camaut', 'camarero', 'pedidos', 'comanda', 'tomar pedidos'],
  },
  {
    title: 'XP y rangos del camarero en Camaut',
    content: `Los camareros acumulan XP (experiencia) por cada pedido que toman. El XP se suma al perfil del camarero y determina su rango.
Rangos disponibles (de menor a mayor): Novato, Bronce, Plata, Oro, Diamante.
Cada rango desbloquea beneficios dentro de la plataforma y mejora el posicionamiento en el ranking público de camareros.
El historial de XP y pedidos queda guardado en el perfil aunque el camarero cambie de local, lo que construye su reputación a lo largo del tiempo.
El ranking compara al camarero con otros de su zona, mostrando posición, propinas promedio y velocidad de atención.`,
    tags: ['camaut', 'xp', 'rangos', 'ranking', 'carrera', 'reputación'],
  },
  {
    title: 'CV digital del camarero en Camaut',
    content: `Cada camarero en Camaut tiene un CV digital público accesible en /c/:alias (por ejemplo capy.ar/c/nombre).
El CV muestra: nombre, foto, rango actual, XP total, cantidad de pedidos tomados, locales donde trabajó y calificaciones de clientes.
Es útil para que el camarero muestre su experiencia verificada en entrevistas de trabajo o al ofrecer sus servicios a nuevos locales.
El alias se configura desde el perfil en la app de Camaut. También hay una versión extendida tipo CV en /cv/:alias con más detalle profesional.`,
    tags: ['camaut', 'cv', 'perfil', 'reputación', 'alias'],
  },
  {
    title: 'Programa de rangos para clientes',
    content: `Capy tiene un sistema de fidelización de clientes por rangos. Los clientes acumulan puntos por cada pedido y suben de nivel.
Se configura en Mi Local → Programa de rangos. Desde ahí se pueden definir:
- Los nombres de los rangos (ej: Bronce, Plata, Oro) y los iconos que los representan.
- Los puntos necesarios para alcanzar cada rango.
- Los premios o beneficios de cada nivel (texto descriptivo que ve el cliente).
El programa se puede activar o desactivar. Cuando está activo, el cliente ve su rango y puntos en su perfil dentro de la app.
Es una herramienta de retención: motiva a los clientes a volver para subir de nivel y acceder a beneficios.`,
    tags: ['rangos', 'fidelización', 'clientes', 'puntos', 'programa'],
  },
  {
    title: 'Encuestas y feedback de clientes',
    content: `Los clientes pueden calificar su experiencia después de cada pedido. Las calificaciones se ven en Mi Local → Encuestas.
La pantalla de encuestas muestra: puntaje promedio general, cantidad de respuestas, y el detalle de cada calificación con comentarios opcionales del cliente.
Es útil para detectar problemas de atención, calidad de platos o tiempos de espera antes de que se conviertan en malas reseñas en Google o Instagram.
Se pueden filtrar por fecha para ver tendencias en el tiempo.`,
    tags: ['encuestas', 'feedback', 'calificaciones', 'clientes', 'reseñas'],
  },
  {
    title: 'KPIs: métricas de facturación y rendimiento',
    content: `La sección KPIs en Mi Local → KPIs (solo accesible para admin) muestra métricas clave del negocio.
Períodos disponibles: hoy, últimos 7 días, últimos 30 días, todo el tiempo.
Métricas disponibles:
- Facturación total del período.
- Cantidad de pedidos y ticket promedio.
- Productos más vendidos (ranking por cantidad vendida).
- Métodos de pago más usados (efectivo vs MercadoPago vs otros).
- Calificaciones promedio de clientes en el período.
Es el panel ideal para revisar al cierre del día o la semana y tomar decisiones sobre la carta, precios y atención.`,
    tags: ['kpis', 'métricas', 'facturación', 'análisis', 'rendimiento'],
  },
  {
    title: 'Reporte de consumo de materia prima',
    content: `El reporte de consumo está en Mi Local → Consumo (solo para admin). Calcula cuánta materia prima se usó en un día dado, en base a los pedidos pagados y los ingredientes configurados por producto.
Para que funcione, primero hay que cargar los ingredientes de cada producto: ir a Mi Local → Carta, expandir el producto y usar el panel de ingredientes para agregar cada materia prima con cantidad y unidad (gramos, litros, unidades, etc.).
El reporte muestra gráficos de barras agrupados por unidad, tabla completa de ingredientes consumidos, desglose por producto y un botón de resumen IA opcional que genera un análisis narrativo del día.
Es útil para controlar stock, detectar desperdicios y planificar compras del día siguiente.`,
    tags: ['consumo', 'materia prima', 'ingredientes', 'stock', 'reporte'],
  },
  {
    title: 'Tips para organizar la carta en Capy',
    content: `Algunos consejos para armar una carta efectiva en Capy:
- Usar categorías claras y cortas: Entradas, Principales, Postres, Bebidas. Evitar subcategorías innecesarias.
- Los productos con foto convierten más. Usar el botón IA en cada producto para buscar una imagen automáticamente con Unsplash.
- Las descripciones cortas pero específicas ayudan al cliente a decidir más rápido.
- Desactivar productos agotados en lugar de borrarlos: así se reactivan fácilmente cuando vuelven a estar disponibles.
- Usar la importación con IA para cargar una carta completa de una sola vez: pegar el texto del menú y Capy crea todos los productos y categorías automáticamente.`,
    tags: ['carta', 'tips', 'productos', 'fotos', 'organización'],
  },
  {
    title: 'Historial de pedidos y cierre de turno',
    content: `En Mi Local → Historial se puede ver el listado completo de pedidos del local con filtros por fecha, estado y método de pago.
Cada pedido muestra: mesa o ubicación, productos pedidos, total, estado y método de pago.
Para el cierre de turno, el camarero puede ver el resumen de su turno en /admin/mi-turno: pedidos tomados, total facturado en su turno y XP ganado.
Los pedidos cancelados y los no pagados quedan registrados en el historial con su estado correspondiente, lo que permite detectar pérdidas o problemas de cobro.`,
    tags: ['historial', 'pedidos', 'turno', 'cierre', 'facturación'],
  },
]

function DocsTab() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | doc object
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [docType, setDocType] = useState('info')
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const { data } = await supabaseStaff
      .from('capy_docs')
      .select('*')
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function seedDocs() {
    setSeeding(true)
    const { data: existing } = await supabaseStaff.from('capy_docs').select('title')
    const existingTitles = new Set((existing || []).map(d => d.title))
    const toInsert = SEED_DOCS.filter(d => !existingTitles.has(d.title))
    if (toInsert.length > 0) {
      await supabaseStaff.from('capy_docs').insert(toInsert)
    }
    setSeeding(false)
    load()
  }

  function startNew() {
    setEditing('new')
    setTitle('')
    setContent('')
    setTags('')
    setDocType('info')
  }

  function startEdit(doc) {
    setEditing(doc)
    setTitle(doc.title)
    setContent(doc.content)
    setTags((doc.tags || []).join(', '))
    setDocType(doc.type || 'info')
  }

  async function save() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const payload = {
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      type: docType,
      updated_at: new Date().toISOString(),
    }
    if (editing === 'new') {
      await supabaseStaff.from('capy_docs').insert(payload)
    } else {
      await supabaseStaff.from('capy_docs').update(payload).eq('id', editing.id)
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  async function toggleActive(doc) {
    await supabaseStaff.from('capy_docs').update({ is_active: !doc.is_active }).eq('id', doc.id)
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: !d.is_active } : d))
  }

  async function deleteDoc(id) {
    if (!confirm('¿Borrar este documento?')) return
    await supabaseStaff.from('capy_docs').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-smoke-200 font-semibold text-sm">{editing === 'new' ? 'Nuevo documento' : 'Editar documento'}</h2>
          <button onClick={() => setEditing(null)} className="text-smoke-500 text-xs underline">Cancelar</button>
        </div>
        {/* Type selector */}
        <div className="flex gap-2">
          {[
            { id: 'info', label: 'Información', desc: 'Aparece cuando es relevante para la pregunta (RAG)' },
            { id: 'instruction', label: 'Instrucción', desc: 'Se aplica siempre, en cada respuesta del chat' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setDocType(opt.id)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                docType === opt.id
                  ? opt.id === 'instruction'
                    ? 'border-violet-500/60 bg-violet-500/10'
                    : 'border-ember-500/60 bg-ember-500/10'
                  : 'border-carbon-700 bg-carbon-900'
              }`}
            >
              <p className={`text-xs font-semibold ${docType === opt.id ? (opt.id === 'instruction' ? 'text-violet-400' : 'text-ember-400') : 'text-smoke-400'}`}>
                {opt.label}
              </p>
              <p className="text-smoke-600 text-[10px] mt-0.5 leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={docType === 'instruction' ? 'Título (ej: Política de feriados)' : 'Título (ej: Cómo cargar la carta)'}
          className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={docType === 'instruction'
            ? 'Instrucción para Capy (ej: "Cuando pregunten por feriados, respondé que el local cierra los feriados nacionales...")'
            : 'Contenido del documento — escribí la información que Capy va a usar para responder...'}
          rows={10}
          className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-smoke-200 focus:outline-none focus:border-ember-500 resize-none"
        />
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags separados por coma (ej: carta, productos, onboarding)"
          className="w-full bg-carbon-900 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-smoke-200 focus:outline-none focus:border-ember-500"
        />
        <button
          onClick={save}
          disabled={saving || !title.trim() || !content.trim()}
          className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
        >
          {saving ? 'Guardando...' : 'Guardar documento'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-smoke-400 text-xs">{docs.length} documentos · usados por Capy Chat para responder</p>
        <div className="flex items-center gap-2">
          {docs.length < SEED_DOCS.length && (
            <button
              onClick={seedDocs}
              disabled={seeding}
              className="text-xs text-smoke-400 border border-carbon-600 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:border-smoke-500 transition-colors"
            >
              {seeding ? 'Cargando...' : `↓ Cargar docs base (${SEED_DOCS.length - docs.length})`}
            </button>
          )}
          <button onClick={startNew} className="bg-ember-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            + Nuevo
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-smoke-500 text-sm">Cargando...</p>
      ) : docs.length === 0 ? (
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
          <p className="text-smoke-500 text-sm">No hay documentos todavía.</p>
          <p className="text-smoke-600 text-xs mt-1">Creá el primero para que Capy tenga contexto específico.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className={`bg-carbon-900 border rounded-2xl p-4 ${doc.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-smoke-200 font-semibold text-sm">{doc.title}</p>
                    {doc.type === 'instruction' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 leading-none flex-shrink-0">instrucción</span>
                    )}
                  </div>
                  <p className="text-smoke-500 text-xs mt-0.5 line-clamp-2">{doc.content}</p>
                  {doc.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {doc.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-carbon-800 text-smoke-400">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(doc)} className={`text-[10px] px-2 py-0.5 rounded-full border ${doc.is_active ? 'border-emerald-500/40 text-emerald-500' : 'border-carbon-600 text-smoke-500'}`}>
                    {doc.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => startEdit(doc)} className="text-smoke-500 text-xs underline">Editar</button>
                  <button onClick={() => deleteDoc(doc.id)} className="text-red-500/60 text-xs underline">Borrar</button>
                </div>
              </div>
            </div>
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
