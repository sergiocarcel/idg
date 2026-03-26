import React, { useEffect } from 'react';

export default function PresupuestoPrint({ ppto, data, onClose, mode = 'cliente' }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    
    const afterPrint = () => onClose();
    window.addEventListener('afterprint', afterPrint);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [onClose]);

  if (!ppto) return null;

  const cliente = data?.clientes?.find(c => c.id === ppto.clienteId) || {};
  
  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const calculateTotal = () => {
    return ppto.capitulos.reduce((sum, cap) => {
      return sum + cap.partidas.reduce((s, p) => s + (p.cantidad * (mode === 'interno' ? p.precioCoste : p.precioVenta)), 0);
    }, 0);
  };

  const total = calculateTotal();
  const iva = total * 0.21;
  const totalConIva = total + iva;

  return (
    <div className="print-container" style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
        
        {/* Header Empresa y Cliente */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Innovate Design Group</h1>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Expertos en reformas integrales</div>
            <div style={{ fontSize: '11px', color: '#777', marginTop: '8px' }}>
              NIF: B-12345678<br />
              Calle Principal 123, Madrid<br />
              contacto@idg.es | 600 000 000
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: mode === 'interno' ? '#dc2626' : '#2563eb' }}>
              PRESUPUESTO {mode === 'interno' ? 'INTERNO' : ''}
            </h2>
            <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>Nº {ppto.id}</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Fecha: {new Date(ppto.fecha).toLocaleDateString()}</div>
            
            <div style={{ marginTop: '20px', textAlign: 'right', background: '#f8f8f8', padding: '12px', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>CLIENTE</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{cliente.nombre || 'Cliente no definido'}</div>
              <div style={{ fontSize: '12px' }}>{cliente.nif}</div>
              <div style={{ fontSize: '12px' }}>{cliente.direccion}</div>
              <div style={{ fontSize: '12px' }}>{cliente.telefono}</div>
            </div>
          </div>
        </div>

        {/* Info Obra si la hay */}
        {ppto.obraId && (
          <div style={{ marginBottom: '24px', fontSize: '13px' }}>
            <strong>Referencia del Proyecto:</strong> {ppto.obraId}
          </div>
        )}

        {/* Desglose de partidas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #000' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Concepto / Descripción</th>
              <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Unidad</th>
              <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Cant.</th>
              <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Precio Un.</th>
              <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {ppto.capitulos.map((cap, capIdx) => {
              const capTotal = cap.partidas.reduce((s, p) => s + (p.cantidad * (mode === 'interno' ? p.precioCoste : p.precioVenta)), 0);
              
              return (
                <React.Fragment key={cap.id || capIdx}>
                  {/* Fila del capítulo */}
                  <tr style={{ background: '#fafafa' }}>
                    <td colSpan="4" style={{ padding: '12px 8px', fontWeight: 'bold', borderBottom: '1px solid #ddd', color: '#1e3a8a' }}>
                      {capIdx + 1}. {cap.nombre.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #ddd', color: '#1e3a8a' }}>
                      {formatCurrency(capTotal)}
                    </td>
                  </tr>
                  
                  {/* Partidas */}
                  {cap.partidas.map((partida, partIdx) => {
                    const precio = mode === 'interno' ? partida.precioCoste : partida.precioVenta;
                    const importe = partida.cantidad * precio;
                    
                    return (
                      <tr key={partIdx}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', fontSize: '11px' }}>{partida.descripcion}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontSize: '11px', color: '#666' }}>{partida.unidad || 'ud'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontSize: '11px' }}>{partida.cantidad}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '11px' }}>{formatCurrency(precio)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '11px' }}>{formatCurrency(importe)}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <div style={{ width: '250px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
              <span>Base Imponible:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {mode === 'cliente' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #ddd' }}>
                <span>IVA (21%):</span>
                <span>{formatCurrency(iva)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '16px', fontWeight: 'bold' }}>
              <span>TOTAL IMPORTE:</span>
              <span>{formatCurrency(mode === 'cliente' ? totalConIva : total)}</span>
            </div>
          </div>
        </div>

        {/* Condiciones / Notas */}
        <div style={{ marginTop: '50px', fontSize: '10px', color: '#666', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
          <strong>Condiciones Generales:</strong><br />
          {ppto.notas ? ppto.notas : "Validez operativa del presupuesto: 30 días. Los precios no incluyen licencias ni permisos de obra a menos que se indique explícitamente en una partida."}
        </div>
        
        {/* Footer print helper notice -> not visible on print */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: '40px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer', background: '#e5e7eb', border: 'none', borderRadius: '4px' }}>Cancelar (o esc)</button>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>Imprimir Doc.</button>
        </div>
      </div>
    </div>
  );
}
