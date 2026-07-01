import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

export default function HubPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    const { data } = await supabaseCustomer
      .from('venues')
      .select('name, slug, logo_url')
      .ilike('name', `%${search.trim()}%`)
      .eq('is_active', true)
      .limit(10)
    setResults(data || [])
    setSearching(false)
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col relative overflow-hidden">

      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-ember-400/15 blur-3xl" />

      <div className="flex-1 flex flex-col px-6 pt-12 pb-10 relative">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-md p-2">
            <img src="/icon-512.png" alt="Capy" className="w-full h-full object-contain" />
          </div>
          <p className="font-display text-4xl text-ember-500 tracking-wide">CAPY</p>
          <p className="text-smoke-500 text-sm mt-1">La plataforma de gastronomía</p>
        </div>

        {/* Buscador de restaurantes */}
        <div className="mb-8">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Buscar un restaurante
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nombre del restaurante…"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
            >
              {searching ? '…' : 'Buscar'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map(v => (
                <button
                  key={v.slug}
                  onClick={() => navigate(`/r/${v.slug}`)}
                  className="w-full flex items-center gap-3 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 text-left"
                >
                  {v.logo_url
                    ? <img src={v.logo_url} alt={v.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-600 flex-shrink-0 text-sm font-bold">{v.name[0]}</div>
                  }
                  <span className="text-smoke-300 font-semibold text-sm">{v.name}</span>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && search && !searching && (
            <p className="text-smoke-500 text-xs mt-3">No encontramos restaurantes con ese nombre.</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-carbon-700" />
          <span className="text-smoke-600 text-xs">o elegí tu camino</span>
          <div className="flex-1 h-px bg-carbon-700" />
        </div>

        {/* Tres caminos */}
        <div className="space-y-3 mt-auto">

          <Link
            to="/camaut"
            className="flex items-center gap-4 bg-carbon-900/70 border border-carbon-700 rounded-2xl px-5 py-4"
          >
            <div className="w-10 h-10 rounded-xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center text-ember-600 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-smoke-300 font-semibold text-sm">Soy camarero</p>
              <p className="text-smoke-500 text-xs mt-0.5">Accedé a Camaut — tu herramienta profesional</p>
            </div>
          </Link>

          <Link
            to="/admin/login"
            className="flex items-center gap-4 bg-carbon-900/70 border border-carbon-700 rounded-2xl px-5 py-4"
          >
            <div className="w-10 h-10 rounded-xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center text-ember-600 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <p className="text-smoke-300 font-semibold text-sm">Tengo un restaurante</p>
              <p className="text-smoke-500 text-xs mt-0.5">Sumá tu local a Capy y gestioná todo desde acá</p>
            </div>
          </Link>

        </div>

        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/privacidad" className="text-smoke-600 text-[11px] hover:text-smoke-500">Privacidad</Link>
          <span className="text-smoke-700 text-[11px]">·</span>
          <Link to="/terminos" className="text-smoke-600 text-[11px] hover:text-smoke-500">Términos</Link>
          <span className="text-smoke-700 text-[11px]">·</span>
          <a href="mailto:hola@capyapp.co" className="text-smoke-600 text-[11px] hover:text-smoke-500">Contacto</a>
        </div>

      </div>
    </div>
  )
}
