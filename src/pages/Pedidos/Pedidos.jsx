import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, ShoppingCart, PackageCheck, Paperclip, Loader2, MessageCircle, Mail } from 'lucide-react';
import { saveDoc, deleteDoc, updateDoc } from '../../services/db';
import { openWhatsApp, sendEmail } from '../../utils/sendUtils';

export default function Pedidos({ data, setData, userName, userEmail }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);

  const initialForm = { descripcion: '', obraId: '', prioridad: 'no_urgente', notas: '', albaranUrl: '', trabajadorId: '' };
  const [formData, setFormData] = useState(initialForm);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifyModal, setNotifyModal] = useState(null);

  const pedidos = data?.pedidos || [];
  const obras = data?.obras || [];
  const trabajadores = data?.trabajadores || [];

  const getObraName = (id) => obras.find(o => o.id === id)?.nombre || 'Almacén Central';

  const generateId = () => 'PED-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const renderDescripcion = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const tLine = line.trim();
      if (tLine.startsWith('- ') || tLine.startsWith('• ')) {
        return (
          <div key={i} style={{ display: 'flex', gap: '6px', marginTop: '2px', marginLeft: '4px' }}>
            <span style={{ color: 'var(--accent)' }}>•</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{tLine.substring(2)}</span>
          </div>
        );
      }
      return <div key={i} style={{ minHeight: line ? '18px' : '8px', marginTop: i > 0 && !line ? '4px' : 0 }}>{line}</div>;
    });
  };

  const handleSave = async () => {
    if (!formData.descripcion.trim()) return alert('Indica qué material o qué se necesita.');
    if (!formData.trabajadorId) return alert('Selecciona el trabajador solicitante.');
    
    setIsSaving(true);
    try {
      const docId = selectedPedido ? selectedPedido.id : generateId();
      const base = {
        ...formData,
        id: docId,
        solicitante: userEmail || '',
        solicitanteNombre: userName || userEmail || 'Usuario',
      };
      const docData = selectedPedido
        ? base
        : { ...base, estado: 'pedido', createdAt: new Date().toISOString() };
      await saveDoc('pedidos', docId, docData);

      if (!selectedPedido) {
        const usuarios = data?.config?.usuarios || [];
        const destinatarios = usuarios
          .filter(u => u.rol === 'logistica' && u.activo !== false)
          .map(u => u.email)
          .filter(Boolean);
        if (destinatarios.length > 0) {
          const notifId = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
          const obraName = obras.find(o => o.id === formData.obraId)?.nombre || 'Almacén Central';
          const urgenteTxt = formData.prioridad === 'urgente' ? '⚡ URGENTE — ' : '';
          await saveDoc('notificaciones', notifId, {
            id: notifId,
            tipo: formData.prioridad === 'urgente' ? 'alerta' : 'info',
            mensaje: `${urgenteTxt}Nuevo pedido de ${base.solicitanteNombre}: "${formData.descripcion}" (${obraName})`,
            leida: false,
            fecha: new Date().toISOString(),
            link: '/pedidos',
            destinatarios
          });
        }

        // Notificación al trabajador solicitante si tiene contacto
        const trabajador = trabajadores.find(t => t.id === formData.trabajadorId);
        if (trabajador && (trabajador.email || trabajador.telefono)) {
          const obraNombre = obras.find(o => o.id === formData.obraId)?.nombre || 'Almacén Central';
          setIsModalOpen(false);
          setSelectedPedido(null);
          setNotifyModal({ trabajador, pedido: docData, obraNombre });
          return;
        }
      }

      setIsModalOpen(false);
      setSelectedPedido(null);
    } catch (e) {
      console.error(e);
      alert('Error guardando la solicitud.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAlbaranUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
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
    if (!window.confirm('¿Eliminar este pedido permanentemente?')) return;
    await deleteDoc('pedidos', id);
  };

  const openForm = (pedido = null) => {
    if (pedido) {
      setFormData({
        descripcion: pedido.descripcion || pedido.material || '',
        obraId: pedido.obraId || '',
        prioridad: pedido.prioridad || 'no_urgente',
        notas: pedido.notas || '',
        albaranUrl: pedido.albaranUrl || '',
        trabajadorId: pedido.trabajadorId || '',
      });
      setSelectedPedido(pedido);
    } else {
      setFormData(initialForm);
      setSelectedPedido(null);
    }
    setIsModalOpen(true);
  };

  const markEntregado = async (id) => {
    await updateDoc('pedidos', id, { estado: 'entregado' });
  };

  const estadoBadge = (estado) => {
    const isPedido = estado !== 'entregado';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: isPedido ? '#dbeafe' : '#dcfce7',
        color: isPedido ? '#2563eb' : '#16a34a',
        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
      }}>
        {isPedido ? <ShoppingCart size={12} /> : <PackageCheck size={12} />}
        {isPedido ? 'Pedido' : 'Entregado'}
      </span>
    );
  };

  const prioridadBadge = (prioridad) => {
    const urgente = prioridad === 'urgente';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        background: urgente ? '#fef2f2' : '#f1f5f9',
        color: urgente ? '#dc2626' : '#64748b',
        padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.3px'
      }}>
        {urgente ? '⚡ Urgente' : 'Normal'}
      </span>
    );
  };

  const totalPedidos = pedidos.filter(p => p.estado !== 'entregado').length;
  const totalUrgentes = pedidos.filter(p => p.prioridad === 'urgente' && p.estado !== 'entregado').length;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Pedidos de Material</h1>
          <p className="page-subtitle">Peticiones de material para obra.</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={16} /> Solicitar Material
        </button>
      </header>

      {/* Tarjetas resumen */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '12px' }}>Pendientes de entrega</h3>
          <div className="stat-value" style={{ color: '#2563eb' }}>{totalPedidos}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', borderTop: '4px solid #dc2626' }}>
          <h3 style={{ fontSize: '12px' }}>Urgentes</h3>
          <div className="stat-value" style={{ color: '#dc2626' }}>{totalUrgentes}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Prioridad</th>
              <th>Obra</th>
              <th>Solicitante</th>
              <th>Estado</th>
              <th style={{ textAlign: 'center' }}>Albarán</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No hay solicitudes de material activas</td></tr>
            )}
            {pedidos.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '280px' }}>
                    {renderDescripcion(p.descripcion || `${p.cantidad || ''} ${p.material || ''}`.trim())}
                  </div>
                  {p.notas && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notas}</div>}
                </td>
                <td>{prioridadBadge(p.prioridad)}</td>
                <td style={{ fontSize: '12px', fontWeight: 500 }}>{getObraName(p.obraId)}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.solicitanteNombre || p.asignadoA || '—'}</td>
                <td>{estadoBadge(p.estado)}</td>
                <td style={{ textAlign: 'center' }}>
                  {p.albaranUrl
                    ? <a href={p.albaranUrl} target="_blank" rel="noopener noreferrer" title="Ver albarán adjunto" style={{ color: '#3b82f6' }}><Paperclip size={14} /></a>
                    : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {p.estado !== 'entregado' ? (
                      <button onClick={async () => await updateDoc('pedidos', p.id, { estado: 'entregado' })} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                        <PackageCheck size={12} /> Entregado
                      </button>
                    ) : (
                      <button onClick={async () => await updateDoc('pedidos', p.id, { estado: 'pedido' })} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                        <ShoppingCart size={12} /> Marcar pdte.
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => openForm(p)} title="Editar"><Edit2 size={14} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal notificación al trabajador */}
      {notifyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h2>Notificar al trabajador</h2>
              <button className="icon-btn" onClick={() => setNotifyModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                ¿Cómo quieres avisar a <strong>{notifyModal.trabajador.nombre} {notifyModal.trabajador.apellidos || ''}</strong> del nuevo pedido?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifyModal.trabajador.telefono && (
                  <button
                    className="btn-secondary"
                    style={{ justifyContent: 'flex-start', gap: '10px', padding: '12px 16px' }}
                    onClick={() => {
                      const { trabajador, pedido, obraNombre } = notifyModal;
                      const msg = `Hola ${trabajador.nombre}, se ha creado un nuevo pedido para la obra "${obraNombre}":\n\n${pedido.descripcion}\n\nPrioridad: ${pedido.prioridad === 'urgente' ? 'URGENTE' : 'No urgente'}\n\nPara más detalles entra en el CRM.`;
                      openWhatsApp(trabajador.telefono, msg);
                      setNotifyModal(null);
                    }}
                  >
                    <MessageCircle size={16} style={{ color: '#25D366' }} />
                    <span>WhatsApp</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{notifyModal.trabajador.telefono}</span>
                  </button>
                )}
                {notifyModal.trabajador.email && (
                  <button
                    className="btn-secondary"
                    style={{ justifyContent: 'flex-start', gap: '10px', padding: '12px 16px' }}
                    onClick={async () => {
                      const { trabajador, pedido, obraNombre } = notifyModal;
                      const message = `Hola ${trabajador.nombre},\n\nSe ha creado un nuevo pedido para la obra "${obraNombre}":\n\n${pedido.descripcion}\n\nPrioridad: ${pedido.prioridad === 'urgente' ? 'URGENTE' : 'No urgente'}\n\nPara más información entra en el CRM.\n\n— IDG`;
                      const result = await sendEmail(import.meta.env.VITE_EMAILJS_TEMPLATE_PORTAL, {
                        to_email: trabajador.email,
                        to_name: `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim(),
                        subject: `Nuevo pedido asignado — ${obraNombre}`,
                        message,
                        from_name: 'IDG',
                      });
                      if (result.success) alert('✅ Email enviado correctamente');
                      else alert('❌ Error al enviar email: ' + (result.error || 'Error desconocido'));
                      setNotifyModal(null);
                    }}
                  >
                    <Mail size={16} style={{ color: '#3b82f6' }} />
                    <span>Email</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{notifyModal.trabajador.email}</span>
                  </button>
                )}
                <button
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', gap: '10px', padding: '12px 16px', color: 'var(--text-muted)' }}
                  onClick={() => setNotifyModal(null)}
                >
                  <X size={16} />
                  <span>Ninguna, omitir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedPedido ? 'Editar solicitud' : 'Nueva solicitud de material'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">

              {/* Descripción libre */}
              <div className="form-group full-width">
                <label>¿Qué se necesita? *</label>
                <textarea
                  value={formData.descripcion}
                  onChange={handleInputChange('descripcion')}
                  rows="6"
                  placeholder="Ej: 10 sacos de cemento + 2 cubos de pintura blanca"
                  autoFocus
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Prioridad */}
              <div className="form-group full-width">
                <label>Prioridad</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { value: 'no_urgente', label: 'No urgente', sub: 'Entrega en 1–3 días', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', selBg: '#f1f5f9', selBorder: '#64748b' },
                    { value: 'urgente', label: '⚡ Urgente', sub: 'Entrega mañana', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', selBg: '#fef2f2', selBorder: '#dc2626' },
                  ].map(opt => {
                    const selected = formData.prioridad === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, prioridad: opt.value })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                          border: `2px solid ${selected ? opt.color : opt.border}`,
                          background: selected ? opt.selBg : '#fff',
                          outline: 'none',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '13px', color: selected ? opt.color : 'var(--text-main)' }}>{opt.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Obra */}
              <div className="form-group full-width">
                <label>Para qué obra</label>
                <select value={formData.obraId} onChange={handleInputChange('obraId')}>
                  <option value="">Almacén Central (Uso general)</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>

              {/* Trabajador solicitante */}
              <div className="form-group full-width">
                <label>¿A quién le solicitas el pedido? *</label>
                <select value={formData.trabajadorId} onChange={handleInputChange('trabajadorId')}>
                  <option value="">Seleccionar trabajador...</option>
                  {[...trabajadores]
                    .sort((a, b) => {
                      const nameA = `${a.nombre} ${a.apellidos || ''}`.trim().toLowerCase();
                      const nameB = `${b.nombre} ${b.apellidos || ''}`.trim().toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} {t.apellidos || ''}</option>
                  ))}
                </select>
              </div>

              {/* Notas opcionales */}
              <div className="form-group full-width">
                <label>Notas adicionales <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                <textarea
                  value={formData.notas}
                  onChange={handleInputChange('notas')}
                  rows="2"
                  placeholder="Aclaraciones, marca específica, referencia..."
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Albarán */}
              <div className="form-group full-width">
                <label>Adjuntar albarán / factura <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
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
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> Guardando...</> : (selectedPedido ? 'Actualizar' : 'Enviar Solicitud')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
