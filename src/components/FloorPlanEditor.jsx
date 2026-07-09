import { useState, useRef, useEffect } from 'react'
import { supabaseStaff } from '../lib/supabase'

const DEFAULT_SIZES = {
  cuadrada:    { w: 8, h: 13 },
  redonda:     { w: 8, h: 13 },
  rectangular: { w: 14, h: 10 },
  barra:       { w: 22, h: 8 },
}

const SHAPE_RADIUS = {
  cuadrada:    'rounded-xl',
  redonda:     'rounded-full',
  rectangular: 'rounded-xl',
  barra:       'rounded-lg',
}

export default function FloorPlanEditor({ zones, parentZones = [], onSaved, venueId }) {
  const mesas = zones.filter(z => z.is_active)
  const hasZoneTabs = parentZones.length > 0

  const [activeZoneId, setActiveZoneId] = useState(() =>
    hasZoneTabs ? (parentZones[0]?.id ?? '__none__') : '__all__'
  )
  const [positions, setPositions] = useState(() => {
    const map = {}
    mesas.forEach(z => { map[z.id] = { x: z.pos_x ?? null, y: z.pos_y ?? null } })
    return map
  })
  const [sizes, setSizes] = useState(() => {
    const map = {}
    mesas.forEach(z => {
      const def = DEFAULT_SIZES[z.shape || 'cuadrada']
      map[z.id] = { w: z.size_w ?? def.w, h: z.size_h ?? def.h }
    })
    return map
  })
  // Copies not yet saved to DB
  const [pendingCopies, setPendingCopies] = useState([])
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const canvasRef = useRef(null)
  const iaRef = useRef(null)

  // When zones reload from DB (after save), add any new zones not yet in local state
  useEffect(() => {
    const active = zones.filter(z => z.is_active)
    setPositions(prev => {
      const next = { ...prev }
      let changed = false
      active.forEach(z => {
        if (!(z.id in next)) {
          next[z.id] = { x: z.pos_x ?? null, y: z.pos_y ?? null }
          changed = true
        }
      })
      return changed ? next : prev
    })
    setSizes(prev => {
      const next = { ...prev }
      let changed = false
      active.forEach(z => {
        if (!(z.id in next)) {
          const def = DEFAULT_SIZES[z.shape || 'cuadrada']
          next[z.id] = { w: z.size_w ?? def.w, h: z.size_h ?? def.h }
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [zones])

  // All items to render: existing + pending copies
  const allItems = [
    ...mesas.map(z => ({ ...z, isPending: false, itemId: z.id })),
    ...pendingCopies.map(p => ({ ...p, isPending: true, itemId: p.tempId, is_active: true })),
  ]

  const currentParentId = activeZoneId === '__none__' ? null : activeZoneId === '__all__' ? undefined : activeZoneId

  const zoneMesas = allItems.filter(z => {
    if (!z.is_active) return false
    if (hasZoneTabs) {
      if (z.isPending) return z._activeZoneId === activeZoneId
      return activeZoneId === '__none__' ? !z.parent_zone_id : z.parent_zone_id === activeZoneId
    }
    return true
  })

  const positioned = zoneMesas.filter(z => positions[z.itemId]?.x != null)
  const unpositioned = zoneMesas.filter(z => positions[z.itemId]?.x == null)

  const selectedPending = pendingCopies.find(p => p.tempId === selected)

  function startMove(e, id) {
    e.preventDefault()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const pos = positions[id]
    iaRef.current = {
      type: 'move', id,
      startClientX: src.clientX, startClientY: src.clientY,
      startPosX: pos?.x ?? 50, startPosY: pos?.y ?? 50,
      moved: false, rect,
    }
  }

  function startResize(e, id) {
    e.preventDefault()
    e.stopPropagation()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const sz = sizes[id]
    iaRef.current = {
      type: 'resize', id,
      startClientX: src.clientX, startClientY: src.clientY,
      startW: sz.w, startH: sz.h,
      moved: false, rect,
    }
  }

  function onPointerMove(e) {
    const ia = iaRef.current
    if (!ia) return
    const src = e.touches ? e.touches[0] : e
    const dx = src.clientX - ia.startClientX
    const dy = src.clientY - ia.startClientY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ia.moved = true
    if (!ia.moved) return

    if (ia.type === 'move') {
      const dxPct = (dx / ia.rect.width) * 100
      const dyPct = (dy / ia.rect.height) * 100
      setPositions(prev => ({
        ...prev,
        [ia.id]: {
          x: Math.min(96, Math.max(4, ia.startPosX + dxPct)),
          y: Math.min(93, Math.max(7, ia.startPosY + dyPct)),
        }
      }))
    } else if (ia.type === 'resize') {
      const dw = (dx / ia.rect.width) * 100 * 2
      const dh = (dy / ia.rect.height) * 100 * 2
      setSizes(prev => ({
        ...prev,
        [ia.id]: {
          w: Math.max(4, Math.min(45, ia.startW + dw)),
          h: Math.max(4, Math.min(40, ia.startH + dh)),
        }
      }))
    }
  }

  function onPointerUp() {
    const ia = iaRef.current
    if (!ia) return
    if (!ia.moved && ia.type === 'move') {
      setSelected(prev => prev === ia.id ? null : ia.id)
    }
    iaRef.current = null
  }

  function removeFromMap(id, isPending) {
    if (isPending) {
      setPendingCopies(prev => prev.filter(p => p.tempId !== id))
    } else {
      setPositions(prev => ({ ...prev, [id]: { x: null, y: null } }))
    }
    setSelected(null)
  }

  function rotate(id) {
    setSizes(prev => ({
      ...prev,
      [id]: { w: prev[id].h, h: prev[id].w }
    }))
  }

  function copyZone(zone) {
    const tempId = `new_${Date.now()}`
    const pos = positions[zone.itemId]
    const sz = sizes[zone.itemId]
    const offsetX = Math.min(90, (pos?.x ?? 50) + 10)
    const offsetY = Math.min(85, (pos?.y ?? 50) + 10)
    setPendingCopies(prev => [...prev, {
      tempId,
      name: zone.name,
      shape: zone.shape || 'cuadrada',
      type: zone.type,
      parent_zone_id: zone.parent_zone_id ?? null,
      _activeZoneId: activeZoneId,
    }])
    setPositions(prev => ({ ...prev, [tempId]: { x: offsetX, y: offsetY } }))
    setSizes(prev => ({ ...prev, [tempId]: { w: sz.w, h: sz.h } }))
    setSelected(tempId)
  }

  function placeOnCanvas(zone) {
    const id = zone.itemId
    setPositions(prev => ({
      ...prev,
      [id]: { x: 10 + Math.random() * 70, y: 15 + Math.random() * 65 }
    }))
    setSizes(prev => {
      if (id in prev) return prev
      const def = DEFAULT_SIZES[zone.shape || 'cuadrada']
      return { ...prev, [id]: { w: zone.size_w ?? def.w, h: zone.size_h ?? def.h } }
    })
  }

  async function save() {
    setSaving(true)
    // Update existing zones
    await Promise.all(
      mesas.map(z =>
        supabaseStaff.from('venue_zones').update({
          pos_x: positions[z.id]?.x ?? null,
          pos_y: positions[z.id]?.y ?? null,
          size_w: sizes[z.id]?.w,
          size_h: sizes[z.id]?.h,
        }).eq('id', z.id)
      )
    )
    // Insert pending copies
    if (pendingCopies.length > 0 && venueId) {
      await Promise.all(
        pendingCopies.map(pc =>
          supabaseStaff.from('venue_zones').insert({
            venue_id: venueId,
            name: pc.name.trim() || 'Nueva mesa',
            shape: pc.shape,
            type: pc.type,
            parent_zone_id: pc.parent_zone_id,
            pos_x: positions[pc.tempId]?.x ?? null,
            pos_y: positions[pc.tempId]?.y ?? null,
            size_w: sizes[pc.tempId]?.w,
            size_h: sizes[pc.tempId]?.h,
            is_active: true,
          })
        )
      )
      setPendingCopies([])
    }
    setSaving(false)
    setSavedOk(true)
    setSelected(null)
    setTimeout(() => setSavedOk(false), 2000)
    onSaved?.()
  }

  if (mesas.length === 0) {
    return (
      <p className="text-smoke-500 text-sm text-center py-10">
        No hay mesas activas. Agregalas en la vista Lista primero.
      </p>
    )
  }

  return (
    <div>
      {hasZoneTabs && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {parentZones.map(z => (
            <button
              key={z.id}
              onClick={() => setActiveZoneId(z.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeZoneId === z.id ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {z.name}
            </button>
          ))}
          {mesas.some(m => !m.parent_zone_id) && (
            <button
              onClick={() => setActiveZoneId('__none__')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeZoneId === '__none__' ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
              }`}
            >
              Sin zona
            </button>
          )}
        </div>
      )}

      <p className="text-smoke-600 text-[11px] mb-2">
        Tocá para seleccionar · Arrastrá para mover · Esquina naranja para redimensionar · ⟳ para rotar · ⧉ para copiar
      </p>

      <div
        ref={canvasRef}
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{
          paddingTop: '60%',
          background: '#0D1117',
          border: '1.5px solid #2a2d33',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '10% 10%',
        }}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchMove={e => { e.preventDefault(); onPointerMove(e) }}
        onTouchEnd={onPointerUp}
      >
        <div className="absolute inset-0">
          {positioned.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-smoke-600 text-xs pointer-events-none">
              Tocá las mesas de abajo para posicionarlas en el mapa
            </p>
          )}
          {positioned.map(zone => {
            const id = zone.itemId
            const { x, y } = positions[id]
            const { w, h } = sizes[id]
            const isSelected = selected === id
            const isMoving = iaRef.current?.type === 'move' && iaRef.current?.id === id && iaRef.current?.moved
            const radius = SHAPE_RADIUS[zone.shape || 'cuadrada']

            return (
              <div
                key={id}
                className="absolute"
                style={{
                  left: `${x}%`, top: `${y}%`,
                  width: `${w}%`, height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                  zIndex: isSelected ? 20 : 1,
                }}
                onMouseDown={e => startMove(e, id)}
                onTouchStart={e => startMove(e, id)}
              >
                <div
                  className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing border-2 ${radius}
                    ${isMoving
                      ? 'bg-ember-500 border-ember-400 shadow-lg'
                      : isSelected
                        ? 'bg-carbon-700 border-ember-500 shadow-ember-500/30 shadow-md'
                        : zone.isPending
                          ? 'bg-carbon-800 border-dashed border-ember-500/60'
                          : 'bg-carbon-800 border-carbon-600 hover:border-carbon-400'
                    }`}
                >
                  <span className="text-[8px] font-semibold text-smoke-300 text-center leading-tight px-1 break-words w-full">
                    {zone.name}
                  </span>
                </div>

                {isSelected && (
                  <>
                    {/* Rotate */}
                    <button
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-ember-500 text-white text-[10px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); rotate(id) }}
                      onTouchStart={e => { e.stopPropagation(); rotate(id) }}
                    >
                      ⟳
                    </button>
                    {/* Copy */}
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#3a3f4a] text-white text-[9px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); copyZone(zone) }}
                      onTouchStart={e => { e.stopPropagation(); copyZone(zone) }}
                    >
                      ⧉
                    </button>
                    {/* Remove from map */}
                    <button
                      className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); removeFromMap(id, zone.isPending) }}
                      onTouchStart={e => { e.stopPropagation(); removeFromMap(id, zone.isPending) }}
                    >
                      ✕
                    </button>
                    {/* Resize handle */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-ember-500 border-2 border-[#0D1117] cursor-se-resize z-30"
                      onMouseDown={e => startResize(e, id)}
                      onTouchStart={e => startResize(e, id)}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Name editor for pending copies */}
      {selectedPending && (
        <div className="mt-2 flex items-center gap-2 border border-ember-500/40 rounded-xl px-3 py-2.5" style={{ background: '#fff' }}>
          <span className="text-smoke-400 text-xs whitespace-nowrap">Nombre:</span>
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none min-w-0"
            style={{ color: '#2A2824' }}
            value={selectedPending.name}
            onChange={e => setPendingCopies(prev =>
              prev.map(p => p.tempId === selected ? { ...p, name: e.target.value } : p)
            )}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
            placeholder="Nombre de la nueva ubicación"
          />
          <span className="text-smoke-400 text-[10px] whitespace-nowrap">Se guarda con el mapa</span>
        </div>
      )}

      {unpositioned.length > 0 && (
        <div className="mt-3">
          <p className="text-smoke-600 text-[11px] mb-2">Sin posicionar — tocá para agregar al mapa:</p>
          <div className="flex flex-wrap gap-2">
            {unpositioned.map(z => (
              <button
                key={z.itemId}
                onClick={() => placeOnCanvas(z)}
                className="border border-dashed border-carbon-600 text-smoke-400 text-xs px-3 py-1.5 rounded-lg hover:border-ember-500 hover:text-smoke-200 transition-colors"
              >
                + {z.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {saving ? 'Guardando...' : savedOk ? '✓ Guardado' : `Guardar mapa${pendingCopies.length > 0 ? ` (+${pendingCopies.length} nueva${pendingCopies.length > 1 ? 's' : ''})` : ''}`}
      </button>
    </div>
  )
}
