import React from 'react';

/**
 * Cabecera compartida para todos los documentos PDF generados.
 * Lee dinámicamente los datos de config.empresa en lugar de usar valores hardcoded.
 *
 * Props:
 * - empresa: objeto config.empresa {nombre, nif, direccion, telefono, email, logoId}
 * - rightContent: JSX opcional para el lado derecho (título doc, nº, fecha, datos cliente, etc.)
 */
export default function PdfHeader({ empresa, rightContent }) {
  const emp = empresa || {};

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {emp.logoId && (
          <img
            src={emp.logoId}
            alt="Logo"
            style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain' }}
          />
        )}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>
            {emp.nombre || 'Empresa'}
          </h1>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '8px', lineHeight: '1.5' }}>
            {emp.nif && <>NIF: {emp.nif}<br /></>}
            {emp.direccion && <>{emp.direccion}<br /></>}
            {(emp.email || emp.telefono) && (
              <>{[emp.email, emp.telefono].filter(Boolean).join(' | ')}</>
            )}
          </div>
        </div>
      </div>
      {rightContent && (
        <div style={{ textAlign: 'right' }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
