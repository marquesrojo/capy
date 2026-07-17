// Módulo fiscal: emisión de factura via edge function emit-invoice
// (TusFacturasAPP → ARCA/AFIP) y armado del link de refuerzo de WhatsApp
// con el ticket digital de 80mm.

export async function emitFiscalInvoice(orderId) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emit-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ orderId }),
  })
  return res.json()
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
