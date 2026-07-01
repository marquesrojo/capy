import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function QuickNotesPage() {
  const { venueId } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!venueId) return
    loadNotes()
  }, [venueId])

  async function loadNotes() {
    const { data } = await supabaseStaff
      .from('quick_notes')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order')
    setNotes(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!label.trim()) return
    setAdding(true)
    const maxOrder = notes.length ? Math.max(...notes.map(n => n.sort_order)) : 0
    const { data } = await supabaseStaff
      .from('quick_notes')
      .insert({ venue_id: venueId, label: label.trim(), sort_order: maxOrder + 1 })
      .select().single()
    if (data) setNotes(prev => [...prev, data])
    setLabel('')
    setAdding(false)
  }

  async function handleToggle(note) {
    await supabaseStaff.from('quick_notes').update({ is_active: !note.is_active }).eq('id', note.id)
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_active: !n.is_active } : n))
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta nota rápida?')) return
    await supabaseStaff.from('quick_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
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
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">NOTAS RÁPIDAS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <p className="text-smoke-500 text-xs mt-1">Aparecen como chips al tomar un pedido</p>
      </header>

      <main className="px-5 mt-4 space-y-4">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex gap-3">
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ej: Sin sal, Bien cocido..."
            className="input flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !label.trim()}
            className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
          >
            {adding ? '...' : 'Agregar'}
          </button>
        </div>

        <div className="space-y-2">
          {notes.length === 0 && (
            <p className="text-smoke-500 text-sm text-center py-6">No hay notas rápidas cargadas.</p>
          )}
          {notes.map(note => (
            <div
              key={note.id}
              className={`bg-carbon-900 border rounded-xl px-4 py-3 flex items-center justify-between ${
                note.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'
              }`}
            >
              <p className="text-smoke-300 text-sm">{note.label}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(note)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    note.is_active
                      ? 'border-emerald-500/40 text-emerald-700'
                      : 'border-carbon-600 text-smoke-500'
                  }`}
                >
                  {note.is_active ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => handleDelete(note.id)} className="text-smoke-500 text-xs underline">
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
