import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, X, Trash2, ExternalLink } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function NotificationBell({ notificaciones = [], onNavigate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const ref = useRef(null);

  const { sorted, unread } = useMemo(() => ({
    sorted: [...notificaciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    unread: notificaciones.filter(n => !n.leida).length,
  }), [notificaciones]);
  const visible = useMemo(
    () => (soloNoLeidas ? sorted.filter(n => !n.leida) : sorted).slice(0, 20),
    [sorted, soloNoLeidas]
  );

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
    await Promise.all(unreadItems.map(n => updateDoc('notificaciones', n.id, { leida: true })));
  };

  const handleDelete = (e, notif) => {
    e.stopPropagation();
    if (onDelete) onDelete(notif);
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
          width: '340px', maxHeight: '460px', background: '#fff',
          borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)', zIndex: 200,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              Notificaciones {unread > 0 && <span style={{ color: '#dc2626', fontSize: '12px' }}>({unread})</span>}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setSoloNoLeidas(v => !v)}
                style={{
                  background: soloNoLeidas ? 'var(--accent)' : 'none',
                  color: soloNoLeidas ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: '4px',
                  fontSize: '10px', cursor: 'pointer', padding: '2px 6px', fontWeight: 600
                }}
              >
                No leídas
              </button>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Leer todo
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 16px', fontSize: '13px' }}>
                {soloNoLeidas ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </div>
            ) : (
              visible.map(n => {
                const style = tipoStyles[n.tipo] || tipoStyles.info;
                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n)}
                    style={{
                      padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
                      cursor: n.link ? 'pointer' : 'default',
                      background: n.leida ? 'transparent' : '#f8fafc',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      transition: 'background 0.15s', position: 'relative'
                    }}
                    className="notif-row"
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
                    <button
                      onClick={(e) => handleDelete(e, n)}
                      title="Eliminar"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '2px', opacity: 0.5,
                        flexShrink: 0, marginTop: '2px', borderRadius: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      <Trash2 size={12} />
                    </button>
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
