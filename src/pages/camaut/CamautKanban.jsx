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

export default function CamautKanban({ venueId, linkedVenues = [], staffId }) {
  const [ownOrders, setOwnOrders] = useState([])
  const [linkedOrders, setLinkedOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('propio')
  const [timerModal, setTimerModal] = useState(null) // { orderId }
  const [timerMins, setTimerMins] = useState('15')
  const [qrModal, setQrModal] = useState(null)

  useEffect(() => {
    if (venueId) loadOrders()
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [venueId, linkedVenues, staffId])

  async function loadOrders() {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-orders`, {
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
    })
    const result = await res.json()
    if (result.success) {
      setOwnOrders(result.ownOrders || [])
      setLinkedOrders(result.linkedOrders || [])
    }
    setLoading(false)
  }

  async function updateStatus(orderId, newStatus) {
    await supabaseStaff.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOwnOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  async function startTimer(orderId, mins) {
    const minutes = parseInt(mins)
    if (!minutes || minutes < 1) return
    await supabaseStaff.from('orders').update({
      prep_started_at: new Date().toISOString(),
      prep_time_minutes: minutes
    }).eq('id', orderId)
    setOwnOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, prep_started_at: new Date().toISOString(), prep_time_minutes: minutes }
      : o
    ))
    setTimerModal(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando...</p>
    </div>
  )

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
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2 bg-black/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('propio')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                activeTab === 'propio' ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
              }`}
            >
              Mi Carta
            </button>
            {linkedVenues.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveTab(v.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                  activeTab === v.id ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
                }`}
              >
                {v.name.replace(' — Capy', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kanban propio — editable */}
      {activeTab === 'propio' && (
        <div className="overflow-x-auto px-4 py-4">
          <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 180}px` }}>
            {COLUMNS.map(col => {
              const colOrders = ownOrders.filter(o => col.statuses.includes(o.status))
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
                        order.status === 'listo' ? 'border-emerald-300' : 'border-black/5'
                      }`}>
                        {order.status === 'listo' && (
                          <p className="text-emerald-600 text-[10px] font-semibold mb-1">✓ Listo</p>
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
                        <div className="text-[#8896A5] text-[10px] space-y-0.5 mb-2">
                          {(order.order_items || []).slice(0, 3).map((item, i) => (
                            <p key={i}>{item.quantity}× {item.product_name}</p>
                          ))}
                          {(order.order_items || []).length > 3 && (
                            <p>+{order.order_items.length - 3} más</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-mono text-[#1A2A3A] text-xs font-semibold">
                            {formatPrice(order.total)}
                          </p>
                          <button
                            onClick={() => setQrModal(order.id)}
                            className="border border-black/10 text-[#8896A5] text-[10px] px-2 py-1 rounded-lg"
                          >
                            QR
                          </button>
                        </div>
                        {col.id !== 'entregado' && (
                          <div className="flex gap-1">
                            {PREV_STATUS[order.status] && (
                              <button
                                onClick={() => updateStatus(order.id, PREV_STATUS[order.status])}
                                className="flex-1 border border-black/10 text-[#8896A5] text-[10px] py-1 rounded-lg"
                              >
                                ↺
                              </button>
                            )}
                            {col.id === 'en_preparacion' && (
                              <button
                                onClick={() => { setTimerModal(order.id); setTimerMins('15') }}
                                className="border border-[#008080]/30 text-[#008080] text-[10px] px-2 py-1 rounded-lg"
                              >
                                ⏱
                              </button>
                            )}
                            {NEXT_STATUS[order.status] && (
                              <button
                                onClick={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                                className="flex-1 bg-[#008080] text-white text-[10px] py-1 rounded-lg font-semibold"
                              >
                                {order.status === 'recibido' || order.status === 'pendiente_aprobacion' ? 'Preparar' :
                                 order.status === 'en_preparacion' ? 'Listo ✓' : 'Entregar'}
                              </button>
                            )}
                          </div>
                        )}
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
                        order.status === 'listo' ? 'border-emerald-300' : 'border-black/5'
                      }`}>
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
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-mono text-[#1A2A3A] text-xs font-semibold">
                            {formatPrice(order.total)}
                          </p>
                          <button
                            onClick={() => setQrModal(order.id)}
                            className="border border-black/10 text-[#8896A5] text-[10px] px-2 py-1 rounded-lg"
                          >
                            QR
                          </button>
                        </div>
                        {order.status === 'listo' && (
                          <p className="text-emerald-600 text-[10px] font-semibold mt-1">✓ Listo para entregar</p>
                        )}
                        {(order.status === 'en_preparacion' || order.status === 'listo') && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => { setTimerModal(order.id); setTimerMins('15') }}
                              className="border border-[#008080]/30 text-[#008080] text-[10px] px-2 py-1 rounded-lg"
                            >
                              ⏱ Timer
                            </button>
                          </div>
                        )}
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
