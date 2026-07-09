import { useState, useRef } from 'react'
import { supabaseStaff } from '../lib/supabase'

// Default size (% of canvas width / height) per shape
const DEFAULT_SIZES = {
  cuadrada:    { w: 8, h: 13 },
  redonda:     { w: 8, h: 13 },
  rectangular: { w: 14, h: 10 },
  barra:       { w: 22, h: 8 },
}

// Border-radius class per shape
const SHAPE_RADIUS = {
  cuadrada:    'rounded-xl',
  redonda:     'rounded-full',
  rectangular: 'rounded-xl',
  barra:       'rounded-lg',
}

export default function FloorPlanEditor({ zones, parentZones = [], onSaved }) {
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
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const canvasRef = useRef(null)
  // tracks the active pointer interaction
  const iaRef = useRef(null)

  const zoneMesas = hasZoneTabs
    ? (activeZoneId === '__none__'
        ? mesas.filter(z => !z.parent_zone_id)
        : mesas.filter(z => z.parent_zone_id === activeZoneId))
    : mesas

  const positioned = zoneMesas.filter(z => positions[z.id]?.x != null)
  const unpositioned = zoneMesas.filter(z => positions[z.id]?.x == null)

  function canvasRect() {
    return canvasRef.current.getBoundingClientRect()
  }

  function startMove(e, id) {
    e.preventDefault()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRect()
    const pos = positions[id]
    iaRef.current = {
      type: 'move', id,
      startClientX: src.clientX,
      startClientY: src.clientY,
      startPosX: pos?.x ?? 50,
      startPosY: pos?.y ?? 50,
      moved: false,
      rect,
    }
  }

  function startResize(e, id) {
    e.preventDefault()
    e.stopPropagation()
    const src = e.touches ? e.touches[0] : e
    const rect = canvasRect()
    const sz = sizes[id]
    iaRef.current = {
      type: 'resize', id,
      startClientX: src.clientX,
      startClientY: src.clientY,
      startW: sz.w,
      startH: sz.h,
      moved: false,
      rect,
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
      // BR corner drag: moving corner right/down increases size
      // since element is centered, delta on one corner = half the size delta
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

  function rotate(id) {
    setSizes(prev => ({
      ...prev,
      [id]: { w: prev[id].h, h: prev[id].w }
    }))
  }

  function placeOnCanvas(zone) {
    setPositions(prev => ({
      ...prev,
      [zone.id]: { x: 10 + Math.random() * 70, y: 15 + Math.random() * 65 }
    }))
  }

  async function save() {
    setSaving(true)
    await Promise.all(
      mesas.map(z =>
        supabaseStaff
          .from('venue_zones')
          .update({
            pos_x: positions[z.id]?.x ?? null,
            pos_y: positions[z.id]?.y ?? null,
            size_w: sizes[z.id]?.w,
            size_h: sizes[z.id]?.h,
          })
          .eq('id', z.id)
      )
    )
    setSaving(false)
    setSavedOk(true)
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
        Tocá para seleccionar · Arrastrá para mover · Arrastrá la esquina para redimensionar · ⟳ para rotar
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
            const { x, y } = positions[zone.id]
            const { w, h } = sizes[zone.id]
            const isSelected = selected === zone.id
            const isMoving = iaRef.current?.type === 'move' && iaRef.current?.id === zone.id && iaRef.current?.moved
            const radius = SHAPE_RADIUS[zone.shape || 'cuadrada']

            return (
              <div
                key={zone.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: 'translate(-50%,-50%)',
                  zIndex: isSelected ? 20 : 1,
                }}
                onMouseDown={e => startMove(e, zone.id)}
                onTouchStart={e => startMove(e, zone.id)}
              >
                {/* Main element */}
                <div
                  className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing border-2 ${radius}
                    ${isMoving
                      ? 'bg-ember-500 border-ember-400 shadow-lg scale-105'
                      : isSelected
                        ? 'bg-carbon-700 border-ember-500 shadow-ember-500/30 shadow-md'
                        : 'bg-carbon-800 border-carbon-600 hover:border-carbon-400'
                    }`}
                >
                  <span className="text-[8px] font-semibold text-smoke-200 text-center leading-tight px-1 break-words w-full">
                    {zone.name}
                  </span>
                </div>

                {/* Controls when selected */}
                {isSelected && (
                  <>
                    {/* Rotate button — top-left */}
                    <button
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-ember-500 text-white text-[10px] flex items-center justify-center shadow z-30"
                      onMouseDown={e => { e.stopPropagation(); rotate(zone.id) }}
                      onTouchStart={e => { e.stopPropagation(); rotate(zone.id) }}
                    >
                      ⟳
                    </button>

                    {/* Resize handle — bottom-right corner */}
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-ember-500 border-2 border-carbon-900 cursor-se-resize z-30"
                      onMouseDown={e => startResize(e, zone.id)}
                      onTouchStart={e => startResize(e, zone.id)}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {unpositioned.length > 0 && (
        <div className="mt-3">
          <p className="text-smoke-600 text-[11px] mb-2">Sin posicionar — tocá para agregar al mapa:</p>
          <div className="flex flex-wrap gap-2">
            {unpositioned.map(z => (
              <button
                key={z.id}
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
        {saving ? 'Guardando...' : savedOk ? '✓ Guardado' : 'Guardar mapa'}
      </button>
    </div>
  )
}
