import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, MapPin } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Planificacion({ data, setData }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [popover, setPopover] = useState(null); // { planId, obraId, day }

  const trabajadores = data?.trabajadores || [];
  const obras = (data?.obras || []).filter(o => o.estado !== 'finalizada');
  const planificacion = data?.planificacion || [];

  // Calculate current week days (Mon-Fri)
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

  // Get assignments for a specific obra+day
  const getAssignments = (obraId, day) => {
    return planificacion.filter(p => p.obraId === obraId && p.fecha === dayKey(day));
  };

  // Handle drop of a worker chip onto a cell
  const handleDrop = async (e, obraId, day) => {
    e.preventDefault();
    const trabajadorId = e.dataTransfer.getData('text/plain');
    const trab = trabajadores.find(t => t.id === trabajadorId);
    if (!trab) return;

    // Check if already assigned
    const existing = planificacion.find(p => p.obraId === obraId && p.fecha === dayKey(day) && p.trabajadorId === trabajadorId);
    if (existing) return;

    const id = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    await saveDoc('planificacion', id, {
      id, obraId, trabajadorId,
      trabajadorNombre: trab.nombre + (trab.apellidos ? ' ' + trab.apellidos : ''),
      fecha: dayKey(day),
      horas: 8,
      notas: ''
    });
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleRemoveAssignment = async (planId) => {
    await deleteDoc('planificacion', planId);
    setPopover(null);
  };

  const handleUpdateAssignment = async (planId, updates) => {
    const item = planificacion.find(p => p.id === planId);
    if (!item) return;
    await saveDoc('planificacion', planId, { ...item, ...updates });
  };

  // Worker colors
  const workerColor = (idx) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    return colors[idx % colors.length];
  };

  const weekLabel = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.getDate()}/${start.getMonth() + 1} — ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Planificación Semanal</h1>
          <p className="page-subtitle">Arrastra trabajadores a las celdas para asignarlos a obras por día.</p>
        </div>
      </header>

      {/* Week Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button className="icon-btn" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={18} /></button>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', minWidth: '200px', textAlign: 'center' }}>
          {weekLabel()}
        </div>
        <button className="icon-btn" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={18} /></button>
        {weekOffset !== 0 && (
          <button className="btn-secondary" onClick={() => setWeekOffset(0)} style={{ fontSize: '11px', padding: '4px 10px' }}>Hoy</button>
        )}
      </div>

      {/* Worker chips pool */}
      <div className="stat-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Equipo disponible — arrastra al tablero</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {trabajadores.length === 0 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>No hay trabajadores registrados</span>}
          {trabajadores.map((t, i) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
              style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: `${workerColor(i)}15`, color: workerColor(i),
                border: `1px solid ${workerColor(i)}40`,
                cursor: 'grab', userSelect: 'none', whiteSpace: 'nowrap'
              }}
            >
              {t.nombre} {t.apellidos ? t.apellidos.charAt(0) + '.' : ''}
              {t.rol && <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: '4px' }}>({t.rol})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Board: rows=obras, columns=days */}
      <div className="stat-card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="data-table" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ width: '180px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>Obra / Proyecto</th>
              {weekDays.map((d, i) => (
                <th key={i} style={{ textAlign: 'center', background: isToday(d) ? '#eff6ff' : undefined, minWidth: '140px' }}>
                  <div style={{ fontWeight: 700 }}>{dayNames[i]}</div>
                  <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>{d.getDate()}/{d.getMonth() + 1}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {obras.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No hay obras activas para planificar</td></tr>
            )}
            {obras.map(obra => (
              <tr key={obra.id}>
                <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                  <div>{obra.nombre}</div>
                  {obra.direccion && <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={10} />{obra.direccion}</div>}
                </td>
                {weekDays.map((day, di) => {
                  const assignments = getAssignments(obra.id, day);
                  return (
                    <td
                      key={di}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, obra.id, day)}
                      style={{
                        verticalAlign: 'top', padding: '8px',
                        background: isToday(day) ? '#f0f7ff' : undefined,
                        minHeight: '60px', position: 'relative',
                        border: '1px dashed #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {assignments.map(a => {
                          const tIdx = trabajadores.findIndex(t => t.id === a.trabajadorId);
                          const color = workerColor(tIdx >= 0 ? tIdx : 0);
                          return (
                            <div
                              key={a.id}
                              onClick={() => setPopover(popover?.planId === a.id ? null : { planId: a.id, obraId: obra.id, day })}
                              style={{
                                padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                                background: `${color}20`, color, border: `1px solid ${color}40`,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              {a.trabajadorNombre?.split(' ')[0]}
                              <span style={{ opacity: 0.6 }}>{a.horas}h</span>
                            </div>
                          );
                        })}
                        {assignments.length === 0 && (
                          <div style={{ fontSize: '10px', color: '#cbd5e1', fontStyle: 'italic', padding: '4px' }}>—</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popover for editing assignment */}
      {popover && (() => {
        const item = planificacion.find(p => p.id === popover.planId);
        if (!item) return null;
        return (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setPopover(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: '#fff', borderRadius: '12px', padding: '20px', width: '300px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', margin: 0 }}>{item.trabajadorNombre}</h3>
                <button className="icon-btn" onClick={() => setPopover(null)}><X size={16} /></button>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Horas asignadas</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {HOURS_OPTIONS.map(h => (
                    <button
                      key={h}
                      onClick={() => handleUpdateAssignment(item.id, { horas: h })}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: item.horas === h ? '#3b82f6' : '#f1f5f9',
                        color: item.horas === h ? '#fff' : '#64748b',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notas</label>
                <input
                  type="text"
                  value={item.notas || ''}
                  onChange={(e) => handleUpdateAssignment(item.id, { notas: e.target.value })}
                  placeholder="Tareas específicas..."
                  style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                />
              </div>
              <button
                onClick={() => handleRemoveAssignment(item.id)}
                style={{ width: '100%', padding: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Eliminar asignación
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
