import { useState } from 'react'

export default function ClientFloorMap({ zones, accent, onChoose, confirmStep = true }) {
  const [selected, setSelected] = useState(null)

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
            const w = zone.size_w ?? 8
            const h = zone.size_h ?? 13
            const radius = zone.shape === 'redonda' ? 'rounded-full' : zone.shape === 'barra' ? 'rounded-lg' : 'rounded-xl'
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
                  className={`w-full h-full ${radius} flex items-center justify-center border-2 transition-all`}
                  style={isSelected
                    ? { backgroundColor: accent, borderColor: accent, boxShadow: `0 0 0 3px ${accent}55` }
                    : { backgroundColor: '#E8E3DA', borderColor: '#C2B9A8' }
                  }
                >
                  <span
                    className="text-[9px] font-semibold text-center leading-tight px-1 break-words w-full"
                    style={{ color: isSelected ? 'white' : '#4A4742' }}
                  >
                    {zone.name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

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
