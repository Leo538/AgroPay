/**
 * Unidades de venta (mayorista / grandes productores).
 * Etiquetas legadas: productos guardados antes del cambio.
 */
export const UNIDADES_OFERTA = [
  { key: 'kg', label: 'Kilogramo (kg)' },
  { key: 't', label: 'Tonelada (t)' },
  { key: 'quintal', label: 'Quintal (100 kg)' },
  { key: 'saco', label: 'Saco / bulto' },
  { key: 'arroba', label: 'Arroba' },
  { key: 'litro', label: 'Litro' },
  { key: 'caja', label: 'Caja / cajón' },
  { key: 'unidad', label: 'Pieza / envase' },
  { key: 'otro', label: 'Otro' },
];

const LEGACY = {
  lb: 'Libra',
  docena: 'Docena',
  atado: 'Atado / manojo',
};

export function labelUnidad(key) {
  if (key == null || key === '') return '—';
  const row = UNIDADES_OFERTA.find((u) => u.key === key);
  if (row) return row.label;
  return LEGACY[key] || String(key);
}

/** Chips del formulario: incluye la clave guardada si ya no está en la lista nueva. */
export function unidadesParaFormulario(unidadActual) {
  const keys = new Set(UNIDADES_OFERTA.map((u) => u.key));
  const out = [...UNIDADES_OFERTA];
  if (unidadActual && !keys.has(unidadActual)) {
    out.push({
      key: unidadActual,
      label: `${labelUnidad(unidadActual)} (actual en catálogo)`,
    });
  }
  return out;
}
