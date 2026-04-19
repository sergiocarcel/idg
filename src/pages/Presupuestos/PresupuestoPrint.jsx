import React, { useRef, useState } from 'react';
import PdfHeader from '../../components/print/PdfHeader.jsx';
import PdfFooter from '../../components/print/PdfFooter.jsx';
import { generatePdfFromElement } from '../../utils/pdfUtils.js';

export default function PresupuestoPrint({ ppto, data, onClose, mode = 'cliente', printOnMount = true, companySignature = null }) {
  // Modes: 'direccion' (all columns), 'cliente' (no unit price, just total), 'colaboradores' (no price, no total)
  const contentRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const { blob, filename } = await generatePdfFromElement(contentRef.current, `Presupuesto_${ppto.id}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!ppto) return null;

  const cliente = data?.clientes?.find(c => c.id === ppto.clienteId) || {};
  
  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  // Modos de exportación V3:
  // - direccion: Concepto + Unidades + Cantidad + Precio + Total (por línea y global)
  // - cliente: Concepto + Unidades + Cantidad + Total ग्लोबल (sin precio unitario ni total por línea)
  // - colaboradores: Concepto + Unidades + Cantidad (sin ningún precio/total)
  const showPrice = mode === 'direccion';
  const showLineTotal = mode === 'direccion';
  const showChapterTotal = mode === 'direccion' || mode === 'cliente';
  const showGlobalTotal = mode !== 'colaboradores';
  const priceField = 'precioVenta';

  const calculateTotal = () => {
    return ppto.capitulos.reduce((sum, cap) => {
      return sum + cap.partidas.reduce((s, p) => s + (p.cantidad * p[priceField]), 0);
    }, 0);
  };

  const total = calculateTotal();
  const iva = total * 0.21;
  const totalConIva = total + iva;

  const docContent = (
    <div ref={contentRef} style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', color: '#000', fontFamily: 'Arial, sans-serif', background: 'white' }}>
        
        {/* Header Empresa y Cliente */}
        <PdfHeader
          empresa={data?.config?.empresa}
          rightTopContent={
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: mode === 'direccion' ? '#dc2626' : '#2563eb' }}>
                PRESUPUESTO {mode === 'direccion' ? '(DIRECCIÓN)' : (mode === 'colaboradores' ? '(COLABORADORES)' : '')}
              </h2>
              <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>Nº {ppto.id}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Fecha: {new Date(ppto.fecha).toLocaleDateString()}</div>
            </>
          }
          rightBottomContent={
            <>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>CLIENTE</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{cliente.nombre || 'Cliente no definido'}</div>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{cliente.nif}</div>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{cliente.direccion}</div>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{cliente.telefono}</div>
            </>
          }
        />

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
              {showPrice && <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Precio</th>}
              {(showLineTotal || showChapterTotal) && <th style={{ padding: '8px', textAlign: 'right', width: '100px' }}>Importe</th>}
            </tr>
          </thead>
          <tbody>
            {ppto.capitulos.map((cap, capIdx) => {
              const capTotal = cap.partidas.reduce((s, p) => s + (p.cantidad * p[priceField]), 0);
              
              return (
                <React.Fragment key={cap.id || capIdx}>
                  {/* Fila del capítulo */}
                  <tr style={{ background: '#fafafa' }}>
                    <td colSpan={3 + (showPrice ? 1 : 0)} style={{ padding: '12px 8px', fontWeight: 'bold', borderBottom: '1px solid #ddd', color: '#1e3a8a' }}>
                      {capIdx + 1}. {cap.nombre.toUpperCase()}
                    </td>
                    {(showLineTotal || showChapterTotal) && (
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #ddd', color: '#1e3a8a' }}>
                        {formatCurrency(capTotal)}
                      </td>
                    )}
                  </tr>
                  
                  {/* Partidas */}
                  {cap.partidas.map((partida, partIdx) => {
                    const precio = partida[priceField];
                    const importe = partida.cantidad * precio;

                    return (
                      <tr key={partIdx}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee', fontSize: '11px' }} dangerouslySetInnerHTML={{ __html: partida.descripcion || '' }} />
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontSize: '11px', color: '#666' }}>{partida.unidad || 'ud'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontSize: '11px' }}>{partida.cantidad}</td>
                        {showPrice && <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '11px' }}>{formatCurrency(precio)}</td>}
                        {showLineTotal && <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '11px' }}>{formatCurrency(importe)}</td>}
                        {!showLineTotal && showChapterTotal && <td style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}></td>}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totales */}
        {showGlobalTotal && (
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
        )}

        {/* Bloque EXTRAS (debajo del total) */}
        {(ppto.extras || []).length > 0 && (
          <div style={{ marginTop: '30px', borderTop: '2px dashed #d97706', paddingTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '16px' }}>
              EXTRAS / PARTIDAS ADICIONALES
            </div>
            
            {(ppto.extras || []).map((ext, extIdx) => {
              const extTotal = ext.partidas.reduce((s, p) => s + (p.cantidad * p[priceField]), 0);
              const extIva = extTotal * 0.21;
              
              return (
                <div key={ext.id || extIdx} style={{ marginBottom: '20px' }}>
                  {/* Tabla del extra */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '10px' }}>
                    <tbody>
                      {/* Cabecera del extra */}
                      <tr style={{ background: '#fffbeb' }}>
                        <td colSpan={3 + (showPrice ? 1 : 0)} style={{ padding: '10px 8px', fontWeight: 'bold', borderBottom: '1px solid #fde68a', color: '#92400e' }}>
                          {extIdx + 1}. {ext.nombre.toUpperCase()}
                        </td>
                        {(showLineTotal || showChapterTotal) && (
                          <td style={{ padding: '10px 8px', fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #fde68a', color: '#92400e' }}>
                            {formatCurrency(extTotal)}
                          </td>
                        )}
                      </tr>
                      
                      {/* Partidas del extra */}
                      {ext.partidas.map((partida, partIdx) => {
                        const precio = partida[priceField];
                        const importe = partida.cantidad * precio;
                        return (
                          <tr key={partIdx}>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid #fef3c7', fontSize: '11px' }} dangerouslySetInnerHTML={{ __html: partida.descripcion || '' }} />
                            <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #fef3c7', fontSize: '11px', color: '#666' }}>{partida.unidad || 'ud'}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #fef3c7', fontSize: '11px' }}>{partida.cantidad}</td>
                            {showPrice && <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #fef3c7', fontSize: '11px' }}>{formatCurrency(precio)}</td>}
                            {showLineTotal && <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #fef3c7', fontSize: '11px' }}>{formatCurrency(importe)}</td>}
                            {!showLineTotal && showChapterTotal && <td style={{ padding: '6px 8px', borderBottom: '1px solid #fef3c7' }}></td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Total del extra */}
                  {showGlobalTotal && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: '250px', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e' }}>
                          <span>Subtotal Extra:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(extTotal)}</span>
                        </div>
                        {mode === 'cliente' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                            <span>IVA (21%):</span>
                            <span>{formatCurrency(extIva)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: '#92400e', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #fde68a' }}>
                          <span>Total Extra:</span>
                          <span>{formatCurrency(mode === 'cliente' ? extTotal + extIva : extTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Condiciones y Firmas — solo en modo cliente, siempre en página propia */}
        {mode === 'cliente' && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '40px' }}>
            <PdfFooter
              empresa={data?.config?.empresa}
              extraText={`<strong>Condiciones Generales:</strong><br />${ppto.condicionesPresupuesto || data?.config?.empresa?.condicionesPresupuesto || "Validez operativa del presupuesto: 30 días. Los precios no incluyen licencias ni permisos de obra a menos que se indique explícitamente en una partida."}`}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '40px', pageBreakInside: 'avoid' }}>
              <div style={{ width: '45%' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Por la empresa:</div>
                {companySignature ? (
                  <img src={companySignature} alt="Firma empresa" style={{ height: '80px', maxWidth: '100%', objectFit: 'contain', display: 'block', borderBottom: '1px solid #000' }} />
                ) : (
                  <div style={{ height: '80px', borderBottom: '1px solid #000' }} />
                )}
                <div style={{ fontSize: '11px', marginTop: '6px', color: '#555' }}>
                  Fdo: {data?.config?.empresa?.nombre || 'La empresa'}
                </div>
              </div>
              <div style={{ width: '45%' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Conforme del cliente:</div>
                <div style={{ height: '80px', borderBottom: '1px solid #000' }} />
                <div style={{ fontSize: '11px', marginTop: '6px', color: '#555' }}>Fdo: El cliente</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer genérico para otras versiones (sin condiciones) */}
        {mode !== 'cliente' && (
          <PdfFooter empresa={data?.config?.empresa} />
        )}

    </div>
  );

  if (printOnMount) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '92vw', maxWidth: '880px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Vista previa — {ppto.id}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {mode === 'direccion' ? 'Versión Dirección (interno)' : mode === 'colaboradores' ? 'Versión Colaboradores' : 'Versión Cliente'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', padding: '4px 8px' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
            {docContent}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer', background: '#e5e7eb', border: 'none', borderRadius: '4px' }}>Cancelar</button>
            <button onClick={handleDownloadPdf} disabled={generating} style={{ padding: '8px 16px', cursor: generating ? 'default' : 'pointer', background: generating ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>
              {generating ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-container" style={{ position: 'relative', background: 'white' }}>
      {docContent}
    </div>
  );
}
