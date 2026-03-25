import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Package, ExternalLink, X } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

export default function Proveedores({ data, setData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvId, setSelectedProvId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null); // Para ver detalle del proveedor

  const formDataInitial = {
    empresa: '', especialidad: '', contacto: '', telefono: '', email: '', plazo: '', pago: '', notas: ''
  };
  const [formData, setFormData] = useState(formDataInitial);

  const proveedores = data?.proveedores || [];
  const materiales = data?.materiales || []; // Para ver cuántos materiales nos sirve

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSave = async () => {
    const docId = selectedProvId || ('PROV-' + Date.now());
    await saveDoc('proveedores', docId, { ...formData, id: docId });
    setIsModalOpen(false);
    if(selectedDetail && selectedDetail.id === docId) {
      setSelectedDetail({ ...formData, id: docId });
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este proveedor de la agenda corporativa?')) {
      await deleteDoc('proveedores', id);
      if(selectedDetail?.id === id) setSelectedDetail(null);
    }
  };

  const getMaterialsCount = (provId) => materiales.filter(m => m.proveedorId === provId).length;

  const getAvatarColor = (name) => {
    const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Directorio de Proveedores</h1>
          <p className="page-subtitle">Agenda de suministros, marcas y contactos de almacén.</p>
        </div>
        <button className="btn-primary" onClick={() => { setFormData(formDataInitial); setSelectedProvId(null); setIsModalOpen(true); }}>
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDetail ? '1fr 360px' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Grid de tarjetas */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedDetail ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {proveedores.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>No hay proveedores registrados.</div>
          )}
          {proveedores.map(p => {
            const isSelected = selectedDetail?.id === p.id;
            const color = getAvatarColor(p.empresa);
            return (
              <div 
                key={p.id} 
                onClick={() => setSelectedDetail(isSelected ? null : p)}
                style={{ background: '#fff', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontWeight: 700, fontSize: '14px' }}>
                      {p.empresa?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{p.empresa}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.especialidad || 'Suministros varios'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setFormData(p); setSelectedProvId(p.id); setIsModalOpen(true); }}><Edit2 size={12} /></button>
                    <button className="icon-btn danger" onClick={(e) => handleDelete(p.id, e)}><Trash2 size={12} /></button>
                  </div>
                </div>

                <div style={{ fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Contacto</span> <span style={{ fontWeight: 500 }}>{p.contacto || '—'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Teléfono</span> <span style={{ color: '#2563eb' }}>{p.telefono || '—'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Plazo medio</span> <span>{p.plazo || '—'}</span></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel lateral detalle */}
        {selectedDetail && (
          <div className="stat-card" style={{ padding: 0, alignSelf: 'start', position: 'sticky', top: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedDetail.empresa}</div>
              <button className="icon-btn" onClick={() => setSelectedDetail(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} className="text-slate-400" /> <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{selectedDetail.telefono || 'Sin teléfono'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} className="text-slate-400" /> <span style={{ color: '#2563eb' }}>{selectedDetail.email || 'Sin email'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={14} className="text-slate-400" /> <span>Plazo: {selectedDetail.plazo || 'No definido'}</span></div>
                
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Forma de pago:</span>
                  <span style={{ fontWeight: 600 }}>{selectedDetail.pago || '—'}</span>
                </div>

                {selectedDetail.notas && (
                  <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', marginTop: '8px', fontSize: '12px', lineHeight: 1.5 }}>
                    <strong>Notas:</strong> {selectedDetail.notas}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Materiales vinculados ({getMaterialsCount(selectedDetail.id)})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {materiales.filter(m => m.proveedorId === selectedDetail.id).map(m => (
                     <div key={m.id} style={{ fontSize: '12px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                       <span>{m.nombre}</span>
                       <span style={{ fontWeight: 600, color: m.stock === 0 ? '#dc2626' : 'var(--text-main)' }}>{m.stock} uds</span>
                     </div>
                  ))}
                  {getMaterialsCount(selectedDetail.id) === 0 && <span style={{fontSize:'12px', color:'var(--text-muted)'}}>No le compras ningún material actualmente.</span>}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{selectedProvId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group half-width">
                <label>Empresa</label>
                <input type="text" value={formData.empresa} onChange={handleInputChange('empresa')} placeholder="Nombre comercial" autoFocus />
              </div>
              <div className="form-group half-width">
                <label>Especialidad</label>
                <input type="text" value={formData.especialidad} onChange={handleInputChange('especialidad')} placeholder="Ej: Cerámicas, Pintura..." />
              </div>
              <div className="form-group full-width">
                <label>Persona de Contacto</label>
                <input type="text" value={formData.contacto} onChange={handleInputChange('contacto')} placeholder="Nombre del comercial" />
              </div>
              <div className="form-group half-width">
                <label>Teléfono</label>
                <input type="text" value={formData.telefono} onChange={handleInputChange('telefono')} placeholder="612 000 000" />
              </div>
              <div className="form-group half-width">
                <label>Email de pedidos</label>
                <input type="email" value={formData.email} onChange={handleInputChange('email')} placeholder="pedidos@empresa.es" />
              </div>
              <div className="form-group half-width">
                <label>Plazo medio de entrega</label>
                <input type="text" value={formData.plazo} onChange={handleInputChange('plazo')} placeholder="Ej: 2-3 días" />
              </div>
              <div className="form-group half-width">
                <label>Forma de pago acordada</label>
                <input type="text" value={formData.pago} onChange={handleInputChange('pago')} placeholder="Ej: 30 días factura" />
              </div>
              <div className="form-group full-width">
                <label>Notas Privadas</label>
                <textarea value={formData.notas} onChange={handleInputChange('notas')} rows="2" placeholder="Descuentos especiales, números de cuenta..."></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>{selectedProvId ? 'Actualizar' : 'Añadir Proveedor'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
