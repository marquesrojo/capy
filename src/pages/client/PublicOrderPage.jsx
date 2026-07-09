import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { formatPrice } from '../../lib/utils'
import OrderFeedback from '../../components/OrderFeedback'
import { supabaseCustomer } from '../../lib/supabase'
import { SearchIcon, PinIcon, ChefHatIcon, FileTextIcon } from '../../components/Icons'

const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

const STATUS_INFO = {
  pendiente_aprobacion: {
    label: 'Esperando confirmación', color: 'text-amber-500',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  },
  recibido: {
    label: 'Recibido', color: 'text-blue-500',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  },
  en_preparacion: {
    label: 'En preparación', color: 'text-[#008080]',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#008080]"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>
  },
  listo: {
    label: '¡Listo para retirar!', color: 'text-emerald-500',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  },
  entregado: {
    label: 'Entregado', color: 'text-smoke-400',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-smoke-400"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
  },
}

export default function PublicOrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [staff, setStaff] = useState(null)
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [calling, setCalling] = useState(false)
  const [billRequested, setBillRequested] = useState(false)
  const [aliasCopied, setAliasCopied] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [splitPeople, setSplitPeople] = useState(2)
  const [tipPercent, setTipPercent] = useState(10)
  const [prepProgress, setPrepProgress] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (id) loadOrder()
    return () => clearInterval(intervalRef.current)
  }, [id])

  async function loadOrder() {
    // Ensure supabaseCustomer has an anon session so OrderFeedback can insert
    const { data: { session } } = await supabaseCustomer.auth.getSession()
    if (!session) await supabaseCustomer.auth.signInAnonymously()

    const { data: orderData } = await supabasePublic
      .from('orders')
      .select('id, status, location_label, total, daily_number, created_at, prep_time_minutes, prep_started_at, waiter_called_at, assigned_staff_id, payment_status, notes, venue_id, created_by_staff')
      .eq('id', id)
      .single()

    if (!orderData) { setNotFound(true); setLoading(false); return }

    const { data: itemsData } = await supabasePublic
      .from('order_items')
      .select('product_name, quantity, unit_price, item_notes')
      .eq('order_id', id)

    setOrder(orderData)
    setItems(itemsData || [])
    setBillRequested(orderData.payment_status === 'cuenta_solicitada')

    const [staffRes, venueRes] = await Promise.all([
      orderData.assigned_staff_id
        ? supabaseCustomer.from('staff_names').select('full_name, alias, alias_bancario, avatar_url, bio').eq('id', orderData.assigned_staff_id).single()
        : Promise.resolve({ data: null }),
      orderData.venue_id
        ? supabaseCustomer.from('venues').select('name, logo_url').eq('id', orderData.venue_id).single()
        : Promise.resolve({ data: null }),
    ])
    setStaff(staffRes.data)
    setVenue(venueRes.data)

    setLoading(false)
    startPolling()
  }

  function startPolling() {
    intervalRef.current = setInterval(async () => {
      const { data } = await supabasePublic
        .from('orders')
        .select('status, waiter_called_at, payment_status, prep_time_minutes, prep_started_at')
        .eq('id', id)
        .single()
      if (data) {
        setOrder(prev => ({ ...prev, ...data }))
        setBillRequested(data.payment_status === 'cuenta_solicitada')
      }
    }, 8000)
  }

  async function callWaiter() {
    if (calling || order?.waiter_called_at) return
    setCalling(true)
    await supabasePublic
      .from('orders')
      .update({ waiter_called_at: new Date().toISOString() })
      .eq('id', id)
    setOrder(prev => ({ ...prev, waiter_called_at: new Date().toISOString() }))
    setCalling(false)
  }

  async function requestBill(method) {
    await supabasePublic
      .from('orders')
      .update({ payment_status: 'cuenta_solicitada', payment_method: method })
      .eq('id', id)
    setBillRequested(true)
    setOrder(prev => ({ ...prev, payment_status: 'cuenta_solicitada' }))
  }

  // Countdown preparación
  useEffect(() => {
    if (!order?.prep_started_at || !order?.prep_time_minutes) { setPrepProgress(null); return }
    function calcProgress() {
      const start = new Date(order.prep_started_at).getTime()
      const total = order.prep_time_minutes * 60 * 1000
      const elapsed = Date.now() - start
      const remaining = Math.max(0, total - elapsed)
      const percent = Math.min(100, (elapsed / total) * 100)
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setPrepProgress({ percent, mins, secs, done: remaining === 0 })
    }
    calcProgress()
    const t = setInterval(calcProgress, 1000)
    return () => clearInterval(t)
  }, [order?.prep_started_at, order?.prep_time_minutes])

  if (loading) return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando pedido...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-carbon-900">
        <SearchIcon size={32} className="text-smoke-400" />
      </div>
      <p className="text-smoke-200 font-bold text-lg mb-2">Pedido no encontrado</p>
      <p className="text-smoke-500 text-sm">El link puede haber expirado.</p>
    </div>
  )

  const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.recibido
  const tipAmount = Math.round(order.total * tipPercent / 100)
  const perPerson = Math.ceil(order.total / splitPeople)
  // Staff-placed orders (camaut / admin) have no customer_id; customer-placed orders do.
  const isStaffOrder = !order.customer_id

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8 pb-16">
      {/* Header — staff-placed orders show waiter photo, customer orders show venue logo */}
      <div className="text-center mb-6">
        {isStaffOrder && staff?.avatar_url ? (
          <img src={staff.avatar_url} alt={staff.full_name} className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2 border-carbon-700" />
        ) : venue?.logo_url ? (
          <img src={venue.logo_url} alt={venue.name} className="w-16 h-16 mx-auto mb-2 rounded-xl object-cover border border-carbon-700" />
        ) : (
          <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-carbon-800 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-smoke-400">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
          </div>
        )}
        <p className="font-display text-2xl text-ember-500 tracking-wide">
          {isStaffOrder && staff?.full_name ? staff.full_name.toUpperCase() : (venue?.name?.toUpperCase() || 'CAPY')}
        </p>
        {isStaffOrder && staff?.bio && (
          <p className="text-smoke-400 text-xs mt-1.5 italic px-4">{staff.bio}</p>
        )}
      </div>

      {/* Estado */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 text-center mb-4">
        <div className="flex justify-center mb-2">{statusInfo.icon}</div>
        <p className={`font-bold text-lg ${statusInfo.color}`}>{statusInfo.label}</p>
        <p className="text-smoke-500 text-xs mt-1 flex items-center justify-center gap-1">
          Pedido #{order.daily_number} · <PinIcon size={11} /> {order.location_label}
        </p>
        {staff?.full_name && !isStaffOrder && (
          <p className="text-smoke-400 text-xs mt-1.5 font-medium flex items-center justify-center gap-1">
            <ChefHatIcon size={13} /> {staff.full_name}
          </p>
        )}
      </div>

      {/* Countdown preparación */}
      {prepProgress && !prepProgress.done && order.status === 'en_preparacion' && (
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">Tiempo estimado</p>
          <div className="w-full bg-carbon-700 rounded-full h-2 mb-2">
            <div className="h-2 rounded-full bg-ember-500 transition-all" style={{ width: `${prepProgress.percent}%` }} />
          </div>
          <p className="text-smoke-300 text-sm text-center">
            {prepProgress.mins}:{String(prepProgress.secs).padStart(2, '0')} restantes
          </p>
        </div>
      )}

      {/* Ítems */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-carbon-700">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">Tu pedido</p>
        </div>
        <div className="divide-y divide-carbon-700">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-ember-500 font-bold text-sm">{item.quantity}×</span>
                  <span className="text-smoke-300 text-sm">{item.product_name}</span>
                </div>
                <span className="text-smoke-400 text-sm font-mono">{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
              {item.item_notes && (
                <p className="text-smoke-500 text-xs mt-0.5 ml-6 italic">{item.item_notes}</p>
              )}
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="px-4 py-3 border-t border-carbon-700">
            <p className="text-smoke-500 text-xs italic flex items-center gap-1"><FileTextIcon size={12} /> {order.notes}</p>
          </div>
        )}
        <div className="px-4 py-3 border-t border-carbon-700 flex justify-between">
          <span className="text-smoke-400 text-sm">Total</span>
          <span className="font-mono font-bold text-smoke-200">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Calculadora propina */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4">
        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">¿Querés dejar propina?</p>
        <div className="flex gap-2 mb-3">
          {[5, 10, 15, 20].map(p => (
            <button
              key={p}
              onClick={() => setTipPercent(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                tipPercent === p ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-600 text-smoke-400'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
        <p className="text-center text-smoke-300 text-sm">
          Propina sugerida: <span className="font-mono font-bold text-ember-500">{formatPrice(tipAmount)}</span>
        </p>
        {staff?.alias_bancario && (
          <div className="mt-3 space-y-2">
            <div className="bg-carbon-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-smoke-500 text-[10px] mb-0.5">Alias para transferir propina</p>
                <p className="font-mono text-smoke-200 font-bold text-sm">{staff.alias_bancario}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(staff.alias_bancario)
                  setAliasCopied(true)
                  setTimeout(() => setAliasCopied(false), 2000)
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
                  aliasCopied ? 'bg-emerald-600 text-white' : 'bg-ember-500 text-white'
                }`}
              >
                {aliasCopied ? '¡Copiado! ✓' : 'Copiar'}
              </button>
            </div>
            <a
              href="https://852u.adj.st/home/?adj_t=mqo65e0&adj_label=nav_mp_login&adj_campaign=nav_mp_login&adj_fallback=https%3A%2F%2Fwww.mercadolibre.com%2Fjms%2Fmla%2Flgz%2Flogin%3Fplatform_id%3DMP%26go%3Dhttps%253A%252F%252Fwww.mercadopago.com.ar%252F%26loginType%3Dexplicit&adj_redirect_macos=https%3A%2F%2Fwww.mercadolibre.com%2Fjms%2Fmla%2Flgz%2Flogin%3Fplatform_id%3DMP%26go%3Dhttps%253A%252F%252Fwww.mercadopago.com.ar%252F%26loginType%3Dexplicit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#009EE3] text-white font-semibold py-3 rounded-xl text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.97-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.566 2.186z"/>
              </svg>
              Pagar {formatPrice(tipAmount)} con Mercado Pago
            </a>
          </div>
        )}
      </div>

      {/* Dividir cuenta */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4">
        <button
          onClick={() => setShowSplit(v => !v)}
          className="w-full flex items-center justify-between text-smoke-300 text-sm font-semibold"
        >
          <span>Dividir la cuenta</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showSplit ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showSplit && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-smoke-400 text-sm">Personas</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSplitPeople(p => Math.max(2, p - 1))}
                  aria-label="Quitar persona"
                  className="w-10 h-10 rounded-lg border border-carbon-600 text-smoke-300 flex items-center justify-center">−</button>
                <span className="text-smoke-200 font-bold text-sm w-4 text-center">{splitPeople}</span>
                <button onClick={() => setSplitPeople(p => p + 1)}
                  aria-label="Agregar persona"
                  className="w-10 h-10 rounded-lg border border-carbon-600 text-smoke-300 flex items-center justify-center">+</button>
              </div>
            </div>
            <p className="text-center text-smoke-300 text-sm">
              Cada uno paga: <span className="font-mono font-bold text-ember-500">{formatPrice(perPerson)}</span>
            </p>
          </div>
        )}
      </div>

      {/* La cuenta por favor */}
      {!billRequested && (
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">La cuenta, por favor</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { method: 'Efectivo', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
              { method: 'Posnet', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
              { method: 'Mercado Pago', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 12h8M12 8v8"/></svg> },
            ].map(({ method, icon }) => (
              <button
                key={method}
                onClick={() => requestBill(method)}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-carbon-600 text-smoke-400 hover:border-ember-500 hover:text-ember-500 transition-colors"
              >
                {icon}
                <span className="text-[10px] font-semibold">{method}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {billRequested && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-4 text-center">
          <p className="text-emerald-500 text-sm font-semibold">✓ Cuenta solicitada</p>
          <p className="text-smoke-500 text-xs mt-0.5">El camarero ya sabe que pediste la cuenta</p>
        </div>
      )}

      {/* Llamar al camarero */}
      {order.status !== 'entregado' && (
        <button
          onClick={callWaiter}
          disabled={!!order.waiter_called_at || calling}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold mb-4 ${
            order.waiter_called_at
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
              : 'bg-carbon-900 border border-carbon-700 text-smoke-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {order.waiter_called_at ? 'Camarero/a en camino...' : 'Llamar al camarero/a'}
          </span>
        </button>
      )}

      {/* Encuesta */}
      <div className="mt-2">
        <OrderFeedback orderId={order.id} staffId={order.assigned_staff_id} />
      </div>

      <p className="text-smoke-600 text-[10px] text-center mt-4">Se actualiza automáticamente</p>
    </div>
  )
}
