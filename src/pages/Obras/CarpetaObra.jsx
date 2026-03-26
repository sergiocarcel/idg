import React, { useState, useEffect } from 'react';
import { X, Upload, File as FileIcon, Image as ImageIcon, Trash2, DownloadCloud, Loader2 } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function CarpetaObra({ obra, data, setData, onClose }) {
  const [files, setFiles] = useState(obra.archivos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('documentos');

  const timelineFiles = files.filter(f => f.type === 'image' || f.type === 'video');
  const groupedTimeline = timelineFiles.reduce((acc, file) => {
    const d = new Date(file.date).toLocaleDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(file);
    return acc;
  }, {});

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso de subida porque Fetch API nativa no incluye listener de progreso simple
      const timer = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 5 : p));
      }, 300);

      // Usar servicio robusto de infraestructura CDN (Cloudinary Free Tier)
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: fd
      });

      const dataResponse = await res.json();
      
      clearInterval(timer);
      setUploadProgress(100);

      if (dataResponse.error) {
        throw new Error(dataResponse.error.message);
      }

      const downloadURL = dataResponse.secure_url;
      
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        url: downloadURL,
        type: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'document'),
        size: file.size,
        date: new Date().toISOString()
      };

      const newFilesArray = [newFile, ...files];
      setFiles(newFilesArray);
      await updateDoc('obras', obra.id, { archivos: newFilesArray });
      
      setIsUploading(false);
      setUploadProgress(0);
      
    } catch (err) {
      console.error("Error subiendo a Cloudinary:", err);
      alert("Error subiendo a la nube. Comprueba la configuración de Cloudinary en el archivo .env");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = async (fileObj) => {
    if(!window.confirm("¿Eliminar archivo permanentemente de la vista de la obra?")) return;
    
    try {
      const newFilesArray = files.filter(f => f.id !== fileObj.id);
      setFiles(newFilesArray);
      await updateDoc('obras', obra.id, { archivos: newFilesArray });
      
      // Borrado silencioso y lógico de la base de datos local (Cloudinary permite auto-expiración o borrado por panel admin)
    } catch(err) {
      console.error(err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>Carpeta de Obra</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{obra.nombre} &middot; {files.length} archivos</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff', padding: '0 24px' }}>
          <button onClick={() => setActiveTab('documentos')} style={{ padding: '16px', background: 'none', border: 'none', borderBottom: activeTab === 'documentos' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'documentos' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Documentos Generales</button>
          <button onClick={() => setActiveTab('timeline')} style={{ padding: '16px', background: 'none', border: 'none', borderBottom: activeTab === 'timeline' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'timeline' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Timeline Seguimiento</button>
        </div>

        {/* Upload Area */}
        <div style={{ padding: '24px', background: '#fff', borderBottom: '1px solid var(--border)', display: activeTab === 'timeline' ? 'none' : 'block' }}>
          <label style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            padding: '30px', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', 
            cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: isUploading ? 0.7 : 1
          }}>
            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
            {isUploading ? (
              <>
                <Loader2 size={32} className="text-blue-500" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#3b82f6' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Subiendo a la nube... {uploadProgress}%</div>
                <div style={{ width: '200px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
                </div>
              </>
            ) : (
              <>
                <Upload size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Haz clic para subir un documento o foto</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Soporta PDF, imágenes y modelos hasta 50MB</div>
              </>
            )}
          </label>
        </div>

        {/* Files List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'documentos' && (
            files.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
                La carpeta de esta obra está vacía. Suma archivos arrastrándolos aquí.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {files.map(file => (
                  <div key={file.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {file.type === 'image' ? (
                      <div style={{ height: '120px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                        <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : file.type === 'video' ? (
                      <div style={{ height: '120px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                        <video src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                      </div>
                    ) : (
                      <div style={{ height: '120px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                        <FileIcon size={48} />
                      </div>
                    )}
                    
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(file.date).toLocaleDateString()} &middot; {formatSize(file.size)}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '4px', textAlign: 'center', background: '#f1f5f9', borderRadius: '4px', color: '#3b82f6', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>
                          <DownloadCloud size={12} style={{ display: 'inline', marginRight: '4px' }}/> Abrir
                        </a>
                        <button onClick={() => handleRemoveFile(file)} style={{ padding: '4px', background: '#fef2f2', border: 'none', borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'timeline' && (
            Object.keys(groupedTimeline).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
                No hay fotos ni vídeos subidos a esta obra todavía. Sube los recursos en la pestaña 'Documentos' para que se ordenen solos aquí.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{ position: 'absolute', top: 0, left: '6px', bottom: 0, width: '2px', background: '#e2e8f0' }} />
                
                {Object.keys(groupedTimeline).sort((a,b)=> new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'))).map(date => (
                  <div key={date} style={{ marginBottom: '32px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-19px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff' }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', marginTop: '-2px' }}>{date}</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {groupedTimeline[date].map(file => (
                        <div key={file.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                          {file.type === 'video' ? (
                            <video src={file.url} style={{ width: '100%', height: '140px', objectFit: 'cover' }} controls />
                          ) : (
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                               <img src={file.url} alt={file.name} style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'zoom-in' }} />
                            </a>
                          )}
                          <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(file.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <button onClick={() => handleRemoveFile(file)} style={{ padding: '2px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
