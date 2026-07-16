import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'

export default function CamautRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    localStorage.setItem('capy-post-auth', 'camaut')
    await supabaseStaff.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

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

  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      localStorage.setItem('capy-post-auth', 'camaut')
      const { data: authData, error: authError } = await supabaseStaff.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            role: 'camarero'
          }
        }
      })
      if (authError) throw authError

      // Si Supabase devuelve sesión directamente, la confirmación de email
      // está deshabilitada — ir al app sin esperar email
      if (authData.session) {
        navigate('/camareroa/app')
        return
      }

      setStep(3)
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setResendDone(false)
    await supabaseStaff.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    setResendDone(true)
    setResending(false)
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
        <p className="text-smoke-500 text-sm mb-1 max-w-xs">
          Te enviamos un link de confirmación a <strong>{email}</strong>.
        </p>
        <p className="text-smoke-600 text-xs mb-6 max-w-xs">
          Si no lo ves, revisá la carpeta de spam o correo no deseado.
        </p>
        <button
          onClick={handleResend}
          disabled={resending || resendDone}
          className="text-ember-500 text-sm underline mb-4 disabled:opacity-50"
        >
          {resending ? 'Reenviando...' : resendDone ? '¡Reenviado! Revisá tu casilla.' : 'No llegó el email → Reenviar'}
        </button>
        <Link to="/camareroa/login" className="text-smoke-500 text-xs underline">
          Ya confirmé mi email → Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-6 py-10">
      <Link to="/camareroa" className="text-smoke-500 text-sm">← Volver</Link>

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

      {step === 1 && (
        <>
          <button
            onClick={handleGoogleRegister}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white disabled:opacity-60 text-[#1A1A1A] font-semibold py-3.5 rounded-2xl text-sm mb-4 border border-carbon-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Redirigiendo...' : 'Registrarse con Google'}
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-carbon-700" />
            <span className="text-smoke-600 text-xs">o con email</span>
            <div className="flex-1 h-px bg-carbon-700" />
          </div>
        </>
      )}

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
        <Link to="/camareroa/login" className="text-ember-500 underline">Iniciá sesión</Link>
      </p>
    </div>
  )
}
