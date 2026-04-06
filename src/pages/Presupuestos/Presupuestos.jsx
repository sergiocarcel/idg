import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, FileText, Download, Copy, Eye, Send, Lock, BookOpen, RotateCcw, Mail, Link2, X, MoreHorizontal, CheckCircle, Printer } from 'lucide-react';
import { openWhatsApp, openEmailComposer } from '../../utils/sendUtils';
import { saveDoc, deleteDoc } from '../../services/db';
import PresupuestoEditor from './PresupuestoEditor.jsx';
import PresupuestoPrint from './PresupuestoPrint.jsx';
import CatalogoPartidas from './CatalogoPartidas.jsx';

export default function Presupuestos({ data, setData, forceMode }) {
  const [filter, setFilter] = useState('todos');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCatalogoOpen, setIsCatalogoOpen] = useState(false);
  const [selectedPpto, setSelectedPpto] = useState(null);
  const [printPpto, setPrintPpto] = useState(null);
  const [printMode, setPrintMode] = useState('cliente');
  const [linkObraModal, setLinkObraModal] = useState(null); // ppto pendiente de vincular a obra
  const [openMenu, setOpenMenu] = useState(null); // ppto.id for "more" dropdown

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenu) return;
    const close = (e) => {
      // Don't close if clicking inside the dropdown
      if (e.target.closest('[data-menu-dropdown]')) return;
      setOpenMenu(null);
    };
    // Use setTimeout so the listener is added after the current click event
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [openMenu]);


  const presupuestos = data?.presupuestos || [];
  const clientes = data?.clientes || [];

  const getClientName = (id) => clientes.find(c => c.id === id)?.nombre || 'Cliente desconocido';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const isExpired = (fechaStr, estado) => {
    if (estado !== 'enviado') return false;
    const pptoDate = new Date(fechaStr);
    const today = new Date();
    const diffDays = Math.ceil((today - pptoDate) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  };

  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'borrador': return { bg: '#f1f5f9', color: '#475569', label: 'Borrador' };
      case 'enviado': return { bg: '#dbeafe', color: '#2563eb', label: 'Enviado' };
      case 'aceptado': return { bg: '#dcfce7', color: '#16a34a', label: 'Aceptado' };
      case 'rechazado': return { bg: '#fef2f2', color: '#dc2626', label: 'Rechazado' };
      default: return { bg: '#fef3c7', color: '#d97706', label: 'Pendiente' };
    }
  };

  const handleCreate = () => {
    setSelectedPpto(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (ppto) => {
    setSelectedPpto(ppto);
    setIsEditorOpen(true);
  };

  const handleSave = async (savedPpto) => {
    await saveDoc('presupuestos', savedPpto.id, savedPpto);
    setIsEditorOpen(false);
  };

  const calculateTotal = (ppto) => {
    if (!ppto.capitulos) return 0;
    return ppto.capitulos.reduce((totalCap, cap) => {
      const capTotal = cap.partidas?.reduce((sum, p) => sum + (p.cantidad * p.precioVenta), 0) || 0;
      return totalCap + capTotal;
    }, 0);
  };

  const filteredPptos = filter === 'todos' 
    ? presupuestos.filter(p => p.estado !== 'eliminado') 
    : presupuestos.filter(p => p.estado === filter);

  const totalAceptado = presupuestos.filter(p => p.estado === 'aceptado').reduce((sum, p) => sum + calculateTotal(p), 0);
  const totalEnviado = presupuestos.filter(p => p.estado === 'enviado').reduce((sum, p) => sum + calculateTotal(p), 0);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-subtitle">Gestiona las valoraciones económicas de tus obras.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setIsCatalogoOpen(true)}>
            <BookOpen size={16} /> Catálogo Maestro
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={16} /> Nuevo Presupuesto
          </button>
        </div>
      </header>

      {/* Tarjetas resumen */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '12px' }}>Total Aceptados</h3>
          <div className="stat-value" style={{ color: '#16a34a' }}>{formatCurrency(totalAceptado)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '12px' }}>Pendientes de Respuesta</h3>
          <div className="stat-value" style={{ color: '#2563eb' }}>{formatCurrency(totalEnviado)}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {presupuestos.filter(p => p.estado === 'enviado').length} documentos enviados
          </p>
        </div>
      </div>

      {/* Lista contenedora */}
      <div className="stat-card" style={{ padding: 0 }}>
        
        {/* Toolbar de filtros */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'todos', label: 'Todos los Pptos.' },
            { id: 'borrador', label: 'Borradores' },
            { id: 'enviado', label: 'Enviados' },
            { id: 'aceptado', label: 'Aceptados' },
            { id: 'rechazado', label: 'Rechazados' },
            { id: 'eliminado', label: '🗑️ Papelera' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? 'var(--text-main)' : 'rgba(0,0,0,0.03)',
                color: filter === f.id ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: filter === f.id ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabla principal */}
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha de Creación</th>
              <th>Importe Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPptos.length === 0 && (
              <tr><td colSpan="6" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay presupuestos en esta categoría</td></tr>
            )}
            {filteredPptos.map(ppto => {
              const status = getStatusStyle(ppto.estado);
              return (
                <tr key={ppto.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{ppto.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{getClientName(ppto.clienteId)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ref: {ppto.obraId || 'S/N'}</div>
                  </td>
                  <td>{new Date(ppto.fecha).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '600' }}>{formatCurrency(calculateTotal(ppto))}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {status.label}
                      </span>
                      {isExpired(ppto.fecha, ppto.estado) && (
                        <span title="Han pasado más de 7 días desde el envío" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center' }}>
                          ¡+7 DÍAS!
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Siempre visible: Editar */}
                      <button className="icon-btn" onClick={() => handleEdit(ppto)} title="Editar presupuesto"><Edit2 size={14} /></button>

                      {/* Siempre visible: PDF Cliente */}
                      <button className="icon-btn" onClick={() => { setPrintMode('cliente'); setPrintPpto(ppto); }} title="Generar PDF"><Printer size={14} /></button>

                      {/* Papelera / Restaurar */}
                      {ppto.estado !== 'eliminado' ? (
                        <button className="icon-btn danger" onClick={async () => { if(window.confirm('¿Mover a papelera?')) await saveDoc('presupuestos', ppto.id, { ...ppto, estado: 'eliminado' }); }} title="Mover a papelera"><Trash2 size={14} /></button>
                      ) : (
                        <>
                          <button className="icon-btn" onClick={async () => { await saveDoc('presupuestos', ppto.id, { ...ppto, estado: 'borrador' }); }} title="Restaurar" style={{ color: '#16a34a' }}><RotateCcw size={14} /></button>
                          <button className="icon-btn danger" onClick={async () => { if(window.confirm('¿Eliminar PERMANENTEMENTE?')) await deleteDoc('presupuestos', ppto.id); }} title="Eliminar definitivo"><Trash2 size={14} /></button>
                        </>
                      )}

                      {/* Menú "Más opciones" */}
                      {ppto.estado !== 'eliminado' && (
                        <div style={{ position: 'relative' }}>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === ppto.id ? null : ppto.id); }} title="Más opciones"><MoreHorizontal size={14} /></button>
                          {openMenu === ppto.id && (
                            <div data-menu-dropdown style={{
                              position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                              background: '#fff', border: '1px solid var(--border)', borderRadius: '8px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
                              width: '200px', padding: '4px 0', fontSize: '12px'
                            }}>
                              {/* PDF Dirección */}
                              <button onClick={() => { setPrintMode('direccion'); setPrintPpto(ppto); setOpenMenu(null); }}
                                style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', textAlign: 'left' }}>
                                <Printer size={13} /> PDF Dirección (Interno)
                              </button>
                              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
                              {/* WhatsApp */}
                              {ppto.estado !== 'borrador' && (
                                <button onClick={() => {
                                  openWhatsApp(
                                    clientes.find(c => c.id === ppto.clienteId)?.telefono || '',
                                    'Hola ' + getClientName(ppto.clienteId) + ', te enviamos el presupuesto ' + ppto.id + ' por importe de ' + formatCurrency(calculateTotal(ppto)) + ' (+ IVA). Saludos, IDG.'
                                  );
                                  setOpenMenu(null);
                                }}
                                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#25D366', textAlign: 'left' }}>
                                  <Send size={13} /> Enviar por WhatsApp
                                </button>
                              )}
                              {/* Email */}
                              {ppto.estado !== 'borrador' && (
                                <button
                                  onClick={() => {
                                    openEmailComposer(
                                      clientes.find(c => c.id === ppto.clienteId)?.email || '',
                                      'Presupuesto ' + ppto.id + ' - IDG',
                                      'Estimado/a ' + getClientName(ppto.clienteId) + ',\n\nAdjuntamos el presupuesto referencia ' + ppto.id + ' por un importe de ' + formatCurrency(calculateTotal(ppto)) + ' (+ IVA).\n\nQuedamos a su disposición.\nSaludos,\nIDG'
                                    );
                                    setOpenMenu(null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', textAlign: 'left' }}>
                                  <Mail size={13} /> Enviar por Email
                                </button>
                              )}
                              {/* Marcar como Aceptado */}
                              {ppto.estado === 'enviado' && (
                                <button onClick={async () => {
                                  await saveDoc('presupuestos', ppto.id, { ...ppto, estado: 'aceptado' });
                                  if (!ppto.obraId) setLinkObraModal(ppto);
                                  setOpenMenu(null);
                                }}
                                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', textAlign: 'left' }}>
                                  <CheckCircle size={13} /> Marcar como Aceptado
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isEditorOpen && (
        <PresupuestoEditor 
          ppto={selectedPpto} 
          data={data} 
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSave}
        />
      )}

      {printPpto && (
        <PresupuestoPrint
          ppto={printPpto}
          data={data}
          mode={forceMode || printMode}
          onClose={() => setPrintPpto(null)}
        />
      )}

      {isCatalogoOpen && (
        <CatalogoPartidas data={data} onClose={() => setIsCatalogoOpen(false)} />
      )}

      {/* Modal vincular presupuesto aceptado a obra */}
      {linkObraModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Vincular a Obra</h2>
              <button className="icon-btn" onClick={() => setLinkObraModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                El presupuesto <strong>{linkObraModal.id}</strong> ha sido aceptado. Selecciona la obra a la que vincular:
              </p>
              <select id="linkObraSelect" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>
                <option value="">Selecciona obra...</option>
                {(data?.obras || []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setLinkObraModal(null)}>Omitir</button>
              <button className="btn-primary" onClick={async () => {
                const obraId = document.getElementById('linkObraSelect').value;
                if (!obraId) return;
                await saveDoc('presupuestos', linkObraModal.id, { ...linkObraModal, estado: 'aceptado', obraId });
                const obra = (data?.obras || []).find(o => o.id === obraId);
                if (obra) await saveDoc('obras', obraId, { ...obra, presupuestoId: linkObraModal.id });
                setLinkObraModal(null);
              }}>Vincular</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
