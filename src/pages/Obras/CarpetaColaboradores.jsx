import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, Loader2, User, FileText, Share2 } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function CarpetaColaboradores({ obra, onClose }) {
  const [colaboradores, setColaboradores] = useState(obra.colaboradores || []);
  const [compartidoCon, setCompartidoCon] = useState(obra.compartidoCon || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [newColab, setNewColab] = useState({ nombre: '', empresa: '', telefono: '', email: '', rol: '' });
  const [uploadingFor, setUploadingFor] = useState(null);

  const saveColaboradores = async (updated) => {
    setColaboradores(updated);
    await updateDoc('obras', obra.id, { colaboradores: updated });
  };

  const saveCompartido = async (updated) => {
    setCompartidoCon(updated);
    await updateDoc('obras', obra.id, { compartidoCon: updated });
  };

  const handleShareAdd = async () => {
    if (!shareEmail || compartidoCon.find(c => c.email === shareEmail)) return;
    await saveCompartido([...compartidoCon, { email: shareEmail, permisos: 'lectura' }]);
    setShareEmail('');
  };

  const handleShareRemove = async (email) => {
    await saveCompartido(compartidoCon.filter(c => c.email !== email));
  };

  const handleAddColab = async () => {
    if (!newColab.nombre) return alert('Indica al menos el nombre del colaborador');
    const colab = { ...newColab, id: 'COL-' + Date.now(), documentos: [] };
    await saveColaboradores([...colaboradores, colab]);
    setNewColab({ nombre: '', empresa: '', telefono: '', email: '', rol: '' });
    setShowAddForm(false);
  };

  const handleRemoveColab = async (colabId) => {
    if (!window.confirm('¿Eliminar este colaborador de la obra?')) return;
    await saveColaboradores(colaboradores.filter(c => c.id !== colabId));
  };

  const handleFileUpload = async (colabId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFor(colabId);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.error) throw new Error(result.error.message);

      const doc = { id: 'DOC-' + Date.now(), nombre: file.name, url: result.secure_url, fecha: new Date().toISOString() };
      const updated = colaboradores.map(c => c.id === colabId ? { ...c, documentos: [...(c.documentos || []), doc] } : c);
      await saveColaboradores(updated);
    } catch (err) {
      console.error('Error subiendo documento:', err);
      alert('Error subiendo el archivo.');
    }
    setUploadingFor(null);
  };

  const handleRemoveDoc = async (colabId, docId) => {
    const updated = colaboradores.map(c => c.id === colabId ? { ...c, documentos: (c.documentos || []).filter(d => d.id !== docId) } : c);
    await saveColaboradores(updated);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '700px', height: '80vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>Colaboradores de Obra</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{obra.nombre} &middot; {colaboradores.length} colaboradores</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowShareForm(!showShareForm)} style={{ fontSize: '12px' }}><Share2 size={14} /> Compartir Obra ({compartidoCon.length})</button>
          <button className="btn-primary" onClick={() => setShowAddForm(true)} style={{ fontSize: '12px' }}><Plus size={14} /> Añadir Colaborador</button>
        </div>

        {showShareForm && (
          <div style={{ padding: '14px 24px', background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>Acceso externo (sin precios) — Los emails compartidos podrán ver esta obra en modo colaborador</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input type="email" placeholder="email@colaborador.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleShareAdd()} style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }} />
              <button className="btn-primary" onClick={handleShareAdd} style={{ fontSize: '11px', padding: '6px 12px' }}>Añadir</button>
            </div>
            {compartidoCon.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {compartidoCon.map(c => (
                  <span key={c.email} style={{ background: '#fff', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {c.email} <span style={{ fontSize: '9px', color: '#92400e' }}>({c.permisos})</span>
                    <button onClick={() => handleShareRemove(c.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, fontSize: '14px' }}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {showAddForm && (
          <div style={{ padding: '16px 24px', background: '#eff6ff', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <input type="text" placeholder="Nombre *" value={newColab.nombre} onChange={e => setNewColab({ ...newColab, nombre: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Empresa" value={newColab.empresa} onChange={e => setNewColab({ ...newColab, empresa: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Teléfono" value={newColab.telefono} onChange={e => setNewColab({ ...newColab, telefono: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="email" placeholder="Email" value={newColab.email} onChange={e => setNewColab({ ...newColab, email: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Rol (Ej: Electricista)" value={newColab.rol} onChange={e => setNewColab({ ...newColab, rol: e.target.value })} style={{ padding: '8px', fontSize: '12px', gridColumn: 'span 2' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddForm(false)} style={{ fontSize: '12px' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddColab} style={{ fontSize: '12px' }}>Guardar</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {colaboradores.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
              No hay colaboradores asignados a esta obra. Pulsa + para añadir.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {colaboradores.map(colab => (
                <div key={colab.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>{colab.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {[colab.empresa, colab.rol].filter(Boolean).join(' · ') || 'Sin detalles'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {[colab.telefono, colab.email].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <button className="icon-btn" onClick={() => handleRemoveColab(colab.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>

                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Documentos ({(colab.documentos || []).length})</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', cursor: uploadingFor === colab.id ? 'not-allowed' : 'pointer', fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(colab.id, e)} disabled={uploadingFor === colab.id} />
                        {uploadingFor === colab.id ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</> : <><Upload size={12} /> Subir</>}
                      </label>
                    </div>
                    {(colab.documentos || []).length === 0 ? (
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin documentos adjuntos</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {(colab.documentos || []).map(doc => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={12} /> {doc.nombre}
                            </a>
                            <button onClick={() => handleRemoveDoc(colab.id, doc.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
