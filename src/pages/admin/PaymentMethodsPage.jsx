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
  const [cashDiscountEnabled, setCashDiscountEnabled] = useState(false)
  const [cashDiscountPercent, setCashDiscountPercent] = useState('')
  const [cashSaving, setCashSaving] = useState(false)
  const [cashSaved, setCashSaved] = useState(false)
  const [fiscalEnabled, setFiscalEnabled] = useState(false)
  const [fiscalSaving, setFiscalSaving] = useState(false)

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

  async function loadAll() {
    const [methodsRes, venueRes] = await Promise.all([
      supabaseStaff.from('payment_methods').select('*').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('venues').select('mp_enabled, mp_access_token, cash_discount_enabled, cash_discount_percent, fiscal_enabled').eq('id', venueId).single()
    ])
    setMethods(methodsRes.data || [])
    if (venueRes.data?.mp_enabled !== undefined) setMpEnabled(venueRes.data.mp_enabled)
    if (venueRes.data?.mp_access_token) setMpToken(venueRes.data.mp_access_token)
    if (venueRes.data?.fiscal_enabled !== undefined) setFiscalEnabled(venueRes.data.fiscal_enabled)
    if (venueRes.data?.cash_discount_enabled !== undefined) setCashDiscountEnabled(venueRes.data.cash_discount_enabled)
    if (venueRes.data?.cash_discount_percent !== undefined) setCashDiscountPercent(String(venueRes.data.cash_discount_percent || ''))
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

  async function syncCashDiscountToVenueDiscounts(enabled, percent) {
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

  async function toggleFiscal() {
    const newVal = !fiscalEnabled
    setFiscalEnabled(newVal)
    setFiscalSaving(true)
    await supabaseStaff.from('venues').update({ fiscal_enabled: newVal }).eq('id', venueId)
    setFiscalSaving(false)
  }

  async function toggleCashDiscount() {
    const newVal = !cashDiscountEnabled
    setCashDiscountEnabled(newVal)
    await supabaseStaff.from('venues').update({ cash_discount_enabled: newVal }).eq('id', venueId)
    await syncCashDiscountToVenueDiscounts(newVal, parseFloat(cashDiscountPercent) || 0)
  }

  async function saveCashDiscountPercent() {
    const val = Math.min(100, Math.max(0, parseFloat(cashDiscountPercent) || 0))
    setCashDiscountPercent(String(val))
    setCashSaving(true)
    await supabaseStaff.from('venues').update({ cash_discount_percent: val }).eq('id', venueId)
    await syncCashDiscountToVenueDiscounts(cashDiscountEnabled, val)
    setCashSaving(false)
    setCashSaved(true)
    setTimeout(() => setCashSaved(false), 2000)
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

        {/* Facturación electrónica */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Facturación electrónica</p>
              <p className="text-smoke-500 text-xs mt-0.5">
                Emite Factura B (ARCA/AFIP via TusFacturasAPP) con el botón Facturar en cada pedido cobrado. El ticket digital se comparte por WhatsApp — no requiere impresora.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFiscal}
              disabled={fiscalSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-70 flex-shrink-0 ml-3 ${
                fiscalEnabled ? 'bg-emerald-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                fiscalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Descuento en efectivo */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-smoke-300 font-medium text-sm">Descuento en efectivo</p>
              <p className="text-smoke-500 text-xs mt-0.5">Se aplica al total cuando el cliente elige pagar en efectivo</p>
            </div>
            <button
              type="button"
              onClick={toggleCashDiscount}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                cashDiscountEnabled ? 'bg-emerald-500' : 'bg-carbon-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                cashDiscountEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="space-y-2 pt-1 border-t border-carbon-700">
            <p className="text-smoke-400 text-xs">Porcentaje de descuento</p>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 max-w-[140px]">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={cashDiscountPercent}
                  onChange={e => { setCashDiscountPercent(e.target.value); setCashSaved(false) }}
                  onKeyDown={e => e.key === 'Enter' && saveCashDiscountPercent()}
                  placeholder="0"
                  className="input w-full pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-500 text-sm pointer-events-none">%</span>
              </div>
              <button
                onClick={saveCashDiscountPercent}
                disabled={cashSaving || cashDiscountPercent === ''}
                className="bg-ember-500 hover:bg-ember-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm"
              >
                {cashSaving ? '...' : cashSaved ? '✓' : 'Guardar'}
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
