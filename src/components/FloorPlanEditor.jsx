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

// Objetos de referencia (columna, planta, escenario...): decorativos, no ocupables
const DECOR_SHAPES = [
  { shape: 'cuadrada',    label: '■' },
  { shape: 'redonda',     label: '●' },
  { shape: 'rectangular', label: '▬' },
  { shape: 'barra',       label: '▭' },
]
const DECOR_COLORS = ['#6B7280', '#92643E', '#4F8A5B', '#4A7BA6', '#C9A227', '#B0524D', '#7C6BAE', '#2F855A']
const DEFAULT_DECOR_COLOR = '#6B7280'

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
  const [pendingCopies, setPendingCopies] = useState([])
  // Ediciones de nombre/color de objetos decor ya guardados (se persisten al guardar)
  const [decorEdits, setDecorEdits] = useState({})
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [rubberBand, setRubberBand] = useState(null) // { x1, y1, x2, y2 } in % of canvas
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const canvasRef = useRef(null)
  const iaRef = useRef(null)

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

  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0] : null
  const selectedPending = pendingCopies.find(p => p.tempId === singleSelectedId)
  const selectedSavedDecor = !selectedPending && singleSelectedId
    ? mesas.find(z => z.id === singleSelectedId && z.type === 'decor')
    : null
  const selectedIsDecor = selectedPending?.type === 'decor' || !!selectedSavedDecor

  function decorName(zone) {
    if (zone.isPending) return zone.name
    return decorEdits[zone.id]?.name ?? zone.name
  }
  function decorColor(zone) {
    if (zone.isPending) return zone.color || DEFAULT_DECOR_COLOR
    return decorEdits[zone.id]?.color ?? zone.color ?? DEFAULT_DECOR_COLOR
  }

  function addPending({ type, shape, name, color = null }) {
    const tempId = `new_${Date.now()}`
    setPendingCopies(prev => [...prev, {
      tempId,
      name,
      shape,
      type,
      color,
      parent_zone_id: currentParentId === undefined ? null : currentParentId,
      _activeZoneId: activeZoneId,
    }])
    setPositions(prev => ({ ...prev, [tempId]: { x: 50, y: 50 } }))
    setSizes(prev => ({ ...prev, [tempId]: { ...DEFAULT_SIZES[shape] } }))
    setSelectedIds(new Set([tempId]))
  }

  function addDecor(shape) {
    addPending({ type: 'decor', shape, name: 'Objeto', color: DEFAULT_DECOR_COLOR })
  }

  function addMesa() {
    const mesaCount = mesas.filter(z => z.type === 'mesa').length
      + pendingCopies.filter(p => p.type === 'mesa').length
    addPending({ type: 'mesa', shape: 'cuadrada', name: `Mesa ${mesaCount + 1}` })
  }

  function updateSelectedDecor(patch) {
    if (selectedPending) {
      setPendingCopies(prev => prev.map(p => p.tempId === singleSelectedId ? { ...p, ...patch } : p))
    } else if (selectedSavedDecor) {
      setDecorEdits(prev => ({
        ...prev,
        [selectedSavedDecor.id]: { ...prev[selectedSavedDecor.id], ...patch },
      }))
    }
  }

  // ── Rubber-band: start on empty canvas ──────────────────────────────────────
  function onCanvasStart(e) {
    if (e.button != null && e.button !== 0) return
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const x = clamp(((src.clientX - rect.left) / rect.width) * 100, 0, 100)
    const y = clamp(((src.clientY - rect.top) / rect.height) * 100, 0, 100)
    iaRef.current = { type: 'rubber', startX: x, startY: y, currentX: x, currentY: y, rect }
    setRubberBand({ x1: x, y1: y, x2: x, y2: y })
  }

  // ── Move / resize: start on table ───────────────────────────────────────────
  function startMove(e, id) {
    e.preventDefault()
    e.stopPropagation()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const isGroup = selectedIds.has(id) && selectedIds.size > 1
    const startPositions = {}
    if (isGroup) {
      selectedIds.forEach(sid => { startPositions[sid] = { ...positions[sid] } })
    } else {
      const pos = positions[id]
      startPositions[id] = { x: pos?.x ?? 50, y: pos?.y ?? 50 }
    }
    iaRef.current = {
      type: 'move', id, isGroup,
      startClientX: src.clientX, startClientY: src.clientY,
      startPositions,
      shiftKey: !!(e.shiftKey || e.ctrlKey || e.metaKey),
      moved: false, rect,
    }
  }

  function startResize(e, id) {
    e.preventDefault()
    e.stopPropagation()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    iaRef.current = {
      type: 'resize',
      startClientX: src.clientX, startClientY: src.clientY,
      startSizes: { [id]: { ...sizes[id] } },
      moved: false, rect,
    }
  }

  function startGroupResize(e) {
    e.preventDefault()
    e.stopPropagation()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRef.current.getBoundingClientRect()
    const startSizes = {}
    selectedIds.forEach(sid => { startSizes[sid] = { ...sizes[sid] } })
    iaRef.current = {
      type: 'resize',
      startClientX: src.clientX, startClientY: src.clientY,
      startSizes,
      moved: false, rect,
    }
  }

  // ── Unified pointer move ─────────────────────────────────────────────────────
  function onPointerMove(e) {
    const ia = iaRef.current
    if (!ia) return
    const src = e.touches ? e.touches[0] : e

    if (ia.type === 'rubber') {
      const x = clamp(((src.clientX - ia.rect.left) / ia.rect.width) * 100, 0, 100)
      const y = clamp(((src.clientY - ia.rect.top) / ia.rect.height) * 100, 0, 100)
      ia.currentX = x
      ia.currentY = y
      setRubberBand({ x1: ia.startX, y1: ia.startY, x2: x, y2: y })
      return
    }

    const dx = src.clientX - ia.startClientX
    const dy = src.clientY - ia.startClientY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ia.moved = true
    if (!ia.moved) return

    if (ia.type === 'move') {
      const dxPct = (dx / ia.rect.width) * 100
      const dyPct = (dy / ia.rect.height) * 100
      setPositions(prev => {
        const next = { ...prev }
        Object.entries(ia.startPositions).forEach(([sid, sp]) => {
          next[sid] = {
            x: clamp(sp.x + dxPct, 4, 96),
            y: clamp(sp.y + dyPct, 7, 93),
          }
        })
        return next
      })
    } else if (ia.type === 'resize') {
      const dw = (dx / ia.rect.width) * 100 * 2
      const dh = (dy / ia.rect.height) * 100 * 2
      setSizes(prev => {
        const next = { ...prev }
        Object.entries(ia.startSizes).forEach(([sid, ss]) => {
          next[sid] = {
            w: clamp(ss.w + dw, 4, 45),
            h: clamp(ss.h + dh, 4, 40),
          }
        })
        return next
      })
    }
  }

  // ── Unified pointer up ───────────────────────────────────────────────────────
  function onPointerUp() {
    const ia = iaRef.current
    if (!ia) return

    if (ia.type === 'rubber') {
      const minX = Math.min(ia.startX, ia.currentX)
      const maxX = Math.max(ia.startX, ia.currentX)
      const minY = Math.min(ia.startY, ia.currentY)
      const maxY = Math.max(ia.startY, ia.currentY)
      if (maxX - minX > 2 || maxY - minY > 2) {
        const next = new Set()
        positioned.forEach(zone => {
          const pos = positions[zone.itemId]
          if (pos && pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
            next.add(zone.itemId)
          }
        })
        setSelectedIds(next)
      } else {
        setSelectedIds(new Set())
      }
      setRubberBand(null)
      iaRef.current = null
      return
    }

    if (ia.type === 'move' && !ia.moved) {
      if (ia.shiftKey) {
        setSelectedIds(prev => {
          const next = new Set(prev)
          if (next.has(ia.id)) next.delete(ia.id)
          else next.add(ia.id)
          return next
        })
      } else {
        setSelectedIds(new Set([ia.id]))
      }
    }
    iaRef.current = null
  }

  // ── Table actions ────────────────────────────────────────────────────────────
  function removeFromMap(id, isPending) {
    if (isPending) {
      setPendingCopies(prev => prev.filter(p => p.tempId !== id))
    } else {
      setPositions(prev => ({ ...prev, [id]: { x: null, y: null } }))
    }
    setSelectedIds(new Set())
  }

  function removeSelectedFromMap() {
    setPositions(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => {
        if (id in next) next[id] = { x: null, y: null }
      })
      return next
    })
    setPendingCopies(prev => prev.filter(p => !selectedIds.has(p.tempId)))
    setSelectedIds(new Set())
  }

  function rotate(id) {
    setSizes(prev => ({ ...prev, [id]: { w: prev[id].h, h: prev[id].w } }))
  }

  function copyZone(zone) {
    const tempId = `new_${Date.now()}`
    const pos = positions[zone.itemId]
    const sz = sizes[zone.itemId]
    setPendingCopies(prev => [...prev, {
      tempId, name: decorName(zone), shape: zone.shape || 'cuadrada',
      type: zone.type, parent_zone_id: zone.parent_zone_id ?? null,
      color: zone.type === 'decor' ? decorColor(zone) : null,
      _activeZoneId: activeZoneId,
    }])
    setPositions(prev => ({ ...prev, [tempId]: { x: clamp((pos?.x ?? 50) + 10, 4, 90), y: clamp((pos?.y ?? 50) + 10, 7, 85) } }))
    setSizes(prev => ({ ...prev, [tempId]: { w: sz.w, h: sz.h } }))
    setSelectedIds(new Set([tempId]))
  }

  function placeOnCanvas(zone) {
    const id = zone.itemId
    setPositions(prev => ({ ...prev, [id]: { x: 10 + Math.random() * 70, y: 15 + Math.random() * 65 } }))
    setSizes(prev => {
      if (id in prev) return prev
      const def = DEFAULT_SIZES[zone.shape || 'cuadrada']
      return { ...prev, [id]: { w: zone.size_w ?? def.w, h: zone.size_h ?? def.h } }
    })
    setSelectedIds(new Set([id]))
  }

  async function save() {
    setSaving(true)
    await Promise.all(
      mesas.map(z => {
        const upd = {
          pos_x: positions[z.id]?.x ?? null,
          pos_y: positions[z.id]?.y ?? null,
          size_w: sizes[z.id]?.w,
          size_h: sizes[z.id]?.h,
        }
        if (z.type === 'decor' && decorEdits[z.id]) {
          const e = decorEdits[z.id]
          if (e.name != null) upd.name = e.name.trim() || z.name
          if (e.color) upd.color = e.color
        }
        return supabaseStaff.from('venue_zones').update(upd).eq('id', z.id)
      })
    )
    if (pendingCopies.length > 0 && venueId) {
      await Promise.all(
        pendingCopies.map(pc =>
          supabaseStaff.from('venue_zones').insert({
            venue_id: venueId,
            name: pc.name.trim() || (pc.type === 'decor' ? 'Objeto' : 'Nueva mesa'),
            shape: pc.shape, type: pc.type,
            color: pc.color ?? null,
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
    setDecorEdits({})
    setSaving(false)
    setSavedOk(true)
    setSelectedIds(new Set())
    setTimeout(() => setSavedOk(false), 2000)
    onSaved?.()
  }

  return (
    <div>
      {hasZoneTabs && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {parentZones.map(z => (
            <button key={z.id} onClick={() => setActiveZoneId(z.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeZoneId === z.id ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {z.name}
            </button>
          ))}
          {mesas.some(m => !m.parent_zone_id) && (
            <button onClick={() => setActiveZoneId('__none__')}
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
        Tocá para seleccionar · Arrastrá mesa para mover · Arrastrá espacio vacío para seleccionar varias · Esquina para redimensionar · ⟳ rotar · ⧉ copiar
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
        onMouseDown={onCanvasStart}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={e => {
          if (e.target.closest('[data-table]')) return
          e.preventDefault()
          onCanvasStart(e)
        }}
        onTouchMove={e => { e.preventDefault(); onPointerMove(e) }}
        onTouchEnd={onPointerUp}
      >
        <div className="absolute inset-0">
          {positioned.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-smoke-600 text-xs pointer-events-none">
              Tocá las mesas de abajo para posicionarlas en el mapa
            </p>
          )}

          {/* Group resize handle */}
          {(() => {
            if (selectedIds.size < 2) return null
            let maxX = -Infinity, maxY = -Infinity
            selectedIds.forEach(sid => {
              const pos = positions[sid]
              const sz = sizes[sid]
              if (!pos || pos.x == null) return
              maxX = Math.max(maxX, pos.x + sz.w / 2)
              maxY = Math.max(maxY, pos.y + sz.h / 2)
            })
            if (!isFinite(maxX)) return null
            return (
              <div
                className="absolute w-5 h-5 rounded-full bg-[#008080] border-2 border-[#0D1117] cursor-se-resize z-50 flex items-center justify-center"
                style={{ left: `${maxX}%`, top: `${maxY}%`, transform: 'translate(-50%, -50%)' }}
                onMouseDown={startGroupResize}
                onTouchStart={startGroupResize}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 7L7 1M4 7H7V4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )
          })()}

          {positioned.map(zone => {
            const id = zone.itemId
            const { x, y } = positions[id]
            const { w, h } = sizes[id]
            const isSelected = selectedIds.has(id)
            const isSoleSelected = isSelected && selectedIds.size === 1
            const isMoving = iaRef.current?.type === 'move' && iaRef.current?.id === id && iaRef.current?.moved
            const radius = SHAPE_RADIUS[zone.shape || 'cuadrada']
            const isDecor = zone.type === 'decor'
            const dColor = isDecor ? decorColor(zone) : null

            return (
              <div
                key={id}
                data-table="1"
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
                        ? isDecor ? 'shadow-md' : 'bg-carbon-700 border-ember-500 shadow-ember-500/30 shadow-md'
                        : zone.isPending && !isDecor
                          ? 'bg-carbon-800 border-dashed border-ember-500/60'
                          : isDecor ? '' : 'bg-carbon-800 border-carbon-600 hover:border-carbon-400'
                    }`}
                  style={isDecor && !isMoving
                    ? {
                        backgroundColor: `${dColor}33`,
                        borderColor: isSelected ? '#F97316' : `${dColor}AA`,
                        borderStyle: zone.isPending ? 'dashed' : 'solid',
                      }
                    : undefined
                  }
                >
                  <span
                    className={`text-[8px] font-semibold text-center leading-tight px-1 break-words w-full ${isDecor && !isMoving ? '' : 'text-smoke-300'}`}
                    style={{ color: isDecor && !isMoving ? dColor : undefined }}
                  >
                    {isDecor ? decorName(zone) : zone.name}
                  </span>
                </div>

                {isSoleSelected && (
                  <>
                    <button
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-ember-500 text-white text-[10px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); rotate(id) }}
                      onTouchStart={e => { e.stopPropagation(); rotate(id) }}
                    >⟳</button>
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#3a3f4a] text-white text-[9px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); copyZone(zone) }}
                      onTouchStart={e => { e.stopPropagation(); copyZone(zone) }}
                    >⧉</button>
                    <button
                      className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); removeFromMap(id, zone.isPending) }}
                      onTouchStart={e => { e.stopPropagation(); removeFromMap(id, zone.isPending) }}
                    >✕</button>
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

          {/* Rubber-band selection rect */}
          {rubberBand && (
            <div
              className="absolute pointer-events-none border border-ember-400 z-50"
              style={{
                left: `${Math.min(rubberBand.x1, rubberBand.x2)}%`,
                top: `${Math.min(rubberBand.y1, rubberBand.y2)}%`,
                width: `${Math.abs(rubberBand.x2 - rubberBand.x1)}%`,
                height: `${Math.abs(rubberBand.y2 - rubberBand.y1)}%`,
                background: 'rgba(249,115,22,0.08)',
              }}
            />
          )}
        </div>
      </div>

      {/* Group action bar */}
      {selectedIds.size > 1 && (
        <div className="mt-2 flex items-center gap-3 bg-carbon-900 border border-ember-500/30 rounded-xl px-4 py-2.5">
          <span className="text-smoke-300 text-xs font-semibold flex-1">{selectedIds.size} mesas seleccionadas</span>
          <span className="text-smoke-500 text-[11px]">Arrastrá una mesa para mover · esquina verde para redimensionar</span>
          <button
            className="text-red-400 text-xs underline whitespace-nowrap"
            onClick={removeSelectedFromMap}
          >
            Quitar del mapa
          </button>
        </div>
      )}

      {/* Name (+ color for decor) editor: new pending copies and saved decor objects */}
      {(selectedPending || selectedSavedDecor) && (
        <div className="mt-2 border border-ember-500/40 rounded-xl px-3 py-2.5" style={{ background: '#fff' }}>
          <div className="flex items-center gap-2">
            <span className="text-smoke-400 text-xs whitespace-nowrap">Nombre:</span>
            <input
              autoFocus={!!selectedPending}
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
              style={{ color: '#2A2824' }}
              value={selectedPending ? selectedPending.name : decorName(selectedSavedDecor)}
              onChange={e => updateSelectedDecor({ name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              placeholder={selectedIsDecor ? 'Ej: Columna, Planta, Escenario...' : 'Nombre de la nueva ubicación'}
            />
            <span className="text-smoke-400 text-[10px] whitespace-nowrap">Se guarda con el mapa</span>
          </div>
          {selectedIsDecor && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/5">
              <span className="text-smoke-400 text-xs whitespace-nowrap">Color:</span>
              <div className="flex gap-1.5 flex-wrap">
                {DECOR_COLORS.map(c => {
                  const current = selectedPending ? (selectedPending.color || DEFAULT_DECOR_COLOR) : decorColor(selectedSavedDecor)
                  return (
                    <button
                      key={c}
                      onClick={() => updateSelectedDecor({ color: c })}
                      className="w-6 h-6 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: c,
                        borderColor: current === c ? '#2A2824' : 'transparent',
                        transform: current === c ? 'scale(1.15)' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add tables and reference objects */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-smoke-600 text-[11px]">Agregar:</span>
        <button
          onClick={addMesa}
          className="border border-dashed border-ember-500/50 text-ember-500 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:border-ember-500 hover:bg-ember-500/10 transition-colors"
        >
          + Mesa
        </button>
        <span className="text-smoke-600 text-[11px] ml-2">Objetos de referencia (columna, planta...):</span>
        {DECOR_SHAPES.map(s => (
          <button
            key={s.shape}
            onClick={() => addDecor(s.shape)}
            className="border border-dashed border-carbon-600 text-smoke-400 text-xs px-2.5 py-1.5 rounded-lg hover:border-ember-500 hover:text-smoke-200 transition-colors"
            title={`Agregar objeto ${s.shape}`}
          >
            + {s.label}
          </button>
        ))}
      </div>

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

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
