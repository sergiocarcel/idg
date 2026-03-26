import React, { useState, useEffect } from 'react';
import SignatureCanvas from './SignatureCanvas.jsx';

export default function GanttPrint({ obra, tasks, onClose }) {
  const [signature, setSignature] = useState(null);
  const totalDays = 30;

  return (
    <div className="print-container" style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 9999, overflowY: 'auto' }}>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        @media not print {
          .print-only-img { display: none !important; }
        }
      `}</style>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Innovate Design Group</h1>
            <div style={{ fontSize: '14px', color: '#555', marginTop: '4px' }}>Cronograma Oficial de Ejecución</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>ACTA DE PLANIFICACIÓN</h2>
            <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 'bold' }}>{obra?.nombre || 'PROYECTO TIPO'}</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Fecha expedición: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Info Extra */}
        <div style={{ marginBottom: '20px', fontSize: '12px', display: 'flex', gap: '40px' }}>
          <div><strong>Responsable de Obra:</strong> {obra?.responsable || 'No asignado'}</div>
          <div><strong>Dirección:</strong> {obra?.direccion || '—'}</div>
          <div><strong>Fecha Inicio Estimada:</strong> {obra?.inicio ? new Date(obra?.inicio).toLocaleDateString() : '—'}</div>
        </div>

        {/* Gantt Chart Static */}
        <div style={{ border: '2px solid #000', borderRadius: '4px', overflow: 'hidden', marginBottom: '40px', background: '#fff' }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #000', background: '#f4f4f5' }}>
            <div style={{ width: '280px', padding: '10px 12px', fontWeight: 'bold', fontSize: '11px', borderRight: '1px solid #000' }}>FASES Y PARTIDAS</div>
            <div style={{ flex: 1, display: 'flex' }}>
              {Array.from({ length: totalDays }).map((_, i) => (
                <div key={i} style={{ flex: 1, borderRight: i === totalDays - 1 ? 'none' : '1px solid #ddd', textAlign: 'center', fontSize: '8px', padding: '6px 0', background: i % 7 === 5 || i % 7 === 6 ? '#fecaca' : 'transparent', fontWeight: 'bold' }}>{i+1}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.map((task, index) => (
              <div key={task.id} style={{ display: 'flex', borderBottom: index === tasks.length - 1 ? 'none' : '1px solid #ddd', background: index % 2 === 0 ? '#fff' : '#fafafa', position: 'relative' }}>
                <div style={{ width: '280px', padding: '10px 12px', fontSize: '11px', fontWeight: 'bold', borderRight: '1px solid #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {index+1}. {task.name.toUpperCase()}
                </div>
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  {/* Grid Lines */}
                  {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={`bg-${i}`} style={{ flex: 1, borderRight: i === totalDays - 1 ? 'none' : '1px solid #ddd', background: i % 7 === 5 || i % 7 === 6 ? 'rgba(239,68,68,0.05)' : 'transparent' }} />
                  ))}
                  {/* Task Bar */}
                  <div style={{ 
                    position: 'absolute', top: '6px', bottom: '6px', 
                    left: `${(task.startDay / totalDays) * 100}%`, 
                    width: `${(task.duration / totalDays) * 100}%`,
                    background: task.color, borderRadius: '4px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Firmas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', pageBreakInside: 'avoid' }}>
          <div style={{ width: '45%' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Por parte de la Empresa Contratista:</div>
            <div style={{ height: '100px', borderBottom: '1px solid #000', marginBottom: '4px' }}></div>
            <div style={{ fontSize: '11px' }}>Fdo: {obra?.responsable || 'Dirección de Obra'}</div>
          </div>
          <div style={{ width: '45%' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Acuse de recibo y conformidad del Cronograma:</div>
            
            <div className="no-print">
               <SignatureCanvas onSign={setSignature} />
            </div>

            {signature ? (
              <img src={signature} alt="Firma cliente" style={{ height: '100px', objectFit: 'contain', borderBottom: '1px solid #000' }} className="print-only-img" />
            ) : (
              <div style={{ height: '100px', borderBottom: '1px solid #000', marginBottom: '4px' }} className="print-only-img"></div>
            )}
            
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Fdo: Cliente titular de la obra</div>
          </div>
        </div>

        {/* Validating Warning */}
        <div className="no-print" style={{ background: '#fffbeb', color: '#d97706', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '40px', fontSize: '13px' }}>
          <strong>Aviso:</strong> Pide al cliente que trace su firma en el recuadro gris usando el dedo (o el ratón). Una vez dibujada, pulsa el botón azul de imprimir para acoplar la firma vectorial al PDF.
        </div>

        {/* Buttons */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: '40px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}>Modificar Gantt (Esc)</button>
          <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Acoplar Firma y Exportar PDF</button>
        </div>

      </div>
    </div>
  );
}
