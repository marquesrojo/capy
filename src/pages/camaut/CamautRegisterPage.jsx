import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseCamaut } from '../../lib/supabase'

export default function CamautRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: cuenta
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  // Step 2: perfil
  const [alias, setAlias] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [docNumber, setDocNumber] = useState('')

  async function handleStep1(e) {
    e.preventDefault()
    if (!email || !password || !fullName) { setError('Completá todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setStep(2)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseCamaut.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            full_name: fullName.trim(),
            role: 'camarero'
          }
        }
      })
      if (authError) throw authError

      // Registro exitoso — el venue se crea en el onboarding
      setStep(3)
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Si el registro fue exitoso, mostrar mensaje de confirmación
  if (step === 3) {
    return (
      <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ember-500/10 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h1 className="font-bold text-smoke-200 text-2xl mb-2">Revisá tu email</h1>
        <p className="text-smoke-500 text-sm mb-6 max-w-xs">
          Te enviamos un link de confirmación a <strong>{email}</strong>. Hacé click en el link para activar tu cuenta.
        </p>
        <Link to="/camaut/login" className="text-ember-500 text-sm underline">
          Ya confirmé mi email → Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-6 py-10">
      <Link to="/camaut" className="text-smoke-500 text-sm">← Volver</Link>

      <div className="mt-6 mb-8">
        <h1 className="font-bold text-smoke-200 text-2xl mb-1">
          {step === 1 ? 'Creá tu cuenta' : 'Tu perfil profesional'}
        </h1>
        <p className="text-smoke-500 text-sm">
          {step === 1 ? 'Paso 1 de 2 — Datos de acceso' : 'Paso 2 de 2 — Opcional pero recomendado'}
        </p>
        {/* Barra de progreso */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 h-1.5 rounded-full bg-ember-500" />
          <div className={`flex-1 h-1.5 rounded-full ${step === 2 ? 'bg-ember-500' : 'bg-carbon-700'}`} />
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleStep1} className="space-y-4">
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Tu nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ej: Matías Acevedo"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
              required
            />
          </div>
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
              required
            />
          </div>
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
              required
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-ember-500 text-white font-bold py-4 rounded-2xl text-base"
          >
            Continuar →
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Alias público (para el ranking)
            </label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="Ej: mozo_veloz"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
            />
            <p className="text-smoke-600 text-[10px] mt-1">Los demás te ven con este nombre en el ranking</p>
          </div>
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              DNI / Documento
            </label>
            <input
              type="text"
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
              placeholder="Ej: 35123456"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
            />
            <p className="text-smoke-600 text-[10px] mt-1">Necesario para generar tu certificado verificado</p>
          </div>
          <div>
            <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              LinkedIn (opcional)
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/tu-perfil"
              className="w-full border border-carbon-700 rounded-xl px-4 py-3 text-sm bg-white text-smoke-200"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {loading ? 'Creando cuenta...' : 'Crear mi cuenta →'}
          </button>
          <button
            type="button"
            onClick={() => handleRegister({ preventDefault: () => {} })}
            disabled={loading}
            className="w-full text-smoke-500 text-sm underline"
          >
            Saltar este paso
          </button>
        </form>
      )}

      <p className="text-smoke-500 text-xs text-center mt-6">
        ¿Ya tenés cuenta?{' '}
        <Link to="/camaut/login" className="text-ember-500 underline">Iniciá sesión</Link>
      </p>
    </div>
  )
}
