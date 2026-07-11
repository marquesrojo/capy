import { useEffect, useState } from 'react'

const ACTIVE_STATUSES = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo']

export default function FloorPlanViewer({ zones, venueId, selectedZone, onSelect, supabaseClient, filterZoneId }) {
  const [occupiedIds, setOccupiedIds] = useState(new Set())

  const mesas = zones.filter(z => z.is_active && z.pos_x != null && z.pos_y != null && z.type !== 'zona' && z.type !== 'retiro')
  const zonas = zones.filter(z => z.type === 'zona' && z.is_active)
  const zonaIdsWithMesas = new Set(mesas.map(m => m.parent_zone_id).filter(Boolean))
  const relevantZonas = zonas.filter(z => zonaIdsWithMesas.has(z.id))
  const hasZoneTabs = relevantZonas.length > 0

  const [activeZoneId, setActiveZoneId] = useState(() => relevantZonas[0]?.id ?? null)

  const visibleMesas = filterZoneId
    ? mesas.filter(m => m.parent_zone_id === filterZoneId)
    : hasZoneTabs
      ? mesas.filter(m => m.parent_zone_id === activeZoneId)
      : mesas

  useEffect(() => {
    if (!venueId) return
    loadActive()
    const channel = supabaseClient
      .channel(`floor-viewer-${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` }, loadActive)
      .subscribe()
    return () => supabaseClient.removeChannel(channel)
  }, [venueId])

  async function loadActive() {
    const { data } = await supabaseClient
      .from('orders')
      .select('zone_id')
      .eq('venue_id', venueId)
      .in('status', ACTIVE_STATUSES)
      .not('zone_id', 'is', null)
    setOccupiedIds(new Set((data || []).map(o => o.zone_id)))
  }

  if (mesas.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="mx-auto mb-3 text-smoke-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        <p className="text-smoke-500 text-sm">El mapa no está configurado.</p>
        <p className="text-smoke-600 text-xs mt-1">Ir a Configuración → Ubicaciones → Mapa para posicionar las mesas.</p>
      </div>
    )
  }

  return (
    <div>
      {hasZoneTabs && !filterZoneId && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {relevantZonas.map(z => (
            <button
              key={z.id}
              onClick={() => setActiveZoneId(z.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeZoneId === z.id ? 'bg-[#008080] text-white border-[#008080]' : 'border-black/10 text-[#8896A5] bg-white'
              }`}
            >
              {z.name}
            </button>
          ))}
          {mesas.some(m => !m.parent_zone_id) && (
            <button
              onClick={() => setActiveZoneId(null)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeZoneId === null ? 'bg-[#008080] text-white border-[#008080]' : 'border-black/10 text-[#8896A5] bg-white'
              }`}
            >
              General
            </button>
          )}
        </div>
      )}

      <div
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{
          paddingTop: '60%',
          background: '#0D1117',
          border: '1.5px solid #2a2d33',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
      >
        <div className="absolute inset-0">
          {visibleMesas.map(zone => {
            const occupied = occupiedIds.has(zone.id)
            const selected = selectedZone?.id === zone.id
            const w = zone.size_w ?? 8
            const h = zone.size_h ?? 13
            const radius = zone.shape === 'redonda' ? 'rounded-full' : zone.shape === 'barra' ? 'rounded-lg' : 'rounded-xl'
            return (
              <button
                key={zone.id}
                className="absolute"
                style={{
                  left: `${zone.pos_x}%`,
                  top: `${zone.pos_y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                }}
                onClick={() => onSelect?.(zone)}
              >
                <div className={`w-full h-full ${radius} flex items-center justify-center transition-all relative border-2
                  ${selected
                    ? 'bg-[#008080] border-[#00b0b0] shadow-lg scale-105'
                    : occupied
                      ? 'bg-red-950 border-red-700/70'
                      : 'bg-carbon-800 border-carbon-600 hover:border-[#008080]'
                  }`}
                >
                  <span className={`text-[9px] font-semibold text-center leading-tight px-1 break-words w-full
                    ${selected ? 'text-white' : occupied ? 'text-red-300' : 'text-smoke-200'}`}
                  >
                    {zone.name}
                  </span>
                  {occupied && !selected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-[#0D1117]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-carbon-700 border border-carbon-500" />
          <span className="text-smoke-500 text-[11px]">Libre</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-950 border border-red-700/70" />
          <span className="text-smoke-500 text-[11px]">Ocupada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#008080]" />
          <span className="text-smoke-500 text-[11px]">Seleccionada</span>
        </div>
      </div>
    </div>
  )
}
