import { useState, useRef } from 'react'
import { supabaseStaff } from '../lib/supabase'

const SHAPE_STYLES = {
  cuadrada:    { cls: 'w-10 h-10 rounded' },
  redonda:     { cls: 'w-10 h-10 rounded-full' },
  rectangular: { cls: 'w-14 h-9 rounded' },
  barra:       { cls: 'w-20 h-6 rounded-sm' },
}

export default function FloorPlanEditor({ zones, parentZones = [], onSaved }) {
  const mesas = zones.filter(z => z.is_active)
  const hasZoneTabs = parentZones.length > 0

  const [activeZoneId, setActiveZoneId] = useState(() => hasZoneTabs ? (parentZones[0]?.id ?? '__none__') : '__all__')

  const [positions, setPositions] = useState(() => {
    const map = {}
    mesas.forEach(z => { map[z.id] = { x: z.pos_x ?? null, y: z.pos_y ?? null } })
    return map
  })
  const [dragging, setDragging] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const canvasRef = useRef(null)

  const zoneMesas = hasZoneTabs
    ? (activeZoneId === '__none__'
        ? mesas.filter(z => !z.parent_zone_id)
        : mesas.filter(z => z.parent_zone_id === activeZoneId))
    : mesas

  const positioned = zoneMesas.filter(z => positions[z.id]?.x != null)
  const unpositioned = zoneMesas.filter(z => positions[z.id]?.x == null)

  function getCoords(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(93, Math.max(7, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  function startDrag(e, id) {
    e.preventDefault()
    const src = e.touches ? e.touches[0] : e
    const { x, y } = getCoords(src.clientX, src.clientY)
    const pos = positions[id]
    setDragging({ id, ox: pos?.x != null ? x - pos.x : 0, oy: pos?.y != null ? y - pos.y : 0 })
  }

  function onMove(e) {
    if (!dragging) return
    const src = e.touches ? e.touches[0] : e
    const { x, y } = getCoords(src.clientX, src.clientY)
    setPositions(prev => ({
      ...prev,
      [dragging.id]: {
        x: Math.min(96, Math.max(4, x - dragging.ox)),
        y: Math.min(93, Math.max(7, y - dragging.oy)),
      }
    }))
  }

  function endDrag() { setDragging(null) }

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
          .update({ pos_x: positions[z.id]?.x ?? null, pos_y: positions[z.id]?.y ?? null })
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
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchMove={e => { e.preventDefault(); onMove(e) }}
        onTouchEnd={endDrag}
      >
        <div className="absolute inset-0">
          {positioned.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-smoke-600 text-xs pointer-events-none">
              Tocá las mesas de abajo para posicionarlas en el mapa
            </p>
          )}
          {positioned.map(zone => {
            const { x, y } = positions[zone.id]
            const active = dragging?.id === zone.id
            const shapeStyle = SHAPE_STYLES[zone.shape || 'cuadrada']
            return (
              <div
                key={zone.id}
                className="absolute"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', zIndex: active ? 20 : 1 }}
                onMouseDown={e => startDrag(e, zone.id)}
                onTouchStart={e => startDrag(e, zone.id)}
              >
                <div
                  className={`flex items-center justify-center cursor-grab active:cursor-grabbing border-2 ${shapeStyle.cls}
                    ${active
                      ? 'bg-ember-500 border-ember-400 scale-110 shadow-lg'
                      : 'bg-carbon-800 border-carbon-600 hover:border-carbon-400'
                    }`}
                >
                  <span className="text-[8px] font-semibold text-smoke-200 text-center leading-tight px-1 break-words w-full">
                    {zone.name}
                  </span>
                </div>
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
