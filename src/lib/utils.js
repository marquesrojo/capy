export function formatPrice(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const STATUS_LABELS = {
  pendiente_aprobacion: 'Por aprobar',
  pendiente_pago: 'Pendiente de pago',
  recibido: 'Recibido',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
}

export const STATUS_COLORS = {
  pendiente_aprobacion: 'bg-amber-500/10 text-amber-700 border-amber-500/40',
  pendiente_pago: 'bg-smoke-500/15 text-smoke-400 border-smoke-500/40',
  recibido: 'bg-blue-500/10 text-blue-700 border-blue-500/40',
  en_preparacion: 'bg-ember-500/10 text-ember-600 border-ember-500/40',
  listo: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40',
  entregado: 'bg-smoke-500/10 text-smoke-500 border-smoke-500/30',
  cancelado: 'bg-red-500/10 text-red-700 border-red-500/40'
}

export const STATUS_FLOW = ['pendiente_aprobacion', 'recibido', 'en_preparacion', 'listo', 'entregado']

// Pago: eje independiente de "status" (cocina/entrega). Un pedido puede
// estar "entregado" y seguir "pendiente" de pago hasta que el cliente
// pida la cuenta y la caja confirme.
export const PAYMENT_STATUS_LABELS = {
  pendiente: 'Pago pendiente',
  cuenta_solicitada: 'Cuenta solicitada',
  en_revision: 'Comprobante en revisión',
  aprobado: 'Pago confirmado',
  rechazado: 'Pago rechazado',
  reembolsado: 'Reembolsado'
}

export const PAYMENT_STATUS_COLORS = {
  pendiente: 'bg-smoke-500/10 text-smoke-500 border-smoke-500/30',
  cuenta_solicitada: 'bg-ember-500/10 text-ember-600 border-ember-500/40',
  en_revision: 'bg-ember-500/10 text-ember-600 border-ember-500/40',
  aprobado: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40',
  rechazado: 'bg-red-500/10 text-red-700 border-red-500/40',
  reembolsado: 'bg-smoke-500/10 text-smoke-500 border-smoke-500/30'
}
