import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, FolderOpen, Calendar, MapPin, User, Users } from 'lucide-react';
import { saveDoc, deleteDoc, updateDoc } from '../../services/db';
import { generatePresupuestoPdf } from '../../utils/pdfUtils';
import Gantt from './Gantt.jsx';
import CarpetaObra from './CarpetaObra.jsx';
import ActasModificacion from './ActasModificacion.jsx';
import CarpetaColaboradores from './CarpetaColaboradores.jsx';

export default function Obras({ data, setData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState(null);
  const [editId, setEditId] = useState(null);
  const [ganttModalObra, setGanttModalObra] = useState(null);
  const [carpetaObra, setCarpetaObra] = useState(null);
  const [actasObra, setActasObra] = useState(null);
  const [colabObra, setColabObra] = useState(null);

  const initialForm = {
    nombre: '', clienteId: '', direccion: '', inicio: '', fin: '',
    presupuestoId: '', avance: 0, estado: 'en_curso', responsable: '', notas: '', color: '#3b82f6'
  };
  const [formData, setFormData] = useState(initialForm);

  const obras = data?.obras || [];
  const clientes = data?.clientes || [];
  const presupuestos = data?.presupuestos || [];

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const generateId = (nombre) => {
    const slug = nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    return slug || 'OBR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) return alert('El nombre de la obra es obligatorio.');
    const docId = editId || generateId(formData.nombre);
    const previousObra = editId ? obras.find(o => o.id === editId) : null;
    const previousPresupuestoId = previousObra?.presupuestoId || null;
    const savedArchivos = formData.archivos || [];

    await saveDoc('obras', docId, { ...formData, id: docId });
    setIsModalOpen(false); // Cerrar modal antes de generar PDF para evitar interferencias CSS

    // Si se acaba de vincular un presupuesto (nuevo o cambiado), generar PDF dirección
    if (formData.presupuestoId && formData.presupuestoId !== previousPresupuestoId) {
      const ppto = presupuestos.find(p => p.id === formData.presupuestoId);
      if (ppto) {
        try {
          const { blob } = await generatePresupuestoPdf(ppto, data, 'direccion');
          const fd = new FormData();
          fd.append('file', blob, `Presupuesto_${ppto.id}_Direccion.pdf`);
          fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
          fd.append('folder', `obras/${docId}`);
          const uploaded = await fetch(
            `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
            { method: 'POST', body: fd }
          ).then(r => r.json());
          if (!uploaded.error) {
            const newFile = {
              id: Date.now().toString(),
              name: `Presupuesto_${ppto.id}_Direccion.pdf`,
              url: uploaded.secure_url,
              type: 'document',
              size: blob.size,
              date: new Date().toISOString()
            };
            // Eliminar PDF del presupuesto anterior si existía
            const archivosSinAnterior = savedArchivos.filter(
              f => f.name !== `Presupuesto_${previousPresupuestoId}_Direccion.pdf`
            );
            await updateDoc('obras', docId, { archivos: [newFile, ...archivosSinAnterior] });
          }
        } catch (_) {
          // No bloquear el guardado si falla la generación del PDF
        }
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar obra de forma permanente?")) return;
    await deleteDoc('obras', id);
    if (selectedObra?.id === id) setSelectedObra(null);
  };

  const openForm = (obra = null) => {
    if (obra) {
      setFormData(obra);
      setEditId(obra.id);
    } else {
      setFormData(initialForm);
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const getClientName = (id) => clientes.find(c => c.id === id)?.nombre || 'Sin cliente';
  const getPresupuestoId = (id) => presupuestos.find(p => p.id === id)?.id || 'Sin ppto.';

  const estadoBadge = (estado) => {
    const map = {
      'pendiente': { l: 'Pendiente', c: '#d97706', bg: '#fef3c7' },
      'en_curso': { l: 'En curso', c: '#2563eb', bg: '#dbeafe' },
      'paralizada': { l: 'Paralizada', c: '#dc2626', bg: '#fef2f2' },
      'finalizada': { l: 'Finalizada', c: '#16a34a', bg: '#dcfce7' },
    };
    const s = map[estado] || map.pendiente;
    return <span style={{ background: s.bg, color: s.c, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{s.l}</span>;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Obras y Proyectos</h1>
          <p className="page-subtitle">{obras.length} obras · {obras.filter(o => o.estado === 'en_curso').length} en curso</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={16} /> Nueva obra
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedObra ? '1fr 380px' : '1fr', gap: '24px', transition: 'all 0.3s' }}>

        {/* Tabla Obras */}
        <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Obra</th>
                <th>Cliente</th>
                <th>Periodo</th>
                <th>Avance</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {obras.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No hay obras registradas</td></tr>
              )}
              {obras.map(o => {
                const isSelected = selectedObra?.id === o.id;
                return (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedObra(isSelected ? null : o)}
                    className={isSelected ? 'selected-row' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '4px', height: '36px', borderRadius: '4px', background: o.color || '#2563eb', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.id} · {o.responsable || 'Sin responsable'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getClientName(o.clienteId)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <div>{o.inicio ? new Date(o.inicio).toLocaleDateString() : '—'}</div>
                      <div>{o.fin ? new Date(o.fin).toLocaleDateString() : '—'}</div>
                    </td>
                    <td style={{ width: '120px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e4e4e7', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${o.avance}%`, height: '100%', background: o.color || '#2563eb', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', width: '30px' }}>{o.avance}%</span>
                      </div>
                    </td>
                    <td>{estadoBadge(o.estado)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setGanttModalObra(o); }} title="Cronograma Gantt"><Calendar size={14} /></button>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openForm(o); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )}
              )}
            </tbody>
          </table>
        </div>

        {/* Panel Detalle Obra */}
        {selectedObra && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'modalIn 0.3s ease-out' }}>
            <div className="stat-card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>{selectedObra.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedObra.id}</div>
                </div>
                <button className="icon-btn" style={{ background: 'none' }} onClick={() => setSelectedObra(null)}><X size={18} /></button>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Avance del proyecto</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: selectedObra.color || '#2563eb' }}>{selectedObra.avance}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e4e4e7', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedObra.avance}%`, height: '100%', background: selectedObra.color || '#2563eb', transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Responsable</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedObra.responsable || 'No asignado'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dirección</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedObra.direccion || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plazos previstos</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedObra.inicio || '—'} a {selectedObra.fin || '—'}</div>
                    </div>
                  </div>
                </div>

                {selectedObra.notas && (
                  <div style={{ marginTop: '20px', padding: '12px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)', borderLeft: `3px solid ${selectedObra.color || '#2563eb'}` }}>
                    {selectedObra.notas}
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setGanttModalObra(selectedObra)}>
                    <Calendar size={14} /> Gantt
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCarpetaObra(selectedObra)}>
                    <FolderOpen size={14} /> Docs
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setActasObra(selectedObra)}>
                    <Edit2 size={14} /> Actas
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setColabObra(selectedObra)}>
                    <Users size={14} /> Colaboradores
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Formulario Obra */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Editar obra' : 'Nueva obra'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group full-width">
                <label>Nombre de la obra</label>
                <input type="text" value={formData.nombre} onChange={handleInputChange('nombre')} placeholder="Descripción del proyecto" autoFocus />
              </div>
              <div className="form-group half-width">
                <label>Cliente vinculado</label>
                <select value={formData.clienteId} onChange={handleInputChange('clienteId')}>
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Presupuesto</label>
                <select value={formData.presupuestoId} onChange={handleInputChange('presupuestoId')}>
                  <option value="">Sin presupuesto</option>
                  {presupuestos.filter(p => p.estado === 'aceptado').map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Responsable / Jefe de Obra</label>
                <input type="text" value={formData.responsable} onChange={handleInputChange('responsable')} placeholder="Nombre del encargado" />
              </div>
              <div className="form-group half-width">
                <label>Dirección</label>
                <input type="text" value={formData.direccion} onChange={handleInputChange('direccion')} placeholder="Ubicación de la obra" />
              </div>
              <div className="form-group half-width">
                <label>Fecha inicio</label>
                <input type="date" value={formData.inicio} onChange={handleInputChange('inicio')} />
              </div>
              <div className="form-group half-width">
                <label>Fecha fin prevista</label>
                <input type="date" value={formData.fin} onChange={handleInputChange('fin')} />
              </div>
              <div className="form-group half-width">
                <label>Estado</label>
                <select value={formData.estado} onChange={handleInputChange('estado')}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_curso">En curso</option>
                  <option value="paralizada">Paralizada</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              </div>
              <div className="form-group half-width">
                <label>Avance global (%)</label>
                <input type="number" min="0" max="100" value={formData.avance} onChange={handleInputChange('avance')} />
              </div>
               <div className="form-group half-width">
                <label>Color (Etiqueta Gantt)</label>
                <input type="color" value={formData.color} onChange={handleInputChange('color')} style={{ height: '42px', padding: '4px' }} />
              </div>
              <div className="form-group full-width">
                <label>Notas internas</label>
                <textarea value={formData.notas} onChange={handleInputChange('notas')} rows="3" placeholder="Información relevante..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>{editId ? 'Actualizar' : 'Guardar obra'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cronograma Gantt */}
      {ganttModalObra && (
        <Gantt obra={ganttModalObra} onClose={() => setGanttModalObra(null)} empresa={data?.config?.empresa} />
      )}

      {/* Modal Carpeta Obra (Firebase Storage) */}
      {carpetaObra && (
        <CarpetaObra obra={carpetaObra} data={data} setData={setData} onClose={() => setCarpetaObra(null)} />
      )}

      {actasObra && (
        <ActasModificacion obra={actasObra} onClose={() => setActasObra(null)} />
      )}

      {colabObra && (
        <CarpetaColaboradores obra={colabObra} data={data} onClose={() => setColabObra(null)} />
      )}
    </div>
  );
}
