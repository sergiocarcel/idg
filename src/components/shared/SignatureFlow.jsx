import React, { useState } from 'react';
import { X, PenTool, Send, MessageCircle, Mail, Check } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas.jsx';
import { openWhatsApp, sendEmail, openEmailComposer } from '../../utils/sendUtils.js';

/**
 * Componente reutilizable para flujo de firma de documentos.
 * Ofrece dos modos: firma en persona (canvas) o envío remoto (WhatsApp/Email).
 *
 * Props:
 * - title: Título del documento a firmar
 * - description: Descripción o resumen del contenido
 * - documentUrl: URL del documento (para envío remoto)
 * - recipientPhone: Teléfono del destinatario (para WhatsApp)
 * - recipientEmail: Email del destinatario
 * - recipientName: Nombre del destinatario
 * - onSign: callback(firmaImgBase64) — cuando se firma en persona
 * - onSendRemote: callback(channel) — cuando se envía para firma remota
 * - onClose: callback para cerrar el modal
 * - emailTemplateId: ID del template de EmailJS (opcional)
 */
export default function SignatureFlow({
  title = 'Firmar Documento',
  description = '',
  documentUrl = '',
  recipientPhone = '',
  recipientEmail = '',
  recipientName = '',
  onSign,
  onSendRemote,
  onClose,
  emailTemplateId = ''
}) {
  const [mode, setMode] = useState(null); // null | 'persona' | 'remoto'
  const [signature, setSignature] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignInPerson = () => {
    if (!signature) return alert('El cliente debe firmar antes de guardar.');
    onSign?.(signature);
  };

  const handleSendWhatsApp = () => {
    const message = `Hola ${recipientName}, te enviamos el documento "${title}" para su revisión y firma.${documentUrl ? `\n\nDocumento: ${documentUrl}` : ''}\n\nSaludos, ${import.meta.env.VITE_APP_NAME || 'CRM'}.`;
    openWhatsApp(recipientPhone, message);
    onSendRemote?.('whatsapp');
    setSent(true);
  };

  const handleSendEmail = async () => {
    setSending(true);

    if (emailTemplateId) {
      const result = await sendEmail(emailTemplateId, {
        to_email: recipientEmail,
        to_name: recipientName,
        subject: `Documento para firma: ${title}`,
        message: `Le enviamos el documento "${title}" para su revisión y firma.${documentUrl ? `\n\nPuede acceder al documento aquí: ${documentUrl}` : ''}`,
        from_name: import.meta.env.VITE_APP_NAME || 'CRM'
      });

      if (result.success) {
        onSendRemote?.('email');
        setSent(true);
      } else {
        alert('No se pudo enviar el email. Se abrirá el cliente de correo.');
      }
    } else {
      openEmailComposer(
        recipientEmail,
        `Documento para firma: ${title}`,
        `Hola ${recipientName},\n\nLe enviamos el documento "${title}" para su revisión y firma.${documentUrl ? `\n\nDocumento: ${documentUrl}` : ''}\n\nSaludos,\n${import.meta.env.VITE_APP_NAME || 'CRM'}`
      );
      onSendRemote?.('email');
      setSent(true);
    }

    setSending(false);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 103 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} style={{ background: 'none' }}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Resumen del documento */}
          {description && (
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)' }}>
              {description}
            </div>
          )}

          {/* Confirmación de envío */}
          {sent && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={24} color="#16a34a" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#16a34a' }}>Enviado correctamente</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>El destinatario recibirá el documento para firmar</div>
            </div>
          )}

          {/* Selector de modo */}
          {!mode && !sent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setMode('persona')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PenTool size={18} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Firmar en persona</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>El cliente firma ahora mismo en pantalla</div>
                </div>
              </button>

              <button
                onClick={() => setMode('remoto')}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Enviar para firma remota</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enviar por WhatsApp o Email al destinatario</div>
                </div>
              </button>
            </div>
          )}

          {/* Modo: Firma en persona */}
          {mode === 'persona' && (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>Firma del cliente:</div>
              <SignatureCanvas onSign={setSignature} />
            </div>
          )}

          {/* Modo: Envío remoto */}
          {mode === 'remoto' && !sent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recipientPhone && (
                <button
                  onClick={handleSendWhatsApp}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', border: 'none', borderRadius: '10px', background: '#25D366', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                >
                  <MessageCircle size={18} /> Enviar por WhatsApp a {recipientName || recipientPhone}
                </button>
              )}

              {recipientEmail && (
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', border: 'none', borderRadius: '10px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: sending ? 0.7 : 1 }}
                >
                  <Mail size={18} /> {sending ? 'Enviando...' : `Enviar por Email a ${recipientName || recipientEmail}`}
                </button>
              )}

              {!recipientPhone && !recipientEmail && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>
                  No hay datos de contacto del destinatario (teléfono o email).
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={mode ? () => { setMode(null); setSent(false); } : onClose}>
            {mode ? 'Volver' : 'Cerrar'}
          </button>
          {mode === 'persona' && (
            <button className="btn-primary" onClick={handleSignInPerson}>
              Confirmar Firma
            </button>
          )}
          {sent && (
            <button className="btn-primary" onClick={onClose}>Hecho</button>
          )}
        </div>
      </div>
    </div>
  );
}
