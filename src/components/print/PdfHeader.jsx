import React from 'react';

/**
 * Cabecera compartida para todos los documentos PDF generados.
 * Lee dinámicamente los datos de config.empresa en lugar de usar valores hardcoded.
 *
 * Props:
 * - empresa: objeto config.empresa {nombre, nif, direccion, telefono, email, logoId}
 * - rightContent: JSX opcional para el lado derecho (título doc, nº, fecha, datos cliente, etc.)
 */
export default function PdfHeader({ empresa, rightContent, rightTopContent, rightBottomContent }) {
  const emp = empresa || {};

  const topContent = rightTopContent || rightContent;

  const renderNombreEmpresa = () => {
    return emp.nombre || 'Empresa';
  };

  return (
    <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
      
      {/* Fila Superior: Logo + Txt derecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {emp.logoId && (
            <img
              src={emp.logoId}
              alt="Logo"
              style={{ maxHeight: '160px', maxWidth: '500px', objectFit: 'contain', marginBottom: '10px' }}
            />
          )}
        </div>

        {topContent && (
          <div style={{ textAlign: 'right' }}>
            {topContent}
          </div>
        )}
      </div>

      {/* Fila Inferior: Cajas de datos (Empresa y Cliente) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'stretch' }}>
        
        {/* Datos Empresa */}
        <div style={{ width: '48%', background: '#f8f8f8', padding: '12px', borderRadius: '4px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>DATOS DE LA EMPRESA</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', lineHeight: '1.3' }}>
            {renderNombreEmpresa()}
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
            {emp.nif && <div>NIF: {emp.nif}</div>}
            {emp.direccion && <div>{emp.direccion}</div>}
            {(emp.email || emp.telefono) && (
              <div>{[emp.email, emp.telefono].filter(Boolean).join(' | ')}</div>
            )}
          </div>
        </div>

        {/* Datos Cliente / Extra */}
        {rightBottomContent ? (
          <div style={{ width: '48%', background: '#f8f8f8', padding: '12px', borderRadius: '4px', textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            {rightBottomContent}
          </div>
        ) : (
          <div style={{ width: '48%' }} /> /* Separador vacío para mantener la caja de la empresa al lado izquierdo */
        )}
      </div>

    </div>
  );
}
