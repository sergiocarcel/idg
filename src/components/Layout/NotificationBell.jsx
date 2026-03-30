import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { updateDoc } from '../../services/db';

/**
 * Campana de notificaciones in-app.
 * Muestra un badge con el conteo de no leídas y un dropdown con las últimas notificaciones.
 *
 * Props:
 * - notificaciones: array de {id, tipo, mensaje, leida, fecha, link}
 * - onNavigate: callback(link) para navegar al recurso
 */
export default function NotificationBell({ notificaciones = [], onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const unread = notificaciones.filter(n => !n.leida).length;
  const sorted = [...notificaciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAsRead = async (notif) => {
    if (!notif.leida) {
      await updateDoc('notificaciones', notif.id, { leida: true });
    }
    if (notif.link && onNavigate) {
      onNavigate(notif.link);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const unreadItems = notificaciones.filter(n => !n.leida);
    for (const n of unreadItems) {
      await updateDoc('notificaciones', n.id, { leida: true });
    }
  };

  const tipoStyles = {
    alerta: { bg: '#fef2f2', color: '#dc2626' },
    info: { bg: '#eff6ff', color: '#2563eb' },
    exito: { bg: '#f0fdf4', color: '#16a34a' },
    aviso: { bg: '#fefce8', color: '#ca8a04' }
  };

  const timeAgo = (fecha) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center',
          color: 'var(--text-muted)', transition: 'background 0.2s'
        }}
        title="Notificaciones"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            background: '#dc2626', color: '#fff', borderRadius: '50%',
            width: '16px', height: '16px', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          width: '340px', maxHeight: '420px', background: '#fff',
          borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)', zIndex: 200,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Notificaciones</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Marcar todo leído
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 16px', fontSize: '13px' }}>
                No hay notificaciones
              </div>
            ) : (
              sorted.map(n => {
                const style = tipoStyles[n.tipo] || tipoStyles.info;
                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n)}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                      cursor: n.link ? 'pointer' : 'default',
                      background: n.leida ? 'transparent' : '#f8fafc',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: n.leida ? 'transparent' : style.color,
                      flexShrink: 0, marginTop: '5px'
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        {n.mensaje}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: style.bg, color: style.color, padding: '1px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '10px' }}>
                          {n.tipo?.toUpperCase() || 'INFO'}
                        </span>
                        {timeAgo(n.fecha)}
                        {n.link && <ExternalLink size={10} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
