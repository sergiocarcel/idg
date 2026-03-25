import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

export default function Clientes({ data, setData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editId, setEditId] = useState(null);
  
  const initialForm = { nombre: '', nif: '', telefono: '', email: '', direccion: '', notas: '' };
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px'}}>{c.direccion}</div>
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
                ['Dirección', selectedClient.direccion]
              ].map(([lbl, val]) => val && (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: lbl === 'Email' ? 'var(--accent)' : 'var(--text-main)', fontWeight: 500 }}>{val}</span>
                    {lbl === 'Teléfono' && val && (
                      <a href={`https://wa.me/34${val.replace(/\D/g,'')}?text=${encodeURIComponent('Hola '+selectedClient.nombre+', contactamos desde IDG CRM:')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', background: '#25D366', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textDecoration: 'none', fontWeight: 600, alignItems: 'center' }}>WhatsApp</a>
                    )}
                  </div>
                </div>
              ))}
              
              {selectedClient.notas && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '12px', lineHeight: '1.5' }}>
                  {selectedClient.notas}
                </div>
              )}
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
              <div className="form-group half-width">
                <label>Dirección</label>
                <input type="text" value={formData.direccion} onChange={handleInputChange('direccion')} placeholder="Calle, número, ciudad" />
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
