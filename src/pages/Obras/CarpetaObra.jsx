import React, { useState, useEffect } from 'react';
import { X, Upload, File as FileIcon, Image as ImageIcon, Trash2, DownloadCloud, Loader2, FileText, CheckCircle2, FolderPlus, Folder, ChevronRight, CornerLeftUp, MoveRight } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function CarpetaObra({ obra, data, setData, onClose }) {
  const [files, setFiles] = useState(obra.archivos || []);
  useEffect(() => { setFiles(obra.archivos || []); }, [obra.archivos]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('documentos');
  const [currentPath, setCurrentPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileToMove, setFileToMove] = useState(null);

  const timelineFiles = files.filter(f => f.type === 'image' || f.type === 'video');
  // Merge actas into timeline
  const actas = (obra.actas || []).map(a => ({ ...a, _isActa: true, date: a.fecha || a.date }));
  const allTimelineItems = [...timelineFiles, ...actas];
  const groupedTimeline = allTimelineItems.reduce((acc, item) => {
    const d = new Date(item.date).toLocaleDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(item);
    return acc;
  }, {});

  const handleCreateFolder = () => {
    const name = prompt("Nombre de la nueva carpeta:");
    if (!name) return;
    const newFolder = {
      id: Date.now().toString(),
      name,
      type: 'folder',
      path: currentPath,
      date: new Date().toISOString()
    };
    const newFiles = [newFolder, ...files];
    setFiles(newFiles);
    updateDoc('obras', obra.id, { archivos: newFiles });
  };

  const handleMoveFile = async (targetPath) => {
    if (!fileToMove) return;
    try {
      const newFilesArray = files.map(f => f.id === fileToMove.id ? { ...f, path: targetPath } : f);
      setFiles(newFilesArray);
      await updateDoc('obras', obra.id, { archivos: newFilesArray });
    } catch(err) {
      console.error(err);
      alert('Error al mover el archivo');
    } finally {
      setFileToMove(null);
    }
  };

  const handleFiles = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const timer = setInterval(() => setUploadProgress(p => (p < 85 ? p + 2 : p)), 300);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      const uploadPromises = selectedFiles.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', uploadPreset);
        fd.append('folder', `obras/${obra.id}`);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
        const dataResponse = await res.json();
        if (dataResponse.error) throw new Error(dataResponse.error.message);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: file.name,
          url: dataResponse.secure_url,
          type: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'document'),
          size: file.size,
          path: currentPath,
          date: new Date().toISOString()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      clearInterval(timer);
      setUploadProgress(100);
      
      const newFilesArray = [...uploadedFiles, ...files];
      setFiles(newFilesArray);
      await updateDoc('obras', obra.id, { archivos: newFilesArray });
      
    } catch (err) {
      console.error(err);
      alert("Error subiendo archivos.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (e) => handleFiles(Array.from(e.target.files));
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files)); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  
  const displayFiles = files.filter(f => (f.path || '') === currentPath);

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

        {/* Breadcrumb y Controles */}
        {activeTab === 'documentos' && (
          <div style={{ padding: '12px 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              <button 
                onClick={() => setCurrentPath('')}
                style={{ background: 'none', border: 'none', color: currentPath === '' ? '#0f172a' : '#3b82f6', cursor: 'pointer' }}
              >
                Raíz
              </button>
              {currentPath && (
                 <>
                   <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                   <span style={{ color: '#0f172a' }}>{currentPath.split('/').pop()}</span>
                 </>
              )}
            </div>
            <button className="btn-secondary" onClick={handleCreateFolder} style={{ fontSize: '12px', padding: '6px 12px' }}>
              <FolderPlus size={14} /> Nueva Carpeta
            </button>
          </div>
        )}

        {/* Upload Area */}
        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--border)', display: activeTab === 'timeline' ? 'none' : 'block' }}>
          <label 
            onDrop={handleDrop} 
            onDragOver={handleDragOver} 
            onDragLeave={handleDragLeave}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '24px', border: `2px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '12px', 
              background: isDragging ? '#eff6ff' : '#f8fafc', 
              cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              opacity: isUploading ? 0.7 : 1
            }}
          >
            <input type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
            {isUploading ? (
              <>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', color: '#3b82f6' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Subiendo archivos ({uploadProgress}%)</div>
                <div style={{ width: '200px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
                </div>
              </>
            ) : (
              <>
                <Upload size={24} style={{ color: isDragging ? '#3b82f6' : '#94a3b8', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Haz clic o arrastra múltiples archivos aquí</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cualquier archivo soportado hasta 50MB</div>
              </>
            )}
          </label>
        </div>

        {/* Files List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {activeTab === 'documentos' && (
            displayFiles.length === 0 && currentPath === '' ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
                La carpeta de esta obra está vacía. Suma archivos arrastrándolos aquí.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {currentPath !== '' && (
                  <div 
                    onClick={() => {
                        const parts = currentPath.split('/');
                        parts.pop();
                        setCurrentPath(parts.join('/'));
                    }} 
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <CornerLeftUp size={16} color="#64748b" />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Volver</span>
                  </div>
                )}
                {displayFiles.map(file => (
                  <div key={file.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ...file.type === 'folder' ? { cursor: 'pointer' } : {} }} onClick={() => { if(file.type === 'folder') setCurrentPath((currentPath ? currentPath + '/' : '') + file.name) }} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: file.type === 'folder' ? '#eab308' : '#cbd5e1' }}>
                      {file.type === 'folder' ? <Folder size={18} fill="#fef08a" /> : file.type === 'image' ? <ImageIcon size={18} /> : 
                       file.type === 'video' ? <FileIcon size={18} /> : <FileIcon size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(file.date).toLocaleDateString()} {file.type !== 'folder' && `· ${formatSize(file.size)}`}
                      </div>
                    </div>
                    {file.type !== 'folder' && (
                      <button onClick={(e) => { e.stopPropagation(); setFileToMove(file); }} title="Mover documento" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f3e8ff', border: 'none', borderRadius: '6px', color: '#9333ea', cursor: 'pointer' }}>
                        <MoveRight size={16} />
                      </button>
                    )}
                    {file.type !== 'folder' && (
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '6px', color: '#3b82f6' }} onClick={e => e.stopPropagation()}>
                        <DownloadCloud size={16} />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(file); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#fef2f2', border: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'timeline' && (
            Object.keys(groupedTimeline).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>
                No hay fotos, vídeos ni actas registradas en esta obra todavía.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{ position: 'absolute', top: 0, left: '6px', bottom: 0, width: '2px', background: '#e2e8f0' }} />
                
                {Object.keys(groupedTimeline).sort((a,b)=> new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'))).map(date => (
                  <div key={date} style={{ marginBottom: '32px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-19px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff' }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', marginTop: '-2px' }}>{date}</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {groupedTimeline[date].map(item => item._isActa ? (
                        <div key={`acta-${item.id || item.fecha}`} style={{ background: '#fff', border: '1px solid #c4b5fd', borderRadius: '8px', overflow: 'hidden', borderLeft: '3px solid #8b5cf6' }}>
                          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={14} style={{ color: '#8b5cf6' }} />
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase' }}>Acta Modificación</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }}>{item.descripcion || 'Sin descripción'}</div>
                            {(item.impactoDias || item.impactoCoste) && (
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {item.impactoDias && <span>+{item.impactoDias} días</span>}
                                {item.impactoDias && item.impactoCoste && <span> · </span>}
                                {item.impactoCoste && <span>+{item.impactoCoste}€</span>}
                              </div>
                            )}
                            {item.firmada && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>
                                <CheckCircle2 size={12} /> FIRMADA
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={item.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                          {item.type === 'video' ? (
                            <video src={item.url} style={{ width: '100%', height: '140px', objectFit: 'cover' }} controls />
                          ) : (
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                               <img src={item.url} alt={item.name} style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'zoom-in' }} />
                            </a>
                          )}
                          <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <button onClick={() => handleRemoveFile(item)} style={{ padding: '2px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
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

      {/* Modal Mover Archivo */}
      {fileToMove && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Mover Documento</h2>
              <button className="icon-btn" onClick={() => setFileToMove(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Selecciona la carpeta de destino para <strong>{fileToMove.name}</strong>:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                <button 
                  onClick={() => handleMoveFile('')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: (fileToMove.path || '') === '' ? '#f8fafc' : '#fff', border: '1px solid var(--border)', borderRadius: '8px', cursor: (fileToMove.path || '') === '' ? 'default' : 'pointer', opacity: (fileToMove.path || '') === '' ? 0.6 : 1 }}
                  disabled={(fileToMove.path || '') === ''}
                >
                  <Folder size={18} fill="#94a3b8" color="#94a3b8" />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Raíz de la Obra</span>
                </button>

                {files.filter(f => f.type === 'folder').map(folder => {
                  const folderFullPath = folder.path ? folder.path + '/' + folder.name : folder.name;
                  const isCurrent = (fileToMove.path || '') === folderFullPath;
                  return (
                    <button 
                      key={folder.id}
                      onClick={() => handleMoveFile(folderFullPath)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', paddingLeft: folder.path ? '32px' : '16px', background: isCurrent ? '#f8fafc' : '#fff', border: '1px solid var(--border)', borderRadius: '8px', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.6 : 1 }}
                      disabled={isCurrent}
                    >
                      <Folder size={18} fill="#fef08a" color="#eab308" />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{folder.name}</span>
                        {folder.path && <span style={{ fontSize: '10px', color: '#94a3b8' }}>En {folder.path}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
