import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import DiscountCategories from './DiscountCategories'

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
  const [tab, setTab] = useState('codigos')
  const [stack, setStack] = useState(false)
  // El descuento por efectivo vivía en Medios de pago, que es donde nadie lo
  // busca: es un descuento y su lugar es acá
  const [cashEnabled, setCashEnabled] = useState(false)
  const [cashPercent, setCashPercent] = useState('')
  const [cashSaving, setCashSaving] = useState(false)
  const [cashSaved, setCashSaved] = useState(false)
  // Los medios de pago vivían en la sección Pro junto con lo fiscal, así que un
  // local free no podía ni cargar cómo cobra. Son dos cosas distintas.
  const [methods, setMethods] = useState([])
  const [newMethod, setNewMethod] = useState('')
  const [addingMethod, setAddingMethod] = useState(false)

  async function load() {
    const [{ data }, venueRes, methodsRes] = await Promise.all([
      supabaseStaff
        .from('venue_discounts')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false }),
      supabaseStaff.from('venues')
        .select('stack_discounts, cash_discount_enabled, cash_discount_percent')
        .eq('id', venueId).single(),
      supabaseStaff.from('payment_methods').select('*').eq('venue_id', venueId).order('sort_order'),
    ])
    setDiscounts(data || [])
    setStack(!!venueRes.data?.stack_discounts)
    setCashEnabled(!!venueRes.data?.cash_discount_enabled)
    setCashPercent(String(venueRes.data?.cash_discount_percent || ''))
    setMethods(methodsRes.data || [])
    setLoading(false)
  }

  // Espeja el descuento en venue_discounts: de ahí lo lee el checkout
  async function syncCashToVenueDiscounts(enabled, percent) {
    if (percent <= 0) return
    const { data: existing } = await supabaseStaff
      .from('venue_discounts')
      .select('id')
      .eq('venue_id', venueId)
      .eq('is_cash_discount', true)
      .maybeSingle()
    if (existing) {
      await supabaseStaff.from('venue_discounts').update({ is_active: enabled, percent }).eq('id', existing.id)
    } else {
      await supabaseStaff.from('venue_discounts').insert({
        venue_id: venueId, code: 'EFECTIVO', percent, is_active: enabled, is_cash_discount: true, label: 'Descuento efectivo',
      })
    }
  }

  async function toggleCash() {
    const next = !cashEnabled
    setCashEnabled(next)
    await supabaseStaff.from('venues').update({ cash_discount_enabled: next }).eq('id', venueId)
    await syncCashToVenueDiscounts(next, parseFloat(cashPercent) || 0)
    load()
  }

  async function saveCashPercent() {
    const val = Math.min(100, Math.max(0, parseFloat(cashPercent) || 0))
    setCashPercent(String(val))
    setCashSaving(true)
    await supabaseStaff.from('venues').update({ cash_discount_percent: val }).eq('id', venueId)
    await syncCashToVenueDiscounts(cashEnabled, val)
    setCashSaving(false)
    setCashSaved(true)
    setTimeout(() => setCashSaved(false), 2000)
    load()
  }

  async function addMethod() {
    if (!newMethod.trim()) return
    setAddingMethod(true)
    const maxOrder = methods.length ? Math.max(...methods.map(m => m.sort_order || 0)) : 0
    const { data } = await supabaseStaff
      .from('payment_methods')
      .insert({ venue_id: venueId, name: newMethod.trim(), sort_order: maxOrder + 1 })
      .select()
      .single()
    if (data) setMethods(prev => [...prev, data])
    setNewMethod('')
    setAddingMethod(false)
  }

  async function toggleMethod(method) {
    setMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: !m.is_active } : m))
    await supabaseStaff
      .from('payment_methods')
      .update({ is_active: !method.is_active })
      .eq('id', method.id)
  }

  async function deleteMethod(id) {
    if (!confirm('¿Borrar este medio de pago?')) return
    await supabaseStaff.from('payment_methods').delete().eq('id', id)
    setMethods(prev => prev.filter(m => m.id !== id))
  }

  async function toggleStack() {
    const next = !stack
    setStack(next)
    const { error } = await supabaseStaff
      .from('venues')
      .update({ stack_discounts: next })
      .eq('id', venueId)
    if (error) { alert('Error: ' + error.message); setStack(!next) }
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
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">PAGOS Y DESCUENTOS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <div className="flex gap-2 mt-3">
          {[
            { id: 'medios', label: 'Medios de pago' },
            { id: 'codigos', label: 'Códigos' },
            { id: 'categorias', label: 'Categorías' },
          ].map(x => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                tab === x.id ? 'border-ember-500 text-ember-500 bg-ember-500/10' : 'border-carbon-700 text-smoke-500'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </header>

      {tab !== 'medios' && (
      <div className="px-5 mt-4 space-y-3">
        {/* Descuento por efectivo: no se tipea ningún código, lo aplica el
            medio de pago, así que va aparte de la lista de códigos */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-smoke-200 font-semibold text-sm">Descuento por pagar en efectivo</p>
              <p className="text-smoke-500 text-xs mt-0.5">
                Se aplica solo, sin código, cuando el cliente elige efectivo
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCash}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${cashEnabled ? 'bg-ember-500' : 'bg-carbon-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cashEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {cashEnabled && (
            <div className="flex gap-2 items-center mt-3 pt-3 border-t border-carbon-700">
              <div className="relative w-28">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={cashPercent}
                  onChange={e => { setCashPercent(e.target.value); setCashSaved(false) }}
                  onKeyDown={e => e.key === 'Enter' && saveCashPercent()}
                  placeholder="0"
                  className="input pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-500 text-sm pointer-events-none">%</span>
              </div>
              <button
                onClick={saveCashPercent}
                disabled={cashSaving || cashPercent === ''}
                className="bg-ember-500 hover:bg-ember-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm"
              >
                {cashSaving ? '...' : cashSaved ? '✓' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleStack}
          className="w-full flex items-center justify-between gap-3 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 text-left"
        >
          <div>
            <p className="text-smoke-200 font-semibold text-sm">Acumular descuentos</p>
            <p className="text-smoke-500 text-xs mt-0.5">
              {stack
                ? 'Se suman: categoría, código y el de efectivo en el mismo pedido'
                : 'Se aplica uno solo: primero la categoría del cliente, si no el código o el de efectivo'}
            </p>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${stack ? 'bg-ember-500' : 'bg-carbon-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${stack ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>
      )}

      {tab === 'medios' ? (
        <div className="px-5 mt-5 space-y-4">
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex gap-3">
            <input
              type="text"
              value={newMethod}
              onChange={e => setNewMethod(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMethod()}
              placeholder="Ej: Efectivo, Débito, Transferencia..."
              className="input flex-1"
            />
            <button
              onClick={addMethod}
              disabled={addingMethod || !newMethod.trim()}
              className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm flex-shrink-0"
            >
              {addingMethod ? '...' : 'Agregar'}
            </button>
          </div>

          {methods.length === 0 ? (
            <p className="text-smoke-500 text-sm text-center py-8">
              Todavía no cargaste ningún medio de pago.
            </p>
          ) : (
            <div className="space-y-2">
              {methods.map(method => (
                <div
                  key={method.id}
                  className={`bg-carbon-900 border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                    method.is_active ? 'border-carbon-700' : 'border-carbon-800 opacity-50'
                  }`}
                >
                  <p className="text-smoke-300 text-sm font-medium truncate">{method.name}</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => toggleMethod(method)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                        method.is_active
                          ? 'border-emerald-500/40 text-emerald-700'
                          : 'border-carbon-600 text-smoke-500'
                      }`}
                    >
                      {method.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => deleteMethod(method.id)} className="text-smoke-500 text-xs underline">
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-smoke-500 text-xs px-1">
            Solo los activos aparecen cuando el cliente elige cómo pagar. El descuento por efectivo
            se configura en la pestaña Códigos.
          </p>
        </div>
      ) : tab === 'categorias' ? (
        <div className="px-5 mt-5">
          <DiscountCategories venueId={venueId} />
        </div>
      ) : (
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
                placeholder="Ej: DESCUENTO10"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-smoke-500 text-xs block mb-1">Descripción (opcional)</label>
              <input
                className="input"
                placeholder="Ej: Descuento clientes habituales"
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
      )}
    </div>
  )
}
