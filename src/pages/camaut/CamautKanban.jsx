import { useEffect, useState } from 'react'
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

export default function CamautKanban({ venueId, linkedVenues = [], staffId }) {
  const [ownOrders, setOwnOrders] = useState([])
  const [linkedOrders, setLinkedOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('propio')

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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      {/* Tabs propio / restaurante */}
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
                        <p className="font-mono text-[#1A2A3A] text-xs font-semibold mb-2">
                          {formatPrice(order.total)}
                        </p>
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
                        <p className="font-mono text-[#1A2A3A] text-xs font-semibold">
                          {formatPrice(order.total)}
                        </p>
                        {order.status === 'listo' && (
                          <p className="text-emerald-600 text-[10px] font-semibold mt-1">✓ Listo para entregar</p>
                        )}
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
