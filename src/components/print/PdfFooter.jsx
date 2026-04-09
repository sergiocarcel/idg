import React from 'react';

/**
 * Pie de página compartido para todos los documentos PDF generados.
 * Lee dinámicamente el texto legal de config.empresa.pieFactura.
 *
 * Props:
 * - empresa: objeto config.empresa {pieFactura, nombre, ...}
 * - extraText: texto adicional a mostrar antes del pie legal (ej. condiciones específicas)
 */
export default function PdfFooter({ empresa, extraText }) {
  const emp = empresa || {};

  return (
    <div style={{ marginTop: '50px', fontSize: '10px', color: '#666', borderTop: '1px solid #ccc', paddingTop: '16px', lineHeight: '1.5' }}>
      {extraText && (
        typeof extraText === 'string'
          ? <div style={{ marginBottom: '8px' }} dangerouslySetInnerHTML={{ __html: extraText }} />
          : <div style={{ marginBottom: '8px' }}>{extraText}</div>
      )}
      {emp.pieFactura && (
        <div>{emp.pieFactura}</div>
      )}
      {emp.nombre && (
        <div style={{ marginTop: '6px', fontStyle: 'italic' }}>
          © {new Date().getFullYear()} {emp.nombre}
        </div>
      )}
    </div>
  );
}
