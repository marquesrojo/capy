import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff, setActiveVenueId } from '../../lib/supabase'



function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login')
  }, [authLoading, user])

  function handleNameChange(e) {
    const val = e.target.value
    setName(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  function handleSlugChange(e) {
    setSlugEdited(true)
    setSlug(toSlug(e.target.value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setError('')
    setSubmitting(true)

    const { data: venue, error: venueError } = await supabaseStaff
      .from('venues')
      .insert({ name: name.trim(), slug: slug.trim(), owner_id: user.id, is_active: true })
      .select()
      .single()

    if (venueError) {
      if (venueError.code === '23505') {
        setError('Ese slug ya está en uso. Elegí otro.')
      } else {
        setError(`Error al crear el local: ${venueError.message}`)
      }
      setSubmitting(false)
      return
    }

    const { data: updatedRows, error: profileError } = await supabaseStaff
      .from('profiles')
      .update({ venue_id: venue.id, role: 'propietario' })
      .eq('id', user.id)
      .select('id, venue_id, role')

    if (profileError) {
      setError(`Error al vincular el local con tu perfil: ${profileError.message}`)
      setSubmitting(false)
      return
    }

    if (!updatedRows?.length) {
      setError('No se pudo actualizar tu perfil (sin filas afectadas). Contactá a soporte.')
      setSubmitting(false)
      return
    }

    setActiveVenueId(venue.id)
    // Reload duro para que el auth context lea el profile actualizado (role=propietario, venue_id)
    window.location.href = '/admin'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-md p-2">
            <img src="/icon-512.png" alt="Capy" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-3xl tracking-wide text-ember-500">CAPY</h1>
          <p className="text-smoke-400 text-sm mt-1">Configurá tu restaurante</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-smoke-400 text-xs mb-1.5 block">Nombre del restaurante</span>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="Ej: El Asador del Puerto"
              className="input"
            />
          </label>
          <label className="block">
            <span className="text-smoke-400 text-xs mb-1.5 block">URL del local</span>
            <div className="flex items-center gap-0 bg-carbon-800 border border-carbon-600 rounded-xl px-3 py-2.5">
              <span className="text-smoke-500 text-xs whitespace-nowrap">capyapp.co/r/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="tu-restaurante"
                className="bg-transparent text-smoke-300 text-sm flex-1 outline-none min-w-0 ml-0.5"
              />
            </div>
            <p className="text-smoke-600 text-[11px] mt-1.5">
              Los clientes entrarán desde esta URL.
            </p>
          </label>
          {error && <p className="text-red-700 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim() || !slug.trim()}
            className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
          >
            {submitting ? 'Creando...' : 'Crear mi restaurante →'}
          </button>
        </form>
      </div>
    </div>
  )
}
