import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileBarChart, Save, Plus, Trash2 } from 'lucide-react';
import { updateDoc } from '../../services/db';

export default function Facturas({ data, setData }) {
  const [selectedObraId, setSelectedObraId] = useState(null);

  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];

  const updateGastos = async (obraId, field, value) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const actuales = obra.gastosReales || { personal: [], materiales: [], subcontratas: [], otros: [] };
    await updateDoc('obras', obraId, { gastosReales: { ...actuales, [field]: value } });
  };

  const sumLineas = (lineas) => {
    if (Array.isArray(lineas)) return lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0);
    return Number(lineas) || 0;
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
    const g = obra.gastosReales || { personal: [], materiales: [], subcontratas: [], otros: [] };
    const gastosTotal = sumLineas(g.personal) + sumLineas(g.materiales) + sumLineas(g.subcontratas) + sumLineas(g.otros);
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
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Imputar Gastos (Detallado)</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>{obra.nombre}</p>

                  {[{key:'personal',label:'Personal (por trabajador)',placeholder:'Ej: Juan Fontanero'},{key:'materiales',label:'Materiales (por proveedor)',placeholder:'Ej: Leroy Merlín'},{key:'subcontratas',label:'Subcontratas',placeholder:'Ej: Fontanería López'},{key:'otros',label:'Otros gastos',placeholder:'Ej: Licencia de obra'}].map(cat => {
                    const lineas = Array.isArray(r.g[cat.key]) ? r.g[cat.key] : [];
                    return (
                      <div key={cat.key} style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{cat.label}</label>
                          <button type="button" onClick={() => {
                            const updated = [...lineas, { concepto: '', importe: 0 }];
                            updateGastos(obra.id, cat.key, updated);
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={12} /> Añadir línea</button>
                        </div>
                        {lineas.length === 0 && <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin líneas. Pulsa + para desglosar.</div>}
                        {lineas.map((l, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                            <input type="text" value={l.concepto} placeholder={cat.placeholder} onChange={(e) => {
                              const updated = [...lineas]; updated[idx] = { ...updated[idx], concepto: e.target.value };
                              updateGastos(obra.id, cat.key, updated);
                            }} style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                            <div style={{ position: 'relative', width: '100px' }}>
                              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '11px' }}>€</span>
                              <input type="number" value={l.importe || ''} placeholder="0" onChange={(e) => {
                                const updated = [...lineas]; updated[idx] = { ...updated[idx], importe: Number(e.target.value) || 0 };
                                updateGastos(obra.id, cat.key, updated);
                              }} style={{ width: '100%', paddingLeft: '22px', textAlign: 'right', fontSize: '12px', padding: '6px 8px 6px 22px' }} />
                            </div>
                            <button onClick={() => {
                              const updated = lineas.filter((_, i) => i !== idx);
                              updateGastos(obra.id, cat.key, updated);
                            }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                        {lineas.length > 0 && <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>Subtotal: {formatCurrency(sumLineas(lineas))}</div>}
                      </div>
                    );
                  })}

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
