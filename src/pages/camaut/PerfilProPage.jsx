import { useEffect, useState } from 'react'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'

export default function PerfilProPage({ venueId }) {
  const [staffId, setStaffId] = useState(null)
  const [experience, setExperience] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('trabajo')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState(null)
  const [bioText, setBioText] = useState('')
  const [bioEditing, setBioEditing] = useState(false)
  const [bioSaving, setBioSaving] = useState(false)

  const [form, setForm] = useState({
    type: 'trabajo',
    title: '',
    institution: '',
    role: '',
    date_from: '',
    date_to: '',
    current: false,
    description: ''
  })

  useEffect(() => {
    if (venueId) loadAll()
  }, [venueId])

  async function loadAll() {
    const { data: staffData } = await supabaseStaff
      .from('staff_names')
      .select('id, bio')
      .eq('venue_id', venueId)
      .single()

    if (!staffData) { setLoading(false); return }
    setStaffId(staffData.id)
    setBio(staffData.bio || null)
    setBioText(staffData.bio || '')

    const [expRes, reviewsRes] = await Promise.all([
      supabaseStaff
        .from('staff_experience')
        .select('*')
        .eq('staff_id', staffData.id)
        .order('date_from', { ascending: false }),
      supabaseStaff
        .from('order_feedback')
        .select('rating, notes, created_at')
        .eq('staff_id', staffData.id)
        .order('created_at', { ascending: false })
    ])

    setExperience(expRes.data || [])
    setReviews(reviewsRes.data || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim() || !staffId) return
    setSaving(true)

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaut-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        staffId,
        type: form.type,
        title: form.title.trim(),
        institution: form.institution.trim() || null,
        role: form.role.trim() || null,
        date_from: form.date_from || null,
        date_to: form.current ? null : (form.date_to || null),
        current: form.current,
        description: form.description.trim() || null
      })
    })

    const result = await res.json()
    if (result.success) {
      setSaving(false)
      setShowForm(false)
      setForm({ type: activeSection, title: '', institution: '', role: '', date_from: '', date_to: '', current: false, description: '' })
      loadAll()
    } else {
      alert('Error: ' + result.error)
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await supabaseStaff.from('staff_experience').delete().eq('id', id)
    setExperience(prev => prev.filter(e => e.id !== id))
  }

  async function handleBioSave() {
    if (!staffId) return
    setBioSaving(true)
    const newBio = bioText.trim() || null
    await supabaseCamaut.from('staff_names').update({ bio: newBio }).eq('id', staffId)
    setBio(newBio)
    setBioEditing(false)
    setBioSaving(false)
  }

  const SECTIONS = [
    { id: 'trabajo', label: 'Experiencia' },
    { id: 'estudio', label: 'Estudios' },
    { id: 'honor', label: 'Honores' },
    { id: 'reviews', label: 'Reviews' },
  ]

  const RATING_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
  const RATING_COLORS = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-emerald-500', 'text-emerald-400']

  const filtered = experience.filter(e => e.type === activeSection)
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-10">Cargando...</p>

  return (
    <div className="space-y-4">
      {/* Bio */}
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest">Sobre mí</p>
          {!bioEditing && (
            <button
              onClick={() => { setBioEditing(true); setBioText(bio || '') }}
              className="text-[#008080] text-xs font-semibold"
            >
              {bio ? 'Editar' : 'Agregar'}
            </button>
          )}
        </div>
        {bioEditing ? (
          <div className="space-y-2">
            <textarea
              value={bioText}
              onChange={e => setBioText(e.target.value)}
              placeholder="Contá tu estilo de trabajo, especialidad, lo que te diferencia..."
              rows={4}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBioSave}
                disabled={bioSaving}
                className="flex-1 bg-[#008080] disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm"
              >
                {bioSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => { setBioEditing(false); setBioText(bio || '') }}
                className="flex-1 border border-black/10 text-[#8896A5] py-2 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : bio ? (
          <p className="text-[#3A4A5A] text-sm leading-relaxed">{bio}</p>
        ) : (
          <p className="text-[#B0BEC5] text-sm">Contá algo sobre tu estilo de trabajo.</p>
        )}
      </div>

      {/* Tabs de sección */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => { setActiveSection(s.id); setShowForm(false) }}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border ${
              activeSection === s.id
                ? 'bg-[#008080] text-white border-[#008080]'
                : 'bg-white border-black/10 text-[#3A4A5A]'
            }`}
          >
            {s.label}
            {s.id === 'reviews' && reviews.length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({reviews.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {activeSection === 'reviews' && (
        <div>
          {avgRating && (
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm mb-3 flex items-center gap-4">
              <div className="text-center">
                <p className="font-bold text-[#008080] text-3xl">{avgRating}</p>
                <p className="text-[#8896A5] text-xs">/ 5</p>
              </div>
              <div>
                <p className="font-semibold text-[#1A2A3A] text-sm">Calificación promedio</p>
                <p className="text-[#8896A5] text-xs">{reviews.length} opiniones totales</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${RATING_COLORS[r.rating]}`}>
                    {RATING_LABELS[r.rating]}
                  </span>
                  <span className="text-[#B0BEC5] text-[10px]">
                    {new Date(r.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
                {r.notes && <p className="text-[#8896A5] text-xs italic">"{r.notes}"</p>}
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-[#8896A5] text-sm text-center py-6">Todavía no tenés reviews.</p>
            )}
          </div>
        </div>
      )}

      {/* Experiencia / Estudios / Honores */}
      {activeSection !== 'reviews' && (
        <div>
          {/* Lista */}
          <div className="space-y-2 mb-3">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#1A2A3A] text-sm">{item.title}</p>
                    {item.institution && <p className="text-[#008080] text-xs">{item.institution}</p>}
                    {item.role && <p className="text-[#8896A5] text-xs">{item.role}</p>}
                    {(item.date_from || item.current) && (
                      <p className="text-[#B0BEC5] text-[10px] mt-1">
                        {item.date_from ? new Date(item.date_from + '-01').toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) : ''}
                        {item.current ? ' · Actual' : item.date_to ? ` → ${new Date(item.date_to + '-01').toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}` : ''}
                      </p>
                    )}
                    {item.description && <p className="text-[#8896A5] text-xs mt-1 italic">{item.description}</p>}
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-red-400 text-xs underline ml-3">
                    Borrar
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !showForm && (
              <p className="text-[#8896A5] text-sm text-center py-4">
                {activeSection === 'trabajo' ? 'Agregá tu experiencia laboral' :
                 activeSection === 'estudio' ? 'Agregá tus estudios' : 'Agregá un honor o reconocimiento'}
              </p>
            )}
          </div>

          {/* Formulario */}
          {showForm ? (
            <form onSubmit={handleSave} className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm space-y-3">
              <p className="font-semibold text-[#1A2A3A] text-sm">
                {activeSection === 'trabajo' ? 'Nueva experiencia' :
                 activeSection === 'estudio' ? 'Nuevo estudio' : 'Nuevo honor'}
              </p>

              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder={activeSection === 'trabajo' ? 'Nombre del restaurante/local' :
                             activeSection === 'estudio' ? 'Institución / Curso' : 'Título del honor'}
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
                required
              />

              {activeSection === 'trabajo' && (
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  placeholder="Rol (ej: Camarero, Bartender)"
                  className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
                />
              )}

              {activeSection !== 'honor' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[#8896A5] text-[10px] block mb-1">Desde</label>
                    <input
                      type="month"
                      value={form.date_from}
                      onChange={e => setForm(p => ({ ...p, date_from: e.target.value }))}
                      className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
                    />
                  </div>
                  {!form.current && (
                    <div className="flex-1">
                      <label className="text-[#8896A5] text-[10px] block mb-1">Hasta</label>
                      <input
                        type="month"
                        value={form.date_to}
                        onChange={e => setForm(p => ({ ...p, date_to: e.target.value }))}
                        className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'trabajo' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.current}
                    onChange={e => setForm(p => ({ ...p, current: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-[#3A4A5A] text-sm">Trabajo actual</span>
                </label>
              )}

              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descripción opcional"
                className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
              />

              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#008080] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-black/10 text-[#8896A5] py-2.5 rounded-xl text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowForm(true); setForm(p => ({ ...p, type: activeSection })) }}
              className="w-full border-2 border-dashed border-[#008080]/30 text-[#008080] text-sm font-semibold py-3 rounded-2xl"
            >
              + Agregar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
