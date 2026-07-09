import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ConsumoPage() {
  const { venueId } = useAuth()
  const [date, setDate] = useState(todayLocal())
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState(null) // null = not calculated yet
  const [productBreakdown, setProductBreakdown] = useState([])
  const [missingProducts, setMissingProducts] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [view, setView] = useState('ingredients') // 'ingredients' | 'products'

  async function calculate() {
    if (!venueId) return
    setLoading(true)
    setRows(null)
    setProductBreakdown([])
    setMissingProducts([])
    setAiSummary('')

    const dayStart = `${date}T00:00:00.000Z`
    const dayEnd = `${date}T23:59:59.999Z`

    // Adjust for local timezone offset
    const tzOffset = new Date().getTimezoneOffset()
    const startMs = new Date(date + 'T00:00:00').getTime() - tzOffset * 60000
    const endMs = new Date(date + 'T23:59:59.999').getTime() - tzOffset * 60000
    const localStart = new Date(startMs).toISOString()
    const localEnd = new Date(endMs).toISOString()

    const { data: orders } = await supabaseStaff
      .from('orders')
      .select('id')
      .eq('venue_id', venueId)
      .eq('payment_status', 'aprobado')
      .gte('created_at', localStart)
      .lte('created_at', localEnd)
      .not('status', 'eq', 'cancelado')

    if (!orders?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const orderIds = orders.map(o => o.id)

    const { data: items } = await supabaseStaff
      .from('order_items')
      .select('product_id, product_name, quantity')
      .in('order_id', orderIds)

    if (!items?.length) {
      setRows([])
      setLoading(false)
      return
    }

    // Aggregate sold quantities per product
    const soldMap = {}
    for (const item of items) {
      if (!item.product_id) continue
      if (!soldMap[item.product_id]) {
        soldMap[item.product_id] = { product_name: item.product_name, qty: 0 }
      }
      soldMap[item.product_id].qty += item.quantity
    }

    const productIds = Object.keys(soldMap)

    const { data: ingredients } = await supabaseStaff
      .from('product_ingredients')
      .select('product_id, ingredient_name, quantity, unit')
      .in('product_id', productIds)

    // Compute ingredient totals
    const ingMap = {} // `${name}||${unit}` → { name, unit, total }
    const breakdown = []
    const missing = []

    for (const [productId, { product_name, qty }] of Object.entries(soldMap)) {
      const productIngs = (ingredients || []).filter(i => i.product_id === productId)
      if (productIngs.length === 0) {
        missing.push(product_name)
        breakdown.push({ product_name, qty, ingredients: [] })
        continue
      }
      const prodIngRows = []
      for (const ing of productIngs) {
        const key = `${ing.ingredient_name}||${ing.unit}`
        if (!ingMap[key]) ingMap[key] = { name: ing.ingredient_name, unit: ing.unit, total: 0 }
        const consumed = ing.quantity * qty
        ingMap[key].total += consumed
        prodIngRows.push({ name: ing.ingredient_name, unit: ing.unit, consumed })
      }
      breakdown.push({ product_name, qty, ingredients: prodIngRows })
    }

    const sorted = Object.values(ingMap).sort((a, b) => a.name.localeCompare(b.name))
    setRows(sorted)
    setProductBreakdown(breakdown)
    setMissingProducts([...new Set(missing)])
    setLoading(false)
  }

  async function generateAiSummary() {
    if (!rows?.length) return
    setAiLoading(true)
    setAiSummary('')
    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
      if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY no configurada')

      const list = rows.map(r => `- ${r.name}: ${formatQty(r.total)} ${r.unit}`).join('\n')
      const prompt = `Sos el asistente de un restaurante. El resumen de consumo de materia prima del día ${date} fue:\n\n${list}\n\nEscribí un párrafo breve (máximo 4 oraciones) en español que resuma el consumo del día y destaque los ingredientes más utilizados. Sin asteriscos ni markdown.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      setAiSummary(text)
    } catch {
      setAiSummary('No se pudo generar el resumen.')
    }
    setAiLoading(false)
  }

  function formatQty(n) {
    if (n === Math.floor(n)) return String(n)
    return Number(n.toFixed(2)).toString()
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">CONSUMO</h1>
        <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
      </header>

      <div className="px-5 mt-5 space-y-4">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 input"
          />
          <button
            onClick={calculate}
            disabled={loading}
            className="bg-ember-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
        </div>

        <p className="text-smoke-500 text-xs">
          Calculá el consumo de materia prima en base a los pedidos pagados del día.{' '}
          <Link to="/admin/carta" className="text-ember-500 underline">
            Configurá ingredientes por producto →
          </Link>
        </p>

        {rows === null && !loading && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
            <p className="text-smoke-400 text-sm">Seleccioná una fecha y presioná Calcular.</p>
          </div>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
            <p className="text-smoke-400 text-sm">No hay pedidos pagados para esta fecha.</p>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-carbon-900 border border-carbon-700 rounded-xl p-1">
              <button
                onClick={() => setView('ingredients')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  view === 'ingredients' ? 'bg-ember-500 text-white' : 'text-smoke-400'
                }`}
              >
                Por ingrediente
              </button>
              <button
                onClick={() => setView('products')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  view === 'products' ? 'bg-ember-500 text-white' : 'text-smoke-400'
                }`}
              >
                Por producto
              </button>
            </div>

            {view === 'ingredients' && (
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-carbon-700 flex items-center justify-between">
                  <p className="text-smoke-300 text-sm font-medium">Ingredientes consumidos</p>
                  <p className="text-smoke-500 text-xs">{date}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-carbon-800">
                        <th className="text-left px-4 py-2.5 text-smoke-500 text-xs font-medium">Ingrediente</th>
                        <th className="text-right px-4 py-2.5 text-smoke-500 text-xs font-medium">Total</th>
                        <th className="text-left px-4 py-2.5 text-smoke-500 text-xs font-medium">Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-b border-carbon-800/50 last:border-0">
                          <td className="px-4 py-2.5 text-smoke-200">{r.name}</td>
                          <td className="px-4 py-2.5 text-ember-400 font-mono text-right tabular-nums">{formatQty(r.total)}</td>
                          <td className="px-4 py-2.5 text-smoke-400">{r.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'products' && (
              <div className="space-y-2">
                {productBreakdown.map((p, i) => (
                  <div key={i} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-smoke-200 text-sm font-medium">{p.product_name}</p>
                      <span className="text-smoke-500 text-xs">×{p.qty} vendidos</span>
                    </div>
                    {p.ingredients.length === 0 ? (
                      <p className="text-smoke-600 text-xs italic">Sin ingredientes configurados</p>
                    ) : (
                      <div className="space-y-0.5">
                        {p.ingredients.map((ing, j) => (
                          <div key={j} className="flex justify-between text-xs">
                            <span className="text-smoke-400">{ing.name}</span>
                            <span className="text-ember-400 font-mono tabular-nums">{formatQty(ing.consumed)} {ing.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {missingProducts.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-medium mb-1">Productos sin ingredientes configurados:</p>
                <p className="text-amber-300/70 text-xs">{missingProducts.join(', ')}</p>
                <Link to="/admin/carta" className="text-amber-400 text-xs underline mt-1 inline-block">
                  Configurar ingredientes →
                </Link>
              </div>
            )}

            {/* AI Summary */}
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-smoke-300 text-sm font-medium">Resumen IA</p>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading}
                  className="text-xs text-ember-500 underline disabled:opacity-50"
                >
                  {aiLoading ? 'Generando...' : aiSummary ? 'Regenerar' : 'Generar resumen'}
                </button>
              </div>
              {aiSummary ? (
                <p className="text-smoke-300 text-sm leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-smoke-600 text-xs italic">Presioná "Generar resumen" para obtener un análisis del consumo del día.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
