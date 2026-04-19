import { saveDoc } from './db';

const BUCKET_RANK = { expirado: 3, '7d': 2, '30d': 1 };

// Returns email[] for active users with the given role
export function resolveEmailsByRole(rol, usuarios = []) {
  return usuarios
    .filter(u => u.rol === rol && u.activo !== false)
    .map(u => u.email)
    .filter(Boolean);
}

// Core helper — persists a notification document
export async function createNotification({ tipo, mensaje, link, destinatarios = [] }) {
  const id = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  await saveDoc('notificaciones', id, {
    id,
    tipo,
    mensaje,
    leida: false,
    fecha: new Date().toISOString(),
    link,
    destinatarios,
  });
  return id;
}

// Pedido nuevo — notifica a usuarios con rol logistica
export async function notifyPedidoNuevo({ pedido, obras = [], usuarios = [] }) {
  const destinatarios = resolveEmailsByRole('logistica', usuarios);
  if (destinatarios.length === 0) return;
  const obraName = obras.find(o => o.id === pedido.obraId)?.nombre || 'Almacén Central';
  const urgenteTxt = pedido.prioridad === 'urgente' ? '⚡ URGENTE — ' : '';
  await createNotification({
    tipo: pedido.prioridad === 'urgente' ? 'alerta' : 'info',
    mensaje: `${urgenteTxt}Nuevo pedido de ${pedido.solicitanteNombre || 'Desconocido'}: "${pedido.descripcion}" (${obraName})`,
    link: '/pedidos',
    destinatarios,
  });
}

// Presupuesto firmado — notifica a todos los admins
export async function notifyPresupuestoFirmado({ ppto, usuarios = [] }) {
  const destinatarios = resolveEmailsByRole('admin', usuarios);
  if (destinatarios.length === 0) return;
  await createNotification({
    tipo: 'exito',
    mensaje: `✅ Presupuesto "${ppto.titulo || ppto.id}" firmado por el cliente.`,
    link: '/presupuestos',
    destinatarios,
  });
}

// Documento RRHH por caducar — notifica a admins
export async function notifyRRHHVencimiento({ doc, trabajador, bucket, usuarios = [] }) {
  const destinatarios = resolveEmailsByRole('admin', usuarios);
  if (destinatarios.length === 0) return;
  const workerName = trabajador?.nombre || doc.trabajadorId || 'Trabajador';
  const bucketMsg = bucket === 'expirado'
    ? `ha caducado`
    : bucket === '7d'
    ? `caduca en menos de 7 días`
    : `caduca en menos de 30 días`;
  await createNotification({
    tipo: bucket === 'expirado' ? 'alerta' : 'aviso',
    mensaje: `Documento "${doc.nombre}" de ${workerName} ${bucketMsg}.`,
    link: '/rrhh',
    destinatarios,
  });
}

// Tarea asignada — notifica al usuario asignado si es diferente al autor
export async function notifyTareaAsignada({ tarea, autorEmail, usuarios = [] }) {
  if (!tarea.asignadoA || tarea.asignadoA === autorEmail) return;
  await createNotification({
    tipo: 'info',
    mensaje: `Se te ha asignado la tarea: "${tarea.titulo}"${tarea.fechaVencimiento ? ` (vence el ${new Date(tarea.fechaVencimiento).toLocaleDateString()})` : ''}.`,
    link: '/dashboard',
    destinatarios: [tarea.asignadoA],
  });
}

// Evento de calendario — notifica a cada participante (fix: añade destinatarios)
export async function notifyEvento({ evento, usuarios = [] }) {
  if (!evento.participantes || evento.participantes.length === 0) return;

  // Resolve participant names to emails via config.usuarios list
  const emailsFromUsuarios = usuarios.reduce((map, u) => {
    if (u.email) map[u.nombre?.toLowerCase()] = u.email;
    return map;
  }, {});

  for (const participante of evento.participantes) {
    const email = emailsFromUsuarios[participante.toLowerCase()];
    // If we can't resolve to an email, skip (external participant without account)
    if (!email) continue;
    await createNotification({
      tipo: 'info',
      mensaje: `Nuevo evento: "${evento.title}" el ${new Date(evento.date).toLocaleDateString()} a las ${evento.time}.`,
      link: '/calendario',
      destinatarios: [email],
    });
  }
}

// Returns the rank order of a vencimiento bucket for deduplication
export function bucketRank(bucket) {
  return BUCKET_RANK[bucket] ?? 0;
}
