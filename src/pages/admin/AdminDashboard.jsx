import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'

const BOARD_COLUMNS = ['recibido', 'en_preparacion', 'listo', 'entregado']
const PROOF_BUCKET = 'payment-proofs'
const ORDER_SELECT = '*, order_items(*), customers(full_name, whatsapp), assigned_staff:staff_names!orders_assigned_staff_id_fkey(id, full_name)'

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [pendingProofOrders, setPendingProofOrders] = useState([])
  const [pendingInPersonOrders, setPendingInPersonOrders] = useState([])
  const [proofUrls, setProofUrls] = useState({}) // orderId -> signed url
  const [waiters, setWaiters] = useState([])
  const [loading, setLoading] = useState(true)
  const { signOut, profile } = useAuth()

  useEffect(() => {
    loadWaiters()
  }, [])

  async function loadWaiters() {
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('id, full_name')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .eq('is_active', true)
      .order('full_name')
    setWaiters(data || [])
  }

  async function addWaiter(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const { data, error } = await supabaseStaff
      .from('staff_names')
      .insert({ venue_id: ACTIVE_VENUE_ID, full_name: trimmed })
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

  async function load() {
    const [boardRes, proofRes, inPersonRes] = await Promise.all([
      supabaseStaff
        .from('orders')
        .select(ORDER_SELECT)
        .eq('venue_id', ACTIVE_VENUE_ID)
        .in('status', BOARD_COLUMNS)
        .order('created_at', { ascending: true }),
      supabaseStaff
        .from('orders')
        .select(ORDER_SELECT)
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('payment_status', 'en_revision')
        .order('created_at', { ascending: true }),
      supabaseStaff
        .from('orders')
        .select(ORDER_SELECT)
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('payment_status', 'cuenta_solicitada')
        .in('payment_method', ['efectivo', 'tarjeta'])
        .order('bill_requested_at', { ascending: true })
    ])
    setOrders(boardRes.data || [])
    setPendingProofOrders(proofRes.data || [])
    setPendingInPersonOrders(inPersonRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabaseStaff
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${ACTIVE_VENUE_ID}` },
        () => load()
      )
      .subscribe()

    return () => supabaseStaff.removeChannel(channel)
  }, [])

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

  async function updateStatus(orderId, newStatus) {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)))
    await supabaseStaff.from('orders').update({ status: newStatus }).eq('id', orderId)
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

  async function confirmPayment(order) {
    await supabaseStaff
      .from('orders')
      .update({
        payment_status: 'aprobado',
        payment_confirmed_by: profile.id,
        payment_confirmed_at: new Date().toISOString()
      })
      .eq('id', order.id)
    setPendingProofOrders(prev => prev.filter(o => o.id !== order.id))
    setPendingInPersonOrders(prev => prev.filter(o => o.id !== order.id))
    load()
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

  return (
    <div className="min-h-screen bg-carbon-950">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">PEDIDOS</h1>
          <p className="text-smoke-500 text-xs mt-0.5">{profile?.full_name}</p>
        </div>
        <div className="flex gap-3 items-center">
          <Link to="/admin/historial" className="text-smoke-400 text-xs underline">
            Historial
          </Link>
          <Link to="/admin/encuestas" className="text-smoke-400 text-xs underline">
            Encuestas
          </Link>
          <Link to="/admin/carta" className="text-smoke-400 text-xs underline">
            Editar carta
          </Link>
          <button onClick={signOut} className="text-smoke-500 text-xs underline">
            Salir
          </button>
        </div>
      </header>

      <WaiterManager waiters={waiters} onAdd={addWaiter} onRemove={removeWaiter} />

      {pendingProofOrders.length > 0 && (
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

      {pendingInPersonOrders.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-blue-700 text-xs font-semibold uppercase tracking-wide mb-2">
            Por cobrar en persona · {pendingInPersonOrders.length}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pendingInPersonOrders.map(order => (
              <InPersonCard
                key={order.id}
                order={order}
                waiters={waiters}
                onConfirm={() => confirmPayment(order)}
                onAssignWaiter={assignWaiter}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto p-4">
        {BOARD_COLUMNS.map(status => (
          <Column
            key={status}
            status={status}
            orders={orders.filter(o => o.status === status)}
            onUpdateStatus={updateStatus}
            waiters={waiters}
            onAssignWaiter={assignWaiter}
          />
        ))}
      </div>
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
  const waLink = `https://wa.me/${customer.whatsapp.replace(/[^\d]/g, '')}`
  return (
    <div className="flex items-center justify-between mb-2 bg-carbon-800 rounded-lg px-2.5 py-1.5">
      <span className="text-smoke-300 text-xs">{customer.full_name}</span>
      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="text-emerald-700 text-xs font-medium underline"
      >
        WhatsApp →
      </a>
    </div>
  )
}

function ProofCard({ order, proofUrl, onConfirm, onReject }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex-shrink-0 w-56 bg-carbon-900 border border-ember-500/40 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">#{order.id.slice(0, 6)}</span>
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

function InPersonCard({ order, waiters, onConfirm, onAssignWaiter }) {
  const methodLabel = order.payment_method === 'efectivo' ? 'Efectivo' : 'Tarjeta'
  const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <div className="flex-shrink-0 w-56 bg-carbon-900 border border-blue-500/40 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">#{order.id.slice(0, 6)}</span>
        <span className="text-smoke-500 text-xs">{elapsedMin} min</span>
      </div>
      <CustomerContact customer={order.customers} />
      <p className="text-smoke-300 text-sm font-medium mb-1">📍 {order.location_label}</p>
      <p className="text-blue-700 text-xs mb-2">💳 Paga con {methodLabel}</p>
      {order.payment_method === 'efectivo' && order.cash_amount && (
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

      <div className="flex items-center justify-between">
        <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
        <button
          onClick={onConfirm}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
        >
          Marcar pago recibido
        </button>
      </div>
    </div>
  )
}

function Column({ status, orders, onUpdateStatus, waiters, onAssignWaiter }) {
  const nextStatus = {
    recibido: 'en_preparacion',
    en_preparacion: 'listo',
    listo: 'entregado'
  }[status]

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`px-3 py-2 rounded-lg border text-sm font-semibold mb-3 ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]} · {orders.length}
      </div>
      <div className="space-y-3">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            nextStatus={nextStatus}
            onUpdateStatus={onUpdateStatus}
            waiters={waiters}
            onAssignWaiter={onAssignWaiter}
          />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, nextStatus, onUpdateStatus, waiters, onAssignWaiter }) {
  const elapsedMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
  const isUrgent = elapsedMin > 15 && order.status !== 'entregado'

  return (
    <div
      className={`bg-carbon-900 border rounded-2xl p-4 ${
        isUrgent ? 'border-red-500/50' : 'border-carbon-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-ember-400 text-xs">#{order.id.slice(0, 6)}</span>
        <span className={`text-xs ${isUrgent ? 'text-red-700 font-semibold' : 'text-smoke-500'}`}>
          {elapsedMin} min
        </span>
      </div>

      <CustomerContact customer={order.customers} />
      <p className="text-smoke-300 text-sm font-medium mb-2">📍 {order.location_label}</p>

      <div className="mb-2">
        <WaiterSelect order={order} waiters={waiters} onAssign={onAssignWaiter} />
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

      <div className="flex items-center justify-between">
        <span className="font-mono text-smoke-300 text-sm">{formatPrice(order.total)}</span>
        {nextStatus && (
          <button
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            className="bg-ember-500 hover:bg-ember-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            Marcar {STATUS_LABELS[nextStatus]} →
          </button>
        )}
      </div>
    </div>
  )
}
