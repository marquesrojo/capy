// Módulo fiscal: emisión de factura via edge function emit-invoice
// (TusFacturasAPP → ARCA/AFIP) y armado del link de refuerzo de WhatsApp
// con el ticket digital de 80mm.
import { supabaseStaff } from './supabase'

export async function emitFiscalInvoice(orderId) {
  // La edge function exige el JWT del cajero/admin logueado: la emisión es
  // siempre una acción explícita del staff.
  const { data: { session } } = await supabaseStaff.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada, volvé a iniciar sesión' }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emit-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId }),
  })
  return res.json()
}

// Compartir nativo del dispositivo con fallback a copiar el link
export async function shareTicket({ pdfUrl, venueName }) {
  const text = `🧾 Ticket digital de ${venueName || 'nuestro local'}`
  if (navigator.share) {
    try {
      await navigator.share({ title: text, text, url: pdfUrl })
      return 'shared'
    } catch { return 'cancelled' }
  }
  try {
    await navigator.clipboard.writeText(pdfUrl)
    return 'copied'
  } catch { return 'error' }
}

// Link wa.me con el ticket. Si no hay teléfono, abre el picker de WhatsApp
// para que el cajero elija el contacto.
export function buildTicketWaUrl({ phone, venueName, pdfUrl, dailyNumber }) {
  const text = `🧾 Tu ticket digital de *${venueName || 'nuestro local'}*${dailyNumber ? ` (pedido #${dailyNumber})` : ''}: ${pdfUrl}`
  const encoded = encodeURIComponent(text)
  const digits = (phone || '').replace(/\D/g, '')
  return digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
