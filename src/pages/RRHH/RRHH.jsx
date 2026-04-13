import React, { useState } from 'react';
import { Plus, FolderOpen, AlertTriangle, FileText, DownloadCloud, Trash2, Send, X, PenTool, MessageCircle, Mail } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';
import { openWhatsApp, sendEmail } from '../../utils/sendUtils';
import SignatureFlow from '../../components/shared/SignatureFlow.jsx';

export default function RRHH({ data, setData }) {
  const [activeCategory, setActiveCategory] = useState('contratos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', categoria: 'contratos', subcategoria: '', fechaVencimiento: '', coste: '', archivoUrl: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [signatureDoc, setSignatureDoc] = useState(null);
  const [sendDocModal, setSendDocModal] = useState(null);
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');

  const documentos = data?.documentosRRHH || [];
  const trabajadores = data?.trabajadores || [];

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      alert('Configura VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setFormData(prev => ({ ...prev, archivoUrl: data.secure_url, nombre: prev.nombre || file.name }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Error al subir archivo');
    }
  };

  const handleSave = async () => {
    const newDoc = {
      id: 'DOC-' + Date.now(),
      ...formData,
      fechaSubida: new Date().toISOString()
    };
    await saveDoc('documentosRRHH', newDoc.id, newDoc);
    setIsModalOpen(false);
    setFormData({ nombre: '', categoria: activeCategory, fechaVencimiento: '', coste: '', archivoUrl: '' });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar documento corporativo permanentemente?")) return;
    await deleteDoc('documentosRRHH', id);
  };

  const defaultCategories = [
    { id: 'contratos', label: 'Contratos Personal', color: '#3b82f6' },
    { id: 'vehiculos', label: 'Vehículos Reales', color: '#10b981' },
    { id: 'seguros', label: 'Seguros RC / Empresa', color: '#8b5cf6' },
    { id: 'licencias', label: 'Licencias y REA', color: '#f59e0b' }
  ];
  const customCategories = (data?.config?.empresa?.categoriasRRHH || []).map(c => ({ id: c.id, label: c.label, color: c.color || '#64748b' }));
  const categories = [...defaultCategories, ...customCategories];

  const colorPalette = ['#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'];

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const id = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const existing = data?.config?.empresa?.categoriasRRHH || [];
    const color = colorPalette[existing.length % colorPalette.length];
    const updated = [...existing, { id, label: newCategoryName.trim(), color }];
    await saveDoc('config', 'empresa', { ...data.config.empresa, categoriasRRHH: updated });
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('¿Eliminar esta carpeta? Los documentos que contenga no se eliminarán.')) return;
    const existing = data?.config?.empresa?.categoriasRRHH || [];
    const updated = existing.filter(c => c.id !== catId);
    await saveDoc('config', 'empresa', { ...data.config.empresa, categoriasRRHH: updated });
    if (activeCategory === catId) setActiveCategory('todas');
  };

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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowAddCategory(true)}>
            <Plus size={14} /> Nueva Carpeta
          </button>
          <button className="btn-primary" onClick={() => { setFormData({...formData, categoria: activeCategory === 'todas' ? 'contratos' : activeCategory}); setIsModalOpen(true); }}>
            <Plus size={16} /> Subir Documento
          </button>
        </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: '12px', opacity: isActive ? 0.9 : 0.6, marginTop: '2px' }}>{count} archivos</div>
                </div>
                {customCategories.some(cc => cc.id === c.id) && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8', padding: '2px' }}><Trash2 size={14} /></button>
                )}
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
                    <FileText size={16} className="text-slate-400" /> {d.archivoUrl ? <a href={d.archivoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color='#2563eb'} onMouseLeave={e => e.target.style.color='var(--text-main)'}>{d.nombre}</a> : d.nombre}
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
                    {d.archivoUrl && (
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#3b82f6', borderColor: '#bfdbfe', background: '#eff6ff', display: 'flex', gap: '4px', alignItems: 'center' }}
                        onClick={() => { setSendDocModal(d); setSelectedTrabajadorId(''); }}>
                        <Send size={12} /> Enviar
                      </button>
                    )}
                    {d.archivoUrl && (
                      <button className="icon-btn" title="Enviar para firma" onClick={() => setSignatureDoc(d)} style={{ color: '#8b5cf6' }}><PenTool size={14} /></button>
                    )}
                    <button className="icon-btn" title="Descargar" onClick={() => d.archivoUrl ? window.open(d.archivoUrl, '_blank') : alert('Este documento no tiene archivo adjunto.')}><DownloadCloud size={14} /></button>
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
              <div className="form-group half-width">
                <label>Carpeta</label>
                <select value={formData.categoria} onChange={handleInputChange('categoria')}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Subcarpeta (opcional)</label>
                <input type="text" value={formData.subcategoria} onChange={handleInputChange('subcategoria')} placeholder="Ej: Nóminas 2026, EPIs..." list="subcats-list" />
                <datalist id="subcats-list">
                  {[...new Set(documentos.filter(d => d.subcategoria).map(d => d.subcategoria))].map(s => <option key={s} value={s} />)}
                </datalist>
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
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{formData.archivoUrl ? 'Archivo subido' : 'Seleccionar Archivo (PDF, Img)'}</span>
                  {formData.archivoUrl && <span style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>Listo para guardar</span>}
                  <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
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

      {/* Modal Firma */}
      {signatureDoc && (
        <SignatureFlow
          title={`Firmar: ${signatureDoc.nombre}`}
          description={`Documento RRHH — ${signatureDoc.nombre}`}
          documentUrl={signatureDoc.archivoUrl}
          onSign={async (signatureData) => {
            await saveDoc('documentosRRHH', signatureDoc.id, { ...signatureDoc, firmado: true, firmaData: signatureData, fechaFirma: new Date().toISOString() });
            setSignatureDoc(null);
          }}
          onSendRemote={() => setSignatureDoc(null)}
          onClose={() => setSignatureDoc(null)}
        />
      )}

      {/* Modal Nueva Carpeta */}
      {showAddCategory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h2>Nueva Carpeta</h2>
              <button className="icon-btn" onClick={() => setShowAddCategory(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group full-width">
                <label>Nombre de la carpeta</label>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej: Formaciones, EPIs..." autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddCategory(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddCategory}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar Documento a Trabajador */}
      {sendDocModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Enviar Documento</h2>
              <button className="icon-btn" onClick={() => setSendDocModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Selecciona un trabajador para enviarle el documento <strong>{sendDocModal.nombre}</strong>.
              </p>
              <div className="form-group full-width" style={{ marginBottom: '20px' }}>
                <label>Trabajador</label>
                <select value={selectedTrabajadorId} onChange={e => setSelectedTrabajadorId(e.target.value)}>
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} {t.apellidos || ''}</option>
                  ))}
                </select>
              </div>

              {selectedTrabajadorId && (() => {
                const trabajador = trabajadores.find(t => t.id === selectedTrabajadorId);
                if (!trabajador) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      className="btn-secondary"
                      disabled={!trabajador.telefono}
                      style={{ justifyContent: 'flex-start', gap: '10px', padding: '12px 16px', opacity: trabajador.telefono ? 1 : 0.5, cursor: trabajador.telefono ? 'pointer' : 'not-allowed' }}
                      onClick={() => {
                        if (!trabajador.telefono) return;
                        const msg = `Hola ${trabajador.nombre}, te adjunto el documento "${sendDocModal.nombre}":\n\nPuedes descargarlo aquí: ${sendDocModal.archivoUrl}`;
                        openWhatsApp(trabajador.telefono, msg);
                        setSendDocModal(null);
                      }}
                    >
                      <MessageCircle size={16} style={{ color: trabajador.telefono ? '#25D366' : '#94a3b8' }} />
                      <span>WhatsApp</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{trabajador.telefono || 'No disponible'}</span>
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={!trabajador.email}
                      style={{ justifyContent: 'flex-start', gap: '10px', padding: '12px 16px', opacity: trabajador.email ? 1 : 0.5, cursor: trabajador.email ? 'pointer' : 'not-allowed' }}
                      onClick={async () => {
                        if (!trabajador.email) return;
                        const message = `Hola ${trabajador.nombre},\n\nTe adjunto el documento "${sendDocModal.nombre}".\n\nPuedes acceder a él desde el siguiente enlace:\n${sendDocModal.archivoUrl}\n\nUn saludo.`;
                        const result = await sendEmail(import.meta.env.VITE_EMAILJS_TEMPLATE_PORTAL, {
                          to_email: trabajador.email,
                          to_name: `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim(),
                          subject: `Documento de recursos humanos: ${sendDocModal.nombre}`,
                          message,
                          from_name: 'IDG',
                        });
                        if (result.success) {
                          alert('✅ Email enviado correctamente');
                          setSendDocModal(null);
                        } else {
                          alert('❌ Error al enviar email: ' + (result.error || 'Error desconocido'));
                        }
                      }}
                    >
                      <Mail size={16} style={{ color: trabajador.email ? '#3b82f6' : '#94a3b8' }} />
                      <span>Email</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{trabajador.email || 'No disponible'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
