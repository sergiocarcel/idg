import React, { useState } from 'react';
import { Settings, Users, Save, Upload, Plus, Edit2, Shield, UserX, CheckCircle, UploadCloud } from 'lucide-react';
import { saveDoc } from '../../services/db';

export default function Configuracion({ data, setData }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'usuarios'
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [empresa, setEmpresa] = useState(data?.config?.empresa || {
    nombre: 'Innovate Design Group',
    nif: 'B-12345678',
    direccion: 'Calle Principal 123, Madrid',
    telefono: '+34 600 000 000',
    email: 'contacto@idg.es',
    iban: 'ES00 0000 0000 0000 0000 0000',
    pieFactura: 'Inscrita en el Registro Mercantil...',
    logoId: ''
  });

  const [usuarios, setUsuarios] = useState(data?.config?.usuarios || [
    { id: 'U1', nombre: 'Admin Default', email: 'admin@idg.es', rol: 'admin', activo: true }
  ]);

  const [userForm, setUserForm] = useState({ id: '', nombre: '', email: '', password: '', rol: 'trabajador', activo: true });

  const handleEmpresaChange = (field) => (e) => setEmpresa({ ...empresa, [field]: e.target.value });
  
  const saveEmpresa = async () => {
    await saveDoc('config', 'empresa', empresa);
    alert('Datos de empresa guardados correctamente.');
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
            <h3 style={{ fontSize: '14px', marginBottom: '16px', textAlign: 'left' }}>Logotipo Coporativo</h3>
            <div style={{ width: '100%', height: '160px', background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <UploadCloud size={32} className="text-blue-500" />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG transparente recomendado</span>
            </div>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Seleccionar Imagen</button>
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
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn-primary" onClick={saveEmpresa}><Save size={16} /> Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
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
                <label>Email (Usuario login)</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
              </div>
              {!userForm.id && (
                <div className="form-group full-width">
                  <label>Contraseña Temporal</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                </div>
              )}
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
