import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import FloorPlanEditor from '../../components/FloorPlanEditor'

const TYPE_LABELS = {
  mesa: 'Mesa',
  zona: 'Zona',
  retiro: 'Punto de retiro'
}

const TYPE_TABS = [
  { id: 'mesa', label: 'Mesas' },
  { id: 'zona', label: 'Zonas' },
  { id: 'retiro', label: 'Puntos de retiro' }
]

export default function LocationsPage() {
  const { venueId } = useAuth()
  const [zones, setZones] = useState([])
  const [staffNames, setStaffNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('mesa')
  const [viewMode, setViewMode] = useState('lista') // 'lista' | 'mapa'
  const [newName, setNewName] = useState('')
  const [locationDisplayMode, setLocationDisplayMode] = useState('lista') // 'lista' | 'ambos' | 'mapa'
  const [savingMode, setSavingMode] = useState(false)

  useEffect(() => {
    if (!venueId) return
    load()
    supabaseStaff
      .from('venues')
      .select('client_floor_map_enabled, location_display_mode')
      .eq('id', venueId)
      .single()
      .then(({ data }) => {
        if (!data) return
        if (data.location_display_mode) {
          setLocationDisplayMode(data.location_display_mode)
        } else {
          setLocationDisplayMode(data.client_floor_map_enabled ? 'ambos' : 'lista')
        }
      })
    supabaseStaff
      .from('venue_staff')
      .select('staff_profile_id')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .then(async ({ data: linked }) => {
        const profileIds = (linked || []).map(l => l.staff_profile_id).filter(Boolean)
        if (!profileIds.length) { setStaffNames([]); return }
        const { data } = await supabaseStaff
          .from('staff_names')
          .select('id, full_name')
          .in('profile_id', profileIds)
          .order('full_name')
        setStaffNames(data || [])
      })
  }, [venueId])

  async function load() {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order')
      .order('name')
    setZones(data || [])
    setLoading(false)
  }

  async function saveLocationMode(mode) {
    setSavingMode(true)
    await supabaseStaff
      .from('venues')
      .update({
        location_display_mode: mode,
        client_floor_map_enabled: mode !== 'lista',
      })
      .eq('id', venueId)
    setLocationDisplayMode(mode)
    setSavingMode(false)
  }

  async function addZone() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const { data, error } = await supabaseStaff
      .from('venue_zones')
      .insert({ venue_id: venueId, name: trimmed, type: activeTab })
      .select()
      .single()
    if (!error && data) {
      setZones(prev => [...prev, data])
      setNewName('')
    }
  }

  async function toggleActive(zone) {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .update({ is_active: !zone.is_active })
      .eq('id', zone.id)
      .select()
      .single()
    if (data) {
      setZones(prev => prev.map(z => (z.id === zone.id ? data : z)))
    }
  }

  async function renameZone(zone, name) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === zone.name) return
    const { data } = await supabaseStaff
      .from('venue_zones')
      .update({ name: trimmed })
      .eq('id', zone.id)
      .select()
      .single()
    if (data) {
      setZones(prev => prev.map(z => (z.id === zone.id ? data : z)))
    }
  }

  async function reassignZone(zone, parentZoneId) {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .update({ parent_zone_id: parentZoneId || null })
      .eq('id', zone.id)
      .select()
      .single()
    if (data) {
      setZones(prev => prev.map(z => (z.id === zone.id ? data : z)))
    }
  }

  async function deleteZone(zone) {
    const label = zone.type === 'mesa' ? 'esta mesa' : zone.type === 'zona' ? 'esta zona' : 'este punto de retiro'
    if (!confirm(`¿Eliminar ${label} "${zone.name}"? Esta acción no se puede deshacer.`)) return
    await supabaseStaff.from('venue_zones').delete().eq('id', zone.id)
    setZones(prev => prev.filter(z => z.id !== zone.id))
  }

  async function assignWaiter(zone, staffId) {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .update({ current_waiter_id: staffId || null })
      .eq('id', zone.id)
      .select()
      .single()
    if (data) {
      setZones(prev => prev.map(z => (z.id === zone.id ? data : z)))
    }
  }

  async function reorderZone(zone, dir) {
    const sorted = zones
      .filter(z => z.type === activeTab)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    const idx = sorted.findIndex(z => z.id === zone.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    await Promise.all(
      reordered.map((z, i) =>
        supabaseStaff.from('venue_zones').update({ sort_order: i + 1 }).eq('id', z.id)
      )
    )
    setZones(prev => {
      const next = [...prev]
      reordered.forEach((z, i) => {
        const j = next.findIndex(n => n.id === z.id)
        if (j >= 0) next[j] = { ...next[j], sort_order: i + 1 }
      })
      return next
    })
  }

  async function reshapeZone(zone, shape) {
    const { data } = await supabaseStaff
      .from('venue_zones')
      .update({ shape })
      .eq('id', zone.id)
      .select()
      .single()
    if (data) {
      setZones(prev => prev.map(z => (z.id === zone.id ? data : z)))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando ubicaciones...</p>
      </div>
    )
  }

  const filtered = zones.filter(z => z.type === activeTab)
  const parentZonas = zones.filter(z => z.type === 'zona' && z.is_active)

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">UBICACIONES</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">
            ← Volver
          </Link>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setViewMode('lista') }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-ember-500 text-white border-ember-500'
                    : 'border-carbon-700 text-smoke-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'mesa' && (
            <div className="flex gap-1 bg-carbon-900 border border-carbon-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('lista')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'lista' ? 'bg-carbon-700 text-smoke-200' : 'text-smoke-500'}`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('mapa')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'mapa' ? 'bg-carbon-700 text-smoke-200' : 'text-smoke-500'}`}
              >
                Mapa
              </button>
            </div>
          )}
        </div>
      </header>

      {activeTab === 'mesa' && (
        <div className="mx-5 mt-4 bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3">
          <p className="text-smoke-300 text-xs font-semibold mb-0.5">Vista de selección para clientes</p>
          <p className="text-smoke-500 text-[11px] mb-3">Cómo eligen mesa o zona los clientes en la app</p>
          <div className="flex gap-1 bg-carbon-800 rounded-lg p-0.5">
            {[
              { id: 'lista', label: 'Solo lista' },
              { id: 'ambos', label: 'Mapa y lista' },
              { id: 'mapa', label: 'Solo mapa' },
            ].map(opt => (
              <button
                key={opt.id}
                disabled={savingMode}
                onClick={() => saveLocationMode(opt.id)}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-50 ${
                  locationDisplayMode === opt.id
                    ? 'bg-ember-500 text-white'
                    : 'text-smoke-500 hover:text-smoke-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {locationDisplayMode === 'mapa' && (
            <p className="text-smoke-600 text-[10px] mt-2">
              Asegurate de posicionar las mesas en la vista Mapa del editor.
            </p>
          )}
        </div>
      )}

      <div className="mx-5 mt-3 mb-1 flex items-center gap-2 bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <p className="text-smoke-500 text-xs flex-1">Los QR por mesa se generan en</p>
        <Link to="/admin/qr" className="text-ember-500 text-xs font-semibold">Códigos QR →</Link>
      </div>

      <main className="px-5 mt-4">
        {viewMode === 'mapa' ? (
          <FloorPlanEditor zones={filtered} parentZones={parentZonas} onSaved={load} venueId={venueId} />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addZone()}
                placeholder={`Nombre de ${TYPE_LABELS[activeTab].toLowerCase()}`}
                className="input flex-1"
              />
              <button
                onClick={addZone}
                className="bg-ember-500 hover:bg-ember-600 text-white text-sm font-semibold px-4 rounded-xl"
              >
                Agregar
              </button>
            </div>

            {filtered.length === 0 ? (
              <p className="text-smoke-500 text-sm text-center py-10">
                Todavía no agregaste ningún {TYPE_LABELS[activeTab].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((zone, idx) => (
                  <ZoneRow
                    key={zone.id}
                    zone={zone}
                    onToggle={() => toggleActive(zone)}
                    onRename={renameZone}
                    parentZones={activeTab === 'mesa' ? parentZonas : []}
                    onReassign={reassignZone}
                    onReshape={activeTab === 'mesa' ? reshapeZone : null}
                    onDelete={() => deleteZone(zone)}
                    staffList={activeTab === 'mesa' ? staffNames : []}
                    onAssignWaiter={activeTab === 'mesa' ? assignWaiter : null}
                    onMoveUp={idx > 0 ? () => reorderZone(zone, 'up') : null}
                    onMoveDown={idx < filtered.length - 1 ? () => reorderZone(zone, 'down') : null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

const SHAPES = [
  { id: 'cuadrada',    label: 'Cuad.',  icon: <rect x="3" y="3" width="18" height="18" rx="2"/> },
  { id: 'redonda',     label: 'Red.',   icon: <circle cx="12" cy="12" r="9"/> },
  { id: 'rectangular', label: 'Rect.',  icon: <rect x="2" y="6" width="20" height="12" rx="2"/> },
  { id: 'barra',       label: 'Barra',  icon: <rect x="1" y="9" width="22" height="6" rx="1"/> },
]

function ZoneRow({ zone, onToggle, onRename, parentZones = [], onReassign, onReshape, onDelete, staffList = [], onAssignWaiter, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(zone.name)

  function handleBlur() {
    setEditing(false)
    onRename(zone, name)
  }

  const shape = zone.shape || 'cuadrada'

  return (
    <div
      className={`bg-carbon-900 border rounded-xl px-4 py-3 gap-2 ${
        zone.is_active ? 'border-carbon-700' : 'border-carbon-700 opacity-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => e.key === 'Enter' && handleBlur()}
            autoFocus
            className="input flex-1"
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setEditing(true)} className="text-smoke-300 text-sm text-left truncate">
              {zone.name}
            </button>
            {parentZones.length > 0 && (
              <select
                value={zone.parent_zone_id || ''}
                onChange={e => onReassign(zone, e.target.value || null)}
                className="text-[10px] text-smoke-400 bg-carbon-800 border border-carbon-700 rounded-lg px-1.5 py-0.5 flex-shrink-0"
              >
                <option value="">Sin zona</option>
                {parentZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="w-5 h-4 flex items-center justify-center text-smoke-500 hover:text-smoke-200 disabled:opacity-20 disabled:cursor-default transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 2L9 7H1L5 2Z"/></svg>
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="w-5 h-4 flex items-center justify-center text-smoke-500 hover:text-smoke-200 disabled:opacity-20 disabled:cursor-default transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 8L1 3H9L5 8Z"/></svg>
            </button>
          </div>
          <button
            onClick={onToggle}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              zone.is_active
                ? 'border-emerald-500/40 text-emerald-700'
                : 'border-smoke-500/40 text-smoke-500'
            }`}
          >
            {zone.is_active ? 'Activo' : 'Inactivo'}
          </button>
          <button
            onClick={onDelete}
            className="text-smoke-600 text-xs underline hover:text-red-500"
          >
            Borrar
          </button>
        </div>
      </div>

      {onReshape && (
        <div className="flex gap-1.5 mt-2.5">
          {SHAPES.map(s => (
            <button
              key={s.id}
              onClick={() => onReshape(zone, s.id)}
              title={s.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                shape === s.id
                  ? 'bg-ember-500/15 border-ember-500/60 text-ember-500'
                  : 'border-carbon-600 text-smoke-500 hover:border-carbon-400'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {s.icon}
              </svg>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {onAssignWaiter && (
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-smoke-500 text-[10px]">Camarero:</span>
          {staffList.length === 0 ? (
            <span className="text-smoke-600 text-[10px]">Sin camaurers registrados</span>
          ) : (
            <select
              value={zone.current_waiter_id || ''}
              onChange={e => onAssignWaiter(zone, e.target.value || null)}
              className="flex-1 text-[10px] text-smoke-300 bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1"
            >
              <option value="">Sin asignar</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
