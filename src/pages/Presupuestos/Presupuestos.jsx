import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, FileText, Download, Copy, Eye, Send, Lock, BookOpen, RotateCcw, Mail, Link2, X, MoreHorizontal, CheckCircle, Printer, MessageCircle, LayoutTemplate, FileSignature, RefreshCw, Paperclip } from 'lucide-react';
import { openWhatsApp, sendEmail } from '../../utils/sendUtils';
import { generatePdfFromElement, generatePresupuestoPdf } from '../../utils/pdfUtils';
import { saveDoc, deleteDoc, updateDoc } from '../../services/db';
import { createAndSendSigningRequest, checkSigningStatus, blobToBase64 } from '../../services/firmadev';
import PresupuestoEditor from './PresupuestoEditor.jsx';
import PresupuestoPrint from './PresupuestoPrint.jsx';
import SignatureCanvas from '../../components/shared/SignatureCanvas.jsx';
import CatalogoPartidas from './CatalogoPartidas.jsx';

export default function Presupuestos({ data, setData, forceMode }) {
  const [filter, setFilter] = useState('todos');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCatalogoOpen, setIsCatalogoOpen] = useState(false);
  const [selectedPpto, setSelectedPpto] = useState(null);
  const [printPpto, setPrintPpto] = useState(null);
  const [printMode, setPrintMode] = useState('cliente');
  const [linkObraModal, setLinkObraModal] = useState(null); // ppto pendiente de vincular a obra
  const [pdfSelectionModal, setPdfSelectionModal] = useState(null); // ppto para elegir version de pdf
  const [openMenu, setOpenMenu] = useState(null); // ppto.id for "more" dropdown
  const [previewPpto, setPreviewPpto] = useState(null);       // ppto en preview (email o whatsapp)
  const [previewChannel, setPreviewChannel] = useState(null); // 'email' | 'whatsapp'
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [saveTemplateModal, setSaveTemplateModal] = useState(null); // ppto a guardar como plantilla
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [checkingFirma, setCheckingFirma] = useState(null); // ppto.id mientras consulta estado firma
  const [firmaSuccessModal, setFirmaSuccessModal] = useState(null); // { ppto, cliente, signingLink } tras envío
  const [companySignature, setCompanySignature] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(null); // ppto.id mientras genera PDF export
  const printRef = useRef(null);

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

  const handleExportPdf = async (ppto, mode) => {
    setPdfSelectionModal(null);
    setExportingPdf(ppto.id);
    try {
      const { blob, filename } = await generatePresupuestoPdf(ppto, data, mode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setExportingPdf(null);
    }
  };

  const openPreview = (ppto, channel) => {
    setOpenMenu(null);
    const cliente = clientes.find(c => c.id === ppto.clienteId);
    if (channel === 'email' && !cliente?.email) return alert('El cliente no tiene email configurado. Añádelo en la ficha del cliente.');
    if (channel === 'whatsapp' && !cliente?.telefono) return alert('El cliente no tiene teléfono configurado. Añádelo en la ficha del cliente.');
    if (channel === 'firma' && !cliente?.email) return alert('El cliente necesita email para la firma electrónica. Añádelo en la ficha del cliente.');
    if (channel === 'firma' && !import.meta.env.VITE_FIRMADEV_API_KEY) return alert('La API Key de firma.dev no está configurada. Añade VITE_FIRMADEV_API_KEY al .env y redesplega.');
    setPreviewPpto(ppto);
    setPreviewChannel(channel);
  };

  const buildPdfMessage = (ppto, cliente, pdfUrl) => {
    const baseTotal = calculateTotal(ppto);
    const totalConIva = baseTotal * 1.21;
    const extras = ppto.extras || [];
    return [
      `Hola ${cliente.nombre},`,
      ``,
      `Te enviamos el presupuesto ${ppto.id} por un importe de ${formatCurrency(totalConIva)} (IVA incluido).`,
      ...extras.map(ext => {
        const extBase = (ext.partidas || []).reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
        return `Extra "${ext.nombre}": ${formatCurrency(extBase * 1.21)} (IVA incluido)`;
      }),
      ``,
      `Puedes descargarlo aquí:`,
      pdfUrl,
      ``,
      `Quedamos a tu disposición.`,
      `Saludos,`,
      `IDG`
    ].join('\n');
  };

  const handleConfirmSend = async () => {
    const ppto = previewPpto;
    const cliente = clientes.find(c => c.id === ppto.clienteId);
    setSendingEmailId(ppto.id);
    try {
      // 1. Capturar PDF del contenido visible del modal
      const element = printRef.current?.querySelector('.print-container') || printRef.current;
      const { blob } = await generatePdfFromElement(element, `Presupuesto_${ppto.id}.pdf`);

      if (previewChannel === 'firma') {
        // ── Canal firma.dev ──────────────────────────────────────
        const base64 = await blobToBase64(blob);
        // Contar páginas del PDF para apuntar el campo de firma a la última
        const arrayBuffer = await blob.arrayBuffer();
        const pdfText = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));
        const pageCount = Math.max(1, (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length);
        const firmaResponse = await createAndSendSigningRequest(
          base64,
          cliente,
          `Presupuesto ${ppto.id} - ${cliente.nombre}`,
          pageCount
        );
        const signingLink = firmaResponse.first_signer?.signing_link || '';

        // Guardar datos de firma en Firestore y marcar como enviado
        await updateDoc('presupuestos', ppto.id, {
          firmaRequestId: firmaResponse.id,
          firmaEstado: 'enviado',
          estado: 'enviado',
          firmaUrl: signingLink,
          firmaFecha: new Date().toISOString(),
        });

        setPreviewPpto(null);
        setCompanySignature(null);
        setSendingEmailId(null);
        setFirmaSuccessModal({ ppto, cliente, signingLink });
      } else {
        // ── Canal email / whatsapp ───────────────────────────────
        const fd = new FormData();
        fd.append('file', blob, `Presupuesto_${ppto.id}.pdf`);
        fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        fd.append('folder', `presupuestos/${ppto.id}`);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
        const uploaded = await res.json();
        if (uploaded.error) throw new Error(uploaded.error.message);

        const message = buildPdfMessage(ppto, cliente, uploaded.secure_url);

        if (previewChannel === 'email') {
          const result = await sendEmail(
            import.meta.env.VITE_EMAILJS_TEMPLATE_PORTAL,
            { to_email: cliente.email, to_name: cliente.nombre, subject: `Presupuesto ${ppto.id} - IDG`, message, from_name: 'IDG' }
          );
          setPreviewPpto(null);
          setSendingEmailId(null);
          if (result.success) alert(`✅ Email enviado correctamente a ${cliente.email}`);
          else alert('No se pudo enviar el email. ' + (result.error || 'Revisa la configuración de EmailJS.'));
        } else {
          setPreviewPpto(null);
          setSendingEmailId(null);
          openWhatsApp(cliente.telefono, message);
        }
      }
    } catch (err) {
      setSendingEmailId(null);
      alert('Error generando o enviando el PDF: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleCheckFirma = async (ppto) => {
    setCheckingFirma(ppto.id);
    try {
      const statusData = await checkSigningStatus(ppto.firmaRequestId);
      const finished = statusData.status?.finished === true || statusData.finished === true;
      const declined = statusData.status?.declined === true || statusData.declined === true;
      const certGenerated = statusData.certificate?.generated === true;
      const signedDocUrl = statusData.final_document_download_url || statusData.document_only_download_url;

      if (finished && signedDocUrl) {
        // Descargar PDF firmado de firma.dev y subir a Cloudinary para almacenamiento permanente
        const pdfBlob = await fetch(signedDocUrl).then(r => r.blob());
        const fd = new FormData();
        fd.append('file', pdfBlob, `Presupuesto_${ppto.id}_FIRMADO.pdf`);
        fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
        fd.append('folder', ppto.obraId ? `obras/${ppto.obraId}` : `presupuestos/${ppto.id}`);
        const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd }).then(r => r.json());
        if (uploaded.error) throw new Error(uploaded.error.message);

        await updateDoc('presupuestos', ppto.id, {
          firmaEstado: 'firmado',
          estado: 'aceptado',
          pdfFirmadoUrl: uploaded.secure_url,
          firmaFechaFirmado: new Date().toISOString(),
        });

        if (ppto.obraId) {
          const obra = (data?.obras || []).find(o => o.id === ppto.obraId);
          if (obra) {
            const newFile = {
              id: Date.now().toString(),
              name: `Presupuesto_${ppto.id}_FIRMADO.pdf`,
              url: uploaded.secure_url,
              type: 'document',
              size: pdfBlob.size,
              date: new Date().toISOString()
            };
            await updateDoc('obras', ppto.obraId, { archivos: [newFile, ...(obra.archivos || [])] });
          }
        }

        if (!ppto.obraId) setLinkObraModal({ ...ppto, estado: 'aceptado' });
        alert('✅ El presupuesto ha sido firmado y marcado como Aceptado.');
      } else if (finished && !signedDocUrl) {
        alert('✅ Firmado, pero el certificado aún se está generando. Inténtalo en unos segundos.');
      } else if (declined) {
        await updateDoc('presupuestos', ppto.id, { firmaEstado: 'rechazado', estado: 'rechazado' });
        alert('❌ El cliente ha rechazado la firma.');
      } else {
        alert('⏳ El cliente todavía no ha firmado el documento.');
      }
    } catch (err) {
      alert('Error comprobando estado de firma: ' + (err.message || 'Error desconocido'));
    }
    setCheckingFirma(null);
  };

  const handleSaveTemplate = async () => {
    const ppto = saveTemplateModal;
    if (!saveTemplateName.trim()) return alert('Ponle un nombre a la plantilla.');
    const templateId = 'TPL-' + Date.now();
    await saveDoc('plantillasPresupuesto', templateId, {
      id: templateId,
      nombre: saveTemplateName.trim(),
      capitulos: JSON.parse(JSON.stringify(ppto.capitulos || [])),
      extras: JSON.parse(JSON.stringify(ppto.extras || [])),
      condicionesPresupuesto: ppto.condicionesPresupuesto || '',
      createdAt: new Date().toISOString(),
    });
    setSaveTemplateModal(null);
    setSaveTemplateName('');
    alert(`✅ Plantilla "${saveTemplateName.trim()}" guardada correctamente.`);
  };

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
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{ppto.id}</div>
                    {ppto.etiqueta && <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '2px', fontWeight: 500 }}>{ppto.etiqueta}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{getClientName(ppto.clienteId)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ref: {ppto.obraId || 'S/N'}</div>
                  </td>
                  <td>{new Date(ppto.fecha).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '600' }}>{formatCurrency(calculateTotal(ppto))}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {status.label}
                      </span>
                      {isExpired(ppto.fecha, ppto.estado) && (
                        <span title="Han pasado más de 7 días desde el envío" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center' }}>
                          ¡+7 DÍAS!
                        </span>
                      )}
                      {ppto.firmaEstado === 'enviado' && (
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <FileSignature size={10} /> Pte. firma
                        </span>
                      )}
                      {ppto.firmaEstado === 'firmado' && (
                        <a href={ppto.pdfFirmadoUrl} target="_blank" rel="noopener noreferrer" title="Ver PDF firmado"
                          style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                          <FileSignature size={10} /> Firmado <Paperclip size={9} />
                        </a>
                      )}
                      {ppto.firmaEstado === 'rechazado' && (
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <FileSignature size={10} /> Firma rechazada
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Comprobar firma — visible cuando hay firma pendiente */}
                      {ppto.firmaEstado === 'enviado' && (
                        <button className="icon-btn" onClick={() => handleCheckFirma(ppto)} disabled={checkingFirma === ppto.id}
                          title="Comprobar si el cliente ya ha firmado"
                          style={{ color: '#d97706', borderColor: '#fcd34d' }}>
                          {checkingFirma === ppto.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                        </button>
                      )}

                      {/* Siempre visible: Editar */}
                      <button className="icon-btn" onClick={() => handleEdit(ppto)} title="Editar presupuesto"><Edit2 size={14} /></button>

                      {/* Siempre visible: Selector de PDF */}
                      <button className="icon-btn" onClick={() => setPdfSelectionModal(ppto)} title="Exportar PDF"><Printer size={14} /></button>

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
                              {/* Firma electrónica */}
                              {ppto.estado !== 'aceptado' && ppto.estado !== 'rechazado' && (
                                <button onClick={() => openPreview(ppto, 'firma')}
                                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', textAlign: 'left' }}>
                                  <FileSignature size={13} /> Enviar para Firmar
                                </button>
                              )}
                              {/* WhatsApp */}
                              <button onClick={() => openPreview(ppto, 'whatsapp')}
                                style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#25D366', textAlign: 'left' }}>
                                <MessageCircle size={13} /> Enviar por WhatsApp (PDF)
                              </button>
                              {/* Email */}
                              <button onClick={() => openPreview(ppto, 'email')}
                                style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', textAlign: 'left' }}>
                                <Mail size={13} /> Enviar por Email (PDF)
                              </button>
                              {/* Guardar como plantilla */}
                              <button onClick={() => { setSaveTemplateModal(ppto); setSaveTemplateName(''); setOpenMenu(null); }}
                                style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', textAlign: 'left' }}>
                                <LayoutTemplate size={13} /> Guardar como Plantilla
                              </button>
                              {/* Marcar como Aceptado */}
                              {ppto.estado === 'enviado' && (
                                <button onClick={async () => {
                                  await saveDoc('presupuestos', ppto.id, { ...ppto, estado: 'aceptado' });
                                  if (!ppto.obraId) {
                                    setLinkObraModal(ppto);
                                  } else {
                                    // Ya tiene obra vinculada: guardar PDF dirección en archivos de la obra
                                    const obra = (data?.obras || []).find(o => o.id === ppto.obraId);
                                    if (obra) {
                                      try {
                                        const { blob } = await generatePresupuestoPdf(ppto, data, 'direccion');
                                        const fd = new FormData();
                                        fd.append('file', blob, `Presupuesto_${ppto.id}_Direccion.pdf`);
                                        fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
                                        fd.append('folder', `obras/${ppto.obraId}`);
                                        const uploaded = await fetch(
                                          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                                          { method: 'POST', body: fd }
                                        ).then(r => r.json());
                                        if (!uploaded.error) {
                                          const newFile = { id: Date.now().toString(), name: `Presupuesto_${ppto.id}_Direccion.pdf`, url: uploaded.secure_url, type: 'document', size: blob.size, date: new Date().toISOString() };
                                          await updateDoc('obras', ppto.obraId, { archivos: [newFile, ...(obra.archivos || [])] });
                                        }
                                      } catch (_) {}
                                    }
                                  }
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
          plantillas={data?.plantillasPresupuesto || []}
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
                const ppto = linkObraModal;
                await saveDoc('presupuestos', ppto.id, { ...ppto, estado: 'aceptado', obraId });
                const obra = (data?.obras || []).find(o => o.id === obraId);
                if (obra) {
                  await saveDoc('obras', obraId, { ...obra, presupuestoId: ppto.id });
                  // Generar PDF versión dirección y guardarlo en archivos de la obra
                  try {
                    const { blob } = await generatePresupuestoPdf({ ...ppto, obraId }, data, 'direccion');
                    const fd = new FormData();
                    fd.append('file', blob, `Presupuesto_${ppto.id}_Direccion.pdf`);
                    fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
                    fd.append('folder', `obras/${obraId}`);
                    const uploaded = await fetch(
                      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                      { method: 'POST', body: fd }
                    ).then(r => r.json());
                    if (!uploaded.error) {
                      const newFile = {
                        id: Date.now().toString(),
                        name: `Presupuesto_${ppto.id}_Direccion.pdf`,
                        url: uploaded.secure_url,
                        type: 'document',
                        size: blob.size,
                        date: new Date().toISOString()
                      };
                      await updateDoc('obras', obraId, { archivos: [newFile, ...(obra.archivos || [])] });
                    }
                  } catch (_) {
                    // No bloquear el flujo si falla la generacion del PDF
                  }
                }
                setLinkObraModal(null);
              }}>Vincular</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selección versión PDF */}
      {pdfSelectionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Exportar Presupuesto a PDF</h2>
              <button className="icon-btn" onClick={() => setPdfSelectionModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Selecciona la versión del presupuesto que deseas exportar para el documento <strong>{pdfSelectionModal.id}</strong>:
              </p>
              
              <button className="btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left', borderColor: '#c4b5fd', background: '#f5f3ff' }}
               onClick={() => { setPrintMode('cliente'); setPrintPpto(pdfSelectionModal); setPdfSelectionModal(null); }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}><Printer size={16} /> Versión Cliente</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Concepto + Unidades + Cantidad + Total Global. Oculta el desglose de precios unitarios.</div>
                </div>
              </button>

              <button className="btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left', borderColor: '#fca5a5', background: '#fef2f2' }}
               onClick={() => { setPrintMode('direccion'); setPrintPpto(pdfSelectionModal); setPdfSelectionModal(null); }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}><Printer size={16} /> Versión Dirección (Interno)</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Desglose completo: todos los precios, cantidades y márgenes por partida.</div>
                </div>
              </button>

              <button className="btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px', height: 'auto', textAlign: 'left', borderColor: '#86efac', background: '#f0fdf4' }}
               onClick={() => { setPrintMode('colaboradores'); setPrintPpto(pdfSelectionModal); setPdfSelectionModal(null); }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}><Printer size={16} /> Versión Colaboradores</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Sin precios. Solo conceptos, unidades y cantidades para compartir con subcontratas.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview unificado (email + whatsapp) */}
      {previewPpto && (() => {
        const previewCliente = clientes.find(c => c.id === previewPpto.clienteId);
        const isWA = previewChannel === 'whatsapp';
        const isFirma = previewChannel === 'firma';
        const destino = isWA ? previewCliente?.telefono : previewCliente?.email;
        return (
          <div className="modal-overlay" style={{ zIndex: 150 }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '92vw', maxWidth: '880px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    {isFirma ? 'Firma electrónica' : 'Vista previa'} — {previewPpto.id}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {isFirma
                      ? <>firma.dev enviará email de firma a <strong>{previewCliente?.email}</strong> · ~0,03€ por envío</>
                      : <>{isWA ? 'WhatsApp' : 'Email'} a <strong>{destino}</strong> con enlace de descarga del PDF</>
                    }
                  </div>
                </div>
                <button className="icon-btn" onClick={() => { setPreviewPpto(null); setCompanySignature(null); }} disabled={!!sendingEmailId}><X size={18} /></button>
              </div>
              <div ref={printRef} style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
                <PresupuestoPrint ppto={previewPpto} data={data} mode="cliente" printOnMount={false} onClose={() => { setPreviewPpto(null); setCompanySignature(null); }} companySignature={companySignature} />
              </div>
              {isFirma && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: '#f5f3ff', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#7c3aed', marginBottom: '6px' }}>Firma de la empresa (opcional)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Dibuja la firma de la empresa. Se incrustará en el PDF antes de enviarlo al cliente.</div>
                  <SignatureCanvas onSign={setCompanySignature} label="Firma de la empresa aquí" />
                </div>
              )}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button className="btn-secondary" onClick={() => { setPreviewPpto(null); setCompanySignature(null); }} disabled={!!sendingEmailId}>Cancelar</button>
                <button className="btn-primary" onClick={handleConfirmSend} disabled={!!sendingEmailId}
                  style={{ background: sendingEmailId ? '#94a3b8' : isFirma ? '#7c3aed' : isWA ? '#25D366' : undefined }}>
                  {isFirma ? <FileSignature size={14} /> : isWA ? <MessageCircle size={14} /> : <Mail size={14} />}
                  {sendingEmailId ? 'Enviando...' : isFirma ? 'Enviar para Firmar' : isWA ? 'Confirmar envío WhatsApp' : 'Confirmar envío Email'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal guardar como plantilla */}
      {saveTemplateModal && (
        <div className="modal-overlay" style={{ zIndex: 160 }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2><LayoutTemplate size={18} style={{ marginRight: '8px' }} />Guardar como Plantilla</h2>
              <button className="icon-btn" onClick={() => setSaveTemplateModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Se guardarán los capítulos y extras de <strong>{saveTemplateModal.id}</strong> como plantilla reutilizable. El cliente, obra y fecha no se guardan.
              </p>
              <div className="form-group">
                <label>Nombre de la plantilla *</label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  placeholder="Ej: Reforma integral baño, Instalación eléctrica..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSaveTemplateModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveTemplate}>
                <LayoutTemplate size={14} /> Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal éxito firma electrónica */}
      {firmaSuccessModal && (
        <div className="modal-overlay" style={{ zIndex: 170 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSignature size={18} style={{ color: '#7c3aed' }} /> Firma enviada
              </h2>
              <button className="icon-btn" onClick={() => setFirmaSuccessModal(null)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>✅ Solicitud enviada correctamente</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  <strong>{firmaSuccessModal.cliente.nombre}</strong> recibirá un email de firma.dev con el enlace para firmar el presupuesto <strong>{firmaSuccessModal.ppto.id}</strong>.
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                ¿Quieres enviarle también el enlace de firma por WhatsApp?
              </p>
              {firmaSuccessModal.signingLink && (
                <p style={{ fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all', background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                  {firmaSuccessModal.signingLink}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setFirmaSuccessModal(null)}>Cerrar</button>
              {firmaSuccessModal.signingLink && firmaSuccessModal.cliente.telefono && (
                <button className="btn-primary" style={{ background: '#25D366' }}
                  onClick={() => {
                    const msg = `Hola ${firmaSuccessModal.cliente.nombre}, te enviamos el enlace para firmar el presupuesto ${firmaSuccessModal.ppto.id}:\n\n${firmaSuccessModal.signingLink}\n\nQuedamos a tu disposición.\nSaludos, IDG`;
                    openWhatsApp(firmaSuccessModal.cliente.telefono, msg);
                    setFirmaSuccessModal(null);
                  }}>
                  <MessageCircle size={14} /> Enviar también por WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
