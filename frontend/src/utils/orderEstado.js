export function labelEstadoPedido(estado) {
  const m = {
    pendiente: 'Pendiente · sube comprobante',
    pendiente_comprobante: 'Pendiente · sube comprobante',
    pre_validado: 'Pre-validado · revisa y confirma',
    comprobante_enviado: 'Comprobante recibido · revisa y confirma',
    rechazado: 'Rechazado',
    pagado: 'Pagado',
    entregado: 'Entregado',
  };
  return m[estado] || estado || '—';
}

export function colorEstadoPedido(estado) {
  if (estado === 'pendiente' || estado === 'pendiente_comprobante') return '#F57C00';
  if (estado === 'pre_validado' || estado === 'comprobante_enviado') return '#1976D2';
  if (estado === 'rechazado') return '#C62828';
  if (estado === 'pagado') return '#2E7D32';
  if (estado === 'entregado') return '#388E3C';
  return '#757575';
}

/** Fondo suave para chips de estado (hex #RRGGBB → rgba). */
export function fondoSuaveEstadoPedido(estado) {
  const hex = colorEstadoPedido(estado).replace('#', '');
  if (hex.length !== 6) return 'rgba(117, 117, 117, 0.1)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.14)`;
}

/** El agricultor puede confirmar pago o rechazar */
export function agricultorPuedeDecidirPago(estado) {
  return estado === 'pre_validado' || estado === 'comprobante_enviado';
}

export function agricultorPuedeMarcarEntregado(estado) {
  return estado === 'pagado';
}
