import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomer } from '../../hooks/useCustomer'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'
import { useCart } from '../../hooks/useCart'
import { supabaseCustomer } from '../../lib/supabase'
import BottomNav from '../../components/BottomNav'
import { MedalIcon, RankIcon, RANK_COLORS, DEFAULT_RANKS } from '../../components/Icons'

const CONDICIONES_IVA = ['Consumidor Final', 'Responsable Inscripto', 'Monotributista', 'Exento']

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function AccountPage() {
  const { customer, isAnonymous, userEmail, signInWithGoogle, updateCustomer, saveBilling, forgetCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const venueCtx = useVenueOptional()
  const venueId = venueCtx?.venue?.id
  const { addItem } = useCart()

  // Profile edit
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [googleError, setGoogleError] = useState('')

  // Top 3
  const [top3, setTop3] = useState([])
  const [top3Loading, setTop3Loading] = useState(true)
  const [addedId, setAddedId] = useState(null)

  // Ranking
  const [rankConfig, setRankConfig] = useState(DEFAULT_RANKS)
  const [monthlyOrders, setMonthlyOrders] = useState(0)
  const [rankLoading, setRankLoading] = useState(true)

  // Billing
  const [billingOpen, setBillingOpen] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [cuitDni, setCuitDni] = useState('')
  const [condicionIva, setCondicionIva] = useState('')
  const [emailFacturacion, setEmailFacturacion] = useState('')
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [billingSaved, setBillingSaved] = useState(false)

  // Load top 3 most ordered products
  useEffect(() => {
    if (!customer?.id) { setTop3Loading(false); return }
    async function loadTop3() {
      try {
        const { data: orders } = await supabaseCustomer
          .from('orders')
          .select('id')
          .eq('customer_id', customer.id)

        if (!orders?.length) { setTop3Loading(false); return }

        const { data: orderItems } = await supabaseCustomer
          .from('order_items')
          .select('product_id, product_name, quantity')
          .in('order_id', orders.map(o => o.id))

        if (!orderItems?.length) { setTop3Loading(false); return }

        const map = {}
        for (const item of orderItems) {
          if (!map[item.product_id]) {
            map[item.product_id] = { product_id: item.product_id, product_name: item.product_name, total: 0 }
          }
          map[item.product_id].total += item.quantity
        }

        const ranked = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 3)
        const productIds = ranked.map(r => r.product_id).filter(Boolean)

        if (productIds.length) {
          const { data: products } = await supabaseCustomer
            .from('products')
            .select('id, name, price, image_url')
            .in('id', productIds)

          const enriched = ranked.map(r => ({
            ...r,
            id: r.product_id,
            ...(products?.find(p => p.id === r.product_id) || {}),
          }))
          setTop3(enriched)
        } else {
          setTop3(ranked.map(r => ({ ...r, id: r.product_id })))
        }
      } catch (e) {
        console.error('top3:', e)
      }
      setTop3Loading(false)
    }
    loadTop3()
  }, [customer?.id])

  // Load rank config and monthly order count
  useEffect(() => {
    if (!customer?.id || !venueId) { setRankLoading(false); return }
    async function loadRank() {
      try {
        const { data } = await supabaseCustomer
          .from('venues')
          .select('customer_rank_config')
          .eq('id', venueId)
          .single()
        if (data?.customer_rank_config?.length) setRankConfig(data.customer_rank_config)
      } catch (_) {}

      try {
        const start = new Date()
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        const { count } = await supabaseCustomer
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customer.id)
          .eq('venue_id', venueId)
          .gte('created_at', start.toISOString())
          .neq('status', 'cancelado')
        setMonthlyOrders(count || 0)
      } catch (_) {}

      setRankLoading(false)
    }
    loadRank()
  }, [customer?.id, venueId])

  // Pre-fill billing from customer data
  useEffect(() => {
    if (customer) {
      setRazonSocial(customer.razon_social || '')
      setCuitDni(customer.cuit_dni || '')
      setCondicionIva(customer.condicion_iva || '')
      setEmailFacturacion(customer.email_facturacion || '')
    }
  }, [customer])

  function startEdit() {
    setEditName(customer?.full_name || '')
    setEditWhatsapp(customer?.whatsapp || '')
    setSaveError('')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    setSaveError('')
    const { error } = await updateCustomer(editName.trim(), editWhatsapp.trim())
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setEditing(false)
  }

  async function saveBillingData() {
    setBillingSaving(true)
    setBillingError('')
    setBillingSaved(false)
    const { error } = await saveBilling({ razonSocial, cuitDni, condicionIva, emailFacturacion })
    setBillingSaving(false)
    if (error) { setBillingError(error.message); return }
    setBillingSaved(true)
    setTimeout(() => setBillingSaved(false), 3000)
  }

  function handleQuickAdd(item) {
    addItem({ id: item.id, name: item.name || item.product_name, price: item.price || 0 })
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 1500)
  }

  // Rank calculation
  const sortedRanks = [...rankConfig].sort((a, b) => b.min_orders - a.min_orders)
  const currentRankData = sortedRanks.find(r => monthlyOrders >= r.min_orders) || rankConfig[0]
  const currentRank = currentRankData ? { ...currentRankData, color: RANK_COLORS[currentRankData.level] } : null
  const nextRankData = currentRank
    ? [...rankConfig].sort((a, b) => a.min_orders - b.min_orders).find(r => r.min_orders > currentRank.min_orders)
    : null
  const nextRank = nextRankData ? { ...nextRankData, color: RANK_COLORS[nextRankData.level] } : null

  return (
    <div className="min-h-screen bg-carbon-950 pb-24">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">MI CUENTA</h1>
      </header>

      <main className="px-5 space-y-4">
        {/* Profile card */}
        {customer && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">Nombre</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">WhatsApp</label>
                  <input
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                    placeholder="+54 9 ..."
                    type="tel"
                  />
                </div>
                {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editName.trim()}
                    className="flex-1 bg-ember-500 disabled:opacity-40 text-white font-bold text-sm py-2.5 rounded-xl"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 bg-carbon-800 text-smoke-300 font-bold text-sm py-2.5 rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-smoke-200 font-semibold text-base leading-tight">{customer.full_name}</p>
                    {customer.whatsapp && (
                      <p className="text-smoke-500 text-xs mt-0.5">{customer.whatsapp}</p>
                    )}
                  </div>
                  <button onClick={startEdit} className="text-ember-500 text-xs font-bold shrink-0 mt-0.5">
                    Editar
                  </button>
                </div>

                {isAnonymous ? (
                  <div className="border-t border-carbon-700 pt-3">
                    <p className="text-smoke-500 text-xs mb-2">Vinculá Google para acceder desde cualquier dispositivo</p>
                    <button
                      onClick={async () => {
                        const r = await signInWithGoogle(`${base}/cuenta`)
                        if (r?.error) setGoogleError(r.error.message)
                      }}
                      className="flex items-center gap-2.5 bg-white text-[#1A2332] font-semibold text-sm px-4 py-2.5 rounded-xl"
                    >
                      <GoogleIcon />
                      Vincular Google
                    </button>
                    {googleError && <p className="text-red-500 text-xs mt-2">{googleError}</p>}
                  </div>
                ) : (
                  <div className="border-t border-carbon-700 pt-3 flex items-center gap-2">
                    <GoogleIcon />
                    <p className="text-smoke-400 text-xs">{userEmail}</p>
                  </div>
                )}

                <div className="border-t border-carbon-700 pt-3">
                  <button
                    onClick={async () => { await forgetCustomer(); navigate(base || '/') }}
                    className="text-smoke-500 text-xs font-semibold"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Rank card */}
        {!rankLoading && currentRank && venueId && (
          <div
            className="bg-carbon-900 rounded-2xl px-4 py-4"
            style={{ border: `1.5px solid ${currentRank.color}50` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${currentRank.color}20` }}
              >
                <RankIcon level={currentRank.level} size={22} style={{ color: currentRank.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-smoke-500 text-[10px] font-bold uppercase tracking-widest">Tu rango este mes</p>
                <p className="font-bold text-base leading-tight" style={{ color: currentRank.color }}>
                  {currentRank.name}
                </p>
              </div>
              <span className="text-smoke-500 text-xs shrink-0">{monthlyOrders} ped.</span>
            </div>

            {nextRank ? (
              <div>
                <div className="w-full bg-carbon-700 rounded-full h-1.5 mb-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (monthlyOrders / nextRank.min_orders) * 100)}%`,
                      backgroundColor: currentRank.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-smoke-600">{monthlyOrders} pedido{monthlyOrders !== 1 ? 's' : ''} este mes</span>
                  <span className="text-smoke-500">{nextRank.min_orders} → <span style={{ color: nextRank.color }}>{nextRank.name}</span></span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-semibold" style={{ color: currentRank.color }}>
                Nivel máximo del mes — {monthlyOrders} pedidos
              </p>
            )}

            {currentRank.prize && (
              <div
                className="mt-3 px-3 py-2 rounded-xl"
                style={{ backgroundColor: `${currentRank.color}18` }}
              >
                <p className="text-[11px] font-semibold" style={{ color: currentRank.color }}>
                  Tu beneficio: {currentRank.prize}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top 3 favoritos */}
        {!top3Loading && top3.length > 0 && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4">
            <h2 className="text-smoke-400 text-[10px] font-bold uppercase tracking-widest mb-3">Tus favoritos</h2>
            <div className="space-y-3">
              {top3.map((item, i) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <div className="shrink-0">
                    <MedalIcon rank={i + 1} size={28} />
                  </div>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-carbon-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-smoke-200 text-sm font-semibold leading-tight truncate">
                      {item.name || item.product_name}
                    </p>
                    <p className="text-smoke-500 text-xs">Pedido {item.total}×</p>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(item)}
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-all"
                    style={{
                      backgroundColor: addedId === item.id ? '#22c55e' : '#e15c23',
                      color: '#fff',
                    }}
                  >
                    {addedId === item.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    ) : '+'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-smoke-600 text-[10px] mt-3">Agregá directo al carrito desde acá</p>
          </div>
        )}

        {/* Datos de facturación */}
        {customer && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4">
            <button
              onClick={() => setBillingOpen(o => !o)}
              className="w-full flex items-center justify-between"
            >
              <div>
                <p className="text-smoke-200 font-semibold text-sm text-left">Datos de facturación</p>
                {customer.razon_social && !billingOpen && (
                  <p className="text-smoke-500 text-xs mt-0.5 text-left">{customer.razon_social}</p>
                )}
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`text-smoke-500 transition-transform shrink-0 ${billingOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {billingOpen && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">Razón Social</label>
                  <input
                    value={razonSocial}
                    onChange={e => setRazonSocial(e.target.value)}
                    placeholder="Nombre o empresa"
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                  />
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">CUIT / DNI</label>
                  <input
                    value={cuitDni}
                    onChange={e => setCuitDni(e.target.value)}
                    placeholder="20-12345678-9"
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                  />
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">Condición IVA</label>
                  <select
                    value={condicionIva}
                    onChange={e => setCondicionIva(e.target.value)}
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                  >
                    <option value="">Seleccionar...</option>
                    {CONDICIONES_IVA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">Email de facturación</label>
                  <input
                    value={emailFacturacion}
                    onChange={e => setEmailFacturacion(e.target.value)}
                    placeholder="facturas@email.com"
                    type="email"
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                  />
                </div>
                {billingError && <p className="text-red-500 text-xs">{billingError}</p>}
                <button
                  onClick={saveBillingData}
                  disabled={billingSaving}
                  className="w-full font-bold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  style={{ backgroundColor: billingSaved ? '#22c55e' : '#e15c23', color: '#fff' }}
                >
                  {billingSaving ? 'Guardando...' : billingSaved ? '✓ Guardado' : 'Guardar datos'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
