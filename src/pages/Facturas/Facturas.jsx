import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileBarChart, Save } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function Facturas({ data, setData }) {
  const [selectedObraId, setSelectedObraId] = useState(null);

  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];

  // Si la obra seleccionada no tiene `gastosReales`, la inicializamos
  const updateGastos = async (obraId, field, value) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const actuales = obra.gastosReales || { personal: 0, materiales: 0, subcontratas: 0, otros: 0 };
    await updateDoc('obras', obraId, { gastosReales: { ...actuales, [field]: Number(value) || 0 } });
  };

  const getPresupuestoAceptado = (obraId) => {
    const ppto = presupuestos.find(p => p.obraId === obraId && p.estado === 'aceptado');
    if (!ppto) return 0;
    return ppto.capitulos.reduce((sum, cap) => {
      return sum + cap.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
    }, 0);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const calculateRentabilidad = (obra) => {
    const presupuestado = getPresupuestoAceptado(obra.id);
    const g = obra.gastosReales || { personal: 0, materiales: 0, subcontratas: 0, otros: 0 };
    const gastosTotal = g.personal + g.materiales + g.subcontratas + g.otros;
    const margen = presupuestado - gastosTotal;
    const porcentaje = presupuestado > 0 ? (margen / presupuestado) * 100 : 0;
    
    return { presupuestado, gastosTotal, margen, porcentaje, g };
  };

  const totalsGlobales = obras.reduce((acc, o) => {
    const r = calculateRentabilidad(o);
    acc.presupuestado += r.presupuestado;
    acc.gastos += r.gastosTotal;
    acc.margen += r.margen;
    return acc;
  }, { presupuestado: 0, gastos: 0, margen: 0 });

  totalsGlobales.porcentaje = totalsGlobales.presupuestado > 0 ? (totalsGlobales.margen / totalsGlobales.presupuestado) * 100 : 0;

  const getStatusColor = (margen) => {
    if (margen > 15) return '#16a34a'; // verde (rentabilidad sana)
    if (margen > 0) return '#d97706'; // amarillo (justo)
    return '#dc2626'; // rojo (pérdidas)
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Análisis de Rentabilidad</h1>
          <p className="page-subtitle">Control de desvíos, IVA y gastos reales vs presupuestados por obra.</p>
        </div>
      </header>

      {/* KPIs Globales */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Volumen Presupuestado (Aceptado)</h3>
          <div className="stat-value" style={{ fontSize: '24px' }}>{formatCurrency(totalsGlobales.presupuestado)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            IVA Repercutido Est.: {formatCurrency(totalsGlobales.presupuestado * 0.21)}
          </div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gastos Reales Computados</h3>
          <div className="stat-value" style={{ fontSize: '24px', color: '#dc2626' }}>{formatCurrency(totalsGlobales.gastos)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            IVA Soportado Est.: {formatCurrency(totalsGlobales.gastos * 0.21)}
          </div>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: totalsGlobales.porcentaje > 15 ? '#f0fdf4' : (totalsGlobales.porcentaje > 0 ? '#fffbeb' : '#fef2f2'), borderColor: 'transparent' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-main)' }}>Margen Neto Global</h3>
          <div className="stat-value" style={{ fontSize: '28px', color: getStatusColor(totalsGlobales.porcentaje), display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formatCurrency(totalsGlobales.margen)} 
            {totalsGlobales.margen >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: getStatusColor(totalsGlobales.porcentaje) }}>
            {totalsGlobales.porcentaje.toFixed(2)}% rentabilidad
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        
        {/* Tabla Lista de Obras */}
        <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', margin: 0 }}>Desglose por Obra</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th style={{ textAlign: 'right' }}>Presupuestado</th>
                <th style={{ textAlign: 'right' }}>Coste Real</th>
                <th style={{ textAlign: 'right' }}>Margen Beneficio</th>
                <th style={{ textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {obras.length === 0 && (
                <tr><td colSpan="5" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay obras activas para analizar</td></tr>
              )}
              {obras.map(o => {
                const rent = calculateRentabilidad(o);
                const isSelected = selectedObraId === o.id;
                
                return (
                  <tr 
                    key={o.id} 
                    onClick={() => setSelectedObraId(o.id)}
                    style={{ cursor: 'pointer', background: isSelected ? '#eff6ff' : 'transparent', transition: 'background 0.2s' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.id}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(rent.presupuestado)}</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(rent.gastosTotal)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: getStatusColor(rent.porcentaje) }}>
                      {formatCurrency(rent.margen)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: rent.porcentaje > 15 ? '#dcfce7' : (rent.porcentaje > 0 ? '#fef3c7' : '#fef2f2'), color: getStatusColor(rent.porcentaje), padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {rent.porcentaje.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Panel Editor de Gastos Laterales */}
        <div className="stat-card" style={{ padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px' }}>
          {!selectedObraId ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
              <FileBarChart size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <div style={{ fontSize: '14px' }}>Selecciona una obra en la tabla izquierda para imputar sus gastos reales y calcular desvíos.</div>
            </div>
          ) : (
            (() => {
              const obra = obras.find(o => o.id === selectedObraId);
              const r = calculateRentabilidad(obra);
              
              return (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Imputar Gastos</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>{obra.nombre}</p>

                  <div className="form-group full-width" style={{ marginBottom: '16px' }}>
                    <label>Personal (Nóminas Propias)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>€</span>
                      <input 
                        type="number" 
                        value={r.g.personal || ''} 
                        onChange={(e) => updateGastos(obra.id, 'personal', e.target.value)}
                        style={{ paddingLeft: '28px', textAlign: 'right' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="form-group full-width" style={{ marginBottom: '16px' }}>
                    <label>Materiales (Proveedores/Almacén)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>€</span>
                      <input 
                        type="number" 
                        value={r.g.materiales || ''} 
                        onChange={(e) => updateGastos(obra.id, 'materiales', e.target.value)}
                        style={{ paddingLeft: '28px', textAlign: 'right' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="form-group full-width" style={{ marginBottom: '16px' }}>
                    <label>Subcontratas (Fontanería, Cía, etc)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>€</span>
                      <input 
                        type="number" 
                        value={r.g.subcontratas || ''} 
                        onChange={(e) => updateGastos(obra.id, 'subcontratas', e.target.value)}
                        style={{ paddingLeft: '28px', textAlign: 'right' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="form-group full-width" style={{ marginBottom: '24px' }}>
                    <label>Otros Gastos (Licencias, varios)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>€</span>
                      <input 
                        type="number" 
                        value={r.g.otros || ''} 
                        onChange={(e) => updateGastos(obra.id, 'otros', e.target.value)}
                        style={{ paddingLeft: '28px', textAlign: 'right' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Gastos Totales:</span>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>{formatCurrency(r.gastosTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ingresos Aprobados:</span>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(r.presupuestado)}</span>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800 }}>
                      <span style={{ color: 'var(--text-main)' }}>Resultado Real:</span>
                      <span style={{ color: getStatusColor(r.porcentaje) }}>{formatCurrency(r.margen)}</span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#16a34a' }}>
                    <Save size={14} /> Los gastos se calculan y guardan automáticamente
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
