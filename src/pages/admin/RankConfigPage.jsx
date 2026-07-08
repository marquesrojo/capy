import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { RankIcon, RANK_COLORS, DEFAULT_RANKS } from '../../components/Icons'

export default function RankConfigPage() {
  const { venueId } = useAuth()
  const [rankConfig, setRankConfig] = useState(DEFAULT_RANKS.map(r => ({ ...r })))
  const [ranksEnabled, setRanksEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!venueId) return
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('customer_rank_config, customer_ranks_enabled')
        .eq('id', venueId)
        .single()
      if (data?.customer_rank_config?.length) setRankConfig(data.customer_rank_config)
      if (data?.customer_ranks_enabled === false) setRanksEnabled(false)
      setLoading(false)
    }
    load()
  }, [venueId])

  function updateRank(index, field, value) {
    setRankConfig(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const { error: err } = await supabaseStaff
        .from('venues')
        .update({ customer_rank_config: rankConfig, customer_ranks_enabled: ranksEnabled })
        .eq('id', venueId)
      if (err) throw err
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(`No pudimos guardar: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
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
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">PROGRAMA DE RANGOS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4">
        {/* Enable/disable toggle */}
        <button
          onClick={() => setRanksEnabled(v => !v)}
          className="w-full flex items-center justify-between bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3.5"
        >
          <div className="text-left">
            <p className="text-smoke-200 font-semibold text-sm">Programa de rangos</p>
            <p className="text-smoke-500 text-xs mt-0.5">
              {ranksEnabled ? 'Activo — visible para tus clientes' : 'Desactivado — no se muestra a los clientes'}
            </p>
          </div>
          <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${ranksEnabled ? 'bg-ember-500' : 'bg-carbon-600'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${ranksEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </button>

        <p className="text-smoke-500 text-xs">
          El rango se calcula según el promedio mensual de pedidos de los últimos 3 meses. Personalizá el nombre y premio de cada nivel.
        </p>

        <div className={`space-y-4 ${!ranksEnabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {rankConfig.map((rank, i) => (
            <div
              key={rank.level}
              className="rounded-xl p-4 border"
              style={{ borderColor: `${RANK_COLORS[rank.level]}40`, backgroundColor: `${RANK_COLORS[rank.level]}08` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <RankIcon level={rank.level} size={16} style={{ color: RANK_COLORS[rank.level] }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: RANK_COLORS[rank.level] }}>
                  Nivel {rank.level}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-smoke-500 text-[10px] block mb-1">Nombre</label>
                  <input
                    value={rank.name}
                    onChange={e => updateRank(i, 'name', e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] block mb-1">
                    {rank.level === 1 ? 'Desde (siempre 0)' : 'Prom. mensual mínimo'}
                  </label>
                  <input
                    type="number"
                    value={rank.min_orders}
                    onChange={e => updateRank(i, 'min_orders', parseInt(e.target.value) || 0)}
                    className="input text-xs w-full"
                    min="0"
                    disabled={rank.level === 1}
                  />
                </div>
              </div>
              <div>
                <label className="text-smoke-500 text-[10px] block mb-1">Premio / beneficio (opcional)</label>
                <input
                  value={rank.prize || ''}
                  onChange={e => updateRank(i, 'prize', e.target.value || null)}
                  placeholder="Ej: 10% de descuento, postre de regalo..."
                  className="input text-xs w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-700 text-xs px-1">{error}</p>}
        {saved && <p className="text-emerald-700 text-xs px-1">Guardado.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </main>
    </div>
  )
}
