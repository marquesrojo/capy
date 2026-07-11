import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function PaymentMethodsPage() {
  const { venueId } = useAuth()
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [mpEnabled, setMpEnabled] = useState(false)
  const [mpSaving, setMpSaving] = useState(false)
  const [mpToken, setMpToken] = useState('')
  const [mpTokenSaving, setMpTokenSaving] = useState(false)
  const [mpTokenSaved, setMpTokenSaved] = useState(false)

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

  async function loadAll() {
    const [methodsRes, venueRes] = await Promise.all([
      supabaseStaff.from('payment_methods').select('*').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('venues').select('mp_enabled, mp_access_token').eq('id', venueId).single()
    ])
    setMethods(methodsRes.data || [])
    if (venueRes.data?.mp_enabled !== undefined) setMpEnabled(venueRes.data.mp_enabled)
    if (venueRes.data?.mp_access_token) setMpToken(venueRes.data.mp_access_token)
    setLoading(false)
  }

  async function toggleMp() {
    const newVal = !mpEnabled
    setMpEnabled(newVal)
    setMpSaving(true)
    await supabaseStaff.from('venues').update({ mp_enabled: newVal }).eq('id', venueId)
    setMpSaving(false)
  }

  async function saveMpToken() {
    setMpTokenSaving(true)
    await supabaseStaff.from('venues').update({ mp_access_token: mpToken.trim() }).eq('id', venueId)
    setMpTokenSaving(false)
    setMpTokenSaved(true)
    setTimeout(() => setMpTokenSaved(false), 2000)
  }

  async function toggleActive(method) {
    setMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: !m.is_active } : m))
    await supabaseStaff
      .from('payment_methods')
      .update({ is_active: !method.is_active })
      .eq('id', method.id)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    const maxOrder = methods.length ? Math.max(...methods.map(m => m.sort_order)) : 0
    const { data } = await supabaseStaff
      .from('payment_methods')
      .insert({ venue_id: venueId, name: newName.trim(), sort_order: maxOrder + 1 })
      .select()
      .single()
    if (data) setMethods(prev => [...prev, data])
    setNewName('')
    setAdding(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este método de pago?')) return
    await supabaseStaff.from('payment_methods').delete().eq('id', id)
    setMethods(prev => prev.filter(m => m.id !== id))
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
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">MEDIOS DE PAGO</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Mercado Pago</p>
              <p className="text-smoke-500 text-xs mt-0.5">Los clientes pueden pagar directamente desde Capy</p>
            </div>
            <button
              type="button"
              onClick={toggleMp}
              disabled={mpSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-70 ${
                mpEnabled ? 'bg-blue-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mpEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="space-y-2 pt-1 border-t border-carbon-700">
            <p className="text-smoke-400 text-xs">Access Token de Mercado Pago</p>
            <p className="text-smoke-500 text-[11px]">Encontralo en tu cuenta MP → Tu negocio → Credenciales</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={mpToken}
                onChange={e => { setMpToken(e.target.value); setMpTokenSaved(false) }}
                placeholder="APP_USR-..."
                className="input flex-1 font-mono text-xs"
              />
              <button
                onClick={saveMpToken}
                disabled={mpTokenSaving || !mpToken.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm flex-shrink-0"
              >
                {mpTokenSaving ? '...' : mpTokenSaved ? '✓' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ej: Mercado Pago, Débito..."
            className="input flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
          >
            {adding ? '...' : 'Agregar'}
          </button>
        </div>

        <div className="space-y-2">
          {methods.map(method => (
            <div
              key={method.id}
              className={`bg-carbon-900 border rounded-xl px-4 py-3 flex items-center justify-between ${
                method.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'
              }`}
            >
              <p className="text-smoke-300 text-sm font-medium">{method.name}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(method)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    method.is_active
                      ? 'border-emerald-500/40 text-emerald-700'
                      : 'border-carbon-600 text-smoke-500'
                  }`}
                >
                  {method.is_active ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="text-smoke-500 text-xs underline"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-smoke-500 text-xs px-1">
          Solo los métodos activos aparecen en la carta del cliente al momento de pagar.
        </p>
      </main>
    </div>
  )
}
