import { db, auth } from '../config/firebase';

export const AUDIT_COLLECTIONS = [
  'clientes', 'obras', 'presupuestos', 'pedidos',
  'materiales', 'proveedores', 'trabajadores',
  'documentosRRHH', 'colaboradores', 'plantillasPresupuesto',
  'eventos', 'catalogoPartidas', 'config',
];

const IGNORE_DIFF_KEYS = ['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'id'];

const FIELD_LABELS = {
  nombre: 'Nombre',
  email: 'Email',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  estado: 'Estado',
  total: 'Total',
  base: 'Base imponible',
  iva: 'IVA',
  descripcion: 'Descripción',
  titulo: 'Título',
  rol: 'Rol',
  prioridad: 'Prioridad',
  obraId: 'Obra',
  clienteId: 'Cliente',
  fecha: 'Fecha',
  fechaInicio: 'Fecha inicio',
  fechaFin: 'Fecha fin',
  notas: 'Notas',
  ingresosAprobados: 'Ingresos aprobados',
  activo: 'Activo',
  cargo: 'Cargo',
  nif: 'NIF',
  iban: 'IBAN',
  nss: 'NSS',
  salario: 'Salario',
  fechaAlta: 'Fecha alta',
  fechaBaja: 'Fecha baja',
  compartidoCon: 'Compartido con',
  solicitante: 'Solicitante',
  albaranUrl: 'Albarán',
  pdfFirmadoUrl: 'PDF Firmado',
  firmaEstado: 'Estado firma',
};

function labelForField(campo) {
  return FIELD_LABELS[campo] || campo.charAt(0).toUpperCase() + campo.slice(1);
}

export function extractEntityLabel(data) {
  if (!data) return '—';
  return data.nombre || data.titulo || data.descripcion || data.email || data.id || '—';
}

export function computeDiff(prev, next) {
  const cambios = [];
  const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const key of allKeys) {
    if (IGNORE_DIFF_KEYS.includes(key)) continue;
    const before = prev?.[key];
    const after = next?.[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (Array.isArray(before) || Array.isArray(after)) {
      const lenBefore = Array.isArray(before) ? before.length : 0;
      const lenAfter = Array.isArray(after) ? after.length : 0;
      if (lenBefore === lenAfter) continue;
      cambios.push({
        campo: labelForField(key),
        antes: `${lenBefore} items`,
        despues: `${lenAfter} items`,
      });
    } else {
      cambios.push({ campo: labelForField(key), antes: before ?? '—', despues: after ?? '—' });
    }
  }
  return cambios;
}

// Writes directly to Firestore (bypasses db.js interceptor to avoid circular imports)
export async function createLog({ entidad, entidadId, entidadLabel, accion, cambios = [] }) {
  try {
    const user = auth.currentUser;
    const id = 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    await db.collection('logs').doc(id).set({
      id,
      entidad,
      entidadId,
      entidadLabel: entidadLabel || entidadId,
      accion,
      usuarioEmail: user?.email || 'sistema',
      fecha: new Date().toISOString(),
      cambios,
    });
  } catch (e) {
    console.error('[logs] createLog failed:', e);
  }
}
