import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomer } from '../../hooks/useCustomer'
import { useClientBase } from '../../hooks/useVenue'
import BottomNav from '../../components/BottomNav'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function AccountPage() {
  const { customer, isAnonymous, userEmail, signInWithGoogle, updateCustomer, forgetCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [googleError, setGoogleError] = useState('')

  function startEdit() {
    setEditName(customer?.full_name || '')
    setEditWhatsapp(customer?.whatsapp || '')
    setSaveError('')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    setSaveError('')
    const { error } = await updateCustomer(editName.trim(), editWhatsapp.trim())
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setEditing(false)
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-24">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">MI CUENTA</h1>
      </header>

      <main className="px-5 space-y-4">
        {customer && (
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">Nombre</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="text-smoke-500 text-[10px] font-bold uppercase tracking-wide block mb-1">WhatsApp</label>
                  <input
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-smoke-200 text-sm outline-none focus:border-ember-500"
                    placeholder="+54 9 ..."
                    type="tel"
                  />
                </div>
                {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editName.trim()}
                    className="flex-1 bg-ember-500 disabled:opacity-40 text-white font-bold text-sm py-2.5 rounded-xl"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 bg-carbon-800 text-smoke-300 font-bold text-sm py-2.5 rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-smoke-200 font-semibold text-base leading-tight">{customer.full_name}</p>
                    {customer.whatsapp && (
                      <p className="text-smoke-500 text-xs mt-0.5">{customer.whatsapp}</p>
                    )}
                  </div>
                  <button onClick={startEdit} className="text-ember-500 text-xs font-bold shrink-0 mt-0.5">
                    Editar
                  </button>
                </div>

                {isAnonymous ? (
                  <div className="border-t border-carbon-700 pt-3">
                    <p className="text-smoke-500 text-xs mb-2">Vinculá Google para acceder desde cualquier dispositivo</p>
                    <button
                      onClick={async () => {
                        const r = await signInWithGoogle(`${base}/cuenta`)
                        if (r?.error) setGoogleError(r.error.message)
                      }}
                      className="flex items-center gap-2.5 bg-white text-[#1A2332] font-semibold text-sm px-4 py-2.5 rounded-xl"
                    >
                      <GoogleIcon />
                      Vincular Google
                    </button>
                    {googleError && <p className="text-red-500 text-xs mt-2">{googleError}</p>}
                  </div>
                ) : (
                  <div className="border-t border-carbon-700 pt-3 flex items-center gap-2">
                    <GoogleIcon />
                    <p className="text-smoke-400 text-xs">{userEmail}</p>
                  </div>
                )}

                <div className="border-t border-carbon-700 pt-3">
                  <button
                    onClick={async () => { await forgetCustomer(); navigate(base || '/identificacion') }}
                    className="text-smoke-500 text-xs font-semibold"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
