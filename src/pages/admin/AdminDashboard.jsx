import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import FloorPlanViewer from '../../components/FloorPlanViewer'

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
  const [paidOrders, setPaidOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState('pedidos')
  const [zones, setZones] = useState([])
  const [hasProducts, setHasProducts] = useState(true)
  const [hasStaff, setHasStaff] = useState(true)
  const [hasLocations, setHasLocations] = useState(true)
  const [hasCamautStaff, setHasCamautStaff] = useState(true)
  const [waiterCalls, setWaiterCalls] = useState([])
  const prevCallCount = useRef(0)
  const { signOut, profile, venueId, isSuperAdmin } = useAuth()

  useEffect(() => {
    if (waiterCalls.length > prevCallCount.current) {
      playChime()
    }
    prevCallCount.current = waiterCalls.length
  }, [waiterCalls.length])

  useEffect(() => {
    if (!venueId) return
    loadWaiters()
    loadCategories()
    loadVenue()
    loadZones()
    loadOnboardingChecks()
    loadWaiterCalls()
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

  async function loadOnboardingChecks() {
    const [prodRes, staffRes, zoneRes, camautRes] = await Promise.all([
      supabaseStaff.from('products').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).limit(1),
      supabaseStaff.from('staff_names').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).eq('is_active', true).limit(1),
      supabaseStaff.from('venue_zones').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).limit(1),
      supabaseStaff.from('venue_staff').select('id', { count: 'exact', head: true }).eq('venue_id', venueId).limit(1),
    ])
    setHasProducts((prodRes.count ?? 0) > 0)
    setHasStaff((staffRes.count ?? 0) > 0)
    setHasLocations((zoneRes.count ?? 0) > 0)
    setHasCamautStaff((camautRes.count ?? 0) > 0)
  }

  async function loadZones() {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order')
    setZones(data || [])
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
      .select('high_demand')
      .eq('id', venueId)
      .single()
    if (data) setHighDemand(data.high_demand)
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
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('id, full_name')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('full_name')
    const seen = new Set()
    const unique = (data || []).filter(w => {
      const key = w.full_name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setWaiters(unique)
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
      const [boardRes, proofRes, inPersonRes, paidRes] = await Promise.all([
        supabaseStaff
          .from('orders')
          .select(ORDER_SELECT)
          .eq('venue_id', venueId)
          .in('status', [...BOARD_COLUMNS, 'listo', 'pendiente_aprobacion'])
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
          .gte('payment_confirmed_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
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

      // Excluir pedidos cerrados: entregado + pagado = ya no aparecen en el panel
      const openOrders = (boardRes.data || []).filter(o =>
        !(o.status === 'entregado' && o.payment_status === 'aprobado')
      )
      setOrders(openOrders)
      setPendingProofOrders(proofRes.data || [])
      setPendingInPersonOrders(inPersonOrders)
      setPaidOrders(paidRes.data || [])
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
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
          <p className="text-smoke-500 text-xs mt-0.5">{profile?.full_name}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="flex items-center gap-1 text-smoke-400 text-xs border border-carbon-700 rounded-full px-2.5 py-1 disabled:opacity-50"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round"/>
              <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          {isSuperAdmin && (
            <Link to="/admin/superadmin" className="text-ember-500 text-xs underline font-semibold">
              Superadmin
            </Link>
          )}
          <Link to="/admin/historial" className="text-smoke-400 text-xs underline">
            Historial
          </Link>
          {profile?.role === 'camarero' && (
            <Link to="/admin/mi-turno" className="text-smoke-400 text-xs underline">
              Mi turno
            </Link>
          )}
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">
            Configuración
          </Link>
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

      {profile?.role !== 'camarero' && (!hasProducts || !hasStaff || !hasLocations || !hasCamautStaff) && (
        <div className="px-4 pt-4 space-y-2">
          {!hasProducts && (
            <OnboardingAlert
              icon="🍽️"
              title="Agregá productos a tu carta"
              description="Sin productos, los clientes no pueden hacer pedidos."
              linkTo="/admin/carta"
              linkLabel="Crear carta →"
            />
          )}
          {!hasStaff && (
            <OnboardingAlert
              icon="👥"
              title="Agregá al menos un camarero"
              description="Los camareros reciben y entregan los pedidos en mesa."
              linkTo="/admin/camareros"
              linkLabel="Agregar camarero →"
            />
          )}
          {!hasLocations && (
            <OnboardingAlert
              icon="📍"
              title="Configurá las ubicaciones del local"
              description="Sin ubicaciones, los clientes no pueden indicar dónde están."
              linkTo="/admin/ubicaciones"
              linkLabel="Crear ubicaciones →"
            />
          )}
          {!hasCamautStaff && (
            <OnboardingAlert
              icon="📲"
              title="Vinculá el camaut con tu local"
              description="Los camareros instalan el camaut y escanean el QR de este panel para empezar a operar."
              linkTo="/admin/qr"
              linkLabel="Ver QR →"
            />
          )}
        </div>
      )}

      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={() => setView('pedidos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'pedidos' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Pedidos
        </button>
        <button
          onClick={() => setView('salon')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'salon' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Salón
        </button>
        <button
          onClick={() => setView('cocina')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            view === 'cocina' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
          }`}
        >
          Cocina
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className={`rounded-2xl border transition-colors ${
          waiterCalls.length > 0
            ? 'bg-teal-500/10 border-teal-500/40'
            : 'bg-carbon-900 border-carbon-700'
        }`}>
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={waiterCalls.length > 0 ? 'text-teal-400' : 'text-smoke-600'}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              waiterCalls.length > 0 ? 'text-teal-400' : 'text-smoke-600'
            }`}>
              Solicitudes de atención{waiterCalls.length > 0 ? ` · ${waiterCalls.length}` : ''}
            </p>
          </div>
          {waiterCalls.length === 0 ? (
            <p className="text-smoke-600 text-xs px-4 pb-3">Sin solicitudes pendientes</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-3">
              {waiterCalls.map(call => (
                <div
                  key={call.id}
                  className="min-w-[160px] bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 flex-shrink-0"
                >
                  <p className="text-teal-300 font-semibold text-sm mb-0.5">📍 {call.location_label}</p>
                  <p className="text-smoke-500 text-xs mb-2">
                    {new Date(call.called_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => dismissAnonCall(call.id)}
                    className="text-smoke-400 text-xs underline"
                  >
                    Atendido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {view === 'salon' ? (
        <SalonView orders={orders} zones={zones} venueId={venueId} />
      ) : view === 'cocina' ? (
        <CocinaView orders={orders} categories={categories} onUpdateStatus={updateStatus} onRefresh={load} />
      ) : (
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
              paidOrders={status === 'entregado' ? paidOrders : []}
              onConfirmPayment={status === 'entregado' ? confirmPayment : null}
            />
          ))}
        </div>
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
                <p className="text-amber-600 text-xs italic mb-2 border-l-2 border-amber-500/40 pl-2">
                  📝 {order.notes}
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
                <p className="text-smoke-500 text-[10px] mb-2">⏱ {order.prep_time_minutes} min estimados</p>
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

function SalonView({ orders, zones, venueId }) {
  const [typeFilter, setTypeFilter] = useState('todos')

  const filtered = orders.filter(o => typeFilter === 'todos' || o.location_type === typeFilter)

  const grouped = filtered.reduce((acc, order) => {
    const key = order.location_label || 'Sin ubicación'
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {})

  const typesPresent = [...new Set(orders.map(o => o.location_type))]

  return (
    <div className="px-4 pt-4 space-y-4">
      <FloorPlanViewer
        zones={zones}
        venueId={venueId}
        supabaseClient={supabaseStaff}
      />

      {typesPresent.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setTypeFilter('todos')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border ${
              typeFilter === 'todos' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
            }`}
          >
            Todos
          </button>
          {typesPresent.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border ${
                typeFilter === type ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {TYPE_FILTER_LABELS[type] || type}
            </button>
          ))}
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <p className="text-smoke-500 text-sm text-center py-6">No hay pedidos activos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(grouped).map(([location, locationOrders]) => (
            <div key={location} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
              <p className="text-smoke-300 font-medium text-sm mb-3">📍 {location}</p>
              <div className="space-y-2">
                {locationOrders.map(order => (
                  <SalonOrderRow key={order.id} order={order} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TYPE_FILTER_LABELS = {
  mesa: 'Mesas',
  zona: 'Zonas',
  retiro: 'Retiro',
  punto_mapa: 'Mapa'
}

// Codigo de color por METODO de pago (no por status), para que se
// distinga de lejos en una TV/tablet fija en el salon:
//  - efectivo: verde, con el vuelto a llevar si el cliente lo indico
//  - tarjeta/QR: azul, posnet
//  - transferencia en revision: ambar, solo informativo para caja
// Los metodos de pago ahora vienen de la tabla dinamica payment_methods
// (ej. "Efectivo", "Tarjeta / QR", "Transferencia"), no de un enum fijo en
// minuscula. Esta funcion los normaliza a una de 3 categorias conocidas
// para poder elegir estilos/textos sin depender del string exacto.
function normalizePaymentMethod(method) {
  const m = (method || '').toLowerCase()
  if (m.includes('transfer')) return 'transferencia'
  if (m.includes('efectivo')) return 'efectivo'
  if (m.includes('tarjeta') || m.includes('qr') || m.includes('posnet')) return 'tarjeta'
  return 'tarjeta'
}

const METHOD_ALERT_STYLES = {
  efectivo: 'border-emerald-500/60 bg-emerald-500/10',
  tarjeta: 'border-blue-500/60 bg-blue-500/10',
  transferencia: 'border-amber-500/60 bg-amber-500/10'
}

const METHOD_ALERT_TEXT = {
  efectivo: 'text-emerald-700',
  tarjeta: 'text-blue-700',
  transferencia: 'text-amber-700'
}

const METHOD_ALERT_LABELS = {
  efectivo: '💵 Pidió la cuenta — cobrar en efectivo',
  tarjeta: '💳 Pidió la cuenta — cobrar con posnet/QR',
  transferencia: '🧾 Comprobante por revisar'
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
          {METHOD_ALERT_LABELS[normalizePaymentMethod(order.payment_method)] || '🧾 Pidió la cuenta'}
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
        <p className="text-smoke-500 text-xs mt-1">🧑‍🍳 {order.assigned_staff.full_name}</p>
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

function CustomerContact({ customer }) {
  if (!customer) return null
  const waLink = customer.whatsapp
    ? `https://wa.me/${customer.whatsapp.replace(/[^\d]/g, '')}`
    : null
  return (
    <div className="flex items-center justify-between mb-2 bg-carbon-800 rounded-lg px-2.5 py-1.5">
      <span className="text-smoke-300 text-xs">{customer.full_name}</span>
      {waLink ? (
        <a
          href={waLink}
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
      <p className="text-smoke-300 text-xs mb-2">📍 {order.location_label}</p>

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
      <div className="bg-carbon-900 border border-blue-500/30 rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-ember-500 font-bold text-sm">
            #{order.daily_number || order.id.slice(0, 6)}
          </span>
          <span className="text-smoke-500 text-xs">{elapsedMin}m</span>
        </div>
        <p className="text-smoke-400 text-xs mb-1">📍 {order.location_label}</p>
        <p className="text-blue-700 text-xs mb-2">{methodLabel}</p>
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
    <div className="flex-shrink-0 w-56 bg-carbon-900 border border-blue-500/40 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">{order.daily_number ? `#${order.daily_number}` : `#${order.id.slice(0, 6)}`}</span>
        <span className="text-smoke-500 text-xs">{elapsedMin} min</span>
      </div>
      <CustomerContact customer={order.customers} />
      <p className="text-smoke-300 text-sm font-medium mb-1">📍 {order.location_label}</p>
      <p className="text-blue-700 text-xs mb-2">💳 Paga con {methodLabel}</p>
      {normalizePaymentMethod(order.payment_method) === 'efectivo' && order.cash_amount && (
        <p className="text-emerald-700 text-xs mb-2">
          💵 Paga con {formatPrice(order.cash_amount)} · vuelto {formatPrice(order.cash_amount - order.total)}
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

function Column({ status, orders, onUpdateStatus, onDismissCall, waiters, onAssignWaiter, pendingInPersonOrders = [], paidOrders = [], onConfirmPayment }) {
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

  return (
    <div className="flex-1 min-w-80">
      <div className={`px-3 py-2 rounded-lg border text-sm font-semibold mb-3 ${STATUS_COLORS[status]}`}>
        {columnLabel} · {totalCount}
      </div>
      <div className="space-y-3">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            nextStatus={nextStatus}
            prevStatus={prevStatus}
            onUpdateStatus={onUpdateStatus}
            onDismissCall={onDismissCall}
            waiters={waiters}
            onAssignWaiter={onAssignWaiter}
          />
        ))}

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
                  <p className="text-smoke-400 text-xs">📍 {order.location_label}</p>
                  <p className="font-mono text-smoke-300 text-sm mt-1">{formatPrice(order.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, nextStatus, prevStatus, onUpdateStatus, onDismissCall, waiters, onAssignWaiter }) {
  const [showWaiterSelect, setShowWaiterSelect] = useState(false)
  const [showQR, setShowQR] = useState(false)
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
    <div className={`bg-carbon-900 border rounded-2xl p-4 ${borderColor}`}>
      {order.is_addition && (
        <div className="flex items-center gap-1.5 mb-2 bg-violet-500/10 border border-violet-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-violet-400 text-xs font-semibold">+ ADICIÓN · misma mesa</span>
        </div>
      )}
      {order.status === 'listo' && (
        <div className="flex items-center gap-1.5 mb-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-emerald-500 text-xs font-semibold">✓ Listo para entregar</span>
        </div>
      )}
      {order.status === 'pendiente_aprobacion' && (
        <div className="flex items-center gap-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
          <span className="text-amber-500 text-xs font-semibold">⏳ Pendiente de aprobar</span>
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
          <span className="text-smoke-400 text-xs">🧑‍🍳</span>
          <span className="text-smoke-300 text-xs font-medium">
            Tomado por {order.assigned_staff?.full_name || 'camarero'}
          </span>
        </div>
      ) : (
        <CustomerContact customer={order.customers} />
      )}

      {order.waiter_called_at && (
        <div className="flex items-center justify-between mb-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-2.5 py-1.5">
          <span className="text-amber-700 text-xs font-semibold">🔔 Te están llamando</span>
          <button
            onClick={() => onDismissCall(order.id)}
            className="text-smoke-500 text-[10px] underline"
          >
            Atendido
          </button>
        </div>
      )}

      <p className="text-smoke-300 text-sm font-medium mb-2">📍 {order.location_label}</p>

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
        </div>
      </div>

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
            <p className="text-smoke-500 text-xs mb-4">📍 {order.location_label}</p>
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

function OnboardingAlert({ icon, title, description, linkTo, linkLabel }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div>
          <p className="text-amber-700 font-semibold text-sm">{title}</p>
          <p className="text-smoke-500 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <Link
        to={linkTo}
        className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
      >
        {linkLabel}
      </Link>
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
