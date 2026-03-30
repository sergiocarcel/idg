import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, ShoppingCart, Clock, CheckCircle, AlertCircle, PackageCheck, Paperclip, Loader2 } from 'lucide-react';
import { saveDoc, deleteDoc, updateDoc } from '../../services/db';

export default function Pedidos({ data, setData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  
  const initialForm = {
    material: '', cantidad: '', obraId: '', fechaNecesidad: '', asignadoA: '', estado: 'pendiente', notas: '', albaranUrl: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [isUploading, setIsUploading] = useState(false);

  const pedidos = data?.pedidos || [];
  const obras = data?.obras || [];

  const getObraName = (id) => obras.find(o => o.id === id)?.nombre || 'Almacén Central (Varias Obras)';

  const generateId = () => 'PED-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSave = async () => {
    const docId = selectedPedido ? selectedPedido.id : generateId();
    const docData = selectedPedido ? { ...formData, id: docId } : { ...formData, id: docId, createdAt: new Date().toISOString() };
    await saveDoc('pedidos', docId, docData);
    setIsModalOpen(false);
    setSelectedPedido(null);
  };

  const handleAlbaranUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) throw new Error(result.error.message);
      setFormData(prev => ({ ...prev, albaranUrl: result.secure_url }));
    } catch (err) {
      console.error('Error subiendo albarán:', err);
      alert('Error subiendo el archivo. Comprueba la configuración de Cloudinary.');
    }
    setIsUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este pedido permanentemente?")) return;
    await deleteDoc('pedidos', id);
  };

  const openForm = (pedido = null) => {
    if (pedido) {
      setFormData(pedido);
      setSelectedPedido(pedido);
    } else {
      setFormData(initialForm);
      setSelectedPedido(null);
    }
    setIsModalOpen(true);
  };

  const changeStatus = async (id, newStatus) => {
    await updateDoc('pedidos', id, { estado: newStatus });
  };

  const estadoBadge = (estado) => {
    const map = {
      'pendiente': { l: 'Pendiente', c: '#d97706', bg: '#fef3c7', icon: Clock },
      'en_proceso': { l: 'En proceso', c: '#2563eb', bg: '#dbeafe', icon: ShoppingCart },
      'entregado': { l: 'Entregado', c: '#16a34a', bg: '#dcfce7', icon: PackageCheck },
      'cancelado': { l: 'Cancelado', c: '#dc2626', bg: '#fef2f2', icon: AlertCircle },
    };
    const s = map[estado] || map.pendiente;
    const Icon = s.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: s.bg, color: s.c, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
        <Icon size={12} /> {s.l}
      </span>
    );
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Pedidos de Material</h1>
          <p className="page-subtitle">Peticiones enviadas por trabajadores a los responsables.</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={16} /> Solicitar Material
        </button>
      </header>

      {/* Tarjetas resumen */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px', borderTop: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '12px' }}>Nuevos / Pendientes</h3>
          <div className="stat-value" style={{ color: '#d97706' }}>{pedidos.filter(p => p.estado === 'pendiente').length}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '12px' }}>En Proceso</h3>
          <div className="stat-value" style={{ color: '#2563eb' }}>{pedidos.filter(p => p.estado === 'en_proceso').length}</div>
        </div>
      </div>

      {/* Tabla Lista */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Material Solicitado</th>
              <th>Obra Destino</th>
              <th>Fecha Límite</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th style={{ textAlign: 'center' }}>Albarán</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 && (
              <tr><td colSpan="7" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay solicitudes de material activas</td></tr>
            )}
            {pedidos.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.cantidad} x {p.material}</div>
                  {p.notas && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notas}</div>}
                </td>
                <td style={{ fontSize: '12px', fontWeight: 500 }}>{getObraName(p.obraId)}</td>
                <td style={{ fontSize: '12px', color: new Date(p.fechaNecesidad) < new Date() && p.estado !== 'entregado' ? '#ef4444' : 'var(--text-main)', fontWeight: new Date(p.fechaNecesidad) < new Date() ? 700 : 400 }}>
                  {p.fechaNecesidad ? new Date(p.fechaNecesidad).toLocaleDateString() : 'Sin fecha'}
                </td>
                <td style={{ fontSize: '13px' }}>{p.asignadoA || '—'}</td>
                <td>{estadoBadge(p.estado)}</td>
                <td style={{ textAlign: 'center' }}>
                  {p.albaranUrl ? (
                    <a href={p.albaranUrl} target="_blank" rel="noopener noreferrer" title="Ver albarán adjunto" style={{ color: '#3b82f6' }}><Paperclip size={14} /></a>
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {p.estado === 'pendiente' && (
                      <button onClick={() => changeStatus(p.id, 'en_proceso')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}>Procesar</button>
                    )}
                    {p.estado === 'en_proceso' && (
                      <button onClick={() => changeStatus(p.id, 'entregado')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>Entregar</button>
                    )}
                    <button className="icon-btn" onClick={() => openForm(p)} title="Editar pedido"><Edit2 size={14} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedPedido ? 'Editar solicitud' : 'Nueva solicitud de material'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Qué material se necesita</label>
                <input type="text" value={formData.material} onChange={handleInputChange('material')} placeholder="Ej: Cemento rápido, Tubo PVC 110mm..." autoFocus />
              </div>
              <div className="form-group half-width">
                <label>Cantidad y Unidad</label>
                <input type="text" value={formData.cantidad} onChange={handleInputChange('cantidad')} placeholder="Ej: 10 sacos, 5 metros..." />
              </div>
              <div className="form-group half-width">
                <label>Para Cuándo (Fecha límite)</label>
                <input type="date" value={formData.fechaNecesidad} onChange={handleInputChange('fechaNecesidad')} />
              </div>
              <div className="form-group full-width">
                <label>Para qué Obra</label>
                <select value={formData.obraId} onChange={handleInputChange('obraId')}>
                  <option value="">Almacén Central (Uso general)</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>A quién se le solicita</label>
                <input type="text" value={formData.asignadoA} onChange={handleInputChange('asignadoA')} placeholder="Nombre del responsable / proveedor" />
              </div>
              <div className="form-group half-width">
                <label>Estado actual</label>
                <select value={formData.estado} onChange={handleInputChange('estado')}>
                  <option value="pendiente">Pendiente de revisar</option>
                  <option value="en_proceso">Pedido en proceso / Comprando</option>
                  <option value="entregado">Entregado en obra</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Notas / Urgencia</label>
                <textarea value={formData.notas} onChange={handleInputChange('notas')} rows="2" placeholder="Información extra o motivo..." />
              </div>
              <div className="form-group full-width">
                <label>Adjuntar Albarán / Factura (PDF o imagen)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: '12px', color: '#64748b' }}>
                    <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={handleAlbaranUpload} disabled={isUploading} />
                    {isUploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</> : <><Paperclip size={14} /> Seleccionar archivo</>}
                  </label>
                  {formData.albaranUrl && (
                    <a href={formData.albaranUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>Ver adjunto</a>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>{selectedPedido ? 'Actualizar' : 'Enviar Solicitud'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
