import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, MapPin, Plus, UserPlus, Eye } from 'lucide-react';
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
    const trabajadorId = e.dataTransfer.getData('text/plain');
    const trab = trabajadores.find(t => t.id === trabajadorId);
    if (!trab) return;
    const existing = planificacion.find(p => p.obraId === obraId && p.fecha === dayKey(day) && p.trabajadorId === trabajadorId);
    if (existing) return;
    const id = 'PLN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    await saveDoc('planificacion', id, {
      id, obraId, trabajadorId,
      trabajadorNombre: trab.nombre + (trab.apellidos ? ' ' + trab.apellidos : ''),
      fecha: dayKey(day), horas: 8, notas: ''
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
              <th style={{ width: '200px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>Obra / Proyecto</th>
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
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No hay obras. Crea una con el botón "Añadir Obra".</td></tr>
            )}
            {obras.map(obra => (
              <tr key={obra.id} style={{ opacity: obra.estado === 'finalizada' ? 0.5 : 1 }}>
                <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
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

      {/* Popover editar asignación */}
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
            background: '#fff', borderRadius: '12px', padding: '24px', width: '360px',
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
