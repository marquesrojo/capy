import { useEffect, useRef, useState } from 'react'

export default function FloorPlanViewer({
  zones,
  venueId,
  selectedZone,
  onSelect,
  supabaseClient,
  filterZoneId,
  multiSelect = false,
  selectedZones,
  onSelectMultiple,
}) {
  const [occupiedIds, setOccupiedIds] = useState(new Set())
  const [multiSelectedIds, setMultiSelectedIds] = useState(new Set(
    (selectedZones || []).map(z => z.id)
  ))
  const [rubberBand, setRubberBand] = useState(null)
  const canvasRef = useRef(null)
  const iaRef = useRef(null)

  const mesas = zones.filter(z => z.is_active && z.pos_x != null && z.pos_y != null && z.type !== 'zona' && z.type !== 'retiro' && z.type !== 'decor')
  const decorItems = zones.filter(z => z.is_active && z.pos_x != null && z.pos_y != null && z.type === 'decor')
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

  const visibleDecor = filterZoneId
    ? decorItems.filter(d => d.parent_zone_id === filterZoneId)
    : hasZoneTabs
      ? decorItems.filter(d => d.parent_zone_id === activeZoneId)
      : decorItems

  useEffect(() => {
    if (!venueId) return
    loadActive()
    const channelName = `floor-viewer-${venueId}${filterZoneId ? `-${filterZoneId}` : ''}`
    const channel = supabaseClient
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `venue_id=eq.${venueId}` }, loadActive)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` }, loadActive)
      .subscribe()
    return () => supabaseClient.removeChannel(channel)
  }, [venueId, filterZoneId])

  async function loadActive() {
    // Primary source: active sessions (covers all order origins, persists until cashier closes)
    const { data: sessions } = await supabaseClient
      .from('table_sessions')
      .select('zone_id')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .not('zone_id', 'is', null)
    const sessionZoneIds = new Set((sessions || []).map(s => s.zone_id))

    // Fallback: orders without a session (e.g. created by staff without opening a session)
    const { data: orders } = await supabaseClient
      .from('orders')
      .select('zone_id')
      .eq('venue_id', venueId)
      .is('session_id', null)
      .in('status', ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado'])
      .not('zone_id', 'is', null)
    const orderZoneIds = new Set((orders || []).map(o => o.zone_id))

    setOccupiedIds(new Set([...sessionZoneIds, ...orderZoneIds]))
  }

  // ── Multi-select rubber-band ─────────────────────────────────────────────────
  function onCanvasStart(e) {
    if (!multiSelect) return
    if (e.button != null && e.button !== 0) return
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const x = clamp(((src.clientX - rect.left) / rect.width) * 100, 0, 100)
    const y = clamp(((src.clientY - rect.top) / rect.height) * 100, 0, 100)
    iaRef.current = { startX: x, startY: y, currentX: x, currentY: y, rect }
    setRubberBand({ x1: x, y1: y, x2: x, y2: y })
  }

  function onPointerMove(e) {
    const ia = iaRef.current
    if (!ia) return
    const src = e.touches ? e.touches[0] : e
    const x = clamp(((src.clientX - ia.rect.left) / ia.rect.width) * 100, 0, 100)
    const y = clamp(((src.clientY - ia.rect.top) / ia.rect.height) * 100, 0, 100)
    ia.currentX = x
    ia.currentY = y
    setRubberBand({ x1: ia.startX, y1: ia.startY, x2: x, y2: y })
  }

  function onPointerUp() {
    const ia = iaRef.current
    if (!ia) return

    const minX = Math.min(ia.startX, ia.currentX)
    const maxX = Math.max(ia.startX, ia.currentX)
    const minY = Math.min(ia.startY, ia.currentY)
    const maxY = Math.max(ia.startY, ia.currentY)

    if (maxX - minX > 2 || maxY - minY > 2) {
      const selected = visibleMesas.filter(z =>
        z.pos_x >= minX && z.pos_x <= maxX && z.pos_y >= minY && z.pos_y <= maxY
      )
      const newIds = new Set(selected.map(z => z.id))
      setMultiSelectedIds(newIds)
      onSelectMultiple?.(selected)
    }
    setRubberBand(null)
    iaRef.current = null
  }

  function handleZoneClick(zone) {
    if (multiSelect) {
      setMultiSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(zone.id)) next.delete(zone.id)
        else next.add(zone.id)
        const selectedArr = visibleMesas.filter(z => next.has(z.id))
        onSelectMultiple?.(selectedArr)
        return next
      })
    } else {
      onSelect?.(zone)
    }
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
        ref={multiSelect ? canvasRef : undefined}
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{
          paddingTop: '60%',
          background: '#0D1117',
          border: '1.5px solid #2a2d33',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
        onMouseDown={multiSelect ? onCanvasStart : undefined}
        onMouseMove={multiSelect ? onPointerMove : undefined}
        onMouseUp={multiSelect ? onPointerUp : undefined}
        onMouseLeave={multiSelect ? onPointerUp : undefined}
        onTouchStart={multiSelect ? e => { if (!e.target.closest('[data-zone]')) { e.preventDefault(); onCanvasStart(e) } } : undefined}
        onTouchMove={multiSelect ? e => { e.preventDefault(); onPointerMove(e) } : undefined}
        onTouchEnd={multiSelect ? onPointerUp : undefined}
      >
        <div className="absolute inset-0">
          {/* Objetos de referencia: decorativos, no clickeables */}
          {visibleDecor.map(d => {
            const w = d.size_w ?? 8
            const h = d.size_h ?? 13
            const radius = d.shape === 'redonda' ? 'rounded-full' : d.shape === 'barra' ? 'rounded-lg' : 'rounded-xl'
            const color = d.color || '#6B7280'
            return (
              <div
                key={d.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${d.pos_x}%`,
                  top: `${d.pos_y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <div
                  className={`w-full h-full ${radius} border flex items-center justify-center`}
                  style={{ backgroundColor: `${color}26`, borderColor: `${color}88` }}
                >
                  <span
                    className="text-[8px] font-medium text-center leading-tight px-1 break-words w-full"
                    style={{ color }}
                  >
                    {d.name}
                  </span>
                </div>
              </div>
            )
          })}

          {visibleMesas.map(zone => {
            const occupied = occupiedIds.has(zone.id)
            const selected = multiSelect ? multiSelectedIds.has(zone.id) : selectedZone?.id === zone.id
            const w = zone.size_w ?? 8
            const h = zone.size_h ?? 13
            const radius = zone.shape === 'redonda' ? 'rounded-full' : zone.shape === 'barra' ? 'rounded-lg' : 'rounded-xl'
            return (
              <button
                key={zone.id}
                data-zone="1"
                className="absolute"
                style={{
                  left: `${zone.pos_x}%`,
                  top: `${zone.pos_y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                }}
                onMouseDown={multiSelect ? e => e.stopPropagation() : undefined}
                onClick={() => handleZoneClick(zone)}
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

          {/* Rubber-band selection rect */}
          {rubberBand && (
            <div
              className="absolute pointer-events-none border border-[#00b0b0] z-50"
              style={{
                left: `${Math.min(rubberBand.x1, rubberBand.x2)}%`,
                top: `${Math.min(rubberBand.y1, rubberBand.y2)}%`,
                width: `${Math.abs(rubberBand.x2 - rubberBand.x1)}%`,
                height: `${Math.abs(rubberBand.y2 - rubberBand.y1)}%`,
                background: 'rgba(0,176,176,0.08)',
              }}
            />
          )}
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
        {multiSelect && multiSelectedIds.size > 0 && (
          <span className="ml-auto text-[#008080] text-[11px] font-semibold">
            {multiSelectedIds.size} seleccionada{multiSelectedIds.size > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
