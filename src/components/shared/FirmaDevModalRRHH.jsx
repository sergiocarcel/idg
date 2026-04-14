import React, { useState } from 'react';
import { X, MessageCircle, Mail, FileSignature } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas.jsx';
import { createAndSendSigningRequest } from '../../services/firmadev';
import { addSignaturePageToPdf } from '../../utils/pdfModifier';
import { openWhatsApp } from '../../utils/sendUtils';

export default function FirmaDevModalRRHH({ document, trabajadores, onClose, onFirmaSuccess }) {
  const [recipientType, setRecipientType] = useState('trabajador'); // trabajador | tercero
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');
  const [terceroName, setTerceroName] = useState('');
  const [terceroEmail, setTerceroEmail] = useState('');
  const [companySignature, setCompanySignature] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determinar datos actuales según selección
  const tInfo = trabajadores.find(t => t.id === selectedTrabajadorId);
  
  let validName = '';
  let validEmail = '';
  let validPhone = '';

  if (recipientType === 'trabajador' && tInfo) {
    validName = `${tInfo.nombre} ${tInfo.apellidos || ''}`.trim();
    validEmail = tInfo.email || '';
    validPhone = tInfo.telefono || '';
  } else if (recipientType === 'tercero') {
    validName = terceroName.trim();
    validEmail = terceroEmail.trim();
  }

  // Fallback genérico si no hay email pero queremos mandar por WhatsApp (firma.dev obliga a usar email)
  const isGenericEmail = !validEmail && validPhone;
  const effectiveEmail = validEmail || (isGenericEmail ? 'whatsapp@idgenerico.local' : '');

  const canShareEmail = effectiveEmail && !isGenericEmail;
  const canShareWhatsApp = !!validPhone && recipientType === 'trabajador'; // Por ahora tercero no tiene tlf configurado en el form

  // Ambos deshabilitados si faltan todos los datos mínimos
  const hasMinData = recipientType === 'trabajador' ? !!tInfo : (validName && validEmail);
  const canSendAnything = hasMinData && (canShareEmail || canShareWhatsApp);

  const handleSend = async (channel) => {
    if (!hasMinData) return;
    setIsProcessing(true);
    
    try {
      if (!import.meta.env.VITE_FIRMADEV_API_KEY) {
        throw new Error("Falta la VITE_FIRMADEV_API_KEY en el entorno (.env)");
      }

      // 1. Obtener la url remota del pdf evitando posibles CORS usando proxy (si el doc no viene con CORS headers)
      let pdfBuffer;
      try {
        const res = await fetch(document.archivoUrl);
        pdfBuffer = await res.arrayBuffer();
      } catch (err) {
        // Fallback proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(document.archivoUrl)}`;
        const res2 = await fetch(proxyUrl);
        if (!res2.ok) throw new Error('Proxy falló');
        pdfBuffer = await res2.arrayBuffer();
      }

      // 2. Modificar PDF para añadir hoja final
      const { base64, pageCount } = await addSignaturePageToPdf(pdfBuffer, companySignature);

      // 3. Crear solicitud en firma.dev
      const clienteData = {
        nombre: validName,
        email: effectiveEmail
      };

      const firmaResponse = await createAndSendSigningRequest(
        base64,
        clienteData,
        `Documento RRHH - ${validName}`,
        pageCount,
        20
      );

      const signingLink = firmaResponse.first_signer?.signing_link || '';

      if (channel === 'whatsapp' && validPhone) {
        const msg = `Hola ${validName}, te enviamos el documento "${document.nombre}" para firmar.\n\nPuedes firmarlo aquí:\n${signingLink}`;
        openWhatsApp(validPhone, msg);
      } else if (channel === 'email') {
        // firma.dev ya envía el email si settings.send_signing_email = true (como está en firmadev.js)
        alert('Se ha enviado la solicitud de firma por Email a ' + effectiveEmail);
      }

      // Devolver éxito a RRHH.jsx para que lo guarde localmente
      if (onFirmaSuccess) {
        await onFirmaSuccess({
          firmaRequestId: firmaResponse.id,
          signingLink,
          channel,
          workerId: selectedTrabajadorId,
          firmaEstado: 'enviado',
          firmaFecha: new Date().toISOString()
        });
      }

    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 150 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2><FileSignature size={18} style={{marginRight: '8px', display:'inline-block', verticalAlign:'middle', color:'#7c3aed'}} />Enviar para firmar</h2>
          <button className="icon-btn" onClick={onClose} disabled={isProcessing} style={{ background: 'none' }}><X size={18} /></button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Se añadirá una página al final del documento <strong>{document.nombre}</strong> con los espacios de firma.
          </p>

          {/* Tipo de Destinatario */}
          <div>
            <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', display: 'block' }}>¿A quién le solicitas la firma?</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="recipient" checked={recipientType === 'trabajador'} onChange={() => setRecipientType('trabajador')} />
                Trabajador
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="recipient" checked={recipientType === 'tercero'} onChange={() => setRecipientType('tercero')} />
                Tercero (Externo)
              </label>
            </div>
          </div>

          {/* Campos según tipo */}
          {recipientType === 'trabajador' && (
            <div className="form-group full-width">
              <label>Trabajador</label>
              <select value={selectedTrabajadorId} onChange={e => setSelectedTrabajadorId(e.target.value)}>
                <option value="">Seleccionar trabajador...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} {t.apellidos || ''}</option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'tercero' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group full-width">
                <label>Nombre del Tercero *</label>
                <input type="text" value={terceroName} onChange={e => setTerceroName(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="form-group full-width">
                <label>Email *</label>
                <input type="email" value={terceroEmail} onChange={e => setTerceroEmail(e.target.value)} placeholder="email@ejemplo.com" />
              </div>
            </div>
          )}

          {/* Firma Empresa */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Firma de la empresa (Obligatorio/Previo)</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              Dibuja la firma de la empresa. Se incrustará en el PDF antes de enviarlo.
            </div>
            <SignatureCanvas onSign={setCompanySignature} label="Firma empresa" />
          </div>
          
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
          {recipientType === 'trabajador' && isGenericEmail && validPhone && (
            <div style={{ fontSize: '11px', color: '#d97706', background: '#fef3c7', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
              Este trabajador no tiene email. Se usará un email genérico internamente para poder generar el enlace de WhatsApp.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn-secondary" onClick={onClose} disabled={isProcessing}>Cancelar</button>
            <button 
              className="btn-secondary" 
              onClick={() => handleSend('whatsapp')}
              disabled={isProcessing || !canShareWhatsApp || !companySignature}
              style={{ background: '#25D366', color: '#fff', borderColor: '#25D366', opacity: (!canShareWhatsApp || !companySignature) ? 0.5 : 1 }}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button 
              className="btn-primary" 
              onClick={() => handleSend('email')}
              disabled={isProcessing || !canShareEmail || !companySignature}
              style={{ background: '#3b82f6', borderColor: '#3b82f6', opacity: (!canShareEmail || !companySignature) ? 0.5 : 1 }}
            >
              <Mail size={14} /> Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
