import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, MapPin, Plus, UserPlus, Eye, Copy, Trash2, Info } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const OBRA_ESTADOS = [
  { value: 'en_curso', label: 'En curso' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'pendiente', label: 'Pendiente' },
];

const ESTADO_COLORS = {
  en_curso: '#16a34a',
  pausada: '#d97706',
  finalizada: '#64748b',
  pendiente: '#2563eb',
};

export default function Planificacion({ data, setData }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [popover, setPopover] = useState(null);
  const [obraModal, setObraModal] = useState(null); // obra object for detail modal
  const [showAddObra, setShowAddObra] = useState(false);
  const [showAddTrab, setShowAddTrab] = useState(false);
  const [obraForm, setObraForm] = useState({ nombre: '', clienteId: '', direccion: '', inicio: '', responsable: '', color: '#3b82f6' });
  const [trabForm, setTrabForm] = useState({ nombre: '', apellidos: '', rol: '', telefono: '' });

  const trabajadores = data?.trabajadores || [];
  const obras = data?.obras || [];
  const clientes = data?.clientes || [];
  const planificacion = data?.planificacion || [];

  // Semana actual (Lun-Vie)
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

  const getAssignments = (obraId, day) =>
    planificacion.filter(p => p.obraId === obraId && p.fecha === dayKey(day));

  const handleDrop = async (e, obraId, day) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    
    let isReassign = false;
    let payload = null;
    try {
      payload = JSON.parse(dataStr);
      isReassign = payload.type === 'reassign';
    } catch(err) {
      payload = dataStr; // workerId from pool
    }

    const targetDay = dayKey(day);

    if (isReassign) {
      const item = planificacion.find(p => p.id === payload.planId);
      if (!item) return;
      if (item.obraId === obraId && item.fecha === targetDay) return; // Mismo lugar
      
      const existingDest = planificacion.find(p => p.obraId === obraId && p.fecha === targetDay && p.trabajadorId === payload.trabajadorId && p.id !== item.id);
      if (existingDest) return alert('El trabajador ya está asignado a esa obra el día de destino.');

      await saveDoc('planificacion', item.id, { ...item, obraId, fecha: targetDay });
    } else {
      const trabajadorId = typeof payload === 'string' ? payload : null;
      if (!trabajadorId) return;
      const trab = trabajadores.find(t => t.id === trabajadorId);
      if (!trab) return;
      
      const existing = planificacion.find(p => p.obraId === obraId && p.fecha === targetDay && p.trabajadorId === trabajadorId);
      if (existing) return;
      
      const id = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      await saveDoc('planificacion', id, {
        id, obraId, trabajadorId,
        trabajadorNombre: trab.nombre + (trab.apellidos ? ' ' + trab.apellidos : ''),
        fecha: targetDay, horas: 8, notas: ''
      });
    }
  };

  const handleDuplicateAssignment = async (item, offsetDays) => {
    const newDate = new Date(item.fecha);
    newDate.setDate(newDate.getDate() + offsetDays);
    const newDayStr = newDate.toISOString().split('T')[0];
    
    const existing = planificacion.find(p => p.obraId === item.obraId && p.fecha === newDayStr && p.trabajadorId === item.trabajadorId);
    if(existing) return alert('El trabajador ya está asignado esa fecha en esta obra.');

    const newId = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    await saveDoc('planificacion', newId, { ...item, id: newId, fecha: newDayStr });
    setPopover(null);
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

  const workerColor = (idx) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    return colors[idx % colors.length];
  };

  const weekLabel = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.getDate()}/${start.getMonth() + 1} — ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };

  const handleSaveObra = async () => {
    if (!obraForm.nombre.trim()) return alert('El nombre de la obra es obligatorio');
    const id = 'OBR-' + Date.now();
    await saveDoc('obras', id, { ...obraForm, id, estado: 'en_curso', avance: 0, notas: '' });
    setObraForm({ nombre: '', clienteId: '', direccion: '', inicio: '', responsable: '', color: '#3b82f6' });
    setShowAddObra(false);
  };

  const handleSaveTrab = async () => {
    if (!trabForm.nombre.trim()) return alert('El nombre del trabajador es obligatorio');
    const id = 'TRB-' + Date.now();
    await saveDoc('trabajadores', id, { ...trabForm, id });
    setTrabForm({ nombre: '', apellidos: '', rol: '', telefono: '' });
    setShowAddTrab(false);
  };

  const handleDuplicateDay = async (sourceDay) => {
    if (!window.confirm(`¿Quieres duplicar las asignaciones de este día al siguiente día laborable?`)) return;

    const nextDate = new Date(sourceDay);
    if (nextDate.getDay() === 5) {
      nextDate.setDate(nextDate.getDate() + 3); // De Viernes a Lunes
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    const sourceDayStr = dayKey(sourceDay);
    const nextDayStr = dayKey(nextDate);

    const assignmentsToCopy = planificacion.filter(p => p.fecha === sourceDayStr);
    if (assignmentsToCopy.length === 0) return alert('No hay asignaciones para duplicar en este día.');
    
    let copias = 0;
    for (const item of assignmentsToCopy) {
      const existing = planificacion.find(p => p.obraId === item.obraId && p.fecha === nextDayStr && p.trabajadorId === item.trabajadorId);
      if (!existing) {
        // Necesitamos asegurar que el id sea único generándolo de nuevo
        const newId = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        await saveDoc('planificacion', newId, { ...item, id: newId, fecha: nextDayStr });
        copias++;
      }
    }
    
    if (copias > 0) alert(`Se han duplicado ${copias} asignaciones al siguiente día laborable.`);
    else alert('Todas las asignaciones ya existían en el día siguiente.');
  };

  const handleClearDay = async (targetDay) => {
    if (!window.confirm(`¿Estás seguro de que quieres borrar TODAS las asignaciones de este día?`)) return;

    const targetDayStr = dayKey(targetDay);
    const assignmentsToDelete = planificacion.filter(p => p.fecha === targetDayStr);
    
    if (assignmentsToDelete.length === 0) return alert('No hay asignaciones para borrar en este día.');

    let borradas = 0;
    for (const item of assignmentsToDelete) {
      await deleteDoc('planificacion', item.id);
      borradas++;
    }
    
    // Opcional: mostrar un pequeño mensaje temporal o nada, pero alertamos para dar feedback.
    // alert(`Se han borrado ${borradas} asignaciones del día.`);
  };

  const handleDuplicateWeek = async () => {
    if (!window.confirm('¿Quieres duplicar todas las asignaciones de esta semana a la semana siguiente?')) return;

    let copias = 0;
    for (const sourceDay of weekDays) {
      const sourceDayStr = dayKey(sourceDay);
      
      const nextDate = new Date(sourceDay);
      nextDate.setDate(nextDate.getDate() + 7);
      const nextDayStr = dayKey(nextDate);
      
      const assignmentsToCopy = planificacion.filter(p => p.fecha === sourceDayStr);
      
      for (const item of assignmentsToCopy) {
        const existing = planificacion.find(p => p.obraId === item.obraId && p.fecha === nextDayStr && p.trabajadorId === item.trabajadorId);
        if (!existing) {
          const newId = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
          await saveDoc('planificacion', newId, { ...item, id: newId, fecha: nextDayStr });
          copias++;
        }
      }
    }
    
    if (copias > 0) {
      alert(`Se han duplicado ${copias} asignaciones a la semana siguiente.`);
      setWeekOffset(w => w + 1);
    } else {
      alert('No hay asignaciones para duplicar o ya existen en la semana siguiente.');
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Planificación Semanal</h1>
          <p className="page-subtitle">Arrastra trabajadores a las celdas para asignarlos a obras por día.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowAddTrab(true)} style={{ fontSize: '12px' }}>
            <UserPlus size={14} /> Añadir Trabajador
          </button>
          <button className="btn-primary" onClick={() => setShowAddObra(true)} style={{ fontSize: '12px' }}>
            <Plus size={14} /> Añadir Obra
          </button>
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
        <button className="btn-secondary" onClick={handleDuplicateWeek} style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <Copy size={12} /> Duplicar semana sig.
        </button>
      </div>

      {/* Layout contenedor con flex para que Worker pool se quede arriba y la tabla tenga scroll interno */}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      
        {/* Worker chips pool */}
        <div className="stat-card" style={{ padding: '14px 18px', marginBottom: '20px', flexShrink: 0, zIndex: 10, background: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Equipo disponible — arrastra al tablero</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '130px', overflowY: 'auto', paddingRight: '8px', paddingBottom: '4px' }}>
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
        <div className="stat-card" style={{ padding: 0, flex: 1, overflow: 'auto', borderRadius: '12px', position: 'relative' }}>
          <table className="data-table" style={{ minWidth: '800px', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff' }}>
              <tr>
                <th style={{ width: '200px', position: 'sticky', left: 0, top: 0, background: '#f8fafc', zIndex: 25, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>Obra / Proyecto</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ textAlign: 'center', background: isToday(d) ? '#eff6ff' : '#f8fafc', minWidth: '140px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontWeight: 700 }}>{dayNames[i]}</div>
                      <button className="icon-btn" style={{ padding: '2px', color: '#64748b' }} onClick={() => handleDuplicateDay(d)} title="Duplicar al día siguiente">
                        <Copy size={12} />
                      </button>
                      <button className="icon-btn" style={{ padding: '2px', color: '#ef4444' }} onClick={() => handleClearDay(d)} title="Borrar asignaciones del día">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>{d.getDate()}/{d.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {obras.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No hay obras. Crea una con el botón "Añadir Obra".</td></tr>
              )}
              {obras.map(obra => (
                <tr key={obra.id} style={{ opacity: obra.estado === 'finalizada' ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)', position: 'sticky', left: 0, background: '#fff', zIndex: 15, borderRight: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            onClick={() => setObraModal(obra)}
                            style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                            title="Ver detalle"
                          >{obra.nombre}</span>
                          {obra.estado === 'finalizada' && <span style={{ fontSize: '9px', background: '#e2e8f0', color: '#64748b', padding: '1px 5px', borderRadius: '4px' }}>Finalizada</span>}
                        </div>
                        {obra.direccion && <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}><MapPin size={10} />{obra.direccion}</div>}
                      </div>
                    </div>
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
                          borderRight: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {assignments.map(a => {
                            const tIdx = trabajadores.findIndex(t => t.id === a.trabajadorId);
                            const color = workerColor(tIdx >= 0 ? tIdx : 0);
                            return (
                              <div
                                key={a.id}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reassign', planId: a.id, trabajadorId: a.trabajadorId }));
                                }}
                                onClick={(e) => { e.stopPropagation(); setPopover(popover?.planId === a.id ? null : { planId: a.id, obraId: obra.id, day }); }}
                                style={{
                                  padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                                  background: `${color}20`, color, border: `1px solid ${color}40`,
                                  cursor: 'grab', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none'
                                }}
                                title="Click para editar, arrastrar para reasignar a otro día/obra"
                              >
                                {a.trabajadorNombre?.split(' ')[0]}
                                <span style={{ opacity: 0.6 }}>{a.horas}h</span>
                                {a.notas && a.notas.trim() !== '' && (
                                  <div style={{ background: '#eab308', color: '#fff', borderRadius: '50%', padding: '2px', display: 'flex', marginLeft: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} title="Tiene notas">
                                    <Info size={10} strokeWidth={3} />
                                  </div>
                                )}
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
      </div>

      {/* Popover editar asignación */}
      {popover && (() => {
        const item = planificacion.find(p => p.id === popover.planId);
        if (!item) return null;
        
        const trab = trabajadores.find(t => t.id === item.trabajadorId);
        const costeBase = trab?.costeBase ? Number(trab.costeBase) : 0;
        const iva = trab?.iva ? Number(trab.iva) : 0;
        const costeTotalHora = costeBase * (1 + iva / 100);
        const costeTotalAsignacion = costeTotalHora * item.horas;

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

              {(costeTotalAsignacion > 0) && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Coste de esta jornada:</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    {costeTotalAsignacion.toFixed(2)} € 
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
                      ({item.horas}h × {costeTotalHora.toFixed(2)}€/h)
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => handleDuplicateAssignment(item, -1)} className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '11px' }} title="Duplicar para el día anterior">
                  ← Clonar ayer
                </button>
                <button onClick={() => handleDuplicateAssignment(item, 1)} className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '11px', color: '#16a34a', borderColor: '#bbf7d0' }} title="Duplicar para el día siguiente">
                  Clonar mañana →
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Horas asignadas</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {HOURS_OPTIONS.map(h => (
                    <button key={h} onClick={() => handleUpdateAssignment(item.id, { horas: h })}
                      style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: item.horas === h ? '#3b82f6' : '#f1f5f9', color: item.horas === h ? '#fff' : '#64748b', border: 'none', cursor: 'pointer' }}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notas</label>
                <input type="text" value={item.notas || ''} onChange={(e) => handleUpdateAssignment(item.id, { notas: e.target.value })}
                  placeholder="Tareas específicas..." style={{ width: '100%', padding: '8px', fontSize: '12px' }} />
              </div>
              <button onClick={() => handleRemoveAssignment(item.id)}
                style={{ width: '100%', padding: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                Eliminar asignación
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modal detalle de obra */}
      {obraModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setObraModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: '12px', padding: '24px', width: '420px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>{obraModal.nombre}</h3>
              <button className="icon-btn" onClick={() => setObraModal(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estado</span>
                <span style={{ fontWeight: 600, color: ESTADO_COLORS[obraModal.estado] || '#64748b' }}>
                  {OBRA_ESTADOS.find(e => e.value === obraModal.estado)?.label || obraModal.estado}
                </span>
              </div>
              {obraModal.responsable && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Responsable</span><span style={{ fontWeight: 600 }}>{obraModal.responsable}</span></div>}
              {obraModal.direccion && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Dirección</span><span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '200px' }}>{obraModal.direccion}</span></div>}
              {obraModal.inicio && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Inicio</span><span style={{ fontWeight: 600 }}>{new Date(obraModal.inicio).toLocaleDateString()}</span></div>}
              {typeof obraModal.avance === 'number' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ color: 'var(--text-muted)' }}>Avance</span><span style={{ fontWeight: 600 }}>{obraModal.avance}%</span></div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${obraModal.avance}%`, background: 'var(--accent)', borderRadius: '3px' }} />
                  </div>
                </div>
              )}
              {obraModal.notas && (
                <div style={{ marginTop: '4px', padding: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Notas</div>
                  <div style={{ color: '#78350f', whiteSpace: 'pre-wrap' }}>{obraModal.notas}</div>
                </div>
              )}
            </div>

            {/* Resumen de Mano de Obra */}
            {(() => {
              const asignacionesObra = planificacion.filter(p => p.obraId === obraModal.id);
              if (asignacionesObra.length === 0) return null;

              // Agrupar horas por trabajador
              const horasPorTrabajador = {};
              asignacionesObra.forEach(a => {
                if (!horasPorTrabajador[a.trabajadorId]) {
                  horasPorTrabajador[a.trabajadorId] = 0;
                }
                horasPorTrabajador[a.trabajadorId] += (Number(a.horas) || 0);
              });

              let totalCosteGeneral = 0;
              const lineasResumen = Object.entries(horasPorTrabajador).map(([tId, horasTotales]) => {
                const trab = trabajadores.find(t => t.id === tId);
                const nombre = trab ? `${trab.nombre} ${trab.apellidos || ''}`.trim() : 'Desconocido';
                const costeBase = trab?.costeBase ? Number(trab.costeBase) : 0;
                const iva = trab?.iva ? Number(trab.iva) : 0;
                const costeHora = costeBase * (1 + iva / 100);
                const costeTotal = costeHora * horasTotales;
                totalCosteGeneral += costeTotal;
                
                return { nombre, horasTotales, costeHora, costeTotal };
              });

              return (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-main)' }}>Resumen de Mano de Obra</h4>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ paddingBottom: '6px' }}>Trabajador</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'center' }}>Horas</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Coste/h</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineasResumen.map((l, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px dashed var(--border)' }}>
                          <td style={{ padding: '6px 0', fontWeight: 500, color: 'var(--text-main)' }}>{l.nombre}</td>
                          <td style={{ padding: '6px 0', textAlign: 'center' }}>{l.horasTotales}h</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--text-muted)' }}>{l.costeHora.toFixed(2)}€</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{l.costeTotal.toFixed(2)}€</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ paddingTop: '10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Coste General:</td>
                        <td style={{ paddingTop: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '12px' }}>{totalCosteGeneral.toFixed(2)}€</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal añadir obra */}
      {showAddObra && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Añadir Obra</h2>
              <button className="icon-btn" onClick={() => setShowAddObra(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Nombre *</label><input className="form-input" value={obraForm.nombre} onChange={e => setObraForm({ ...obraForm, nombre: e.target.value })} placeholder="Nombre de la obra" /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Cliente</label>
                <select className="form-input" value={obraForm.clienteId} onChange={e => setObraForm({ ...obraForm, clienteId: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Dirección</label><input className="form-input" value={obraForm.direccion} onChange={e => setObraForm({ ...obraForm, direccion: e.target.value })} placeholder="Dirección de la obra" /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Fecha inicio</label><input type="date" className="form-input" value={obraForm.inicio} onChange={e => setObraForm({ ...obraForm, inicio: e.target.value })} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Responsable</label><input className="form-input" value={obraForm.responsable} onChange={e => setObraForm({ ...obraForm, responsable: e.target.value })} placeholder="Nombre del responsable" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddObra(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveObra}>Crear Obra</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir trabajador */}
      {showAddTrab && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h2>Añadir Trabajador</h2>
              <button className="icon-btn" onClick={() => setShowAddTrab(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Nombre *</label><input className="form-input" value={trabForm.nombre} onChange={e => setTrabForm({ ...trabForm, nombre: e.target.value })} placeholder="Nombre" /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Apellidos</label><input className="form-input" value={trabForm.apellidos} onChange={e => setTrabForm({ ...trabForm, apellidos: e.target.value })} placeholder="Apellidos" /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Rol / Oficio</label><input className="form-input" value={trabForm.rol} onChange={e => setTrabForm({ ...trabForm, rol: e.target.value })} placeholder="Ej: Electricista, Fontanero..." /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600 }}>Teléfono</label><input className="form-input" value={trabForm.telefono} onChange={e => setTrabForm({ ...trabForm, telefono: e.target.value })} placeholder="612 345 678" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddTrab(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveTrab}>Añadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
