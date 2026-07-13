import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { geminiGenerate } from '../../lib/gemini'

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatQty(n) {
  if (n === Math.floor(n)) return String(n)
  return Number(n.toFixed(2)).toString()
}

// Normalize weight (kg→g) and volume (l→ml) so they can be charted together
function normalizeRow(row) {
  if (row.unit === 'kg') return { ...row, total: row.total * 1000, unit: 'g' }
  if (row.unit === 'l') return { ...row, total: row.total * 1000, unit: 'ml' }
  return row
}

const UNIT_ORDER = ['g', 'ml', 'unidad', 'taza', 'cda', 'cdita', 'porción']
const BAR_COLOR = '#f97316'

function BarLabel({ x, y, width, height, value, index }) {
  const color = index === 0 ? BAR_COLOR : '#6B7280'
  return (
    <text x={x + width + 6} y={y + height / 2} dy={4} textAnchor="start" fontSize={10} fill={color} fontFamily="monospace">
      {formatQty(value)}
    </text>
  )
}

function UnitChart({ unit, items }) {
  const max = Math.max(...items.map(i => i.total))
  const data = [...items].sort((a, b) => b.total - a.total)
  const chartHeight = Math.max(data.length * 36 + 20, 60)

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-carbon-800 flex items-center gap-2">
        <span className="text-smoke-500 text-[10px] uppercase tracking-wide font-medium">en {unit}</span>
        <span className="text-smoke-600 text-[10px]">· {data.length} ingrediente{data.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="px-2 py-2">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart layout="vertical" data={data} margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11, fill: '#9DAAB8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-carbon-800 border border-carbon-700 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="text-smoke-200 font-semibold">{formatQty(payload[0].value)} {unit}</span>
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={18} label={<BarLabel />}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? BAR_COLOR : '#374151'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ConsumoPage() {
  const { venueId } = useAuth()
  const [date, setDate] = useState(todayLocal())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // null = not yet calculated
  const [view, setView] = useState('charts') // 'charts' | 'ingredients' | 'products'
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  async function calculate() {
    if (!venueId) return
    setLoading(true)
    setResult(null)
    setAiSummary('')

    const tzOffset = new Date().getTimezoneOffset()
    const localStart = new Date(new Date(date + 'T00:00:00').getTime() - tzOffset * 60000).toISOString()
    const localEnd = new Date(new Date(date + 'T23:59:59.999').getTime() - tzOffset * 60000).toISOString()

    const { data: orders } = await supabaseStaff
      .from('orders')
      .select('id')
      .eq('venue_id', venueId)
      .eq('payment_status', 'aprobado')
      .gte('created_at', localStart)
      .lte('created_at', localEnd)
      .not('status', 'eq', 'cancelado')

    if (!orders?.length) {
      setResult({ empty: true })
      setLoading(false)
      return
    }

    const orderIds = orders.map(o => o.id)

    const { data: items } = await supabaseStaff
      .from('order_items')
      .select('product_id, product_name, quantity')
      .in('order_id', orderIds)

    if (!items?.length) {
      setResult({ empty: true })
      setLoading(false)
      return
    }

    // Aggregate sold quantities per product
    const soldMap = {}
    let totalUnitsSold = 0
    for (const item of items) {
      if (!item.product_id) continue
      if (!soldMap[item.product_id]) soldMap[item.product_id] = { product_name: item.product_name, qty: 0 }
      soldMap[item.product_id].qty += item.quantity
      totalUnitsSold += item.quantity
    }

    const productIds = Object.keys(soldMap)
    const { data: ingredients } = await supabaseStaff
      .from('product_ingredients')
      .select('product_id, ingredient_name, quantity, unit')
      .in('product_id', productIds)

    // Compute totals
    const ingMap = {}
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
        const norm = normalizeRow({ name: ing.ingredient_name, unit: ing.unit, total: ing.quantity * qty })
        const key = `${norm.name}||${norm.unit}`
        if (!ingMap[key]) ingMap[key] = { name: norm.name, unit: norm.unit, total: 0 }
        ingMap[key].total += norm.total
        prodIngRows.push({ name: ing.ingredient_name, unit: ing.unit, consumed: ing.quantity * qty })
      }
      breakdown.push({ product_name, qty, ingredients: prodIngRows })
    }

    const rows = Object.values(ingMap).sort((a, b) => a.name.localeCompare(b.name))

    // Group by unit for charts
    const unitGroups = {}
    for (const row of rows) {
      if (!unitGroups[row.unit]) unitGroups[row.unit] = []
      unitGroups[row.unit].push(row)
    }
    const sortedUnits = Object.keys(unitGroups).sort((a, b) => {
      const ia = UNIT_ORDER.indexOf(a), ib = UNIT_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

    setResult({
      empty: false,
      totalOrders: orders.length,
      totalProductTypes: productIds.length,
      totalUnitsSold,
      withIngredients: productIds.length - missing.length,
      missingCount: missing.length,
      missingProducts: [...new Set(missing)],
      rows,
      breakdown,
      unitGroups,
      sortedUnits,
    })
    setLoading(false)
  }

  async function generateAiSummary() {
    if (!result?.rows?.length) return
    setAiLoading(true)
    setAiSummary('')
    try {
      const list = result.rows.map(r => `- ${r.name}: ${formatQty(r.total)} ${r.unit}`).join('\n')
      const prompt = `Sos el asistente de un restaurante. El resumen de consumo de materia prima del día ${date} fue:\n\n${list}\n\nEscribí un párrafo breve (máximo 4 oraciones) en español que resuma el consumo del día y destaque los ingredientes más utilizados. Sin asteriscos ni markdown.`
      const data = await geminiGenerate([{ parts: [{ text: prompt }] }])
      setAiSummary(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
    } catch {
      setAiSummary('No se pudo generar el resumen.')
    }
    setAiLoading(false)
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">CONSUMO</h1>
        <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
      </header>

      <div className="px-5 mt-5 space-y-4">
        {/* Date + calculate */}
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setResult(null); setAiSummary('') }}
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
          Pedidos pagados del día × ingredientes configurados.{' '}
          <Link to="/admin/carta" className="text-ember-500 underline">Configurar ingredientes →</Link>
        </p>

        {result === null && !loading && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
            <p className="text-smoke-400 text-sm">Seleccioná una fecha y presioná Calcular.</p>
          </div>
        )}

        {result?.empty && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
            <p className="text-smoke-400 text-sm">No hay pedidos pagados para esta fecha.</p>
          </div>
        )}

        {result && !result.empty && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 text-center">
                <p className="font-display text-2xl text-ember-400">{result.totalOrders}</p>
                <p className="text-smoke-500 text-[10px] mt-0.5">pedidos</p>
              </div>
              <div className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 text-center">
                <p className="font-display text-2xl text-ember-400">{result.totalUnitsSold}</p>
                <p className="text-smoke-500 text-[10px] mt-0.5">productos vendidos</p>
              </div>
              <div className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 text-center">
                <p className="font-display text-2xl text-ember-400">{result.rows.length}</p>
                <p className="text-smoke-500 text-[10px] mt-0.5">ingredientes</p>
              </div>
            </div>

            {result.missingCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-medium mb-1">
                  {result.missingCount} producto{result.missingCount !== 1 ? 's' : ''} sin ingredientes configurados:
                </p>
                <p className="text-amber-300/70 text-xs">{result.missingProducts.join(', ')}</p>
                <Link to="/admin/carta" className="text-amber-400 text-xs underline mt-1 inline-block">Configurar →</Link>
              </div>
            )}

            {/* View tabs */}
            <div className="flex gap-1 bg-carbon-900 border border-carbon-700 rounded-xl p-1">
              {[
                { id: 'charts', label: 'Gráficos' },
                { id: 'ingredients', label: 'Tabla' },
                { id: 'products', label: 'Por producto' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    view === tab.id ? 'bg-ember-500 text-white' : 'text-smoke-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Charts view */}
            {view === 'charts' && (
              <div className="space-y-3">
                {result.sortedUnits.map(unit => (
                  <UnitChart key={unit} unit={unit} items={result.unitGroups[unit]} />
                ))}
              </div>
            )}

            {/* Ingredients table view */}
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
                      {result.rows.map((r, i) => (
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

            {/* Per-product view */}
            {view === 'products' && (
              <div className="space-y-2">
                {result.breakdown.map((p, i) => (
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

            {/* AI summary — optional, at the bottom */}
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-smoke-300 text-sm font-medium">Resumen IA</p>
                  <p className="text-smoke-600 text-[10px]">Genera un análisis narrativo usando Gemini</p>
                </div>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading}
                  className="text-xs text-ember-500 border border-ember-500/30 px-2.5 py-1 rounded-lg disabled:opacity-50"
                >
                  {aiLoading ? 'Generando...' : aiSummary ? 'Regenerar' : 'Generar'}
                </button>
              </div>
              {aiSummary && <p className="text-smoke-300 text-sm leading-relaxed">{aiSummary}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
