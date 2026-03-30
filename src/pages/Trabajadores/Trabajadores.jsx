import React, { useState } from 'react';
import { Plus, Clock, Briefcase, Calendar as CalIcon, User, Search, MapPin, UserPlus, Edit2, Trash2, X } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';
import PlanificacionTrabajadores from './PlanificacionTrabajadores.jsx';

export default function Trabajadores({ data, setData }) {
  const [activeTab, setActiveTab] = useState('directorio'); // 'directorio', 'horas' o 'planificacion'
  const [filterText, setFilterText] = useState('');
  const [horasForm, setHorasForm] = useState({ trabajador: '', fecha: new Date().toISOString().split('T')[0], horas: '', concepto: '', obraId: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', apellidos: '', rol: '', telefono: '', dni: '', comentarios: '' });
  const [editingId, setEditingId] = useState(null);

  const trabajadores = data?.trabajadores || [];
  const registroHoras = data?.registroHoras || [];
  const obras = data?.obras || [];

  const getObraName = (id) => obras.find(o => o.id === id)?.nombre || 'Varios / Taller';

  const horasFiltradas = registroHoras.filter(h => 
    h.trabajador.toLowerCase().includes(filterText.toLowerCase()) || 
    h.concepto.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gestión de Equipo</h1>
          <p className="page-subtitle">Control de horas extras y asignación a proyectos.</p>
        </div>
      </header>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('directorio')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'directorio' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'directorio' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeTab === 'directorio' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <User size={16} /> Directorio de Personal
        </button>
        <button 
          onClick={() => setActiveTab('horas')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'horas' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'horas' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeTab === 'horas' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={16} /> Horas Extras y Partes
        </button>
        <button 
          onClick={() => setActiveTab('planificacion')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'planificacion' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'planificacion' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeTab === 'planificacion' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <CalIcon size={16} /> Planificación por Obras
        </button>
      </div>

      {activeTab === 'directorio' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Plantilla ({trabajadores.length})</h3>
            <button className="btn-primary" onClick={() => { setFormData({ nombre: '', apellidos: '', rol: '', telefono: '', dni: '', comentarios: '' }); setEditingId(null); setIsModalOpen(true); }}>
              <UserPlus size={16} /> Añadir Trabajador
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {trabajadores.map(t => (
              <div key={t.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#64748b', fontSize: '16px' }}>
                  {t.nombre?.charAt(0) || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>{t.nombre} {t.apellidos || ''}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{t.rol || 'Operario'}</div>
                  {t.comentarios && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>{t.comentarios}</div>}
                  {(t.telefono || t.dni) && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {t.telefono && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span>📞 {t.telefono}</span>
                          <a href={`https://wa.me/34${t.telefono.replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+t.nombre+', ')}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '2px 6px', borderRadius: '8px', textDecoration: 'none', fontSize: '10px', fontWeight: 600 }}>WA</a>
                        </div>
                      )}
                      {t.dni && <span>🆔 {t.dni}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button className="icon-btn" onClick={() => { setFormData(t); setEditingId(t.id); setIsModalOpen(true); }}><Edit2 size={14} /></button>
                  <button className="icon-btn danger" onClick={async () => {
                    if(window.confirm('¿Eliminar a este trabajador?')) {
                      await deleteDoc('trabajadores', t.id);
                    }
                  }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'horas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
          
          <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', background: '#fafafa' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o concepto..." 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>
            
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Horas</th>
                  <th>Concepto / Obra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {horasFiltradas.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay registros de horas extras en este periodo.</td></tr>
                )}
                {horasFiltradas.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                          {h.trabajador.charAt(0)}
                        </div>
                        {h.trabajador}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{new Date(h.fecha).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{h.horas} h</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{h.concepto}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getObraName(h.obraId)}</div>
                    </td>
                    <td>
                      <span style={{ background: h.aprobado ? '#dcfce7' : '#fef3c7', color: h.aprobado ? '#16a34a' : '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {h.aprobado ? 'Aprobado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignSelf: 'start' }}>
            {/* Resumen por trabajador */}
            <div className="stat-card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Resumen Horas Extra</h3>
              {(() => {
                const resumen = {};
                registroHoras.forEach(h => {
                  if (!resumen[h.trabajador]) resumen[h.trabajador] = 0;
                  resumen[h.trabajador] += Number(h.horas) || 0;
                });
                const entries = Object.entries(resumen).sort((a, b) => b[1] - a[1]);
                return entries.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Sin registros.</div>
                ) : entries.map(([nombre, total]) => (
                  <div key={nombre} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{nombre}</span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>{total} h</span>
                  </div>
                ));
              })()}
            </div>

            {/* Formulario nuevo registro */}
            <div className="stat-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} className="text-blue-500" /> Nuevo Registro
              </h3>
              <div className="form-group full-width" style={{ marginBottom: '12px' }}>
                <label>Trabajador</label>
                <select value={horasForm.trabajador} onChange={e => setHorasForm({...horasForm, trabajador: e.target.value})}>
                  <option value="">Selecciona trabajador...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.nombre}>{t.nombre} {t.apellidos || ''}</option>)}
                </select>
              </div>
              <div className="form-group full-width" style={{ marginBottom: '12px' }}>
                <label>Fecha</label>
                <input type="date" value={horasForm.fecha} onChange={e => setHorasForm({...horasForm, fecha: e.target.value})} />
              </div>
              <div className="form-group full-width" style={{ marginBottom: '12px' }}>
                <label>Cant. Horas (Extra)</label>
                <input type="number" step="0.5" placeholder="Ej: 2.5" value={horasForm.horas} onChange={e => setHorasForm({...horasForm, horas: e.target.value})} />
              </div>
              <div className="form-group full-width" style={{ marginBottom: '12px' }}>
                <label>Concepto</label>
                <input type="text" placeholder="Ej: Descarga material fuera de hora" value={horasForm.concepto} onChange={e => setHorasForm({...horasForm, concepto: e.target.value})} />
              </div>
              <div className="form-group full-width" style={{ marginBottom: '24px' }}>
                <label>Asociar a Obra (Opcional)</label>
                <select value={horasForm.obraId} onChange={e => setHorasForm({...horasForm, obraId: e.target.value})}>
                  <option value="">Sin obra específica</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => {
                if (!horasForm.trabajador || !horasForm.horas) return alert('Selecciona trabajador y horas');
                const id = 'HR-' + Date.now();
                await saveDoc('registroHoras', id, { ...horasForm, id, horas: Number(horasForm.horas), aprobado: false });
                setHorasForm({ trabajador: '', fecha: new Date().toISOString().split('T')[0], horas: '', concepto: '', obraId: '' });
              }}>Registrar Horas</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planificacion' && (
        <PlanificacionTrabajadores data={data} />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Trabajador' : 'Añadir Trabajador'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group half-width">
                <label>Nombre</label>
                <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} autoFocus />
              </div>
              <div className="form-group half-width">
                <label>Apellidos</label>
                <input type="text" value={formData.apellidos || ''} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Rol / Cargo (Ej: Oficial 1ª, Jefe de Obra)</label>
                <input type="text" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} />
              </div>
              <div className="form-group half-width">
                <label>Teléfono</label>
                <input type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} />
              </div>
              <div className="form-group half-width">
                <label>DNI / NIE</label>
                <input type="text" value={formData.dni || ''} onChange={e => setFormData({...formData, dni: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Comentarios</label>
                <textarea rows={3} value={formData.comentarios || ''} onChange={e => setFormData({...formData, comentarios: e.target.value})} placeholder="Notas internas sobre el trabajador..." style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={async () => {
                if(!formData.nombre.trim()) return alert('El nombre es obligatorio');
                const docId = editingId || ('TRB-' + Date.now());
                await saveDoc('trabajadores', docId, { ...formData, id: docId });
                setIsModalOpen(false);
              }}>Guardar Trabajador</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
