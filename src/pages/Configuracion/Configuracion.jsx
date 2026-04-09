import React, { useState } from 'react';
import { Settings, Users, Save, Upload, Plus, Edit2, Shield, UserX, CheckCircle, UploadCloud, Info, Loader2 } from 'lucide-react';
import { saveDoc } from '../../services/db';

export default function Configuracion({ data, setData }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'usuarios'
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [empresa, setEmpresa] = useState(data?.config?.empresa || {
    nombre: 'Innovate Design Group',
    nif: 'B-12345678',
    direccion: 'Calle Principal 123, Madrid',
    telefono: '+34 600 000 000',
    email: 'contacto@idg.es',
    iban: 'ES00 0000 0000 0000 0000 0000',
    pieFactura: 'Inscrita en el Registro Mercantil...',
    condicionesPresupuesto: 'Validez operativa del presupuesto: 30 días. Los precios no incluyen licencias ni permisos de obra a menos que se indique explícitamente en una partida.',
    logoId: ''
  });

  const [usuarios, setUsuarios] = useState(data?.config?.usuarios || [
    { id: 'U1', nombre: 'Admin Default', email: 'admin@idg.es', rol: 'admin', activo: true }
  ]);

  const [userForm, setUserForm] = useState({ id: '', nombre: '', email: '', password: '', rol: 'trabajador', activo: true });

  const handleEmpresaChange = (field) => (e) => setEmpresa({ ...empresa, [field]: e.target.value });

  const wrapCondicionesSelection = (tag) => {
    const ta = document.getElementById('condiciones-empresa-textarea');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = empresa.condicionesPresupuesto || '';
    const newVal = val.substring(0, start) + `<${tag}>` + val.substring(start, end) + `</${tag}>` + val.substring(end);
    setEmpresa(prev => ({ ...prev, condicionesPresupuesto: newVal }));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
    }, 0);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          setUploadingLogo(true);
          try {
            const fd = new FormData();
            fd.append('file', blob, 'logo.webp');
            fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
            fd.append('folder', 'config');
            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
              { method: 'POST', body: fd }
            ).then(r => r.json());
            if (res.error) throw new Error(res.error.message);
            setEmpresa(prev => ({ ...prev, logoId: res.secure_url }));
          } catch (err) {
            alert('Error subiendo el logo: ' + (err.message || 'Error desconocido'));
          } finally {
            setUploadingLogo(false);
          }
        }, 'image/webp', 0.8);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  const saveEmpresa = async () => {
    try {
      await saveDoc('config', 'empresa', empresa);
      alert('Datos de empresa y logotipo guardados correctamente.');
    } catch (e) {
      alert('Hubo un error guardando tu configuración. Contáctame si persiste.');
    }
  };

  const handleUserSave = async () => {
    let newUsers;
    if (userForm.id) {
      newUsers = usuarios.map(u => u.id === userForm.id ? userForm : u);
    } else {
      newUsers = [...usuarios, { ...userForm, id: 'U' + Date.now() }];
    }
    setUsuarios(newUsers);
    await saveDoc('config', 'usuarios', { list: newUsers });
    setIsUserModalOpen(false);
  };

  const rolesMap = {
    'admin': { label: 'Administrador (Total)', color: '#dc2626', bg: '#fef2f2' },
    'jefe': { label: 'Jefe de Obra', color: '#2563eb', bg: '#dbeafe' },
    'logistica': { label: 'Logística / Almacén', color: '#d97706', bg: '#fef3c7' },
    'trabajador': { label: 'Trabajador Base', color: '#16a34a', bg: '#dcfce7' },
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Configuración del Sistema</h1>
          <p className="page-subtitle">Ajustes de la empresa, facturación y control de accesos.</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('general')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'general' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'general' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeTab === 'general' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Settings size={16} /> Datos de la Empresa
        </button>
        <button 
          onClick={() => setActiveTab('usuarios')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'usuarios' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'usuarios' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeTab === 'usuarios' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Users size={16} /> Usuarios y Permisos
        </button>
      </div>

      {activeTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '24px' }}>
          
          {/* Logo uploader */}
          <div className="stat-card" style={{ padding: '24px', alignSelf: 'start', textAlign: 'center' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'left' }}>Logotipo Corporativo</h3>
            <div style={{ width: '100%', height: '160px', background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
              {empresa.logoId ? (
                <img src={empresa.logoId} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', padding: '8px' }} />
              ) : (
                <>
                  <div style={{ padding: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <UploadCloud size={32} style={{ color: '#3b82f6' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG transparente recomendado</span>
                </>
              )}
            </div>
            
            <input
              type="file"
              id="logo-upload-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />

            <button
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => !uploadingLogo && document.getElementById('logo-upload-input').click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</> : (empresa.logoId ? 'Cambiar Imagen' : 'Seleccionar Imagen')}
            </button>
            {empresa.logoId && (
              <button 
                className="btn-secondary danger" 
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} 
                onClick={() => setEmpresa({ ...empresa, logoId: '' })}
              >
                Eliminar Logo
              </button>
            )}
          </div>

          <div className="stat-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Información Legal y Fiscal</h3>
            
            <div className="form-grid">
              <div className="form-group half-width">
                <label>Nombre Comercial / Razón Social</label>
                <input type="text" value={empresa.nombre} onChange={handleEmpresaChange('nombre')} />
              </div>
              <div className="form-group half-width">
                <label>NIF / CIF</label>
                <input type="text" value={empresa.nif} onChange={handleEmpresaChange('nif')} />
              </div>
              <div className="form-group full-width">
                <label>Dirección Fiscal</label>
                <input type="text" value={empresa.direccion} onChange={handleEmpresaChange('direccion')} />
              </div>
              <div className="form-group half-width">
                <label>Teléfono Principal</label>
                <input type="text" value={empresa.telefono} onChange={handleEmpresaChange('telefono')} />
              </div>
              <div className="form-group half-width">
                <label>Email de Contacto</label>
                <input type="email" value={empresa.email} onChange={handleEmpresaChange('email')} />
              </div>
              <div className="form-group full-width">
                <label>Cuenta IBAN (Para facturas y cobros)</label>
                <input type="text" value={empresa.iban} onChange={handleEmpresaChange('iban')} />
              </div>
              <div className="form-group full-width">
                <label>Texto Pie de Página (Legal, LOPD...)</label>
                <textarea rows="3" value={empresa.pieFactura} onChange={handleEmpresaChange('pieFactura')}></textarea>
              </div>
              <div className="form-group full-width">
                <label>Condiciones Generales de Presupuestos (Aparecen al pie del PDF)</label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  <button type="button" onClick={() => wrapCondicionesSelection('b')} style={{ padding: '2px 8px', fontWeight: 700, fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', background: '#f8fafc', cursor: 'pointer' }}>B</button>
                  <button type="button" onClick={() => wrapCondicionesSelection('i')} style={{ padding: '2px 8px', fontStyle: 'italic', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', background: '#f8fafc', cursor: 'pointer' }}>I</button>
                </div>
                <textarea id="condiciones-empresa-textarea" rows="4" value={empresa.condicionesPresupuesto || ''} onChange={handleEmpresaChange('condicionesPresupuesto')} placeholder="Ej: Validez operativa del presupuesto: 30 días..."></textarea>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Este texto se mostrará como condiciones generales en todos los PDFs de presupuestos. Selecciona texto y pulsa B o I para formatear. También se puede personalizar por presupuesto.</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn-primary" onClick={saveEmpresa}><Save size={16} /> Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={20} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Gestión de Privacidad (Cero Costes Servidor)</div>
              <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: '1.5' }}>
                Por alta seguridad comercial, el CRM únicamente asigna <strong>Roles Visuales</strong> a correos ya existentes. Tanto la <b>Ceración de la Contraseña (Llave)</b> inicial como el <b>Borrado Destructivo Permanente</b> de la plantilla debe ejecutarse siempre desde la pestaña de <i>Authentication</i> en tu <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 700, textDecoration: 'underline'}}>Consola Nativa de Google Firebase</a>.
              </div>
            </div>
          </div>
          
          <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', margin: 0 }}>Cuentas de Acceso al CRM</h3>
            <button className="btn-primary" onClick={() => { setUserForm({id:'', nombre:'', email:'', password:'', rol:'trabajador', activo:true}); setIsUserModalOpen(true); }}>
              <Plus size={14} /> Nuevo Usuario
            </button>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email de Acceso</th>
                <th>Nivel de Permisos</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const r = rolesMap[u.rol];
                return (
                  <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.nombre}</td>
                    <td style={{ fontSize: '13px' }}>{u.email}</td>
                    <td>
                      <span style={{ background: r.bg, color: r.color, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={12} /> {r.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {u.activo ? (
                        <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500 }}><CheckCircle size={14} /> Activo</span>
                      ) : (
                        <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500 }}><UserX size={14} /> Suspendido</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => { setUserForm(u); setIsUserModalOpen(true); }}>Administrar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {isUserModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{userForm.id ? 'Editar Acceso' : 'Nuevo Usuario'}</h2>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Nombre y Apellidos</label>
                <input type="text" value={userForm.nombre} onChange={e => setUserForm({...userForm, nombre: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Email Idéntico de Acceso (Usuario Login)</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="El email donde le generaste la cuenta real..." />
              </div>
              <div className="form-group full-width">
                <label>Rol de Usuario</label>
                <select value={userForm.rol} onChange={e => setUserForm({...userForm, rol: e.target.value})}>
                  <option value="admin">Administrador (Total)</option>
                  <option value="jefe">Jefe de Obra (Ver obras y pedidos)</option>
                  <option value="logistica">Logística (Almacén)</option>
                  <option value="trabajador">Trabajador Base (Solo sus partes y pedidos)</option>
                </select>
              </div>
              <div className="form-group full-width" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={userForm.activo} onChange={e => setUserForm({...userForm, activo: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Usuario con permiso de acceso activo
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsUserModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleUserSave}>{userForm.id ? 'Guardar Cambios' : 'Crear Acceso'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
