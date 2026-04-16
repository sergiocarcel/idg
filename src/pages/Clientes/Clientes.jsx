import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

export default function Clientes({ data, setData }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editId, setEditId] = useState(null);
  
  const initialForm = { nombre: '', nif: '', telefono: '', email: '', direccion: '', codigoPostal: '', poblacion: '', provincia: '', pais: 'España', notas: '' };
  const [formData, setFormData] = useState(initialForm);

  const clientes = data?.clientes || [];
  const obras = data?.obras || [];

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const generateId = () => 'CLI-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  const handleSave = async () => {
    const docId = editId || generateId();
    await saveDoc('clientes', docId, { ...formData, id: docId });
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar cliente de forma permanente?")) return;
    await deleteDoc('clientes', id);
    if(selectedClient?.id === id) setSelectedClient(null);
  };

  const openForm = (client = null) => {
    if (client) {
      setFormData(client);
      setEditId(client.id);
    } else {
      setFormData(initialForm);
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const getClientStats = (clientId) => {
    return {
      obras: obras.filter(o => o.clienteId === clientId).length
    };
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 360px' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
        
        <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>NIF</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Obras</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 && (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'24px', color:'#94a3b8'}}>No hay clientes registrados</td></tr>
              )}
              {clientes.map(c => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedClient(isSelected ? null : c)}
                    className={isSelected ? 'selected-row' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)'}}>{c.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px'}}>{[c.direccion, c.codigoPostal, c.poblacion, c.provincia, c.pais].filter(Boolean).join(', ')}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.nif}</td>
                    <td>{c.telefono}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 500 }}>{c.email}</td>
                    <td>{getClientStats(c.id).obras} obra{getClientStats(c.id).obras !== 1 ? 's' : ''}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openForm(c); }}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )}
              )}
            </tbody>
          </table>
        </div>

        {selectedClient && (
          <div className="stat-card" style={{ alignSelf: 'start', padding: 0, animation: 'modalIn 0.3s ease-out' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedClient.nombre}</div>
              <button className="icon-btn" style={{ background: 'none' }} onClick={() => setSelectedClient(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              {[
                ['NIF', selectedClient.nif],
                ['Teléfono', selectedClient.telefono],
                ['Email', selectedClient.email],
                ['Dirección', [selectedClient.direccion, selectedClient.codigoPostal, selectedClient.poblacion, selectedClient.provincia, selectedClient.pais].filter(Boolean).join(', ')]
              ].map(([lbl, val]) => val && (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: lbl === 'Email' ? 'var(--accent)' : 'var(--text-main)', fontWeight: 500 }}>{val}</span>
                    {lbl === 'Teléfono' && val && (
                      <a href={`https://wa.me/34${val.replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+selectedClient.nombre+', contactamos desde '+(import.meta.env.VITE_APP_NAME || 'CRM')+':')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', background: '#25D366', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textDecoration: 'none', fontWeight: 600, alignItems: 'center' }}>WhatsApp</a>
                    )}
                  </div>
                </div>
              ))}
              
              {selectedClient.notas && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px', lineHeight: '1.5' }}>
                  {selectedClient.notas}
                </div>
              )}

              {/* Obras Vinculadas */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Proyectos Vinculados
                  <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' }}>
                    {data?.obras?.filter(o => o.clienteId === selectedClient.id).length || 0}
                  </span>
                </h4>
                {data?.obras?.filter(o => o.clienteId === selectedClient.id).length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Este cliente no tiene obras registradas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.obras.filter(o => o.clienteId === selectedClient.id).map(o => (
                      <div key={o.id} onClick={() => navigate('/obras')} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor='#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{o.nombre}</div>
                        <div style={{ color: '#64748b', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{new Date(o.fechaCreacion || Date.now()).toLocaleDateString()}</span>
                          <span style={{ color: o.estado === 'activa' ? '#16a34a' : '#64748b', fontWeight: 500 }}>{o.estado?.toUpperCase() || 'ACTIVA'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Presupuestos Vinculados */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Historial de Presupuestos
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' }}>
                    {data?.presupuestos?.filter(p => p.clienteId === selectedClient.id).length || 0}
                  </span>
                </h4>
                {data?.presupuestos?.filter(p => p.clienteId === selectedClient.id).length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No existen presupuestos asociados.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {data.presupuestos.filter(p => p.clienteId === selectedClient.id).map(p => {
                      const total = p.capitulos?.reduce((sum, cap) => sum + cap.partidas.reduce((s, pt) => s + (pt.cantidad * pt.precioVenta), 0), 0) || 0;
                      return (
                        <div key={p.id} onClick={() => navigate('/presupuestos')} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor='#d97706'} onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.id}</div>
                            <div style={{ color: '#64748b', marginTop: '2px' }}>{new Date(p.fecha).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                            </div>
                            <div style={{ fontSize: '10px', marginTop: '2px', color: p.estado === 'aceptado' ? '#16a34a' : (p.estado === 'rechazado' ? '#ef4444' : '#d97706'), fontWeight: 600 }}>
                              {p.estado.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Nombre completo</label>
                <input type="text" value={formData.nombre} onChange={handleInputChange('nombre')} placeholder="Nombre del cliente" autoFocus />
              </div>
              <div className="form-group half-width">
                <label>NIF/CIF</label>
                <input type="text" value={formData.nif} onChange={handleInputChange('nif')} placeholder="12345678A" />
              </div>
              <div className="form-group half-width">
                <label>Teléfono</label>
                <input type="text" value={formData.telefono} onChange={handleInputChange('telefono')} placeholder="612 000 000" />
              </div>
              <div className="form-group half-width">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={handleInputChange('email')} placeholder="email@cliente.es" />
              </div>
              <div className="form-group full-width" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px' }}>Datos de Dirección</h4>
              </div>
              <div className="form-group full-width">
                <label>Dirección (Calle, número, puerta)</label>
                <input type="text" value={formData.direccion} onChange={handleInputChange('direccion')} placeholder="Ej: C/ Mayor, 12, 3ºA" />
              </div>
              <div className="form-group half-width">
                <label>Código Postal</label>
                <input type="text" value={formData.codigoPostal || ''} onChange={handleInputChange('codigoPostal')} placeholder="Ej: 28001" />
              </div>
              <div className="form-group half-width">
                <label>Población</label>
                <input type="text" value={formData.poblacion || ''} onChange={handleInputChange('poblacion')} placeholder="Ej: Madrid" />
              </div>
              <div className="form-group half-width">
                <label>Provincia</label>
                <input type="text" value={formData.provincia || ''} onChange={handleInputChange('provincia')} placeholder="Ej: Madrid" />
              </div>
              <div className="form-group half-width">
                <label>País</label>
                <input type="text" value={formData.pais || ''} onChange={handleInputChange('pais')} placeholder="Ej: España" />
              </div>
              <div className="form-group full-width">
                <label>Notas / Observaciones</label>
                <textarea value={formData.notas} onChange={handleInputChange('notas')} rows="3" placeholder="Información adicional..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>{editId ? 'Actualizar' : 'Guardar cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
