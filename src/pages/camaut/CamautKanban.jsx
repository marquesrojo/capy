import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { formatPrice } from '../../lib/utils'
import { supabaseStaff } from '../../lib/supabase'

const COLUMNS = [
  { id: 'recibido', label: 'Recibido', statuses: ['recibido', 'pendiente_aprobacion'] },
  { id: 'en_preparacion', label: 'Preparación', statuses: ['en_preparacion', 'listo'] },
  { id: 'entregado', label: 'Entregado', statuses: ['entregado'] },
]

const NEXT_STATUS = {
  recibido: 'en_preparacion',
  pendiente_aprobacion: 'recibido',
  en_preparacion: 'entregado',
  listo: 'entregado',
}

const PREV_STATUS = {
  en_preparacion: 'recibido',
  listo: 'en_preparacion',
  entregado: 'en_preparacion',
}

function PrepTimer({ order }) {
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!order.prep_started_at || !order.prep_time_minutes) { setProgress(null); return }
    function calc() {
      const start = new Date(order.prep_started_at).getTime()
      const total = order.prep_time_minutes * 60 * 1000
      const elapsed = Date.now() - start
      const remaining = Math.max(0, total - elapsed)
      const percent = Math.min(100, (elapsed / total) * 100)
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setProgress({ percent, mins, secs, done: remaining === 0 })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [order.prep_started_at, order.prep_time_minutes])

  if (!progress) return null

  return (
    <div className="mt-2">
      <div className="w-full bg-[#F0F4F8] rounded-full h-1.5 mb-1">
        <div
          className={`h-1.5 rounded-full transition-all ${progress.done ? 'bg-emerald-500' : 'bg-ember-500'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className={`text-[10px] font-semibold text-center ${progress.done ? 'text-emerald-600' : 'text-[#8896A5]'}`}>
        {progress.done ? '✓ Listo' : `${progress.mins}:${String(progress.secs).padStart(2, '0')} restantes`}
      </p>
    </div>
  )
}

export default function CamautKanban({ venueId, linkedVenues = [], staffId, onNewOrderForTable }) {
  const [ownOrders, setOwnOrders] = useState([])
  const [linkedOrders, setLinkedOrders] = useState([])
  const [waiterCalls, setWaiterCalls] = useState([])
  const [menus, setMenus] = useState([])
  const [activeMenuFilter, setActiveMenuFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    if (linkedVenues.length === 0) return 'propio'
    return localStorage.getItem(`capy_kanban_${venueId}`) || null
  })
  const [timerModal, setTimerModal] = useState(null) // { orderId }
  const [timerMins, setTimerMins] = useState('15')
  const [qrModal, setQrModal] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)

  useEffect(() => {
    if (!venueId) return
    supabaseStaff.from('staff_menus').select('*').eq('venue_id', venueId).order('created_at').then(({ data }) => setMenus(data || []))
  }, [venueId])

  function selectTab(id) {
    setActiveTab(id)
    if (id === null) {
      localStorage.removeItem(`capy_kanban_${venueId}`)
    } else {
      localStorage.setItem(`capy_kanban_${venueId}`, id)
    }
  }

  useEffect(() => {
    if (venueId) loadOrders()
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [venueId, linkedVenues, staffId])

  async function loadOrders() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [res, deliveredRes, linkedRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          venueId,
          linkedVenueIds: linkedVenues.map(v => v.id),
          staffId
        })
      }).then(r => r.json()),
      venueId
        ? supabaseStaff
            .from('orders')
            .select('id, daily_number, location_label, total, status, created_at, notes, prep_started_at, prep_time_minutes, menu_id, waiter_called_at, order_items(product_name, quantity, unit_price, item_notes)')
            .eq('venue_id', venueId)
            .eq('status', 'entregado')
            .gte('created_at', todayStart.toISOString())
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      linkedVenues.length > 0
        ? supabaseStaff
            .from('orders')
            .select('id, daily_number, location_label, total, status, created_at, notes, prep_started_at, prep_time_minutes, waiter_called_at, assigned_staff_id, menu_id, order_items(product_name, quantity, unit_price, item_notes), venue_id')
            .in('venue_id', linkedVenues.map(v => v.id))
            .neq('status', 'cancelado')
            .gte('created_at', todayStart.toISOString())
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])

    const linkedData = linkedRes.data || []
    const claimedByMe = staffId ? linkedData.filter(o => o.assigned_staff_id === staffId) : []
    setLinkedOrders(linkedData.filter(o => !staffId || o.assigned_staff_id !== staffId))

    if (res.success) {
      const own = res.ownOrders || []
      let extraMap = {}
      if (own.length > 0) {
        const { data: extraData } = await supabaseStaff
          .from('orders')
          .select('id, menu_id, waiter_called_at')
          .in('id', own.map(o => o.id))
        extraMap = Object.fromEntries((extraData || []).map(o => [o.id, o]))
      }
      const activeOrders = own.map(o => ({
        ...o,
        menu_id: extraMap[o.id]?.menu_id || null,
        waiter_called_at: extraMap[o.id]?.waiter_called_at || null
      }))
      const todayDelivered = deliveredRes.data || []
      const activeIds = new Set(activeOrders.map(o => o.id))
      setOwnOrders([
        ...activeOrders,
        ...todayDelivered.filter(o => !activeIds.has(o.id)),
        ...claimedByMe,
      ])
    }
    setLoading(false)
  }

  async function updateStatus(orderId, newStatus) {
    setOwnOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    const { error } = await supabaseStaff.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) console.error('[updateStatus] DB error:', error.message)
    loadOrders()
  }

  async function clearWaiterCall(orderId) {
    await supabaseStaff.from('orders').update({ waiter_called_at: null }).eq('id', orderId)
    setOwnOrders(prev => prev.map(o => o.id === orderId ? { ...o, waiter_called_at: null } : o))
    setLinkedOrders(prev => prev.map(o => o.id === orderId ? { ...o, waiter_called_at: null } : o))
  }

  async function claimOrder(order) {
    setLinkedOrders(prev => prev.filter(o => o.id !== order.id))
    setOwnOrders(prev => [...prev, { ...order, assigned_staff_id: staffId }])
    await supabaseStaff.from('orders').update({ assigned_staff_id: staffId }).eq('id', order.id)
  }

  async function loadWaiterCalls() {
    if (!venueId) return
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
    await supabaseStaff.from('waiter_calls').update({ resolved_at: new Date().toISOString() }).eq('id', callId)
  }

  useEffect(() => {
    if (!venueId) return
    loadWaiterCalls()
    const channel = supabaseStaff
      .channel(`camaut-waiter-calls-${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `venue_id=eq.${venueId}` }, loadWaiterCalls)
      .subscribe()
    return () => supabaseStaff.removeChannel(channel)
  }, [venueId])

  async function startTimer(orderId, mins) {
    const minutes = parseInt(mins)
    if (!minutes || minutes < 1) return
    const order = ownOrders.find(o => o.id === orderId)
    const toPrep = order && ['recibido', 'pendiente_aprobacion'].includes(order.status)
    await supabaseStaff.from('orders').update({
      prep_started_at: new Date().toISOString(),
      prep_time_minutes: minutes,
      ...(toPrep ? { status: 'en_preparacion' } : {})
    }).eq('id', orderId)
    setOwnOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, prep_started_at: new Date().toISOString(), prep_time_minutes: minutes, ...(toPrep ? { status: 'en_preparacion' } : {}) }
      : o
    ))
    setTimerModal(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando...</p>
    </div>
  )

  // Selector de venue
  if (activeTab === null) {
    return (
      <div className="px-4 pt-5 pb-8 bg-[#F0F4F8] min-h-screen">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-4 px-1">¿Qué pedidos querés ver?</p>
        <div className="space-y-3">
          <button
            onClick={() => selectTab('propio')}
            className="w-full bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-left flex items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E8F5F5] flex items-center justify-center text-[#008080] flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-base">Mis Cartas</p>
              <p className="text-[#8896A5] text-sm">{ownOrders.filter(o => o.status !== 'entregado').length} pedidos activos</p>
            </div>
          </button>
          {linkedVenues.map(v => {
            const count = linkedOrders.filter(o => o.venue_id === v.id && o.status !== 'entregado').length
            return (
              <button
                key={v.id}
                onClick={() => selectTab(v.id)}
                className="w-full bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-left flex items-center gap-4 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFF3E8] flex items-center justify-center flex-shrink-0" style={{ color: '#E07A30' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div>
                  <p className="font-bold text-[#1A2A3A] text-base">{v.name.replace(' — Capy', '')}</p>
                  <p className="text-[#8896A5] text-sm">{count} pedidos activos</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      {/* Modal timer */}
      {timerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <p className="font-bold text-[#1A2A3A] text-base text-center">⏱ Tiempo de preparación</p>
            <div className="flex gap-2 justify-center">
              {['5', '10', '15', '20', '30'].map(m => (
                <button
                  key={m}
                  onClick={() => setTimerMins(m)}
                  className={`w-12 h-12 rounded-xl text-sm font-bold border ${
                    timerMins === m ? 'bg-[#008080] text-white border-[#008080]' : 'border-black/10 text-[#3A4A5A]'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <input
              type="number"
              value={timerMins}
              onChange={e => setTimerMins(e.target.value)}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-center text-sm text-[#1A2A3A]"
              placeholder="Minutos"
              min="1"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setTimerModal(null)}
                className="flex-1 border border-black/10 text-[#8896A5] py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => startTimer(timerModal, timerMins)}
                className="flex-1 bg-[#008080] text-white font-bold py-3 rounded-xl text-sm"
              >
                Iniciar timer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-[#1A2A3A] text-base mb-4">QR del pedido</p>
            <QRCanvas orderId={qrModal} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://capyapp.co/ver-pedido/${qrModal}`)
                  alert('Link copiado')
                }}
                className="flex-1 border border-[#008080] text-[#008080] font-semibold py-2.5 rounded-xl text-sm"
              >
                Copiar link
              </button>
              {navigator.share && (
                <button
                  onClick={() => navigator.share({ url: `https://capyapp.co/ver-pedido/${qrModal}` })}
                  className="flex-1 bg-[#008080] text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  Compartir
                </button>
              )}
            </div>
            <button onClick={() => setQrModal(null)} className="text-[#8896A5] text-sm mt-3">Cerrar</button>
          </div>
        </div>
      )}
      {linkedVenues.length > 0 && (
        <div className="bg-white border-b border-black/8 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide">Viendo</p>
            <p className="font-bold text-[#1A2A3A] text-sm">
              {activeTab === 'propio' ? 'Mis Cartas' : linkedVenues.find(v => v.id === activeTab)?.name?.replace(' — Capy', '')}
            </p>
          </div>
          <button
            onClick={() => selectTab(null)}
            className="text-[#008080] text-xs font-semibold border border-[#008080]/30 px-3 py-1.5 rounded-xl"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Panel de atención unificado: llamadas de pedido + llamadas anónimas */}
      {(() => {
        const orderCalls = activeTab === 'propio'
          ? ownOrders.filter(o => o.waiter_called_at).map(o => ({
              key: `order-${o.id}`,
              label: o.location_label,
              time: o.waiter_called_at,
              dismiss: () => clearWaiterCall(o.id),
            }))
          : linkedOrders.filter(o => o.venue_id === activeTab && o.waiter_called_at).map(o => ({
              key: `order-${o.id}`,
              label: o.location_label,
              time: o.waiter_called_at,
              dismiss: () => clearWaiterCall(o.id),
            }))
        const anonCalls = activeTab === 'propio' ? waiterCalls.map(c => ({
          key: `anon-${c.id}`,
          label: c.location_label,
          time: c.called_at,
          dismiss: () => dismissAnonCall(c.id),
        })) : []
        const allCalls = [...orderCalls, ...anonCalls]
        if (allCalls.length === 0) return null
        return (
          <div className="mx-4 mt-3 rounded-xl border bg-[#008080]/8 border-[#008080]/25 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <p className="text-[#008080] text-xs font-semibold">Te llaman · {allCalls.length}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allCalls.map(call => {
                const time = new Date(call.time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={call.key} className="flex items-center gap-2.5 bg-white border border-black/8 rounded-lg px-2.5 py-1.5 flex-shrink-0">
                    <div className="min-w-0">
                      <p className="text-[#1A2A3A] text-xs font-semibold leading-tight max-w-[130px] truncate">{call.label}</p>
                      <p className="text-[#8896A5] text-[10px]">{time}</p>
                    </div>
                    <button
                      onClick={call.dismiss}
                      className="flex-shrink-0 bg-[#008080] text-white text-[10px] font-bold px-2 py-1 rounded-md"
                    >
                      Atendido
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Kanban propio — editable */}
      {activeTab === 'propio' && (
        <div>
          {menus.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveMenuFilter('all')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 ${
                  activeMenuFilter === 'all' ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white border-black/10 text-[#3A4A5A]'
                }`}
              >
                Todos
              </button>
              {menus.map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveMenuFilter(m.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 ${
                    activeMenuFilter === m.id ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white border-black/10 text-[#3A4A5A]'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
          <div className="overflow-x-auto px-4 py-4">
          {(() => {
            const displayOrders = activeMenuFilter === 'all'
              ? ownOrders
              : ownOrders.filter(o => o.menu_id === activeMenuFilter)
            return (
          <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 180}px` }}>
            {COLUMNS.map(col => {
              const colOrders = displayOrders.filter(o => col.statuses.includes(o.status))
              return (
                <div key={col.id} className="flex-1 min-w-44">
                  <div className={`px-3 py-2 rounded-xl text-xs font-semibold mb-2 text-center ${
                    col.id === 'en_preparacion' ? 'bg-[#008080]/10 text-[#008080]' :
                    col.id === 'entregado' ? 'bg-[#E8EDF2] text-[#8896A5]' :
                    'bg-white text-[#3A4A5A] border border-black/8'
                  }`}>
                    {col.label} · {colOrders.length}
                  </div>
                  <div className="space-y-2">
                    {colOrders.map(order => (
                      <div key={order.id} className={`bg-white rounded-xl p-3 border shadow-sm ${
                        order.waiter_called_at ? 'border-amber-400' : order.status === 'listo' ? 'border-emerald-300' : 'border-black/5'
                      }`}>
                        {order.waiter_called_at && (
                          <div className="flex items-center justify-between -mx-3 -mt-3 mb-2 px-3 pt-2 pb-1.5 bg-amber-50 rounded-t-xl border-b border-amber-200">
                            <p className="text-amber-700 text-[10px] font-semibold">🔔 Te está llamando</p>
                            <button
                              onClick={() => clearWaiterCall(order.id)}
                              className="text-[9px] font-bold text-amber-700 border border-amber-300 bg-white px-1.5 py-0.5 rounded-lg"
                            >
                              Ya voy
                            </button>
                          </div>
                        )}
                        {!order.waiter_called_at && order.status === 'listo' && (
                          <p className="text-emerald-600 text-[10px] font-semibold mb-1">✓ Listo</p>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[#008080] font-bold text-sm">
                            #{order.daily_number || order.id.slice(0, 4)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[#8896A5] text-[10px]">
                              {Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)}m
                            </span>
                            <button
                              onClick={() => setExpandedCard(prev => prev === order.id ? null : order.id)}
                              className="text-[#8896A5] text-[10px] border border-black/10 w-5 h-5 rounded flex items-center justify-center leading-none"
                            >
                              {expandedCard === order.id ? '↑' : '↓'}
                            </button>
                          </div>
                        </div>
                        <p className="text-[#8896A5] text-[10px] mb-1">📍 {order.location_label}</p>

                        {/* Items: collapsed = primeros 3, expanded = todos con notas */}
                        <div className="text-[#8896A5] text-[10px] space-y-0.5 mb-2">
                          {expandedCard === order.id ? (
                            <>
                              {(order.order_items || []).map((item, i) => (
                                <div key={i}>
                                  <p className="text-[#3A4A5A]">{item.quantity}× {item.product_name}</p>
                                  {item.item_notes && (
                                    <p className="text-amber-600 italic ml-3">↳ {item.item_notes}</p>
                                  )}
                                </div>
                              ))}
                              {order.notes && (
                                <p className="text-amber-600 italic border-l-2 border-amber-400/40 pl-2 mt-1">
                                  📝 {order.notes}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              {(order.order_items || []).slice(0, 3).map((item, i) => (
                                <p key={i}>{item.quantity}× {item.product_name}</p>
                              ))}
                              {(order.order_items || []).length > 3 && (
                                <p>+{order.order_items.length - 3} más</p>
                              )}
                            </>
                          )}
                        </div>

                        <p className="font-mono text-[#1A2A3A] text-xs font-semibold mt-2">
                          {formatPrice(order.total)}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {PREV_STATUS[order.status] && col.id !== 'entregado' && (
                            <button
                              onClick={() => updateStatus(order.id, PREV_STATUS[order.status])}
                              className="border border-black/10 text-[#8896A5] text-[10px] py-1.5 px-2 rounded-lg"
                            >
                              ↺
                            </button>
                          )}
                          {(col.id === 'recibido' || col.id === 'en_preparacion') && (
                            <button
                              onClick={() => { setTimerModal(order.id); setTimerMins('15') }}
                              className="border border-[#008080] bg-[#008080]/10 text-[#008080] text-[10px] px-2 py-1.5 rounded-lg font-semibold"
                            >
                              ⏱
                            </button>
                          )}
                          <button
                            onClick={() => setQrModal(order.id)}
                            className="border border-[#008080] bg-[#008080]/10 text-[#008080] text-[10px] px-2 py-1.5 rounded-lg font-semibold"
                          >
                            QR
                          </button>
                          {onNewOrderForTable && order.location_label && (
                            <button
                              onClick={() => onNewOrderForTable(order.location_label)}
                              className="border border-[#008080] bg-[#008080]/10 text-[#008080] text-[10px] px-2 py-1.5 rounded-lg font-semibold"
                            >
                              +
                            </button>
                          )}
                          {NEXT_STATUS[order.status] && (
                            <button
                              onClick={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                              className="flex-1 bg-[#008080] text-white text-[10px] py-1.5 rounded-lg font-semibold"
                            >
                              {order.status === 'recibido' || order.status === 'pendiente_aprobacion' ? 'Preparar' :
                               order.status === 'en_preparacion' ? 'Listo ✓' : 'Entregar'}
                            </button>
                          )}
                        </div>
                        <PrepTimer order={order} />
                      </div>
                    ))}
                    {colOrders.length === 0 && (
                      <p className="text-[#B0BEC5] text-[10px] text-center py-3">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
            )
          })()}
          </div>
        </div>
      )}

      {/* Espejo del restaurante — solo lectura */}
      {linkedVenues.map(v => activeTab === v.id && (
        <div key={v.id} className="overflow-x-auto px-4 py-4">
          <p className="text-[#8896A5] text-xs mb-3">
            Solo lectura — los pedidos los gestiona {v.name.replace(' — Capy', '')}
          </p>
          <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 180}px` }}>
            {COLUMNS.map(col => {
              const colOrders = linkedOrders.filter(o => col.statuses.includes(o.status) && o.venue_id === v.id)
              return (
                <div key={col.id} className="flex-1 min-w-44">
                  <div className={`px-3 py-2 rounded-xl text-xs font-semibold mb-2 text-center ${
                    col.id === 'listo' ? 'bg-emerald-100 text-emerald-700' :
                    col.id === 'en_preparacion' ? 'bg-[#008080]/10 text-[#008080]' :
                    col.id === 'entregado' ? 'bg-[#E8EDF2] text-[#8896A5]' :
                    'bg-white text-[#3A4A5A] border border-black/8'
                  }`}>
                    {col.label} · {colOrders.length}
                  </div>
                  <div className="space-y-2">
                    {colOrders.map(order => (
                      <div key={order.id} className={`bg-white rounded-xl p-3 border shadow-sm ${
                        order.waiter_called_at ? 'border-amber-400' : order.status === 'listo' ? 'border-emerald-300' : 'border-black/5'
                      }`}>
                        {order.waiter_called_at && (
                          <div className="flex items-center justify-between -mx-3 -mt-3 mb-2 px-3 pt-2 pb-1.5 bg-amber-50 rounded-t-xl border-b border-amber-200">
                            <p className="text-amber-700 text-[10px] font-semibold">🔔 Te está llamando</p>
                            <button
                              onClick={() => clearWaiterCall(order.id)}
                              className="text-[9px] font-bold text-amber-700 border border-amber-300 bg-white px-1.5 py-0.5 rounded-lg"
                            >
                              Ya voy
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[#008080] font-bold text-sm">
                            #{order.daily_number || order.id.slice(0, 4)}
                          </span>
                          <span className="text-[#8896A5] text-[10px]">
                            {Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)}m
                          </span>
                        </div>
                        <p className="text-[#8896A5] text-[10px] mb-1">📍 {order.location_label}</p>
                        <div className="text-[#8896A5] text-[10px] space-y-0.5 mb-1">
                          {(order.order_items || []).slice(0, 3).map((item, i) => (
                            <p key={i}>{item.quantity}× {item.product_name}</p>
                          ))}
                        </div>
                        <p className="font-mono text-[#1A2A3A] text-xs font-semibold mt-1">
                          {formatPrice(order.total)}
                        </p>
                        {order.status === 'listo' && (
                          <p className="text-emerald-600 text-[10px] font-semibold mt-1">✓ Listo para entregar</p>
                        )}
                        <div className="flex gap-1 mt-2">
                          {(order.status === 'en_preparacion' || order.status === 'listo') && (
                            <button
                              onClick={() => { setTimerModal(order.id); setTimerMins('15') }}
                              className="border border-[#008080] bg-[#008080]/10 text-[#008080] text-[10px] px-2 py-1.5 rounded-lg font-semibold"
                            >
                              ⏱
                            </button>
                          )}
                          <button
                            onClick={() => setQrModal(order.id)}
                            className="border border-[#008080] bg-[#008080]/10 text-[#008080] text-[10px] px-2 py-1.5 rounded-lg font-semibold"
                          >
                            QR
                          </button>
                          {staffId && order.status !== 'entregado' && (
                            <button
                              onClick={() => claimOrder(order)}
                              className="flex-1 bg-[#008080] text-white text-[10px] py-1.5 rounded-lg font-semibold"
                            >
                              Tomar pedido
                            </button>
                          )}
                        </div>
                        <PrepTimer order={order} />
                      </div>
                    ))}
                    {colOrders.length === 0 && (
                      <p className="text-[#B0BEC5] text-[10px] text-center py-3">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function QRCanvas({ orderId }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !orderId) return
    QRCode.toCanvas(canvasRef.current, `https://capyapp.co/ver-pedido/${orderId}`, {
      width: 220,
      margin: 2,
      color: { dark: '#1A2A3A', light: '#FFFFFF' }
    })
  }, [orderId])

  return (
    <div className="flex justify-center">
      <div className="bg-white p-3 rounded-2xl border border-black/5">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
