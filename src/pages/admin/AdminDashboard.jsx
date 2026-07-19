import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import { fetchVenueWaiters } from '../../lib/staff'
import FiscalTicket from '../../components/FiscalTicket'
import AccountSummary from '../../components/AccountSummary'
import FloorPlanViewer from '../../components/FloorPlanViewer'
import { PinIcon, FileTextIcon, ChefHatIcon, BellIcon, CreditCardIcon, ClockIcon } from '../../components/Icons'

const BOARD_COLUMNS = ['recibido', 'en_preparacion', 'entregado']
const PROOF_BUCKET = 'payment-proofs'
const ORDER_SELECT = '*, order_items(*, products(category_id)), customers(full_name, whatsapp), assigned_staff:staff_names!orders_assigned_staff_id_fkey(id, full_name)'

import { Component } from 'react'

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-red-700 text-sm font-medium mb-2">Error al renderizar el dashboard</p>
            <p className="text-smoke-400 text-xs break-all">{this.state.error?.message || String(this.state.error)}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AdminDashboard() {
  return (
    <DashboardErrorBoundary>
      <AdminDashboardInner />
    </DashboardErrorBoundary>
  )
}

function AdminDashboardInner() {
  const [orders, setOrders] = useState([])
  const [pendingProofOrders, setPendingProofOrders] = useState([])
  const [pendingInPersonOrders, setPendingInPersonOrders] = useState([])
  const [proofUrls, setProofUrls] = useState({})
  const [waiters, setWaiters] = useState([])
  const [categories, setCategories] = useState([])
  const [highDemand, setHighDemand] = useState(false)
  const [venueSlug, setVenueSlug] = useState('')
  const [venueName, setVenueName] = useState('')
  const [fiscalEnabled, setFiscalEnabled] = useState(false)
  const [fiscalCondition, setFiscalCondition] = useState('responsable_inscripto')
  const [invoices, setInvoices] = useState({}) // order_id → fiscal_invoice
  const [paidOrders, setPaidOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState('mapa')
  const [zones, setZones] = useState([])
  const [waiterCalls, setWaiterCalls] = useState([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [showLowStockModal, setShowLowStockModal] = useState(false)
  const [todayReservations, setTodayReservations] = useState([])
  const [showReservationsModal, setShowReservationsModal] = useState(false)
  const prevCallCount = useRef(0)
  const { signOut, profile, venueId, isSuperAdmin, isAdmin, isImpersonating, exitVenue } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const orderCalls = orders.filter(o => o.waiter_called_at).length
    const total = waiterCalls.length + orderCalls
    if (total > prevCallCount.current) playChime()
    prevCallCount.current = total
  }, [waiterCalls.length, orders])

  useEffect(() => {
    if (!venueId) return
    loadWaiters()
    loadCategories()
    loadVenue()
    loadZones()
    loadWaiterCalls()
    loadTodayReservations()
  }, [venueId])

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    } catch (e) {}
  }

