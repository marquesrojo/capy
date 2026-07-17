import { useState, useEffect } from 'react'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../lib/supabase'

export default function ClientFloorMap({ zones, accent, onChoose, confirmStep = true, venueId }) {
  const [selected, setSelected] = useState(null)
  const [occupiedIds, setOccupiedIds] = useState(new Set())
  const vid = venueId || ACTIVE_VENUE_ID

  useEffect(() => {
    if (!vid) return
    // Misma fuente que el mapa del staff (FloorPlanViewer): sesiones activas.
    // La policy permite leer sesiones activas de cualquiera solo para esto.
    async function loadOccupied() {
      const [{ data: sessions }, { data: orders }] = await Promise.all([
        supabaseCustomer
          .from('table_sessions')
          .select('zone_id')
          .eq('venue_id', vid)
          .eq('is_active', true)
          .not('zone_id', 'is', null),
        supabaseCustomer
          .from('orders')
          .select('zone_id')
          .eq('venue_id', vid)
          .is('session_id', null)
          .in('status', ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado'])
          .not('zone_id', 'is', null),
      ])
      setOccupiedIds(new Set([
        ...(sessions || []).map(s => s.zone_id),
        ...(orders || []).map(o => o.zone_id),
      ]))
    }
    loadOccupied()
    const channel = supabaseCustomer
      .channel(`client-floor-${vid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `venue_id=eq.${vid}` }, loadOccupied)
      .subscribe()
    return () => supabaseCustomer.removeChannel(channel)
  }, [vid])

  const mesas = zones.filter(z => z.pos_x != null && z.pos_y != null && z.type === 'mesa')
  const zonas = zones.filter(z => z.type === 'zona')
  const zonaIdsWithMesas = new Set(mesas.map(m => m.parent_zone_id).filter(Boolean))
  const relevantZonas = zonas.filter(z => zonaIdsWithMesas.has(z.id))
  const hasZoneTabs = relevantZonas.length > 0
  const [activeZoneId, setActiveZoneId] = useState(() => relevantZonas[0]?.id ?? null)

  const visibleMesas = hasZoneTabs
    ? mesas.filter(m => m.parent_zone_id === activeZoneId)
    : mesas

  function tap(zone) {
    if (!confirmStep) {
      onChoose(zone)
      return
    }
    setSelected(prev => prev?.id === zone.id ? null : zone)
  }

  return (
    <div>
      {hasZoneTabs && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {relevantZonas.map(z => (
            <button
              key={z.id}
              onClick={() => { setActiveZoneId(z.id); setSelected(null) }}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors"
              style={activeZoneId === z.id
                ? { backgroundColor: accent, borderColor: accent, color: 'white' }
                : { backgroundColor: '#F0F4F8', borderColor: accent, color: accent }
              }
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{
          paddingTop: '65%',
          background: '#0D1117',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
      >
        <div className="absolute inset-0">
          {visibleMesas.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-[#4A5568] text-xs pointer-events-none">
              Sin mesas posicionadas en este sector
            </p>
          )}
          {visibleMesas.map(zone => {
            const isSelected = selected?.id === zone.id
            const isOccupied = occupiedIds.has(zone.id)
            const w = zone.size_w ?? 8
            const h = zone.size_h ?? 13
            const radius = zone.shape === 'redonda' ? 'rounded-full' : zone.shape === 'barra' ? 'rounded-lg' : 'rounded-xl'

            let bgColor, borderColor, textColor
            if (isSelected) {
              bgColor = accent; borderColor = accent; textColor = 'white'
            } else if (isOccupied) {
              bgColor = '#FEF3C7'; borderColor = '#F59E0B'; textColor = '#92400E'
            } else {
              bgColor = '#E8E3DA'; borderColor = '#C2B9A8'; textColor = '#4A4742'
            }

            return (
              <button
                key={zone.id}
                className="absolute active:scale-95 transition-transform"
                style={{
                  left: `${zone.pos_x}%`,
                  top: `${zone.pos_y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                }}
                onClick={() => tap(zone)}
              >
                <div
                  className={`w-full h-full ${radius} flex items-center justify-center border-2 transition-all relative`}
                  style={isSelected
                    ? { backgroundColor: bgColor, borderColor, boxShadow: `0 0 0 3px ${accent}55` }
                    : { backgroundColor: bgColor, borderColor }
                  }
                >
                  <span
                    className="text-[9px] font-semibold text-center leading-tight px-1 break-words w-full"
                    style={{ color: textColor }}
                  >
                    {zone.name}
                  </span>
                  {isOccupied && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0D1117]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {occupiedIds.size > 0 && (
        <div className="flex items-center gap-4 mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#E8E3DA] border border-[#C2B9A8]" />
            <span className="text-[10px] text-[#9DAAB8]">Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#FEF3C7] border border-amber-400" />
            <span className="text-[10px] text-[#9DAAB8]">Ocupada</span>
          </div>
        </div>
      )}

      {confirmStep && (
        <div className="mt-3 min-h-[52px]">
          {selected ? (
            <button
              onClick={() => onChoose(selected)}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white text-center active:scale-95 transition-transform"
              style={{ backgroundColor: accent }}
            >
              Confirmar: {selected.name} →
            </button>
          ) : (
            <p className="text-center text-sm text-[#9DAAB8] pt-3">Tocá una mesa para seleccionarla</p>
          )}
        </div>
      )}
    </div>
  )
}
