import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, Loader2, User, FileText, Share2, FolderPlus, Folder, Check, Key } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';
import { sendEmail } from '../../utils/sendUtils';

export default function CarpetaColaboradores({ obra, data, onClose }) {
  // Colaboradores from separate Firestore collection, filtered by this obra
  const allColaboradores = data?.colaboradores || [];
  const colaboradores = allColaboradores.filter(c => c.obraId === obra.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [newColab, setNewColab] = useState({ nombre: '', empresa: '', telefono: '', email: '', rol: '', pin: '' });
  const [uploadingFor, setUploadingFor] = useState(null);
  const [newFolderFor, setNewFolderFor] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [copiedPin, setCopiedPin] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [emailSent, setEmailSent] = useState(null);

  const PORTAL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_PORTAL || 'template_portal_access';

  const generatePin = () => String(Math.floor(100000 + Math.random() * 900000));

  const handleShareColab = async (colab) => {
    setSendingEmail(colab.id);
    setEmailSent(null);
    const portalUrl = `${window.location.origin}/portal`;
    const subject = `Acceso a documentos de obra: ${obra.nombre} - ${import.meta.env.VITE_APP_COMPANY || 'CRM'}`;
    const message = [
      `Hola ${colab.nombre},`,
      ``,
      `Te compartimos el acceso a tus documentos de la obra "${obra.nombre}".`,
      ``,
      `Para acceder, entra en el siguiente enlace:`,
      portalUrl,
      ``,
      `Tus credenciales de acceso:`,
      `Email: ${colab.email}`,
      `PIN: ${colab.pin}`,
      ``,
      obra.direccion ? `Dirección de la obra: ${obra.direccion}` : '',
      ``,
      `Saludos,`,
      `${import.meta.env.VITE_APP_COMPANY || 'CRM'}`
    ].filter(Boolean).join('\n');

    const result = await sendEmail(PORTAL_TEMPLATE_ID, {
      to_email: colab.email,
      to_name: colab.nombre,
      subject,
      message,
      from_name: import.meta.env.VITE_APP_COMPANY || 'CRM'
    });
    setSendingEmail(null);
    if (result.success) {
      setEmailSent(colab.id);
      setTimeout(() => setEmailSent(null), 3000);
    } else {
      alert('No se pudo enviar el email. ' + (result.error || 'Revisa la configuración de EmailJS.'));
    }
  };

  // CRUD on separate colaboradores collection
  const handleAddColab = async () => {
    if (!newColab.nombre) return alert('Indica al menos el nombre del colaborador');
    if (!newColab.email) return alert('El email es necesario para acceder al portal');
    const pin = newColab.pin || generatePin();
    const colabId = 'COL-' + Date.now();
    const colabData = {
      ...newColab,
      pin,
      id: colabId,
      obraId: obra.id,
      obraNombre: obra.nombre,
      carpetas: [{ id: 'FOLD-' + Date.now(), nombre: 'General', documentos: [] }],
      createdAt: new Date().toISOString()
    };
    await saveDoc('colaboradores', colabId, colabData);
    
    alert(`✅ Colaborador "${colabData.nombre}" creado.\n\n🔑 PIN de acceso al portal: ${pin}\n\nComparte este PIN junto con su email para que pueda acceder a sus documentos en:\n${window.location.origin}/portal`);
    setNewColab({ nombre: '', empresa: '', telefono: '', email: '', rol: '', pin: '' });
    setShowAddForm(false);
  };

  const handleRemoveColab = async (colabId) => {
    if (!window.confirm('¿Eliminar este colaborador de la obra?')) return;
    await deleteDoc('colaboradores', colabId);
  };

  // Carpetas
  const handleAddFolder = async (colabId) => {
    if (!newFolderName.trim()) return;
    const colab = colaboradores.find(c => c.id === colabId);
    if (!colab) return;
    const carpetas = colab.carpetas || [];
    await saveDoc('colaboradores', colabId, {
      ...colab,
      carpetas: [...carpetas, { id: 'FOLD-' + Date.now(), nombre: newFolderName.trim(), documentos: [] }]
    });
    setNewFolderFor(null);
    setNewFolderName('');
  };

  const handleRemoveFolder = async (colabId, folderId) => {
    if (!window.confirm('¿Eliminar esta carpeta y todos sus documentos?')) return;
    const colab = colaboradores.find(c => c.id === colabId);
    if (!colab) return;
    await saveDoc('colaboradores', colabId, {
      ...colab,
      carpetas: (colab.carpetas || []).filter(f => f.id !== folderId)
    });
  };

  const handleFileUpload = async (colabId, folderId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFor(`${colabId}-${folderId}`);
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
      const colab = colaboradores.find(c => c.id === colabId);
      if (!colab) return;
      await saveDoc('colaboradores', colabId, {
        ...colab,
        carpetas: (colab.carpetas || []).map(f =>
          f.id === folderId ? { ...f, documentos: [...(f.documentos || []), doc] } : f
        )
      });
    } catch (err) {
      console.error('Error subiendo documento:', err);
      alert('Error subiendo el archivo.');
    }
    setUploadingFor(null);
  };

  const handleRemoveDoc = async (colabId, folderId, docId) => {
    const colab = colaboradores.find(c => c.id === colabId);
    if (!colab) return;
    await saveDoc('colaboradores', colabId, {
      ...colab,
      carpetas: (colab.carpetas || []).map(f =>
        f.id === folderId ? { ...f, documentos: (f.documentos || []).filter(d => d.id !== docId) } : f
      )
    });
  };

  const copyPin = (pin, colabId) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(colabId);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const getTotalDocs = (colab) => (colab.carpetas || []).reduce((sum, f) => sum + (f.documentos || []).length, 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '750px', height: '85vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>Colaboradores de Obra</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{obra.nombre} · {colaboradores.length} colaboradores</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setShowShareForm(!showShareForm)} 
            style={{ fontSize: '12px', ...(colaboradores.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
            disabled={colaboradores.length === 0}
            title={colaboradores.length === 0 ? 'Añade un colaborador primero' : 'Enviar acceso al portal por email'}
          >
            <Share2 size={14} /> Enviar Acceso Portal
          </button>
          <button className="btn-primary" onClick={() => setShowAddForm(true)} style={{ fontSize: '12px' }}><Plus size={14} /> Añadir Colaborador</button>
        </div>

        {/* Portal info banner */}
        <div style={{ padding: '10px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '11px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Key size={12} />
          Portal externo: <strong>{window.location.origin}/portal</strong> — Los colaboradores acceden con su email + PIN
        </div>

        {/* Share selector: pick a collaborator to email */}
        {showShareForm && colaboradores.length > 0 && (
          <div style={{ padding: '14px 24px', background: '#f0fdf4', borderBottom: '1px solid #86efac' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', marginBottom: '10px' }}>Selecciona un colaborador para enviarle sus credenciales del portal por email:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {colaboradores.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{c.nombre} {c.empresa && <span style={{ fontWeight: 400, color: '#64748b' }}>· {c.empresa}</span>}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{c.email} · PIN: {c.pin}</div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => handleShareColab(c)}
                    disabled={sendingEmail === c.id}
                    style={{ fontSize: '11px', padding: '6px 14px', background: emailSent === c.id ? '#16a34a' : sendingEmail === c.id ? '#94a3b8' : '#16a34a' }}
                  >
                    {sendingEmail === c.id
                      ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                      : emailSent === c.id
                        ? <><Check size={12} /> Enviado</>
                        : <><Share2 size={12} /> Enviar Email</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddForm && (
          <div style={{ padding: '16px 24px', background: '#eff6ff', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <input type="text" placeholder="Nombre *" value={newColab.nombre} onChange={e => setNewColab({ ...newColab, nombre: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Empresa" value={newColab.empresa} onChange={e => setNewColab({ ...newColab, empresa: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Teléfono" value={newColab.telefono} onChange={e => setNewColab({ ...newColab, telefono: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="email" placeholder="Email *" value={newColab.email} onChange={e => setNewColab({ ...newColab, email: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <input type="text" placeholder="Rol (Ej: Electricista)" value={newColab.rol} onChange={e => setNewColab({ ...newColab, rol: e.target.value })} style={{ padding: '8px', fontSize: '12px' }} />
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="PIN (auto si vacío)" value={newColab.pin} onChange={e => setNewColab({ ...newColab, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} style={{ padding: '8px', fontSize: '12px', width: '100%' }} maxLength={6} />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#64748b' }}>6 dígitos</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddForm(false)} style={{ fontSize: '12px' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddColab} style={{ fontSize: '12px' }}>Guardar Colaborador</button>
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
              {colaboradores.map(colab => {
                const carpetas = colab.carpetas || [];
                return (
                  <div key={colab.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Collaborator header */}
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                          <User size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>{colab.nombre}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {[colab.empresa, colab.rol].filter(Boolean).join(' · ') || 'Sin detalles'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {[colab.telefono, colab.email].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {colab.pin && (
                          <button onClick={() => copyPin(colab.pin, colab.id)} title="Copiar PIN"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                            <Key size={11} />
                            {copiedPin === colab.id ? <><Check size={11} /> Copiado</> : <>PIN: {colab.pin}</>}
                          </button>
                        )}
                      </div>
                      <button className="icon-btn" onClick={() => handleRemoveColab(colab.id)} style={{ color: '#ef4444', flexShrink: 0 }}><Trash2 size={14} /></button>
                    </div>

                    {/* Folders */}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Carpetas · {getTotalDocs(colab)} docs</span>
                        <button onClick={() => setNewFolderFor(newFolderFor === colab.id ? null : colab.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#f1f5f9', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                          <FolderPlus size={12} /> Nueva Carpeta
                        </button>
                      </div>

                      {newFolderFor === colab.id && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <input type="text" placeholder="Nombre de la carpeta..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddFolder(colab.id)} style={{ flex: 1, padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px' }} autoFocus />
                          <button className="btn-primary" onClick={() => handleAddFolder(colab.id)} style={{ padding: '6px 10px', fontSize: '11px' }}>Crear</button>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {carpetas.map(folder => (
                          <div key={folder.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                <Folder size={14} style={{ color: '#3b82f6' }} />
                                {folder.nombre} ({(folder.documentos || []).length})
                              </div>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#fff', borderRadius: '5px', cursor: uploadingFor === `${colab.id}-${folder.id}` ? 'not-allowed' : 'pointer', fontSize: '10px', color: '#3b82f6', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(colab.id, folder.id, e)} disabled={uploadingFor === `${colab.id}-${folder.id}`} />
                                  {uploadingFor === `${colab.id}-${folder.id}` ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</> : <><Upload size={10} /> Subir</>}
                                </label>
                                {carpetas.length > 1 && (
                                  <button onClick={() => handleRemoveFolder(colab.id, folder.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}><Trash2 size={12} /></button>
                                )}
                              </div>
                            </div>
                            <div style={{ padding: '6px 12px' }}>
                              {(folder.documentos || []).length === 0 ? (
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>Vacía</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {(folder.documentos || []).map(doc => (
                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '4px' }}>
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={12} /> {doc.nombre}
                                      </a>
                                      <button onClick={() => handleRemoveDoc(colab.id, folder.id, doc.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
  );
}
