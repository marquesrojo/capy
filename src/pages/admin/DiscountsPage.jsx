import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function DiscountsPage() {
  const { venueId } = useAuth()
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [percent, setPercent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabaseStaff
      .from('venue_discounts')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
    setDiscounts(data || [])
    setLoading(false)
  }

  useEffect(() => { if (venueId) load() }, [venueId])

  async function handleCreate() {
    if (!code.trim() || !percent) { setError('Completá código y porcentaje.'); return }
    const p = parseFloat(percent)
    if (isNaN(p) || p <= 0 || p > 100) { setError('El porcentaje debe ser entre 1 y 100.'); return }
    setSaving(true)
    setError('')
    await supabaseStaff.from('venue_discounts').insert({
      venue_id: venueId,
      code: code.trim().toUpperCase(),
      label: label.trim() || null,
      percent: p,
    })
    setSaving(false)
    setCode('')
    setLabel('')
    setPercent('')
    setShowForm(false)
    load()
  }

  async function toggleActive(d) {
    await supabaseStaff.from('venue_discounts').update({ is_active: !d.is_active }).eq('id', d.id)
    setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este descuento?')) return
    await supabaseStaff.from('venue_discounts').delete().eq('id', id)
    setDiscounts(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">DESCUENTOS</h1>
        <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
      </header>

      <div className="px-5 mt-5 space-y-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3 rounded-xl text-sm"
        >
          + Nuevo descuento
        </button>

        {showForm && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
            <p className="text-smoke-300 text-sm font-medium">Nuevo código de descuento</p>
            <div>
              <label className="text-smoke-500 text-xs block mb-1">Código</label>
              <input
                className="input uppercase"
                placeholder="Ej: COWORK"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-smoke-500 text-xs block mb-1">Descripción (opcional)</label>
              <input
                className="input"
                placeholder="Ej: Descuento clientes cowork"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-smoke-500 text-xs block mb-1">Porcentaje de descuento</label>
              <div className="relative">
                <input
                  className="input pr-8"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="10"
                  value={percent}
                  onChange={e => setPercent(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-400 text-sm">%</span>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setCode(''); setLabel(''); setPercent(''); setError('') }}
                className="flex-1 border border-carbon-700 text-smoke-400 py-2.5 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-ember-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>
        ) : discounts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-smoke-600 text-sm">No hay descuentos creados todavía.</p>
            <p className="text-smoke-700 text-xs mt-1">Creá un código para que clientes y camareros puedan aplicarlo al pedir.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discounts.map(d => (
              <div
                key={d.id}
                className={`bg-carbon-900 border rounded-xl px-4 py-3 flex items-center gap-3 transition-opacity ${
                  d.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-smoke-200 font-mono font-semibold text-sm">{d.code}</span>
                    <span className="text-ember-400 text-xs font-semibold bg-ember-500/10 px-1.5 py-0.5 rounded">−{d.percent}%</span>
                  </div>
                  {d.label && <p className="text-smoke-500 text-xs mt-0.5">{d.label}</p>}
                </div>
                <button
                  onClick={() => toggleActive(d)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                    d.is_active
                      ? 'border-emerald-500/40 text-emerald-600'
                      : 'border-carbon-600 text-smoke-600'
                  }`}
                >
                  {d.is_active ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-smoke-600 text-xs underline hover:text-red-500 flex-shrink-0"
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
