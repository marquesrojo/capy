import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomer } from '../../hooks/useCustomer'

export default function IdentifyPage() {
  const { registerCustomer } = useCustomer()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanWhatsapp = whatsapp.replace(/[^\d+]/g, '')
    if (cleanWhatsapp.length < 8) {
      setError('Ingresá un número de WhatsApp válido, con código de área.')
      return
    }

    setLoading(true)
    const { error } = await registerCustomer(fullName.trim(), cleanWhatsapp)
    setLoading(false)

    if (error) {
      setError('No pudimos guardar tus datos. Intentá de nuevo.')
      return
    }
    navigate('/carta')
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/icon-512.png"
            alt="Capy"
            className="w-24 h-24 mx-auto mb-3"
          />
          <p className="text-smoke-400 text-sm mt-1">Pedí desde donde estés</p>
        </div>

        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6">
          <p className="text-smoke-300 text-sm mb-4">
            Antes de empezar, contanos quién pide. Así el mozo te puede contactar si hace falta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-smoke-400 text-xs mb-1.5 block">Tu nombre</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input"
                placeholder="Ej: Juan Pérez"
              />
            </label>

            <label className="block">
              <span className="text-smoke-400 text-xs mb-1.5 block">Tu WhatsApp</span>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="input"
                placeholder="Ej: +54 9 11 1234 5678"
              />
            </label>

            {error && <p className="text-red-700 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Cargando...' : 'Ver la carta →'}
            </button>

            <p className="text-smoke-500 text-[11px] text-center">
              No necesitás contraseña. Vamos a recordar tus datos en este dispositivo.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
