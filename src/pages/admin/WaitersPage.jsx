import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'

export default function WaitersPage() {
  const [waiters, setWaiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editAlias, setEditAlias] = useState('')

  useEffect(() => { loadWaiters() }, [])

  async function loadWaiters() {
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('*')
      .eq('venue_id', ACTIVE_VENUE_ID)
      .eq('is_active', true)
      .order('full_name')
    setWaiters(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setAdding(true)
    const { data } = await supabaseStaff
      .from('staff_names')
      .insert({ venue_id: ACTIVE_VENUE_ID, full_name: name.trim() })
      .select().single()
    if (data) setWaiters(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setName('')
    setAdding(false)
  }

  async function handleRemove(id) {
    if (!confirm('¿Quitar este camarero?')) return
    await supabaseStaff.from('staff_names').update({ is_active: false }).eq('id', id)
    setWaiters(prev => prev.filter(w => w.id !== id))
  }

  async function handleSaveAlias(id) {
    await supabaseStaff
      .from('staff_names')
      .update({ alias_bancario: editAlias.trim() || null })
      .eq('id', id)
    setWaiters(prev => prev.map(w => w.id === id ? { ...w, alias_bancario: editAlias.trim() || null } : w))
    setEditingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">CAMAREROS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nombre del camarero"
            className="input flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim()}
            className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
          >
            {adding ? '...' : 'Agregar'}
          </button>
        </div>

        <div className="space-y-2">
          {waiters.length === 0 && (
            <p className="text-smoke-500 text-sm text-center py-6">Todavía no hay camareros cargados.</p>
          )}
          {waiters.map(w => (
            <div key={w.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-smoke-200 font-medium text-sm">{w.full_name}</p>
                <button onClick={() => handleRemove(w.id)} className="text-red-700 text-xs underline">
                  Quitar
                </button>
              </div>
              {editingId === w.id ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={editAlias}
                    onChange={e => setEditAlias(e.target.value)}
                    placeholder="Alias de Mercado Pago o CBU"
                    className="input flex-1 text-xs py-1.5"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveAlias(w.id)}
                    className="bg-ember-500 text-white text-xs font-semibold px-3 rounded-lg"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-smoke-500 text-xs underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-smoke-500 text-xs">
                    {w.alias_bancario
                      ? <span className="font-mono text-smoke-400">{w.alias_bancario}</span>
                      : 'Sin alias de propina'}
                  </p>
                  <button
                    onClick={() => { setEditingId(w.id); setEditAlias(w.alias_bancario || '') }}
                    className="text-smoke-400 text-xs underline"
                  >
                    {w.alias_bancario ? 'Editar alias' : 'Agregar alias'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
