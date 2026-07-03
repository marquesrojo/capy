import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

serve(async (req) => {
  const payload = await req.json()
  const { user, email_data } = payload
  const { token_hash, redirect_to, email_action_type } = email_data

  const verifyUrl = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`

  let subject = ''
  let html = ''

  if (email_action_type === 'recovery') {
    subject = 'Recuperá tu contraseña en CAPY'
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:800;color:#E85D26;letter-spacing:2px">CAPY</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#1A2A3A;margin:0 0 12px">Recuperá tu contraseña</h2>
        <p style="color:#4A5568;font-size:15px;margin:0 0 24px">Hacé click en el botón para crear una nueva contraseña. El link expira en 1 hora.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#E85D26;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
          Recuperar contraseña →
        </a>
        <p style="color:#8896A5;font-size:12px;margin:24px 0 0">Si no pediste esto, ignorá este email.</p>
      </div>
    `
  } else if (email_action_type === 'signup' || email_action_type === 'email_confirmation') {
    subject = 'Confirmá tu cuenta en CAPY'
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:800;color:#E85D26;letter-spacing:2px">CAPY</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#1A2A3A;margin:0 0 12px">Confirmá tu cuenta</h2>
        <p style="color:#4A5568;font-size:15px;margin:0 0 24px">Bienvenido a Capy. Hacé click para activar tu cuenta y empezar.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#E85D26;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
          Confirmar cuenta →
        </a>
        <p style="color:#8896A5;font-size:12px;margin:24px 0 0">Si no creaste una cuenta, ignorá este email.</p>
      </div>
    `
  } else if (email_action_type === 'invite') {
    subject = 'Te invitaron a CAPY'
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:800;color:#E85D26;letter-spacing:2px">CAPY</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#1A2A3A;margin:0 0 12px">Te invitaron a Capy</h2>
        <p style="color:#4A5568;font-size:15px;margin:0 0 24px">Hacé click para aceptar la invitación y crear tu cuenta.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#E85D26;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
          Aceptar invitación →
        </a>
      </div>
    `
  } else {
    // magic link u otros
    subject = 'Tu link de acceso a CAPY'
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:800;color:#E85D26;letter-spacing:2px">CAPY</span>
        </div>
        <p style="color:#4A5568;font-size:15px;margin:0 0 24px">Hacé click para acceder a tu cuenta.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#E85D26;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
          Acceder →
        </a>
      </div>
    `
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CAPY <noreply@capyapp.co>',
      to: user.email,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
