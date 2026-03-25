import React, { useState } from 'react';
import { Plus, FolderOpen, AlertTriangle, FileText, DownloadCloud, Trash2, Send, X } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

export default function RRHH({ data, setData }) {
  const [activeCategory, setActiveCategory] = useState('contratos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', categoria: 'contratos', fechaVencimiento: '', coste: '' });

  const documentos = data?.documentosRRHH || [];

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSave = async () => {
    const newDoc = {
      id: 'DOC-' + Date.now(),
      ...formData,
      fechaSubida: new Date().toISOString()
    };
    await saveDoc('documentosRRHH', newDoc.id, newDoc);
    setIsModalOpen(false);
    setFormData({ nombre: '', categoria: activeCategory, fechaVencimiento: '', coste: '' });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar documento corporativo permanentemente?")) return;
    await deleteDoc('documentosRRHH', id);
  };

  const categories = [
    { id: 'contratos', label: 'Contratos Personal', color: '#3b82f6' },
    { id: 'vehiculos', label: 'Vehículos Reales', color: '#10b981' },
    { id: 'seguros', label: 'Seguros RC / Empresa', color: '#8b5cf6' },
    { id: 'licencias', label: 'Licencias y REA', color: '#f59e0b' }
  ];

  // Identificar caducidades cercanas (menos de 30 días o caducado)
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + 30);

  const alertasVencimiento = documentos.filter(d => {
    if (!d.fechaVencimiento) return false;
    const FV = new Date(d.fechaVencimiento);
    return FV <= limite;
  }).sort((a,b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const docsMostrados = activeCategory === 'todas' ? documentos : documentos.filter(d => d.categoria === activeCategory);

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val || 0);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">IDG Gestión y RRHH</h1>
          <p className="page-subtitle">Documentación legal cruzada, caducidades y recursos productivos.</p>
        </div>
        <button className="btn-primary" onClick={() => { setFormData({...formData, categoria: activeCategory === 'todas' ? 'contratos' : activeCategory}); setIsModalOpen(true); }}>
          <Plus size={16} /> Subir Documento
        </button>
      </header>

      {/* Alertas de Vencimiento Crítico */}
      {alertasVencimiento.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 700, fontSize: '14px' }}>
            <AlertTriangle size={18} /> Alertas de Vencimiento ({alertasVencimiento.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {alertasVencimiento.map(al => {
              const fv = new Date(al.fechaVencimiento);
              const isCaducado = fv < hoy;
              return (
                <div key={al.id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', borderLeft: isCaducado ? '4px solid #dc2626' : '4px solid #f59e0b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{al.nombre}</div>
                    <div style={{ color: isCaducado ? '#dc2626' : '#d97706', fontWeight: 500, fontSize: '11px', marginTop: '2px' }}>
                      {isCaducado ? 'Caducado el: ' : 'Caduca el: '} 
                      {fv.toLocaleDateString()}
                    </div>
                  </div>
                  {al.coste && <div style={{ fontWeight: 700, color: '#64748b' }}>{formatCurrency(al.coste)}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Carpetas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveCategory('todas')}
          style={{ background: activeCategory === 'todas' ? '#1e293b' : '#fff', color: activeCategory === 'todas' ? '#fff' : '#1e293b', border: activeCategory === 'todas' ? 'none' : '1px solid var(--border)', padding: '20px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <FolderOpen size={24} style={{ color: activeCategory === 'todas' ? '#fff' : '#94a3b8' }} />
          <div>
            <div style={{ fontWeight: 700 }}>Todos los Doc.</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>{documentos.length} archivos</div>
          </div>
        </button>
        {categories.map(c => {
          const count = documentos.filter(d => d.categoria === c.id).length;
          const isActive = activeCategory === c.id;
          return (
            <button 
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              style={{ background: isActive ? c.color : '#fff', color: isActive ? '#fff' : '#1e293b', border: isActive ? 'none' : '1px solid var(--border)', padding: '20px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <FolderOpen size={24} style={{ color: isActive ? '#fff' : c.color }} />
              <div>
                <div style={{ fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: '12px', opacity: isActive ? 0.9 : 0.6, marginTop: '2px' }}>{count} archivos</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Archivos de la Categoría */}
      <div className="stat-card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Documento Legal / RRHH</th>
              <th>Categoría</th>
              <th>Fecha Vencimiento</th>
              <th>Coste Renovación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {docsMostrados.length === 0 && (
              <tr><td colSpan="5" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay documentos almacenados en esta carpeta.</td></tr>
            )}
            {docsMostrados.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} className="text-slate-400" /> {d.nombre}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '22px' }}>Subido el {new Date(d.fechaSubida).toLocaleDateString()}</div>
                </td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>{categories.find(c=>c.id === d.categoria)?.label || d.categoria}</span></td>
                <td>
                  {d.fechaVencimiento ? (
                    <span style={{ fontSize: '13px', color: new Date(d.fechaVencimiento) < hoy ? '#dc2626' : 'var(--text-main)', fontWeight: new Date(d.fechaVencimiento) < hoy ? 600 : 400 }}>
                      {new Date(d.fechaVencimiento).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sin caducidad</span>
                  )}
                </td>
                <td style={{ fontWeight: 600 }}>{d.coste ? formatCurrency(d.coste) : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Send size={12} /> WhatsApp
                    </button>
                    <button className="icon-btn" title="Descargar PDF (Firebase Storage Mock)"><DownloadCloud size={14} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(d.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Upload */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>Archivar Documento</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Nombre identificativo</label>
                <input type="text" value={formData.nombre} onChange={handleInputChange('nombre')} placeholder="Ej: Contrato Indefinido Miguel, Seguro Furgoneta..." autoFocus />
              </div>
              <div className="form-group full-width">
                <label>Carpetas de clasificación</label>
                <select value={formData.categoria} onChange={handleInputChange('categoria')}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Fecha Límite / Caducidad</label>
                <input type="date" value={formData.fechaVencimiento} onChange={handleInputChange('fechaVencimiento')} />
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dejar vacío si no caduca</span>
              </div>
              <div className="form-group half-width">
                <label>Coste Renovación (€)</label>
                <input type="number" value={formData.coste} onChange={handleInputChange('coste')} placeholder="0.00" />
              </div>
              <div className="form-group full-width" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc' }}>
                  <DownloadCloud size={24} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Seleccionar Archivo (PDF, Img)</span>
                  <input type="file" style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar y Subir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
