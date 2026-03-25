import React, { useState, useEffect } from 'react';
import { X, Upload, File as FileIcon, Image as ImageIcon, Trash2, DownloadCloud, Loader2 } from 'lucide-react';
import { storage } from '../../config/firebase';
import { updateDoc } from '../../services/db';

export default function CarpetaObra({ obra, data, setData, onClose }) {
  // En un entorno real, estos archivos vendrían de Firestore asociados a la obra,
  // por ahora lo guardaremos en el mock local memory + Firebase Storage para reflejar la idea.
  const [files, setFiles] = useState(obra.archivos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Subida a Firebase Storage: obras/{obraId}/{fileName}
      const fileRef = storage.ref(`obras/${obra.id}/${Date.now()}_${file.name}`);
      const uploadTask = fileRef.put(file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Error al subir archivo:", error);
          alert("Error al subir archivo a Firebase Storage");
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          
          const newFile = {
            id: Date.now().toString(),
            name: file.name,
            url: downloadURL,
            type: file.type.startsWith('image/') ? 'image' : 'document',
            size: file.size,
            date: new Date().toISOString()
          };

          const newFilesArray = [newFile, ...files];
          setFiles(newFilesArray);
          await updateDoc('obras', obra.id, { archivos: newFilesArray });
          
          setIsUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (err) {
      console.error("Error iniciando upload:", err);
      setIsUploading(false);
    }
  };

  const handleRemoveFile = async (fileObj) => {
    if(!window.confirm("¿Eliminar archivo permanentemente de la nube?")) return;
    
    try {
      const newFilesArray = files.filter(f => f.id !== fileObj.id);
      setFiles(newFilesArray);
      await updateDoc('obras', obra.id, { archivos: newFilesArray });
      
      // Eliminación del storage opcional
      // await storage.refFromURL(fileObj.url).delete();
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

        {/* Upload Area */}
        <div style={{ padding: '24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
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
          {files.length === 0 ? (
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
          )}
        </div>

      </div>
    </div>
  );
}
