import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { formatPrice, venueDisplayName } from '../../lib/utils'
import { supabaseCustomer } from '../../lib/supabase'
import AccountInvite from '../../components/AccountInvite'
import { SearchIcon, PinIcon, ChefHatIcon, UtensilsIcon } from '../../components/Icons'

// Misma sesión anónima que /ver-pedido: auth.uid() es lo que exigen las RLS.
const supabasePublic = supabaseCustomer

const ACTIVE = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado']

const STATUS_LABEL = {
  pendiente_aprobacion: { text: 'Esperando confirmación', color: 'text-amber-500' },
  recibido: { text: 'Recibido', color: 'text-blue-500' },
  en_preparacion: { text: 'En preparación', color: 'text-[#008080]' },
  listo: { text: '¡Listo!', color: 'text-emerald-500' },
  entregado: { text: 'Entregado', color: 'text-smoke-500' },
}

// Cuenta completa de una mesa: todos los pedidos de una misma sesión, con su
// estado en vivo. Es el link que el camarero comparte en lugar de imprimir el
// resumen en papel.
export default function PublicAccountPage() {
  const { sessionId } = useParams()
  const [orders, setOrders] = useState([])
  const [staff, setStaff] = useState(null)
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [aliasCopied, setAliasCopied] = useState(false)
  const [tipPercent, setTipPercent] = useState(10)
  const [splitPeople, setSplitPeople] = useState(2)
  const [showSplit, setShowSplit] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (sessionId) load()
    return () => clearInterval(intervalRef.current)
  }, [sessionId])

  async function load() {
    try {
      await loadInner()
    } catch {
      // Sin red o sin sesión anónima no hay nada que mostrar: mejor el cartel
      // que dejar el "Cargando..." girando para siempre
      setNotFound(true)
      setLoading(false)
    }
  }

  async function loadInner() {
    const { data: { session } } = await supabaseCustomer.auth.getSession()
    if (!session) await supabaseCustomer.auth.signInAnonymously()

    const { data } = await supabasePublic
      .from('orders')
      .select('id, status, location_label, total, daily_number, created_at, prep_time_minutes, prep_started_at, assigned_staff_id, payment_status, notes, venue_id, cash_discount_amount, customer_id, order_items(product_name, quantity, unit_price, item_notes)')
      .eq('session_id', sessionId)
      .in('status', ACTIVE)
      .order('created_at', { ascending: true })

    if (!data?.length) { setNotFound(true); setLoading(false); return }
    setOrders(data)

    const staffId = data.map(o => o.assigned_staff_id).find(Boolean)
    const venueId = data.map(o => o.venue_id).find(Boolean)
    const [staffRes, venueRes] = await Promise.all([
      staffId
        ? supabaseCustomer.from('staff_names').select('full_name, alias, alias_bancario, avatar_url').eq('id', staffId).single()
        : Promise.resolve({ data: null }),
      venueId
        ? supabaseCustomer.from('venues').select('name, slug, logo_url, tip_alias').eq('id', venueId).single()
        : Promise.resolve({ data: null }),
    ])
    setStaff(staffRes.data)
    setVenue(venueRes.data)

    setLoading(false)
    startPolling()
  }

  function startPolling() {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      const { data } = await supabasePublic
        .from('orders')
        .select('id, status, total, payment_status')
        .eq('session_id', sessionId)
        .in('status', ACTIVE)
      if (data?.length) {
        setOrders(prev => prev.map(o => {
          const fresh = data.find(d => d.id === o.id)
          return fresh ? { ...o, ...fresh } : o
        }))
      }
    }, 10000)
  }

  if (loading) return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">Cargando la cuenta...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-carbon-900">
        <SearchIcon size={32} className="text-smoke-400" />
      </div>
      <p className="text-smoke-200 font-bold text-lg mb-2">Cuenta no encontrada</p>
      <p className="text-smoke-500 text-sm">La mesa ya se cerró o el link venció.</p>
    </div>
  )

  const items = orders.flatMap(o => (o.order_items || []).map(it => ({
    qty: it.quantity,
    name: it.product_name,
    notes: it.item_notes,
    total: (Number(it.unit_price) || 0) * it.quantity,
  })))
  const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const discount = orders.reduce((s, o) => s + (Number(o.cash_discount_amount) || 0), 0)
  const subtotal = total + discount
  const mesa = orders.map(o => o.location_label).find(Boolean)
  const tipAmount = Math.round(total * tipPercent / 100)
  const perPerson = Math.ceil(total / splitPeople)
  const tipAlias = staff?.alias_bancario || venue?.tip_alias
  // Los locales del onboarding del camarero llevan slug camaut-…: no son un
  // restaurante, son el contenedor de la carta propia del camarero
  const isAutonomous = !!venue?.slug?.startsWith('camaut-')

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8 pb-16">
      {/* Encabezado: el local si la carta es de un restaurante, el camarero si
          trabaja por su cuenta (ahí el venue es solo su contenedor personal) */}
      <div className="text-center mb-6">
        {isAutonomous && staff?.avatar_url ? (
          <img src={staff.avatar_url} alt={staff.full_name} className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2 border-carbon-700" />
        ) : venue?.logo_url ? (
          <img src={venue.logo_url} alt={venueDisplayName(venue.name)} className="w-16 h-16 mx-auto mb-2 rounded-xl object-cover border border-carbon-700" />
        ) : (
          <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-carbon-800 flex items-center justify-center">
            <UtensilsIcon size={26} className="text-smoke-400" />
          </div>
        )}
        <p className="font-display text-2xl text-ember-500 tracking-wide">
          {isAutonomous && staff?.full_name
            ? staff.full_name.toUpperCase()
            : (venueDisplayName(venue?.name).toUpperCase() || 'CAPY')}
        </p>
        <p className="text-smoke-500 text-xs mt-1 flex items-center justify-center gap-1">
          <PinIcon size={11} /> {mesa || 'Tu mesa'} · {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
        </p>
        {staff?.full_name && !isAutonomous && (
          <p className="text-smoke-400 text-xs mt-1.5 font-medium flex items-center justify-center gap-1">
            <ChefHatIcon size={13} /> Te atiende {staff.full_name}
          </p>
        )}
      </div>

      {/* Detalle de la cuenta */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-carbon-700">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">La cuenta de la mesa</p>
        </div>
        <div className="divide-y divide-carbon-700">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-ember-500 font-bold text-sm flex-shrink-0">{item.qty}×</span>
                  <span className="text-smoke-300 text-sm leading-snug">{item.name}</span>
                </div>
                <span className="text-smoke-400 text-sm font-mono flex-shrink-0">{formatPrice(item.total)}</span>
              </div>
              {item.notes && <p className="text-smoke-500 text-xs mt-0.5 ml-6 italic">{item.notes}</p>}
            </div>
          ))}
        </div>
        {discount > 0 && (
          <>
            <div className="px-4 py-2 border-t border-carbon-700 flex justify-between">
              <span className="text-smoke-500 text-sm">Subtotal</span>
              <span className="font-mono text-smoke-500 text-sm">{formatPrice(subtotal)}</span>
            </div>
            <div className="px-4 py-2 flex justify-between">
              <span className="text-emerald-500 text-sm font-medium">Descuento</span>
              <span className="font-mono text-emerald-500 text-sm font-medium">−{formatPrice(discount)}</span>
            </div>
          </>
        )}
        <div className="px-4 py-3 border-t border-carbon-700 flex justify-between items-center">
          <span className="text-smoke-300 text-sm font-semibold">TOTAL</span>
          <span className="font-mono font-bold text-smoke-100 text-lg">{formatPrice(total)}</span>
        </div>
      </div>

      <p className="text-smoke-600 text-[10px] text-center -mt-2 mb-4">
        Resumen de cuenta — no válido como factura
      </p>

      {/* Estado de cada pedido */}
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4">
        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">Estado</p>
        <div className="space-y-2">
          {orders.map(o => {
            const info = STATUS_LABEL[o.status] || STATUS_LABEL.recibido
            return (
              <div key={o.id} className="flex items-center justify-between gap-3">
                <span className="text-smoke-400 text-sm">
                  Pedido #{o.daily_number}
                  {o.prep_time_minutes ? <span className="text-smoke-600 text-xs"> · {o.prep_time_minutes} min</span> : null}
                </span>
                <span className={`text-xs font-semibold ${info.color}`}>{info.text}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Propina */}
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
        {tipAlias && (
          <div className="mt-3 bg-carbon-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-smoke-500 text-[10px] mb-0.5">
                {staff?.alias_bancario ? `Alias de ${staff.full_name?.split(' ')[0] || 'tu camarero/a'}` : 'Alias del local'}
              </p>
              <p className="font-mono text-smoke-200 font-bold text-sm truncate">{tipAlias}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tipAlias)
                setAliasCopied(true)
                setTimeout(() => setAliasCopied(false), 2000)
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${
                aliasCopied ? 'bg-emerald-600 text-white' : 'bg-ember-500 text-white'
              }`}
            >
              {aliasCopied ? '¡Copiado! ✓' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Dividir */}
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
                <button onClick={() => setSplitPeople(p => Math.max(2, p - 1))} aria-label="Quitar persona"
                  className="w-10 h-10 rounded-lg border border-carbon-600 text-smoke-300 flex items-center justify-center">−</button>
                <span className="text-smoke-200 font-bold text-sm w-4 text-center">{splitPeople}</span>
                <button onClick={() => setSplitPeople(p => p + 1)} aria-label="Agregar persona"
                  className="w-10 h-10 rounded-lg border border-carbon-600 text-smoke-300 flex items-center justify-center">+</button>
              </div>
            </div>
            <p className="text-center text-smoke-300 text-sm">
              Cada uno paga: <span className="font-mono font-bold text-ember-500">{formatPrice(perPerson)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Carta del local */}
      {venue?.slug && (
        <Link
          to={`/r/${venue.slug}/carta`}
          className="flex items-center justify-center gap-2 w-full bg-carbon-900 border border-carbon-700 text-smoke-300 text-sm font-semibold py-3.5 rounded-2xl mb-4"
        >
          <UtensilsIcon size={16} />
          Ver la carta y seguir pidiendo
        </Link>
      )}

      <AccountInvite sessionId={sessionId} />

      <p className="text-smoke-600 text-[10px] text-center mt-4">Se actualiza automáticamente</p>
    </div>
  )
}
