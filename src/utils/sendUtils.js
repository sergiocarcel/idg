import emailjs from '@emailjs/browser';

// ─── CONFIG ────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Inicializar EmailJS una sola vez
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ─── WHATSAPP ──────────────────────────────────────────────

/**
 * Abre WhatsApp con un mensaje pre-rellenado.
 * @param {string} phone - Teléfono (se limpia automáticamente, se añade prefijo 34 si no lo tiene)
 * @param {string} message - Texto del mensaje
 * @returns {string} URL generada (también abre en nueva pestaña)
 */
export function openWhatsApp(phone, message = '') {
  const cleaned = phone.replace(/\D/g, '');
  const withPrefix = cleaned.startsWith('34') ? cleaned : `34${cleaned}`;
  const url = `https://wa.me/${withPrefix}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return url;
}

// ─── EMAIL (EmailJS) ───────────────────────────────────────

/**
 * Envía un email real usando EmailJS.
 * Requiere configurar VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY en .env
 * y crear un template en emailjs.com con las variables: to_email, to_name, subject, message, from_name
 *
 * @param {string} templateId - ID del template en EmailJS
 * @param {Object} params - Parámetros del template (to_email, to_name, subject, message, from_name, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmail(templateId, params) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS no configurado. Añade VITE_EMAILJS_SERVICE_ID y VITE_EMAILJS_PUBLIC_KEY a .env');
    // Fallback a mailto
    openEmailComposer(params.to_email, params.subject, params.message);
    return { success: false, error: 'EmailJS no configurado, se abrió mailto como fallback' };
  }

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, params);
    return { success: true };
  } catch (err) {
    console.error('Error enviando email:', err);
    return { success: false, error: err.text || err.message || 'Error desconocido' };
  }
}

// ─── MAILTO (fallback) ────────────────────────────────────

/**
 * Abre el cliente de correo del usuario con campos pre-rellenados.
 * Útil como fallback cuando EmailJS no está configurado.
 *
 * @param {string} to - Dirección de destino
 * @param {string} subject - Asunto
 * @param {string} body - Cuerpo del mensaje
 */
export function openEmailComposer(to, subject = '', body = '') {
  // No usar elemento <a> — el navegador normaliza el href y convierte %20 a +
  // window.location.href pasa la URL sin normalizar al SO
  const parts = [];
  if (subject) parts.push('subject=' + encodeURIComponent(subject));
  if (body) parts.push('body=' + encodeURIComponent(body));
  const qs = parts.length ? '?' + parts.join('&') : '';
  window.location.href = `mailto:${to}${qs}`;
}

// ─── MODAL DE ENVÍO (helper para UI) ──────────────────────

/**
 * Datos por defecto para el modal de selección de canal de envío.
 * Cada módulo puede usarlo para mostrar opciones WhatsApp/Email.
 */
export const SEND_CHANNELS = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: '#25D366' },
  email: { label: 'Email', icon: 'Mail', color: '#2563eb' }
};
