import React, { useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const accionStyles = {
  create: { bg: '#f0fdf4', color: '#16a34a', icon: Plus, verbo: 'creó' },
  update: { bg: '#eff6ff', color: '#2563eb', icon: Edit2, verbo: 'editó' },
  delete: { bg: '#fef2f2', color: '#dc2626', icon: Trash2, verbo: 'eliminó' },
};

function timeAgo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function dayKey(iso) {
  return iso ? iso.slice(0, 10) : '';
}

function resolveNombre(email, usuarios = []) {
  const u = usuarios.find(u => u.email === email);
  return u?.nombre || email || 'Sistema';
}

function formatValue(val) {
  if (val === null || val === undefined || val === '—') return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (typeof val === 'number') return val.toLocaleString('es-ES');
  if (typeof val === 'string' && val.length > 60) return val.slice(0, 57) + '…';
  return String(val);
}

export default function ActivityTimeline({ entidad, entidadId, logs = [], usuarios = [] }) {
  const filtered = useMemo(() => {
    return [...logs]
      .filter(l => l.entidad === entidad && l.entidadId === entidadId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [logs, entidad, entidadId]);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
        Sin actividad registrada
      </div>
    );
  }

  // Group by day
  const groups = [];
  let lastDay = null;
  for (const log of filtered) {
    const day = dayKey(log.fecha);
    if (day !== lastDay) {
      groups.push({ day, label: formatDate(log.fecha), items: [] });
      lastDay = day;
    }
    groups[groups.length - 1].items.push(log);
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {groups.map(group => (
        <div key={group.day} style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '8px', paddingBottom: '4px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            {group.label}
          </div>
          {group.items.map(log => {
            const style = accionStyles[log.accion] || accionStyles.update;
            const Icon = style.icon;
            const nombre = resolveNombre(log.usuarioEmail, usuarios);
            return (
              <div key={log.id} style={{
                display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: style.bg, color: style.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: '1px',
                }}>
                  <Icon size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600 }}>{nombre}</span>
                    {' '}{style.verbo}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {timeAgo(log.fecha)}
                    </span>
                  </div>
                  {log.cambios && log.cambios.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {log.cambios.map((c, i) => (
                        <div key={i} style={{
                          fontSize: '12px', color: 'var(--text-muted)',
                          marginBottom: '2px', lineHeight: 1.35,
                        }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{c.campo}</span>
                          {': '}
                          <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{formatValue(c.antes)}</span>
                          {' → '}
                          <span style={{ color: style.color }}>{formatValue(c.despues)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
