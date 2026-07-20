import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCustomer } from '../lib/supabase'

// Login por código de email: para la web app instalada (standalone), donde
// el OAuth de Google no funciona (Google corta el flujo dentro del contenedor
// PWA). Todo el flujo ocurre dentro de la app: email → código de 6 dígitos.
export default function EmailLoginModal({ onClose, onSuccess, accent = '#1A3A6B' }) {
  const [step, setStep] = useState('email') // email | code
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode() {
    const clean = email.trim().toLowerCase()
    if (!clean.includes('@')) { setError('Ingresá un email válido'); return }
    setBusy(true)
    setError('')
    const { error: err } = await supabaseCustomer.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setStep('code')
  }

  async function verify() {
    setBusy(true)
    setError('')
    const { error: err } = await supabaseCustomer.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (err) { setError('Código incorrecto o vencido. Probá de nuevo.'); return }
    onSuccess?.()
    onClose()
  }

  // Portal al body: evita quedar atrapado en contextos de apilamiento
  // (transform/filter de contenedores) que dejan el modal invisible
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-[#1A2332] text-lg mb-1">Iniciar sesión</p>

        {step === 'email' ? (
          <>
            <p className="text-[#8896A5] text-sm mb-4">
              Te mandamos un código de 6 dígitos a tu email para entrar.
            </p>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendCode() }}
              placeholder="tu@email.com"
              className="w-full border border-black/15 rounded-xl px-4 py-3 text-sm text-[#1A2332] outline-none focus:border-[#1A3A6B] mb-3"
            />
            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
            <button
              onClick={sendCode}
              disabled={busy}
              className="w-full text-white font-semibold py-3.5 rounded-xl disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {busy ? 'Enviando...' : 'Enviar código'}
            </button>
          </>
        ) : (
          <>
            <p className="text-[#8896A5] text-sm mb-4">
              Revisá <span className="font-semibold text-[#1A2332]">{email}</span> y escribí el código de 6 dígitos.
            </p>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') verify() }}
              placeholder="123456"
              className="w-full border border-black/15 rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-[#1A2332] outline-none focus:border-[#1A3A6B] mb-3"
            />
            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="w-full text-white font-semibold py-3.5 rounded-xl disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {busy ? 'Verificando...' : 'Ingresar'}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full text-[#8896A5] text-xs mt-3 underline"
            >
              Cambiar email o reenviar código
            </button>
          </>
        )}

        <button onClick={onClose} className="w-full text-[#8896A5] text-sm mt-4">Cancelar</button>
      </div>
    </div>,
    document.body
  )
}