async function loadZones() {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order')
    setZones(data || [])
  }

  async function loadTodayReservations() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabaseStaff
      .from('reservations')
      .select('id, slot_time, guests, table_shape, table_capacity, guest_name, guest_phone, notes')
      .eq('venue_id', venueId)
      .eq('date', today)
      .eq('status', 'confirmed')
      .order('slot_time')
    setTodayReservations(data || [])
  }

  async function loadWaiterCalls() {
    const { data } = await supabaseStaff
      .from('waiter_calls')
      .select('id, location_label, called_at')
      .eq('venue_id', venueId)
      .is('resolved_at', null)
      .order('called_at', { ascending: true })
    setWaiterCalls(data || [])
  }

  async function dismissAnonCall(callId) {
    setWaiterCalls(prev => prev.filter(c => c.id !== callId))
    await supabaseStaff
      .from('waiter_calls')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', callId)
  }

  async function loadVenue() {
    const { data } = await supabaseStaff
      .from('venues')
      .select('high_demand, slug, name, fiscal_enabled, fiscal_condition')
      .eq('id', venueId)
      .single()
    if (data) {
      setHighDemand(data.high_demand)
      if (data.slug) setVenueSlug(data.slug)
      setVenueName(data.name || '')
      setFiscalEnabled(!!data.fiscal_enabled)
      setFiscalCondition(data.fiscal_condition || 'responsable_inscripto')
    }
  }

  async function toggleHighDemand() {
    const newVal = !highDemand
    setHighDemand(newVal)
    await supabaseStaff
      .from('venues')
      .update({ high_demand: newVal })
      .eq('id', venueId)
  }

  async function loadCategories() {
    const { data } = await supabaseStaff
      .from('categories')
      .select('id, name, kind')
      .eq('venue_id', venueId)
    setCategories(data || [])
  }

  async function loadWaiters() {
    setWaiters(await fetchVenueWaiters(venueId))
  }

  async function addWaiter(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const { data, error } = await supabaseStaff
      .from('staff_names')
      .insert({ venue_id: venueId, full_name: trimmed })
      .select('id, full_name')
      .single()
    if (!error && data) {
      setWaiters(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    }
  }

  async function removeWaiter(id) {
    await supabaseStaff.from('staff_names').update({ is_active: false }).eq('id', id)
    setWaiters(prev => prev.filter(w => w.id !== id))
  }

  const [debugError, setDebugError] = useState(null)

  async function load({ silent } = {}) {
    if (!silent) setRefreshing(true)
    try {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      const [boardRes, proofRes, inPersonRes, paidRes] = await Promise.all([
        supabaseStaff
          .from('orders')
          .select(ORDER_SELECT)
          .eq('venue_id', venueId)
          .in('status', [...BOARD_COLUMNS, 'listo', 'pendiente_aprobacion'])
          .gte('created_at', todayStart)
          .order('created_at', { ascending: true }),
        supabaseStaff
          .from('orders')
          .select(ORDER_SELECT)
          .eq('venue_id', venueId)
          .eq('payment_status', 'en_revision')
          .order('created_at', { ascending: true }),
        supabaseStaff
          .from('orders')
          .select(ORDER_SELECT)
          .eq('venue_id', venueId)
          .eq('payment_status', 'cuenta_solicitada')
          .order('bill_requested_at', { ascending: true }),
        supabaseStaff
          .from('orders')
          .select(ORDER_SELECT)
          .eq('venue_id', venueId)
          .eq('payment_status', 'aprobado')
          .gte('payment_confirmed_at', todayStart)
          .order('payment_confirmed_at', { ascending: false })
          .limit(50)
      ])

      if (boardRes.error) throw new Error(`boardRes: ${boardRes.error.message}`)
      if (proofRes.error) throw new Error(`proofRes: ${proofRes.error.message}`)
      if (inPersonRes.error) throw new Error(`inPersonRes: ${inPersonRes.error.message}`)

      // "Por cobrar en persona" = cuenta solicitada y el metodo NO es
      // transferencia (esos pasan por el flujo de comprobante en revision).
      // Se compara sin distinguir mayusculas/acentos ya que el nombre del
      // metodo viene de la tabla dinamica payment_methods, no de un enum.
      const inPersonOrders = (inPersonRes.data || []).filter(o => {
        const method = (o.payment_method || '').toLowerCase()
        return !method.includes('transfer')
      })

      // Los pedidos cobrados siguen visibles (panel de mesa y kanban) hasta que
      // el cajero los cierre: ahí se archivan y quedan solo en Pagado hoy/Historial
      let openOrders = boardRes.data || []

      // Cuando el FK join de assigned_staff falla (camarero de otro venue),
      // assigned_staff queda null aunque assigned_staff_id esté seteado.
      // Hacemos un lookup separado para resolver esos IDs.
      const unresolvedIds = [...new Set(
        [...openOrders, ...(proofRes.data || []), ...inPersonOrders]
          .filter(o => o.assigned_staff_id && !o.assigned_staff)
          .map(o => o.assigned_staff_id)
      )]
      if (unresolvedIds.length > 0) {
        const { data: crossStaff } = await supabaseStaff
          .from('staff_names')
          .select('id, full_name')
          .in('id', unresolvedIds)
        if (crossStaff?.length) {
          const staffMap = Object.fromEntries(crossStaff.map(s => [s.id, s]))
          const patch = o => o.assigned_staff_id && !o.assigned_staff && staffMap[o.assigned_staff_id]
            ? { ...o, assigned_staff: staffMap[o.assigned_staff_id] }
            : o
          openOrders = openOrders.map(patch)
        }
      }

      setOrders(openOrders)
      setPendingProofOrders(proofRes.data || [])
      setPendingInPersonOrders(inPersonOrders)
      setPaidOrders(paidRes.data || [])

      // Facturas de los pedidos cobrados de hoy (para el botón Facturar/ticket)
      const paidIds = (paidRes.data || []).map(o => o.id)
      if (paidIds.length) {
        const { data: invData } = await supabaseStaff
          .from('fiscal_invoices')
          .select('*')
          .in('order_id', paidIds)
        setInvoices(Object.fromEntries((invData || []).map(inv => [inv.order_id, inv])))
      } else {
        setInvoices({})
      }

      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      console.error('Error en load():', err)
      setDebugError(err?.message || String(err))
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!venueId) return
    load()

    // Tiempo real: nuevos pedidos y cambios de estado aparecen sin recargar.
    // Esto funciona bien para el staff porque su sesion usa Supabase Auth
    // normal (no depende de headers custom como el cliente).
    const channel = supabaseStaff
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` },
        () => load({ silent: true })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => load({ silent: true })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiter_calls', filter: `venue_id=eq.${venueId}` },
        () => loadWaiterCalls()
      )
      .subscribe()

    return () => supabaseStaff.removeChannel(channel)
  }, [venueId])

  // Generar URLs firmadas para mostrar los comprobantes (el bucket es privado)
  useEffect(() => {
    async function loadUrls() {
      const entries = await Promise.all(
        pendingProofOrders
          .filter(o => o.payment_proof_url && !proofUrls[o.id])
          .map(async o => {
            const { data } = await supabaseStaff.storage
              .from(PROOF_BUCKET)
              .createSignedUrl(o.payment_proof_url, 3600)
            return [o.id, data?.signedUrl]
          })
      )
      if (entries.length) {
        setProofUrls(prev => ({ ...prev, ...Object.fromEntries(entries) }))
      }
    }
    if (pendingProofOrders.length) loadUrls()
  }, [pendingProofOrders])

  async function updateStatus(orderId, newStatus, extraFields = {}) {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus, ...extraFields } : o)))
    await supabaseStaff.from('orders').update({ status: newStatus, ...extraFields }).eq('id', orderId)
    if (newStatus === 'listo' || newStatus === 'entregado' || newStatus === 'rechazado') {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ order_id: orderId, event_type: newStatus }),
      }).catch(() => {})
    }
  }

  // Archiva un pedido entregado: sale del tablero y queda en Historial.
  // Si era el último pedido activo de su sesión, cierra también la mesa.
  async function closeOrder(order) {
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await supabaseStaff.from('orders').update({ status: 'cerrado' }).eq('id', order.id)
    if (order.session_id) {
      const { data: remaining } = await supabaseStaff
        .from('orders')
        .select('id')
        .eq('session_id', order.session_id)
        .in('status', ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado'])
        .limit(1)
      if (!remaining?.length) {
        await supabaseStaff
          .from('table_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', order.session_id)
      }
    }
  }

  async function dismissWaiterCall(orderId) {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, waiter_called_at: null } : o)))
    await supabaseStaff.from('orders').update({ waiter_called_at: null }).eq('id', orderId)
  }

  async function assignWaiter(orderId, staffId) {
    const waiter = waiters.find(w => w.id === staffId) || null
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, assigned_staff_id: staffId, assigned_staff: waiter } : o))
    )
    setPendingInPersonOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, assigned_staff_id: staffId, assigned_staff: waiter } : o))
    )
    await supabaseStaff.from('orders').update({ assigned_staff_id: staffId || null }).eq('id', orderId)
  }

  // Confirma la cuenta solicitada (transferencia revisada, o cobro en
  // persona en efectivo/tarjeta). Esto NO toca el status de cocina/entrega:
  // son dos ejes independientes, el pedido puede llevar rato "entregado".
  async function confirmPayment(order) {
    const confirmedAt = new Date().toISOString()
    await supabaseStaff
      .from('orders')
      .update({
        payment_status: 'aprobado',
        payment_confirmed_by: profile.id,
        payment_confirmed_at: confirmedAt
      })
      .eq('id', order.id)
    setPendingProofOrders(prev => prev.filter(o => o.id !== order.id))
    setPendingInPersonOrders(prev => prev.filter(o => o.id !== order.id))
    setPaidOrders(prev => [{ ...order, payment_status: 'aprobado', payment_confirmed_at: confirmedAt }, ...prev])
    load({ silent: true })
  }

  async function rejectPayment(order) {
    if (!confirm('¿Rechazar este comprobante? El cliente va a tener que pedir la cuenta de nuevo.')) return
    await supabaseStaff
      .from('orders')
      .update({
        payment_status: 'rechazado'
      })
      .eq('id', order.id)
    setPendingProofOrders(prev => prev.filter(o => o.id !== order.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando pedidos...</p>
      </div>
    )
  }

  if (debugError) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-red-700 text-sm font-medium mb-2">Error al cargar el dashboard</p>
          <p className="text-smoke-400 text-xs break-all">{debugError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950">
      {isImpersonating && (
        <div className="bg-violet-600/20 border-b border-violet-500/30 px-5 py-2 flex items-center justify-between">
          <p className="text-violet-300 text-xs font-semibold">Modo SuperAdmin — estás viendo este venue como propietario</p>
          <button
            onClick={() => { exitVenue(); window.location.href = '/admin/superadmin' }}
            className="text-violet-300 text-xs underline"
          >
            Salir del venue
          </button>
        </div>
      )}
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
          <p className="text-smoke-500 text-xs mt-0.5">{profile?.full_name}</p>
        </div>
        <div className="flex gap-3 items-center">
          {isSuperAdmin && (
            <Link to="/admin/superadmin" className="text-ember-500 text-xs underline font-semibold">
              Superadmin
            </Link>
          )}
          {profile?.role === 'camarero' && (
            <Link to="/admin/mi-turno" className="text-smoke-400 text-xs underline">
              Mi turno
            </Link>
          )}
          {profile?.role !== 'camarero' && (
            <Link to="/admin/turno" className="text-smoke-400 text-xs underline">
              Turno
            </Link>
          )}
          {profile?.role !== 'camarero' && (
            <Link to="/admin/auditor" className="text-smoke-400 text-xs underline">
              Auditor
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">
              Mi Local
            </Link>
          )}
          <button onClick={signOut} className="text-smoke-500 text-xs underline">
            Salir
          </button>
        </div>
      </header>

      <div className="px-5 py-2 flex items-center justify-between border-b border-carbon-700">
        <span className="text-smoke-400 text-xs">Alta demanda</span>
        <button
          onClick={toggleHighDemand}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            highDemand ? 'bg-red-500' : 'bg-carbon-700'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            highDemand ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={() => setView('mapa')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'mapa' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Mapa
        </button>
        <button
          onClick={() => setView('pedidos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'pedidos' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Pedidos
        </button>
        <button
          onClick={() => setView('cocina')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'cocina' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Cocina
        </button>
        <button
          onClick={() => navigate('/admin/tomar?location_type=retiro&location_label=Mostrador&return_to=dashboard')}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-ember-500/40 text-ember-400 active:opacity-70"
        >
          Mostrador
        </button>
      </div>

      {(() => {
        const orderCalls = orders.filter(o => o.waiter_called_at)
        const total = waiterCalls.length + orderCalls.length
        const active = total > 0
        return (
          <div className="px-4 pt-3">
            <div className={`rounded-xl border px-3 py-2 transition-colors ${active ? 'bg-ember-500/8 border-ember-500/25' : 'bg-carbon-900 border-carbon-700'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={active ? 'text-ember-400' : 'text-smoke-600'}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-ember-400' : 'text-smoke-600'}`}>
                  Atención{active ? ` · ${total}` : ''}
                </span>
              </div>
              {!active ? (
                <p className="text-smoke-600 text-[10px]">Sin solicitudes</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {waiterCalls.map(call => (
                    <div key={call.id} className="flex items-center gap-2.5 bg-carbon-800 border border-carbon-600 rounded-lg px-2.5 py-1.5 flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-smoke-100 text-xs font-semibold leading-tight max-w-[130px] truncate">{call.location_label}</p>
                        <p className="text-smoke-500 text-[10px]">
                          {new Date(call.called_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissAnonCall(call.id)}
                        className="flex-shrink-0 bg-ember-500 text-white text-[10px] font-bold px-2 py-1 rounded-md"
                      >
                        Atendido
                      </button>
                    </div>
                  ))}
                  {orderCalls.map(order => (
                    <div key={order.id} className="flex items-center gap-2.5 bg-carbon-800 border border-carbon-600 rounded-lg px-2.5 py-1.5 flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-smoke-100 text-xs font-semibold leading-tight max-w-[130px] truncate">
                          #{order.daily_number || order.id.slice(0,4).toUpperCase()} · {order.location_label}
                        </p>
                        <p className="text-smoke-500 text-[10px]">
                          {new Date(order.waiter_called_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissWaiterCall(order.id)}
                        className="flex-shrink-0 bg-ember-500 text-white text-[10px] font-bold px-2 py-1 rounded-md"
                      >
                        Atendido
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {view !== 'cocina' && pendingProofOrders.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-ember-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Comprobantes por confirmar · {pendingProofOrders.length}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pendingProofOrders.map(order => (
              <ProofCard
                key={order.id}
                order={order}
                proofUrl={proofUrls[order.id]}
                onConfirm={() => confirmPayment(order)}
                onReject={() => rejectPayment(order)}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'mapa' ? (
        <MapaView
          orders={orders}
          zones={zones}
          venueId={venueId}
          venueSlug={venueSlug}
          venueName={venueName}
          onUpdateStatus={updateStatus}
          onConfirmPayment={confirmPayment}
          fiscalEnabled={fiscalEnabled}
          fiscalCondition={fiscalCondition}
          invoices={invoices}
          onInvoiceEmitted={(orderId, inv) => setInvoices(prev => ({ ...prev, [orderId]: inv }))}
        />
      ) : view === 'cocina' ? (
        <CocinaView orders={orders} categories={categories} onUpdateStatus={updateStatus} onRefresh={load} />
      ) : (
        <>
          {profile?.role !== 'camarero' && (
            <LowStockPanel venueId={venueId} onCount={setLowStockCount} chipOnly />
          )}
          {lowStockCount > 0 && profile?.role !== 'camarero' && (
            <div className="px-4 pt-3">
              <button
                onClick={() => setShowLowStockModal(true)}
                className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {lowStockCount} con bajo stock
              </button>
            </div>
          )}
          {todayReservations.length > 0 && profile?.role !== 'camarero' && (
            <div className="px-4 pt-2">
              <button
                onClick={() => setShowReservationsModal(true)}
                className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {todayReservations.length} {todayReservations.length === 1 ? 'reserva' : 'reservas'} hoy
              </button>
            </div>
          )}
          {showReservationsModal && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReservationsModal(false)}
            >
              <div
                className="w-full max-w-md bg-carbon-950 rounded-t-2xl pb-8 pt-2 max-h-[70vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-carbon-600 rounded-full mx-auto mb-4" />
                <div className="px-4">
                  <p className="text-smoke-300 font-semibold text-sm mb-3">Reservas de hoy</p>
                  <div className="space-y-2">
                    {todayReservations.map(r => (
                      <div key={r.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-smoke-200 font-bold text-sm">{r.slot_time?.slice(0, 5)} — {r.guest_name}</p>
                          <span className="text-smoke-500 text-xs">{r.guests} pers.</span>
                        </div>
                        {r.table_shape && (
                          <p className="text-smoke-500 text-xs capitalize">{r.table_shape}{r.table_capacity ? ` · ${r.table_capacity} cap.` : ''}</p>
                        )}
                        <p className="text-smoke-600 text-xs">{r.guest_phone}</p>
                        {r.notes && <p className="text-smoke-600 text-xs mt-1 italic">{r.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {showLowStockModal && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLowStockModal(false)}
            >
              <div
                className="w-full max-w-md bg-carbon-950 rounded-t-2xl pb-8 pt-2 max-h-[70vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-carbon-600 rounded-full mx-auto mb-4" />
                <LowStockPanel venueId={venueId} onCount={setLowStockCount} />
              </div>
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto p-4">
          {BOARD_COLUMNS.map(status => (
            <Column
              key={status}
              status={status}
              orders={status === 'recibido'
                ? orders.filter(o => o.status === 'recibido' || o.status === 'pendiente_aprobacion')
                : status === 'en_preparacion'
                  ? orders.filter(o => o.status === 'en_preparacion' || o.status === 'listo')
                  : orders.filter(o => o.status === status)
              }
              onUpdateStatus={updateStatus}
              onDismissCall={dismissWaiterCall}
              waiters={waiters}
              onAssignWaiter={assignWaiter}
              pendingInPersonOrders={status === 'entregado' ? pendingInPersonOrders : []}
              paidOrders={status === 'entregado' ? paidOrders.filter(p => !orders.some(o => o.id === p.id)) : []}
              onConfirmPayment={status === 'entregado' ? confirmPayment : null}
              onCloseOrder={status === 'entregado' ? closeOrder : null}
              fiscalEnabled={status === 'entregado' ? fiscalEnabled : false}
              fiscalCondition={fiscalCondition}
              invoices={invoices}
              onInvoiceEmitted={(orderId, inv) => setInvoices(prev => ({ ...prev, [orderId]: inv }))}
              venueName={venueName}
            />
          ))}
        </div>
        </>
      )}
    </div>
  )
}

const KIND_ORDER = ['comida', 'otro']

function CocinaView({ orders, categories, onUpdateStatus, onRefresh }) {
  // Solo comida y otros — bebidas las maneja el mostrador
  const kindByCategory = Object.fromEntries(
    categories.map(c => [c.id, c.kind || 'otro'])
  )

  const activeOrders = orders
    .filter(o => ['recibido', 'en_preparacion'].includes(o.status))
    .map(order => {
      const foodItems = (order.order_items || []).filter(item => {
        const kind = kindByCategory[item.products?.category_id] || 'otro'
        return kind !== 'bebida'
      })
      return { order, items: foodItems }
    })
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => new Date(a.order.created_at) - new Date(b.order.created_at))

  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <p className="text-smoke-500 text-sm">No hay pedidos activos en cocina.</p>
        <button onClick={onRefresh} className="flex items-center gap-1 text-smoke-400 text-xs border border-carbon-700 rounded-full px-3 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round"/>
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Actualizar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">
          Cocina · {activeOrders.length} pedidos
        </p>
        <button onClick={onRefresh} className="flex items-center gap-1 text-smoke-400 text-xs border border-carbon-700 rounded-full px-3 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round"/>
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {activeOrders.map(({ order, items }) => {
          const elapsedMin = Math.round(
            (Date.now() - new Date(order.created_at).getTime()) / 60000
          )
          const trafficColor = elapsedMin > 30
            ? 'text-red-600 bg-red-500/10 border-red-500/50'
            : elapsedMin > 15
              ? 'text-amber-600 bg-amber-500/10 border-amber-500/40'
              : 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'

          const cardBorder = elapsedMin > 30
            ? 'border-red-500/50'
            : elapsedMin > 15
              ? 'border-amber-500/40'
              : 'border-carbon-700'

          return (
            <div
              key={order.id}
              className={`bg-carbon-900 border rounded-2xl p-3 flex flex-col ${cardBorder}`}
            >
              {/* Header: número + ubicación + tiempo */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-ember-500 font-bold text-xl leading-none">
                    #{order.daily_number || order.id.slice(0, 4)}
                  </p>
                  <p className="text-smoke-300 text-sm font-medium mt-0.5">
                    {order.location_label}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${trafficColor}`}>
                  {elapsedMin}m
                </span>
              </div>

              {/* Ítems */}
              <ul className="flex-1 space-y-1 mb-3">
                {items.map(item => (
                  <li key={item.id} className="text-smoke-200 text-sm">
                    <span className="font-mono text-ember-400 font-bold">{item.quantity}×</span>{' '}
                    {item.product_name}
                    {item.item_notes && (
                      <span className="block text-amber-600 text-xs italic ml-4">↳ {item.item_notes}</span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Notas generales */}
              {order.notes && (
                <p className="text-amber-600 text-xs italic mb-2 border-l-2 border-amber-500/40 pl-2 flex items-center gap-1">
                  <FileTextIcon size={12} /> {order.notes}
                </p>
              )}

              {/* Tiempo estimado */}
              {!order.prep_started_at ? (
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[10, 15, 20, 25, 30].map(min => (
                      <button
                        key={min}
                        onClick={async () => {
                          await supabaseStaff.from('orders').update({
                            prep_time_minutes: min,
                            prep_started_at: new Date().toISOString(),
                            status: 'en_preparacion'
                          }).eq('id', order.id)
                          onRefresh()
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-carbon-700 text-smoke-400 hover:border-ember-500 hover:text-ember-500"
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-smoke-500 text-[10px] mb-2 flex items-center gap-0.5"><ClockIcon size={11} /> {order.prep_time_minutes} min estimados</p>
              )}

              {/* Botón Listo */}
              <button
                onClick={() => onUpdateStatus(order.id, 'listo')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-base"
              >
                Listo ✓
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MesaPanel({ mesa, orders, venueSlug, venueName, onClose, onCloseTable, onUpdateStatus, onConfirmPayment, fiscalEnabled = false, fiscalCondition, invoices = {}, onInvoiceEmitted }) {
  const navigate = useNavigate()
  const ACTIVE = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado']
  const STATUS_RANK = { listo: 0, en_preparacion: 1, recibido: 2, pendiente_aprobacion: 3, entregado: 4 }
  const [closing, setClosing] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  const mesaOrders = orders
    .filter(o => o.zone_id === mesa.id && ACTIVE.includes(o.status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  // Load the active session from the DB — orders may not carry it if all are paid/archived
  useEffect(() => {
    supabaseStaff
      .from('table_sessions')
      .select('id')
      .eq('zone_id', mesa.id)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setActiveSession(data || null))
  }, [mesa.id])

  const sessionId = activeSession?.id || mesaOrders[0]?.session_id || null

  async function handleCloseTable() {
    setClosing(true)
    // Archivar TODOS los pedidos activos de la mesa (quedan en Historial):
    // los de hoy, los huérfanos de otros días y los colgados de sesiones muertas
    await supabaseStaff
      .from('orders')
      .update({ status: 'cerrado' })
      .eq('zone_id', mesa.id)
      .in('status', ACTIVE)
    if (sessionId) {
      // Pedidos de la sesión que puedan tener otra zona (o ninguna)
      await supabaseStaff
        .from('orders')
        .update({ status: 'cerrado' })
        .eq('session_id', sessionId)
        .in('status', ACTIVE)
    }
    // Cerrar todas las sesiones activas de la zona (por si quedó alguna duplicada)
    await supabaseStaff
      .from('table_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('zone_id', mesa.id)
      .eq('is_active', true)
    setClosing(false)
    setActiveSession(null)
    onCloseTable?.()
  }

  function handleNuevoPedido() {
    const params = new URLSearchParams({ zone_id: mesa.id, location_label: mesa.name, return_to: 'dashboard' })
    if (sessionId) params.set('session_id', sessionId)
    navigate(`/admin/tomar?${params.toString()}`)
  }

  const itemMap = {}
  mesaOrders.forEach(order => {
    ;(order.order_items || []).forEach(item => {
      const key = item.product_name
      if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, worstStatus: order.status }
      itemMap[key].qty += item.quantity
      if (STATUS_RANK[order.status] < STATUS_RANK[itemMap[key].worstStatus]) {
        itemMap[key].worstStatus = order.status
      }
    })
  })
  const consolidatedItems = Object.values(itemMap).sort(
    (a, b) => STATUS_RANK[a.worstStatus] - STATUS_RANK[b.worstStatus] || a.name.localeCompare(b.name)
  )

  const totalItems = consolidatedItems.reduce((s, i) => s + i.qty, 0)
  const totalRevenue = mesaOrders.reduce((s, o) => s + (o.total || 0), 0)

  const STATUS_INLINE = {
    listo: 'text-emerald-400 font-semibold',
    en_preparacion: 'text-ember-500',
    recibido: 'text-blue-400',
    pendiente_aprobacion: 'text-amber-400',
    entregado: 'text-smoke-500',
  }
  const STATUS_SHORT = {
    listo: 'Listo',
    en_preparacion: 'En prep.',
    recibido: 'Recibido',
    pendiente_aprobacion: 'Por aprobar',
    entregado: 'Entregado',
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-carbon-950/70 md:bg-carbon-950/40" onClick={onClose} />
      <div
        className="fixed z-50 bg-carbon-900 flex flex-col border-carbon-700
          bottom-0 left-0 right-0 rounded-t-3xl border-t max-h-[78vh]
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 md:max-h-full md:rounded-none md:rounded-l-3xl md:border-t-0 md:border-l"
        style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-carbon-700" />
        </div>

        <div className="px-5 pb-4 pt-1 md:pt-5 flex items-start justify-between flex-shrink-0 border-b border-carbon-800">
          <div>
            <h2 className="text-smoke-100 font-bold text-2xl leading-tight">{mesa.name}</h2>
            <p className="text-smoke-500 text-xs mt-0.5">
              {mesaOrders.length === 0
                ? 'Sin pedidos activos'
                : `${mesaOrders.length} pedido${mesaOrders.length !== 1 ? 's' : ''} · ${totalItems} ítem${totalItems !== 1 ? 's' : ''} · ${formatPrice(totalRevenue)}`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 w-8 h-8 flex items-center justify-center text-smoke-500 hover:text-smoke-200 bg-carbon-800 rounded-full flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-4">
          {mesaOrders.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto mb-3 text-smoke-700" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <p className="text-smoke-500 text-sm">Mesa libre</p>
            </div>
          ) : (
            <>
              <div className="px-5 pt-5">
                <p className="text-smoke-600 text-[10px] font-semibold uppercase tracking-widest mb-3">Lo que pidió la mesa</p>
                <div className="space-y-2.5">
                  {consolidatedItems.map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-smoke-600 font-mono text-sm w-7 text-right flex-shrink-0">{item.qty}×</span>
                      <span className="text-smoke-200 text-sm flex-1 leading-snug">{item.name}</span>
                      <span className={`text-[11px] flex-shrink-0 ${STATUS_INLINE[item.worstStatus]}`}>
                        {STATUS_SHORT[item.worstStatus]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-5 mt-5 border-t border-carbon-800" />

              <div className="px-5 pt-4">
                <p className="text-smoke-600 text-[10px] font-semibold uppercase tracking-widest mb-3">Pedidos</p>
                <div className="space-y-3">
                  {mesaOrders.map(order => {
                    const isListo = order.status === 'listo'
                    const isBillAlert = order.payment_status === 'cuenta_solicitada' || order.payment_status === 'en_revision'
                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl p-4 border ${
                          isListo
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : isBillAlert
                              ? 'bg-amber-500/5 border-amber-500/30'
                              : 'bg-carbon-800 border-carbon-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-mono text-smoke-400 text-xs">
                            #{order.daily_number || order.id.slice(0, 6)}
                            {order.customers?.full_name && (
                              <span className="text-smoke-500 ml-2 font-sans font-normal">· {order.customers.full_name.split(' ')[0]}</span>
                            )}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>

                        <ul className="space-y-1 mb-3">
                          {(order.order_items || []).map(item => (
                            <li key={item.id} className="text-smoke-400 text-xs flex items-baseline gap-2">
                              <span className="text-smoke-600 font-mono w-5 text-right flex-shrink-0">{item.quantity}×</span>
                              <span>{item.product_name}</span>
                              {item.notes && <span className="text-smoke-600 truncate">— {item.notes}</span>}
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between">
                          <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
                          <div className="flex items-center gap-2">
                            {isBillAlert && (
                              <span className="text-amber-400 text-xs font-semibold">⚡ Cuenta</span>
                            )}
                            {/* Avance de estado directo desde el panel: el cajero
                                puede manejar todo el ciclo sin ir al kanban */}
                            {onUpdateStatus && order.status === 'pendiente_aprobacion' && (
                              <button
                                onClick={() => onUpdateStatus(order.id, 'recibido')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Aprobar ✓
                              </button>
                            )}
                            {onUpdateStatus && order.status === 'recibido' && (
                              <button
                                onClick={() => onUpdateStatus(order.id, 'en_preparacion')}
                                className="bg-ember-500 hover:bg-ember-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Preparación →
                              </button>
                            )}
                            {onUpdateStatus && order.status === 'en_preparacion' && (
                              <button
                                onClick={() => onUpdateStatus(order.id, 'listo')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Listo ✓
                              </button>
                            )}
                            {onUpdateStatus && isListo && (
                              <button
                                onClick={() => onUpdateStatus(order.id, 'entregado')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Entregar ✓
                              </button>
                            )}
                            {onConfirmPayment && order.status === 'entregado' && order.payment_status === 'pendiente' && (
                              <button
                                onClick={() => onConfirmPayment(order)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                💰 Cobrar
                              </button>
                            )}
                            {order.status === 'entregado' && order.payment_status === 'aprobado' && (
                              <span className="text-emerald-500 text-xs font-semibold">Pagado ✓</span>
                            )}
                          </div>
                        </div>

                        {fiscalEnabled && (order.payment_status === 'aprobado' || invoices[order.id]?.status === 'approved') && (
                          <FiscalTicket
                            order={order}
                            invoice={invoices[order.id]}
                            onEmitted={onInvoiceEmitted}
                            venueName={venueName}
                            fiscalCondition={fiscalCondition}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky bottom actions */}
        <div className="flex-shrink-0 border-t border-carbon-800 px-5 py-4 flex gap-2">
          <button
            onClick={handleNuevoPedido}
            className="flex-1 bg-ember-500 hover:bg-ember-600 active:opacity-80 text-white text-sm font-bold py-3 rounded-2xl transition-colors"
          >
            + Nuevo pedido
          </button>
          {mesaOrders.length > 0 && (
            <button
              onClick={() => setShowSummary(true)}
              className="flex-shrink-0 border border-carbon-600 text-smoke-400 hover:text-smoke-200 hover:border-carbon-500 text-sm font-semibold px-3.5 py-3 rounded-2xl transition-colors"
              title="Resumen de cuenta para el cliente (no fiscal)"
            >
              🧾 Cuenta
            </button>
          )}
          <button
            onClick={handleCloseTable}
            disabled={closing}
            className="flex-shrink-0 border border-carbon-600 text-smoke-400 hover:text-smoke-200 hover:border-carbon-500 disabled:opacity-40 text-sm font-semibold px-3.5 py-3 rounded-2xl transition-colors"
          >
            {closing ? '...' : 'Cerrar mesa'}
          </button>
        </div>
      </div>

      {showSummary && (
        <AccountSummary
          orders={mesaOrders}
          venueName={venueName}
          locationLabel={mesa.name}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  )
}

function MapaView({ orders, zones, venueId, venueSlug, venueName, onUpdateStatus, onConfirmPayment, fiscalEnabled, fiscalCondition, invoices, onInvoiceEmitted }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cssFull, setCssFull] = useState(false)
  const [selectedMesa, setSelectedMesa] = useState(null)
  const [mapRefresh, setMapRefresh] = useState(0)

  function handleMesaSelect(zone) {
    setSelectedMesa(prev => prev?.id === zone.id ? null : zone)
  }

  useEffect(() => {
    const handler = () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement)
      setIsFullscreen(active)
      if (!active) setCssFull(false)
    }
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  function toggleFullscreen() {
    const effectivelyFull = isFullscreen || cssFull
    if (effectivelyFull) {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      setCssFull(false)
    } else {
      const el = containerRef.current
      const req = el?.requestFullscreen || el?.webkitRequestFullscreen
      if (req) {
        req.call(el).catch(() => setCssFull(true))
      } else {
        setCssFull(true)
      }
    }
  }

  const effectiveFullscreen = isFullscreen || cssFull

  const activeOrders = orders.filter(o => ['recibido', 'en_preparacion', 'listo', 'pendiente_aprobacion'].includes(o.status))
  const listoOrders = orders.filter(o => o.status === 'listo')
  const ocupadas = [...new Set(activeOrders.map(o => o.location_label).filter(Boolean))].length

  const allMesas = zones.filter(z => z.is_active && z.pos_x != null && z.pos_y != null && z.type !== 'zona' && z.type !== 'retiro' && z.type !== 'decor')
  const zonaIdsWithMesas = new Set(allMesas.map(m => m.parent_zone_id).filter(Boolean))
  const relevantZonas = zones.filter(z => z.type === 'zona' && z.is_active && zonaIdsWithMesas.has(z.id))

  return (
    <div
      ref={containerRef}
      className={`${effectiveFullscreen ? 'fixed inset-0 z-50 bg-carbon-950 flex flex-col p-6 overflow-y-auto' : 'px-4 pt-4 pb-6'}`}
    >
      {/* Stats strip + fullscreen button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-5">
          <div>
            <p className="text-smoke-600 text-[10px] font-semibold uppercase tracking-widest">Activos</p>
            <p className="text-smoke-200 font-bold text-xl font-mono leading-none mt-0.5">{activeOrders.length}</p>
          </div>
          {ocupadas > 0 && (
            <div>
              <p className="text-smoke-600 text-[10px] font-semibold uppercase tracking-widest">Ubicaciones</p>
              <p className="text-smoke-200 font-bold text-xl font-mono leading-none mt-0.5">{ocupadas}</p>
            </div>
          )}
          {listoOrders.length > 0 && (
            <div>
              <p className="text-smoke-600 text-[10px] font-semibold uppercase tracking-widest">Listos</p>
              <p className="text-emerald-400 font-bold text-xl font-mono leading-none mt-0.5">{listoOrders.length}</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 text-smoke-500 border border-carbon-700 rounded-lg px-2.5 py-1.5 text-xs hover:text-smoke-300 transition-colors"
        >
          {effectiveFullscreen ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
              Salir
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              Pantalla completa
            </>
          )}
        </button>
      </div>

      {/* Floor plan */}
      <div className={effectiveFullscreen ? 'flex-1 flex gap-4 overflow-hidden' : ''}>
        {effectiveFullscreen && relevantZonas.length > 1 ? (
          relevantZonas.map(zona => (
            <div key={zona.id} className="flex-1 flex flex-col min-w-0">
              <p className="text-smoke-500 text-[10px] font-semibold uppercase tracking-widest mb-2">{zona.name}</p>
              <FloorPlanViewer
                zones={zones}
                venueId={venueId}
                supabaseClient={supabaseStaff}
                filterZoneId={zona.id}
                selectedZone={selectedMesa}
                onSelect={handleMesaSelect}
                refreshKey={mapRefresh}
              />
            </div>
          ))
        ) : (
          <FloorPlanViewer
            zones={zones}
            venueId={venueId}
            supabaseClient={supabaseStaff}
            selectedZone={selectedMesa}
            onSelect={handleMesaSelect}
            refreshKey={mapRefresh}
          />
        )}
      </div>

      {selectedMesa && (
        <MesaPanel
          mesa={selectedMesa}
          orders={orders}
          venueSlug={venueSlug}
          venueName={venueName}
          onConfirmPayment={onConfirmPayment}
          fiscalEnabled={fiscalEnabled}
          fiscalCondition={fiscalCondition}
          invoices={invoices}
          onInvoiceEmitted={onInvoiceEmitted}
          onClose={() => setSelectedMesa(null)}
          onCloseTable={() => { setSelectedMesa(null); setMapRefresh(k => k + 1) }}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </div>
  )
}

function normalizePaymentMethod(method) {
  const m = (method || '').toLowerCase()
  if (m.includes('transfer')) return 'transferencia'
  if (m.includes('efectivo')) return 'efectivo'
  if (m.includes('tarjeta') || m.includes('qr') || m.includes('posnet')) return 'tarjeta'
  return 'tarjeta'
}

const METHOD_ALERT_STYLES = {
  efectivo: 'border-emerald-500/60 bg-emerald-500/10',
  tarjeta: 'border-carbon-600 bg-carbon-800',
  transferencia: 'border-amber-500/60 bg-amber-500/10'
}

const METHOD_ALERT_TEXT = {
  efectivo: 'text-emerald-700',
  tarjeta: 'text-smoke-300',
  transferencia: 'text-amber-700'
}

const METHOD_ALERT_LABELS = {
  efectivo: 'Pidió la cuenta — cobrar en efectivo',
  tarjeta: 'Pidió la cuenta — cobrar con posnet/QR',
  transferencia: 'Comprobante por revisar'
}

function SalonOrderRow({ order }) {
  const isAlert = order.payment_status === 'cuenta_solicitada' || order.payment_status === 'en_revision'
  const alertStyle = isAlert ? METHOD_ALERT_STYLES[normalizePaymentMethod(order.payment_method)] : null

  return (
    <div
      className={`rounded-xl p-2.5 border ${
        alertStyle || 'border-carbon-700 bg-carbon-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-ember-400 text-xs">{order.daily_number ? `#${order.daily_number}` : `#${order.id.slice(0, 6)}`}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>
      {isAlert && (
        <p className={`text-xs font-semibold mt-1 ${METHOD_ALERT_TEXT[normalizePaymentMethod(order.payment_method)]}`}>
          {METHOD_ALERT_LABELS[normalizePaymentMethod(order.payment_method)] || 'Pidió la cuenta'}
        </p>
      )}
      {order.payment_status === 'cuenta_solicitada' &&
        normalizePaymentMethod(order.payment_method) === 'efectivo' &&
        order.cash_amount && (
          <p className="text-emerald-700 text-xs mt-0.5">
            vuelto {formatPrice(order.cash_amount - order.total)}
          </p>
        )}
      {order.assigned_staff?.full_name && (
        <p className="text-smoke-500 text-xs mt-1 flex items-center gap-1"><ChefHatIcon size={12} /> {order.assigned_staff.full_name}</p>
      )}
    </div>
  )
}

function WaiterManager({ waiters, onAdd, onRemove }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  function handleAdd() {
    onAdd(name)
    setName('')
  }

  return (
    <div className="px-4 pt-3">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="text-smoke-400 text-xs underline"
      >
        {open ? 'Ocultar' : 'Gestionar'} camareros ({waiters.length})
      </button>

      {open && (
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mt-2">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nombre del camarero"
              className="input flex-1"
            />
            <button
              onClick={handleAdd}
              className="bg-ember-500 hover:bg-ember-600 text-white text-sm font-semibold px-4 rounded-xl"
            >
              Agregar
            </button>
          </div>

          {waiters.length === 0 ? (
            <p className="text-smoke-500 text-xs">Todavía no agregaste ningún camarero.</p>
          ) : (
            <ul className="space-y-1.5">
              {waiters.map(w => (
                <li
                  key={w.id}
                  className="flex items-center justify-between bg-carbon-800 rounded-lg px-3 py-1.5"
                >
                  <span className="text-smoke-300 text-sm">{w.full_name}</span>
                  <button
                    onClick={() => onRemove(w.id)}
                    className="text-red-700 text-xs underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function WaiterSelect({ order, waiters, onAssign }) {
  const isLocalWaiter = !order.assigned_staff_id || waiters.some(w => w.id === order.assigned_staff_id)

  if (!isLocalWaiter) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-smoke-300 bg-carbon-800 border border-carbon-700 rounded-full px-2.5 py-1 flex items-center gap-1">
          <ChefHatIcon size={12} /> {order.assigned_staff?.full_name || 'Camarero asignado'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onAssign(order.id, null) }}
          className="text-smoke-500 text-xs hover:text-smoke-300"
          title="Desasignar"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <select
      value={order.assigned_staff_id || ''}
      onChange={e => onAssign(order.id, e.target.value || null)}
      onClick={e => e.stopPropagation()}
      className="text-xs bg-carbon-800 border border-carbon-700 rounded-full px-2.5 py-1 text-smoke-300"
    >
      <option value="">Sin camarero</option>
      {waiters.map(w => (
        <option key={w.id} value={w.id}>
          {w.full_name}
        </option>
      ))}
    </select>
  )
}

function CustomerContact({ customer, order }) {
  if (!customer) return null
  const waBase = customer.whatsapp
    ? `https://wa.me/${customer.whatsapp.replace(/[^\d]/g, '')}`
    : null
  const prepMsg = order?.status === 'en_preparacion' && waBase
    ? `${waBase}?text=${encodeURIComponent(`¡Hola ${customer.full_name?.split(' ')[0] || ''}! Tu pedido #${order.daily_number || ''} está en preparación 🍳 En unos minutos está listo.`)}`
    : null
  return (
    <div className="flex items-center justify-between mb-2 bg-carbon-800 rounded-lg px-2.5 py-1.5">
      <span className="text-smoke-300 text-xs">{customer.full_name}</span>
      {prepMsg ? (
        <a
          href={prepMsg}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-600 text-xs font-semibold border border-emerald-600/30 rounded-lg px-2 py-0.5"
        >
          Avisar →
        </a>
      ) : waBase ? (
        <a
          href={waBase}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 text-xs font-medium underline"
        >
          WhatsApp →
        </a>
      ) : (
        <span className="text-smoke-500 text-xs">Sin WhatsApp</span>
      )}
    </div>
  )
}

function ProofCard({ order, proofUrl, onConfirm, onReject }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex-shrink-0 w-56 bg-carbon-900 border border-ember-500/40 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">{order.daily_number ? `#${order.daily_number}` : `#${order.id.slice(0, 6)}`}</span>
        <span className="font-mono text-smoke-300 text-xs">{formatPrice(order.total)}</span>
      </div>
      <CustomerContact customer={order.customers} />
      <p className="text-smoke-300 text-xs mb-2 flex items-center gap-1"><PinIcon size={12} /> {order.location_label}</p>

      {proofUrl ? (
        <button onClick={() => setExpanded(true)} className="block w-full">
          <img
            src={proofUrl}
            alt="Comprobante de transferencia"
            className="w-full h-32 object-cover rounded-lg border border-carbon-700"
          />
        </button>
      ) : (
        <div className="w-full h-32 rounded-lg bg-carbon-800 flex items-center justify-center text-smoke-500 text-xs">
          Cargando comprobante...
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onReject}
          className="flex-1 border border-red-500/40 text-red-700 text-xs font-semibold py-1.5 rounded-full"
        >
          Rechazar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 rounded-full"
        >
          Confirmar pago
        </button>
      </div>

      {expanded && proofUrl && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
        >
          <img src={proofUrl} alt="Comprobante de transferencia" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  )
}

function InPersonCard({ order, waiters, onConfirm, onAssignWaiter, compact }) {
  const methodLabel = order.payment_method || 'Efectivo'
  const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  if (compact) {
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-ember-500 font-bold text-sm">
            #{order.daily_number || order.id.slice(0, 6)}
          </span>
          <span className="text-smoke-500 text-xs">{elapsedMin}m</span>
        </div>
        <p className="text-smoke-400 text-xs mb-1 flex items-center gap-1"><PinIcon size={12} /> {order.location_label}</p>
        <p className="text-smoke-400 text-xs mb-2">{methodLabel}</p>
        {normalizePaymentMethod(order.payment_method) === 'efectivo' && order.cash_amount && (
          <p className="text-emerald-700 text-xs mb-2">
            Vuelto {formatPrice(order.cash_amount - order.total)}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
          <button
            onClick={onConfirm}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded-full"
          >
            Cobrado ✓
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 w-56 bg-carbon-900 border border-carbon-700 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">{order.daily_number ? `#${order.daily_number}` : `#${order.id.slice(0, 6)}`}</span>
        <span className="text-smoke-500 text-xs">{elapsedMin} min</span>
      </div>
      <CustomerContact customer={order.customers} />
      <p className="text-smoke-300 text-sm font-medium mb-1 flex items-center gap-1"><PinIcon size={14} /> {order.location_label}</p>
      <p className="text-smoke-400 text-xs mb-2 flex items-center gap-1"><CreditCardIcon size={12} /> Paga con {methodLabel}</p>
      {normalizePaymentMethod(order.payment_method) === 'efectivo' && order.cash_amount && (
        <p className="text-emerald-700 text-xs mb-2 flex items-center gap-1">
          <CreditCardIcon size={12} /> Paga con {formatPrice(order.cash_amount)} · vuelto {formatPrice(order.cash_amount - order.total)}
        </p>
      )}

      <div className="mb-2">
        <WaiterSelect order={order} waiters={waiters} onAssign={onAssignWaiter} />
      </div>

      <ul className="space-y-1 mb-3">
        {order.order_items.map(item => (
          <li key={item.id} className="text-smoke-400 text-xs">
            {item.quantity}× {item.product_name}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
      </div>
      <button
        onClick={onConfirm}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 rounded-full"
      >
        Marcar pago recibido
      </button>
    </div>
  )
}

function Column({ status, orders, onUpdateStatus, onDismissCall, waiters, onAssignWaiter, pendingInPersonOrders = [], paidOrders = [], onConfirmPayment, onCloseOrder, fiscalEnabled = false, fiscalCondition, invoices = {}, onInvoiceEmitted, venueName }) {
  const nextStatus = {
    recibido: 'en_preparacion',
    en_preparacion: 'entregado',
  }[status]

  const prevStatus = {
    en_preparacion: 'recibido',
    entregado: 'en_preparacion'
  }[status]

  const columnLabel = status === 'en_preparacion' ? 'Preparación' : STATUS_LABELS[status]
  const totalCount = orders.length + pendingInPersonOrders.length + paidOrders.length

  // Group orders by session_id preserving sort order
  const seen = new Map()
  const renderItems = []
  orders.forEach(order => {
    if (!order.session_id) {
      renderItems.push({ type: 'single', order })
      return
    }
    if (seen.has(order.session_id)) {
      renderItems[seen.get(order.session_id)].orders.push(order)
    } else {
      seen.set(order.session_id, renderItems.length)
      renderItems.push({ type: 'group', orders: [order], sessionId: order.session_id })
    }
  })

  return (
    <div className="flex-1 min-w-80">
      <div className={`px-3 py-2 rounded-lg border text-sm font-semibold mb-3 ${STATUS_COLORS[status]}`}>
        {columnLabel} · {totalCount}
      </div>
      <div className="space-y-3">
        {renderItems.map(item => {
          if (item.type === 'single' || item.orders.length === 1) {
            const order = item.type === 'single' ? item.order : item.orders[0]
            return (
              <OrderCard
                key={order.id}
                order={order}
                nextStatus={nextStatus}
                prevStatus={prevStatus}
                onUpdateStatus={onUpdateStatus}
                onDismissCall={onDismissCall}
                waiters={waiters}
                onAssignWaiter={onAssignWaiter}
                onCloseOrder={onCloseOrder}
                onConfirmPayment={onConfirmPayment}
                venueName={venueName}
                fiscalEnabled={fiscalEnabled}
                fiscalCondition={fiscalCondition}
                invoice={invoices[order.id]}
                onInvoiceEmitted={onInvoiceEmitted}
              />
            )
          }
          // Session group with multiple orders
          return (
            <div key={item.sessionId} className="rounded-2xl border border-violet-500/30 overflow-hidden bg-violet-500/5">
              <div className="px-3 py-1.5 border-b border-violet-500/20">
                <span className="text-violet-400 text-[10px] font-bold uppercase tracking-wider">
                  Sesión · {item.orders[0].location_label} · {item.orders.length} pedidos
                </span>
              </div>
              <div className="divide-y divide-carbon-800">
                {item.orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    nextStatus={nextStatus}
                    prevStatus={prevStatus}
                    onUpdateStatus={onUpdateStatus}
                    onDismissCall={onDismissCall}
                    waiters={waiters}
                    onAssignWaiter={onAssignWaiter}
                    onCloseOrder={onCloseOrder}
                    onConfirmPayment={onConfirmPayment}
                    venueName={venueName}
                    fiscalEnabled={fiscalEnabled}
                    fiscalCondition={fiscalCondition}
                    invoice={invoices[order.id]}
                    onInvoiceEmitted={onInvoiceEmitted}
                    inGroup
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Cobros dentro de Entregado */}
        {pendingInPersonOrders.length > 0 && (
          <div>
            <p className="text-blue-700 text-[10px] font-semibold uppercase tracking-wide mb-2 px-1">
              Por cobrar · {pendingInPersonOrders.length}
            </p>
            <div className="space-y-2">
              {pendingInPersonOrders.map(order => (
                <InPersonCard
                  key={order.id}
                  order={order}
                  waiters={waiters}
                  onConfirm={() => onConfirmPayment(order)}
                  onAssignWaiter={onAssignWaiter}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {pendingInPersonOrders.length > 0 && paidOrders.length > 0 && (
          <div className="border-t border-carbon-700 mt-2 pt-2" />
        )}

        {paidOrders.length > 0 && (
          <div>
            <p className="text-emerald-700 text-[10px] font-semibold uppercase tracking-wide mb-2 px-1">
              Pagado hoy · {paidOrders.length}
            </p>
            <div className="space-y-2">
              {paidOrders.map(order => (
                <div key={order.id} className="bg-carbon-900 border border-emerald-500/20 rounded-xl px-3 py-2.5 opacity-75">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-ember-500 font-bold text-sm">
                      #{order.daily_number || order.id.slice(0, 6)}
                    </span>
                    <span className="text-emerald-700 text-xs font-medium">
                      {(order.payment_method || '').toLowerCase().includes('mercado') ? 'Mercado Pago' : order.payment_method}
                    </span>
                  </div>
                  <p className="text-smoke-400 text-xs flex items-center gap-1"><PinIcon size={12} /> {order.location_label}</p>
                  <p className="font-mono text-smoke-300 text-sm mt-1">{formatPrice(order.total)}</p>
                  {fiscalEnabled && (
                    <FiscalTicket
                      order={order}
                      invoice={invoices[order.id]}
                      onEmitted={onInvoiceEmitted}
                      venueName={venueName}
                      fiscalCondition={fiscalCondition}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, nextStatus, prevStatus, onUpdateStatus, onDismissCall, waiters, onAssignWaiter, onCloseOrder, onConfirmPayment, venueName, fiscalEnabled = false, fiscalCondition, invoice, onInvoiceEmitted, inGroup }) {
  const [showWaiterSelect, setShowWaiterSelect] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  // Semáforo: verde <15, amarillo 15-30, rojo >30
  const trafficColor = order.status === 'entregado'
    ? 'text-smoke-500'
    : elapsedMin > 30
      ? 'text-red-700 font-semibold'
      : elapsedMin > 15
        ? 'text-amber-600 font-semibold'
        : 'text-emerald-700'

  const borderColor = order.status === 'listo'
    ? 'border-emerald-500/50'
    : order.status === 'entregado'
      ? 'border-carbon-700'
      : elapsedMin > 30
        ? 'border-red-500/50'
        : elapsedMin > 15
          ? 'border-amber-500/40'
          : 'border-carbon-700'

  return (
    <div className={`bg-carbon-900 p-4 ${inGroup ? '' : `border rounded-2xl ${borderColor}`}`}>
      {order.is_addition && !inGroup && (
        <div className="flex items-center gap-1.5 mb-2 bg-violet-500/10 border border-violet-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-violet-400 text-xs font-semibold">+ ADICIÓN · misma mesa</span>
        </div>
      )}
      {order.is_addition && inGroup && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-violet-400 text-[10px] font-bold uppercase tracking-wide">+ Ronda {order.daily_number}</span>
        </div>
      )}
      {order.status === 'listo' && (
        <div className="flex items-center gap-1.5 mb-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-emerald-500 text-xs font-semibold">✓ Listo para entregar</span>
        </div>
      )}
      {order.status === 'pendiente_aprobacion' && (
        <div className="flex items-center gap-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-amber-500 text-xs font-semibold flex items-center gap-1"><ClockIcon size={12} /> Pendiente de aprobar</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-500 font-bold text-sm">
          {order.daily_number ? `#${order.daily_number}` : `#${order.id.slice(0, 6)}`}
        </span>
        <span className={`text-xs ${trafficColor}`}>
          {elapsedMin} min
        </span>
      </div>

      {order.created_by_staff ? (
        <div className="flex items-center gap-2 mb-2 bg-carbon-800 rounded-lg px-2.5 py-1.5">
          <ChefHatIcon size={13} className="text-smoke-400" />
          <span className="text-smoke-300 text-xs font-medium">
            Tomado por {order.assigned_staff?.full_name || 'camarero'}
          </span>
        </div>
      ) : (
        <CustomerContact customer={order.customers} order={order} />
      )}

      {order.waiter_called_at && (
        <div className="flex items-center justify-between mb-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-2.5 py-1.5">
          <span className="text-amber-700 text-xs font-semibold flex items-center gap-1"><BellIcon size={12} /> Te están llamando</span>
          <button
            onClick={() => onDismissCall(order.id)}
            className="text-smoke-500 text-[10px] underline"
          >
            Atendido
          </button>
        </div>
      )}

      <p className="text-smoke-300 text-sm font-medium mb-2 flex items-center gap-1"><PinIcon size={14} /> {order.location_label}</p>

      {/* Selector de camarero expandible */}
      <div className="mb-2">
        {showWaiterSelect || order.assigned_staff_id ? (
          <div className="flex items-center gap-2">
            <WaiterSelect order={order} waiters={waiters} onAssign={onAssignWaiter} />
            {showWaiterSelect && (
              <button
                onClick={() => setShowWaiterSelect(false)}
                className="text-smoke-500 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowWaiterSelect(true)}
            className="text-smoke-400 text-xs border border-carbon-700 rounded-full px-2.5 py-1"
          >
            + Asignar camarero
          </button>
        )}
      </div>

      <ul className="space-y-1 mb-3">
        {order.order_items.map(item => (
          <li key={item.id} className="text-smoke-400 text-xs">
            {item.quantity}× {item.product_name}
            {item.item_notes && <span className="text-smoke-500"> ({item.item_notes})</span>}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-ember-400/80 text-xs mb-3 italic">"{order.notes}"</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowQR(true)}
            className="text-smoke-500 border border-carbon-700 text-xs px-2 py-1.5 rounded-full"
            title="Ver QR del pedido"
          >
            QR
          </button>
          {prevStatus && (
            <button
              onClick={() => onUpdateStatus(order.id, prevStatus)}
              className="text-smoke-500 border border-carbon-700 text-xs px-2 py-1.5 rounded-full"
              title={`Volver a ${STATUS_LABELS[prevStatus]}`}
            >
              ↺
            </button>
          )}
          {order.status === 'pendiente_aprobacion' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'recibido')}
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700"
            >
              Aprobar ✓
            </button>
          )}
          {order.status !== 'pendiente_aprobacion' && nextStatus && (
            <button
              onClick={() => onUpdateStatus(order.id, nextStatus)}
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-ember-500 hover:bg-ember-600"
            >
              {STATUS_LABELS[nextStatus]} →
            </button>
          )}
          {order.status === 'entregado' && (
            <button
              onClick={() => setShowSummary(true)}
              className="text-smoke-500 border border-carbon-700 text-xs px-2 py-1.5 rounded-full"
              title="Resumen de cuenta para el cliente (no fiscal)"
            >
              Cuenta
            </button>
          )}
          {onConfirmPayment && order.status === 'entregado' && order.payment_status === 'pendiente' && (
            <button
              onClick={() => onConfirmPayment(order)}
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700"
              title="Marcar como cobrado"
            >
              💰 Cobrar
            </button>
          )}
          {order.status === 'entregado' && order.payment_status === 'aprobado' && (
            <span className="text-emerald-500 text-xs font-semibold">Pagado ✓</span>
          )}
          {onCloseOrder && order.status === 'entregado' && (
            <button
              onClick={() => onCloseOrder(order)}
              className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700"
              title="Archivar el pedido: sale del tablero y queda en Historial"
            >
              Cerrar ✓
            </button>
          )}
        </div>
      </div>

      {fiscalEnabled && order.status === 'entregado' && (order.payment_status === 'aprobado' || invoice?.status === 'approved') && (
        <FiscalTicket
          order={order}
          invoice={invoice}
          onEmitted={onInvoiceEmitted}
          venueName={venueName}
          fiscalCondition={fiscalCondition}
        />
      )}

      {showSummary && (
        <AccountSummary
          orders={[order]}
          venueName={venueName}
          locationLabel={order.location_label}
          onClose={() => setShowSummary(false)}
        />
      )}

      {showQR && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-carbon-900 border border-carbon-700 rounded-3xl p-6 text-center max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-smoke-200 text-lg mb-1">
              #{order.daily_number || order.id.slice(0, 6)}
            </p>
            <p className="text-smoke-500 text-xs mb-4 flex items-center justify-center gap-1"><PinIcon size={12} /> {order.location_label}</p>
            <KanbanQRCode orderId={order.id} />
            <p className="text-smoke-500 text-xs mt-3">El cliente escanea y sigue su pedido</p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full border border-carbon-700 text-smoke-400 py-2.5 rounded-xl text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanQRCode({ orderId }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    const url = `https://capyapp.co/ver-pedido/${orderId}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#F5F0EB' }
      }, (err) => { if (!err) setReady(true) })
    })
  }, [orderId])

  return (
    <div className="flex justify-center">
      <div className="bg-[#F5F0EB] rounded-2xl p-3 inline-block">
        <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
        {!ready && (
          <div className="w-[200px] h-[200px] bg-carbon-800 rounded-xl flex items-center justify-center">
            <p className="text-smoke-500 text-xs">Generando QR...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LowStockPanel({ venueId, onCount, chipOnly = false }) {
  const [items, setItems] = useState([])
  const [adjusting, setAdjusting] = useState(null)
  const [newStock, setNewStock] = useState('')
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    if (!venueId) return
    loadLowStock()
  }, [venueId])

  async function loadLowStock() {
    const { data } = await supabaseStaff
      .from('products')
      .select('id, name, unit_stock, min_stock_alert, is_available')
      .eq('venue_id', venueId)
      .not('unit_stock', 'is', null)
    if (!data) return
    const low = data.filter(p => p.unit_stock != null && p.min_stock_alert != null && p.unit_stock <= p.min_stock_alert)
    setItems(low)
    onCount?.(low.length)
    // Notificar por push (una vez por producto por sesión)
    for (const p of low) {
      if (!notifiedRef.current.has(p.id)) {
        notifiedRef.current.add(p.id)
        supabaseStaff.functions.invoke('notify-staff', {
          body: { venue_id: venueId, title: '⚠️ Stock bajo', body: `${p.name}: quedan ${p.unit_stock} unidades` }
        }).catch(() => {})
      }
    }
  }

  async function handleAdjust(productId) {
    const qty = parseInt(newStock, 10)
    if (isNaN(qty) || qty < 0) return
    await supabaseStaff.from('products').update({
      unit_stock: qty,
      is_available: qty > 0 ? true : false,
    }).eq('id', productId)
    setAdjusting(null)
    setNewStock('')
    loadLowStock()
  }

  if (chipOnly || items.length === 0) return null

  return (
    <div className="px-4 pt-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-amber-500 text-xs font-semibold uppercase tracking-wide">Stock bajo — {items.length} producto{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-smoke-200 text-xs font-medium truncate">{p.name}</p>
                <p className={`text-[10px] font-semibold ${p.unit_stock === 0 ? 'text-red-400' : 'text-amber-500'}`}>
                  {p.unit_stock === 0 ? 'Sin stock' : `${p.unit_stock} unidades`}
                </p>
              </div>
              {adjusting === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdjust(p.id); if (e.key === 'Escape') { setAdjusting(null); setNewStock('') } }}
                    className="w-16 bg-carbon-800 border border-carbon-600 text-smoke-200 text-xs px-2 py-1 rounded-lg"
                    placeholder="0"
                  />
                  <button onClick={() => handleAdjust(p.id)} className="text-xs text-emerald-500 font-semibold">OK</button>
                  <button onClick={() => { setAdjusting(null); setNewStock('') }} className="text-xs text-smoke-500">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAdjusting(p.id); setNewStock(String(p.unit_stock)) }}
                  className="text-[10px] text-amber-500 border border-amber-500/40 px-2 py-1 rounded-lg font-semibold flex-shrink-0"
                >
                  Ajustar
                </button>
              )}
            </div>
          ))}
        </div>
        <Link to="/admin/carta" className="mt-3 block text-[10px] text-smoke-500 underline text-right">
          Editar stock en la carta →
        </Link>
      </div>
    </div>
  )
}
