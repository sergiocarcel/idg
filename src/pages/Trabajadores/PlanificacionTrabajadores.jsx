import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, MapPin } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function PlanificacionTrabajadores({ data }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [popover, setPopover] = useState(null); // { planId }

  const trabajadores = data?.trabajadores || [];
  const obras = data?.obras || [];
  const planificacion = data?.planificacion || [];

  // Cálculo de la semana actual (Lun-Vie)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const dayKey = (d) => d.toISOString().split('T')[0];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const isToday = (d) => dayKey(d) === dayKey(today);

  const weekLabel = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.getDate()}/${start.getMonth() + 1} — ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };

  // Color por obra (mismo palette que el módulo Planificación)
  const obraColor = (obraId) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    const idx = obras.findIndex(o => o.id === obraId);
    return colors[(idx >= 0 ? idx : 0) % colors.length];
  };

  // Asignaciones de un trabajador en un día concreto
  const getAssignments = (trabajadorId, day) =>
    planificacion.filter(p => p.trabajadorId === trabajadorId && p.fecha === dayKey(day));

  // Total horas en la semana para un trabajador
  const weekTotal = (trabajadorId) =>
    weekDays.reduce((sum, day) => sum + getAssignments(trabajadorId, day).reduce((s, a) => s + (a.horas || 0), 0), 0);

  const handleUpdateAssignment = async (planId, updates) => {
    const item = planificacion.find(p => p.id === planId);
    if (!item) return;
    await saveDoc('planificacion', planId, { ...item, ...updates });
  };

  const handleRemoveAssignment = async (planId) => {
    await deleteDoc('planificacion', planId);
    setPopover(null);
  };

  const popoverItem = popover ? planificacion.find(p => p.id === popover.planId) : null;

  return (
    <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* Cabecera y navegación */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', margin: 0 }}>Planificación por Obras</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="icon-btn" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={16} /></button>
          <div style={{ fontSize: '13px', fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>{weekLabel()}</div>
          <button className="icon-btn" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={16} /></button>
          {weekOffset !== 0 && (
            <button className="btn-secondary" onClick={() => setWeekOffset(0)} style={{ fontSize: '11px', padding: '4px 10px' }}>Hoy</button>
          )}
        </div>
      </div>

      {/* Tabla trabajador × día */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: '750px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>Trabajador</th>
              {weekDays.map((d, i) => (
                <th key={i} style={{ textAlign: 'center', background: isToday(d) ? '#eff6ff' : undefined, minWidth: '120px' }}>
                  <div style={{ fontWeight: 700 }}>{dayNames[i]}</div>
                  <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>{d.getDate()}/{d.getMonth() + 1}</div>
                </th>
              ))}
              <th style={{ textAlign: 'center', width: '70px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <Clock size={12} style={{ display: 'block', margin: '0 auto 2px' }} />Total
              </th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No hay trabajadores registrados
                </td>
              </tr>
            )}
            {trabajadores.map(trab => {
              const total = weekTotal(trab.id);
              return (
                <tr key={trab.id}>
                  {/* Nombre trabajador */}
                  <td style={{ fontWeight: 600, fontSize: '12px', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                    <div>{trab.nombre} {trab.apellidos ? trab.apellidos.charAt(0) + '.' : ''}</div>
                    {trab.rol && <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>{trab.rol}</div>}
                  </td>

                  {/* Celdas por día */}
                  {weekDays.map((day, di) => {
                    const assignments = getAssignments(trab.id, day);
                    return (
                      <td key={di} style={{
                        verticalAlign: 'top', padding: '6px',
                        background: isToday(day) ? '#f0f7ff' : undefined,
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {assignments.map(a => {
                            const color = obraColor(a.obraId);
                            const obraNombre = obras.find(o => o.id === a.obraId)?.nombre || a.obraId;
                            return (
                              <div
                                key={a.id}
                                onClick={() => setPopover(popover?.planId === a.id ? null : { planId: a.id })}
                                title={obraNombre}
                                style={{
                                  padding: '3px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                                  background: `${color}18`, color, border: `1px solid ${color}35`,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px'
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{obraNombre.length > 12 ? obraNombre.slice(0, 12) + '…' : obraNombre}</span>
                                <span style={{ opacity: 0.7, flexShrink: 0 }}>{a.horas}h</span>
                              </div>
                            );
                          })}
                          {assignments.length === 0 && (
                            <div style={{ fontSize: '10px', color: '#cbd5e1', padding: '3px 4px' }}>—</div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Total horas */}
                  <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: total > 0 ? 700 : 400, color: total > 0 ? 'var(--text-main)' : '#cbd5e1' }}>
                    {total > 0 ? `${total}h` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota informativa */}
      <div style={{ padding: '10px 20px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
        <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
        Para asignar trabajadores a obras usa el módulo <strong>Planificación Semanal</strong> del menú principal.
      </div>

      {/* Popover editar asignación */}
      {popover && popoverItem && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setPopover(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: '12px', padding: '20px', width: '300px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', margin: 0 }}>{popoverItem.trabajadorNombre}</h3>
              <button className="icon-btn" onClick={() => setPopover(null)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} />
              {obras.find(o => o.id === popoverItem.obraId)?.nombre || popoverItem.obraId}
              <span style={{ marginLeft: '4px' }}>— {popoverItem.fecha}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Horas asignadas</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {HOURS_OPTIONS.map(h => (
                  <button
                    key={h}
                    onClick={() => handleUpdateAssignment(popoverItem.id, { horas: h })}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      background: popoverItem.horas === h ? '#3b82f6' : '#f1f5f9',
                      color: popoverItem.horas === h ? '#fff' : '#64748b',
                      border: 'none', cursor: 'pointer'
                    }}
                  >{h}h</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notas</label>
              <input
                type="text"
                value={popoverItem.notas || ''}
                onChange={(e) => handleUpdateAssignment(popoverItem.id, { notas: e.target.value })}
                placeholder="Tareas específicas..."
                style={{ width: '100%', padding: '8px', fontSize: '12px' }}
              />
            </div>
            <button
              onClick={() => handleRemoveAssignment(popoverItem.id)}
              style={{ width: '100%', padding: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              Eliminar asignación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
