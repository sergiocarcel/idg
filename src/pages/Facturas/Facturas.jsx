import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileBarChart, Save, Plus, Trash2, X } from 'lucide-react';
import { updateDoc } from '../../services/db';
import ExportButton from '../../components/shared/ExportButton.jsx';
import { fmtCurrency } from '../../utils/csvExport';
import { round2, normalizeLine, sumLineas, getPresupuestoAceptado, calculateRentabilidad, getPeriodKey, periodLabel } from '../../utils/rentabilidadUtils';

const PREDEFINED_CATS = [
  { key: 'personal',             label: 'Personal (por trabajador/nómina)',  placeholder: 'Ej: Juan Fontanero', useSuggestions: 'trabajadores' },
  { key: 'materiales',           label: 'Materiales (por proveedor)',          placeholder: 'Ej: Leroy Merlín',   useSuggestions: 'proveedores' },
  { key: 'subcontratas',         label: 'Subcontratas (por empresa/gremio)',   placeholder: 'Ej: Fontanería López',useSuggestions: 'proveedores' },
  { key: 'gasolina_mantenimiento',label: 'Gasolina y Mantenimiento',            placeholder: 'Ej: Gasolina furgoneta', useSuggestions: null },
  { key: 'herramienta_alquileres',label: 'Herramienta y Alquileres',            placeholder: 'Ej: Alquiler andamio',   useSuggestions: null },
  { key: 'otros',                label: 'Otros gastos generales',              placeholder: 'Ej: Licencia de obra',   useSuggestions: null },
];

const IVA_OPTIONS = [21, 10, 4, 0];
const IS_OPTIONS = [25, 15];

export default function Facturas({ data, setData }) {
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [vistaTemp, setVistaTemp] = useState('obra');
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];
  const trabajadores = data?.trabajadores || [];
  const clientes = data?.clientes || [];
  const proveedores = data?.proveedores || [];

  const updateGastos = async (obraId, field, value) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const actuales = obra.gastosReales || {};
    await updateDoc('obras', obraId, { gastosReales: { ...actuales, [field]: value } });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val || 0);

  const calcRent = (obra) => calculateRentabilidad(obra, presupuestos);

  const totalsGlobales = obras.reduce((acc, o) => {
    const r = calcRent(o);
    acc.ingresoBase += r.ingresos.base;
    acc.ingresoIva += round2(r.ingresos.total - r.ingresos.base);
    acc.gastoBase += r.gastos.base;
    acc.gastoIva += r.gastos.ivaTotal;
    acc.margen += r.beneficioNeto;
    return acc;
  }, { ingresoBase: 0, ingresoIva: 0, gastoBase: 0, gastoIva: 0, margen: 0 });
  totalsGlobales.ingresoBase = round2(totalsGlobales.ingresoBase);
  totalsGlobales.ingresoIva = round2(totalsGlobales.ingresoIva);
  totalsGlobales.gastoBase = round2(totalsGlobales.gastoBase);
  totalsGlobales.gastoIva = round2(totalsGlobales.gastoIva);
  totalsGlobales.margen = round2(totalsGlobales.margen);
  totalsGlobales.porcentaje = totalsGlobales.ingresoBase > 0 ? (totalsGlobales.margen / totalsGlobales.ingresoBase) * 100 : 0;

  const getStatusColor = (pct) => {
    if (pct > 15) return '#16a34a';
    if (pct > 0) return '#d97706';
    return '#dc2626';
  };

  const buildPeriodRows = () => {
    const map = new Map();
    obras.forEach(o => {
      const k = getPeriodKey(o, vistaTemp);
      const r = calcRent(o);
      if (!map.has(k)) map.set(k, { key: k, ingresoBase: 0, gastoBase: 0, margen: 0, count: 0 });
      const row = map.get(k);
      row.ingresoBase += r.ingresos.base;
      row.gastoBase += r.gastos.base;
      row.margen += r.beneficioNeto;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.key > b.key ? 1 : -1);
  };

  const getCustomCats = (g) => {
    const labels = g._customLabels || {};
    return Object.keys(g)
      .filter(k => k.startsWith('custom_'))
      .map(k => ({ key: k, label: labels[k] || k, placeholder: 'Detalle del gasto', useSuggestions: null }));
  };

  const handleAddCustomCat = async (obraId) => {
    if (!newCatName.trim()) return;
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const k = 'custom_' + Date.now();
    const g = obra.gastosReales || {};
    const labels = g._customLabels || {};
    await updateDoc('obras', obraId, {
      gastosReales: { ...g, [k]: [], _customLabels: { ...labels, [k]: newCatName.trim() } }
    });
    setNewCatName('');
    setShowNewCat(false);
  };

  const handleRemoveCustomCat = async (obraId, catKey) => {
    if (!window.confirm('¿Eliminar esta categoría y sus líneas?')) return;
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const g = { ...obra.gastosReales || {} };
    delete g[catKey];
    const labels = { ...g._customLabels };
    delete labels[catKey];
    g._customLabels = labels;
    await updateDoc('obras', obraId, { gastosReales: g });
  };

  const updateLine = (obra, catKey, lineas, idx, updates) => {
    const updated = lineas.map((l, i) => i === idx ? { ...normalizeLine(l), ...updates } : l);
    updateGastos(obra.id, catKey, updated);
  };

  const renderCatSection = (cat, rawLineas, obra, suggestions) => {
    const lineas = rawLineas.map(normalizeLine);
    const subtotal = sumLineas(lineas);
    return (
      <div key={cat.key} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{cat.label}</label>
            {lineas.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 7px', borderRadius: '10px' }}>
                {formatCurrency(subtotal.total)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {cat.key.startsWith('custom_') && (
              <button type="button" onClick={() => handleRemoveCustomCat(obra.id, cat.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                <X size={12} />
              </button>
            )}
            <button type="button" onClick={() => {
              const updated = [...lineas, { concepto: '', base: 0, iva: 21, total: 0 }];
              updateGastos(obra.id, cat.key, updated);
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={12} /> Añadir línea
            </button>
          </div>
        </div>
        {lineas.length === 0 && <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin líneas. Pulsa + para desglosar.</div>}
        {lineas.map((l, idx) => (
          <div key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {/* Fila 1: concepto */}
            <div style={{ marginBottom: '6px' }}>
              {suggestions && suggestions.length > 0 ? (
                <select value={l.concepto} onChange={(e) => updateLine(obra, cat.key, lineas, idx, { concepto: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}>
                  <option value="">{cat.placeholder}</option>
                  {suggestions.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  {l.concepto && !suggestions.includes(l.concepto) && <option value={l.concepto}>{l.concepto}</option>}
                </select>
              ) : (
                <input type="text" value={l.concepto} placeholder={cat.placeholder}
                  onChange={(e) => updateLine(obra, cat.key, lineas, idx, { concepto: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '5px 8px', boxSizing: 'border-box' }} />
              )}
            </div>
            {/* Fila 2: base, iva, total, delete */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Base €</div>
                <input type="number" value={l.base || ''} placeholder="0"
                  onChange={(e) => {
                    const base = Number(e.target.value) || 0;
                    const total = round2(base * (1 + l.iva / 100));
                    updateLine(obra, cat.key, lineas, idx, { base, total });
                  }}
                  style={{ width: '100%', textAlign: 'right', fontSize: '12px', padding: '5px 6px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: '60px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>IVA %</div>
                <select value={l.iva} onChange={(e) => {
                  const iva = Number(e.target.value);
                  const total = round2(l.base * (1 + iva / 100));
                  updateLine(obra, cat.key, lineas, idx, { iva, total });
                }} style={{ width: '100%', fontSize: '12px', padding: '5px 4px' }}>
                  {IVA_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Total €</div>
                <input type="number" value={l.total || ''} placeholder="0"
                  onChange={(e) => {
                    const total = Number(e.target.value) || 0;
                    const base = round2(total / (1 + l.iva / 100));
                    updateLine(obra, cat.key, lineas, idx, { total, base });
                  }}
                  style={{ width: '100%', textAlign: 'right', fontSize: '12px', padding: '5px 6px', boxSizing: 'border-box' }} />
              </div>
              <button onClick={() => {
                const updated = lineas.filter((_, i) => i !== idx);
                updateGastos(obra.id, cat.key, updated);
              }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px', marginTop: '14px' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const VISTA_OPTS = [
    { value: 'obra', label: 'Por Obra' },
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'anual', label: 'Anual' },
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Análisis de Rentabilidad</h1>
          <p className="page-subtitle">Control financiero completo: ingresos, gastos, IVA y beneficio por obra.</p>
        </div>
        <ExportButton
          data={obras.map(o => { const r = calcRent(o); return { obra: o.nombre, cliente: clientes.find(c => c.id === o.clienteId)?.nombre || '', presupuestado: r.presupuestado, ingresoBase: r.ingresos.base, gastoBase: r.gastos.base, beneficioNeto: r.beneficioNeto, margen: r.porcentaje }; })}
          filename="rentabilidad_obras"
          columns={[
            { key: 'obra', label: 'Obra' },
            { key: 'cliente', label: 'Cliente' },
            { key: (r) => fmtCurrency(r.presupuestado), label: 'Presupuestado' },
            { key: (r) => fmtCurrency(r.ingresoBase), label: 'Ingresos (base)' },
            { key: (r) => fmtCurrency(r.gastoBase), label: 'Gastos (base)' },
            { key: (r) => fmtCurrency(r.beneficioNeto), label: 'Beneficio Neto' },
            { key: (r) => r.margen.toFixed(2) + '%', label: 'Margen %' },
          ]}
        />
      </header>

      {/* KPIs Globales */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ingresos Aprobados (Base)</h3>
          <div className="stat-value" style={{ fontSize: '24px' }}>{formatCurrency(totalsGlobales.ingresoBase)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>IVA Repercutido: {formatCurrency(totalsGlobales.ingresoIva)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gastos Reales (Base)</h3>
          <div className="stat-value" style={{ fontSize: '24px', color: '#dc2626' }}>{formatCurrency(totalsGlobales.gastoBase)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>IVA Soportado: {formatCurrency(totalsGlobales.gastoIva)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: totalsGlobales.porcentaje > 15 ? '#f0fdf4' : (totalsGlobales.porcentaje > 0 ? '#fffbeb' : '#fef2f2'), borderColor: 'transparent' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-main)' }}>Beneficio Neto Global</h3>
          <div className="stat-value" style={{ fontSize: '28px', color: getStatusColor(totalsGlobales.porcentaje), display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formatCurrency(totalsGlobales.margen)}
            {totalsGlobales.margen >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: getStatusColor(totalsGlobales.porcentaje) }}>{totalsGlobales.porcentaje.toFixed(2)}% rentabilidad</div>
        </div>
      </div>

      {/* Selector vista temporal */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {VISTA_OPTS.map(opt => (
          <button key={opt.value} onClick={() => { setVistaTemp(opt.value); setSelectedObraId(null); }}
            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: vistaTemp === opt.value ? '#fff' : 'transparent',
              color: vistaTemp === opt.value ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: vistaTemp === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: vistaTemp === 'obra' ? '1fr 380px' : '1fr', gap: '24px' }}>

        {/* Tabla */}
        <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', margin: 0 }}>
              {vistaTemp === 'obra' ? 'Desglose por Obra' : vistaTemp === 'mensual' ? 'Desglose Mensual' : vistaTemp === 'trimestral' ? 'Desglose Trimestral' : 'Desglose Anual'}
            </h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>{vistaTemp === 'obra' ? 'Proyecto' : 'Período'}</th>
                {vistaTemp !== 'obra' && <th style={{ textAlign: 'center' }}>Obras</th>}
                <th style={{ textAlign: 'right' }}>Ingresos (Base)</th>
                <th style={{ textAlign: 'right' }}>Gastos (Base)</th>
                <th style={{ textAlign: 'right' }}>Beneficio</th>
                <th style={{ textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {vistaTemp === 'obra' ? (
                obras.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No hay obras para analizar</td></tr>
                  : obras.map(o => {
                    const rent = calcRent(o);
                    return (
                      <tr key={o.id} onClick={() => setSelectedObraId(o.id)}
                        style={{ cursor: 'pointer', background: selectedObraId === o.id ? '#eff6ff' : 'transparent' }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.id}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(rent.ingresos.base)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(rent.gastos.base)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: getStatusColor(rent.porcentaje) }}>{formatCurrency(rent.beneficioNeto)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: rent.porcentaje > 15 ? '#dcfce7' : (rent.porcentaje > 0 ? '#fef3c7' : '#fef2f2'), color: getStatusColor(rent.porcentaje), padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                            {rent.porcentaje.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                buildPeriodRows().length === 0
                  ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No hay datos con fecha de inicio</td></tr>
                  : buildPeriodRows().map(row => {
                    const pct = row.ingresoBase > 0 ? (row.margen / row.ingresoBase) * 100 : 0;
                    return (
                      <tr key={row.key}>
                        <td><div style={{ fontWeight: 600 }}>{periodLabel(row.key, vistaTemp)}</div></td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{row.count} obra{row.count !== 1 ? 's' : ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.ingresoBase)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(row.gastoBase)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: getStatusColor(pct) }}>{formatCurrency(row.margen)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: pct > 15 ? '#dcfce7' : (pct > 0 ? '#fef3c7' : '#fef2f2'), color: getStatusColor(pct), padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Panel editor — solo en vista "por obra" */}
        {vistaTemp === 'obra' && (
          <div className="stat-card" style={{ padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px' }}>
            {!selectedObraId ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                <FileBarChart size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px' }}>Selecciona una obra en la tabla para imputar sus gastos reales.</div>
              </div>
            ) : (() => {
              const obra = obras.find(o => o.id === selectedObraId);
              const r = calcRent(obra);
              const customCats = getCustomCats(r.g);
              const allCats = [
                ...PREDEFINED_CATS.map(cat => ({
                  ...cat,
                  suggestions: cat.useSuggestions === 'trabajadores'
                    ? trabajadores.map(t => t.nombre + (t.apellidos ? ' ' + t.apellidos : ''))
                    : cat.useSuggestions === 'proveedores'
                    ? proveedores.map(p => p.nombre)
                    : []
                })),
                ...customCats.map(cat => ({ ...cat, suggestions: [] })),
              ];

              const ivaRepercutido = round2(r.ingresos.total - r.ingresos.base);
              const ivaSoportado = r.gastos.ivaTotal;
              const resultadoIVA = round2(ivaRepercutido - ivaSoportado);

              return (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Imputar Gastos</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>{obra.nombre}</p>

                  {allCats.map(cat => {
                    const lineas = Array.isArray(r.g[cat.key]) ? r.g[cat.key] : [];
                    return renderCatSection(cat, lineas, obra, cat.suggestions);
                  })}

                  {/* Añadir categoría custom */}
                  {showNewCat ? (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                      <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomCat(obra.id); if (e.key === 'Escape') setShowNewCat(false); }}
                        placeholder="Nombre de la categoría..."
                        style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
                      <button className="btn-primary" onClick={() => handleAddCustomCat(obra.id)} style={{ fontSize: '11px', padding: '6px 10px' }}>Crear</button>
                      <button className="btn-secondary" onClick={() => setShowNewCat(false)} style={{ fontSize: '11px', padding: '6px 10px' }}>✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowNewCat(true)}
                      style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Plus size={13} /> Añadir categoría personalizada
                    </button>
                  )}

                  {/* ── BLOQUE RESUMEN FINANCIERO ── */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>

                    {/* 1. Ingresos Aprobados */}
                    <div style={{ padding: '14px 16px', background: '#f0fdf4' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Ingresos Aprobados</div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Base €</div>
                          <input type="number" value={r.ingresos.base || ''} placeholder="0"
                            onChange={async (e) => {
                              const base = Number(e.target.value) || 0;
                              const iva = r.ingresos.iva;
                              const total = round2(base * (1 + iva / 100));
                              await updateDoc('obras', obra.id, { ingresosAprobados: { base, iva, total } });
                            }}
                            style={{ width: '100%', textAlign: 'right', fontSize: '12px', padding: '5px 6px', boxSizing: 'border-box', background: '#fff' }} />
                        </div>
                        <div style={{ width: '60px' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>IVA %</div>
                          <select value={r.ingresos.iva}
                            onChange={async (e) => {
                              const iva = Number(e.target.value);
                              const base = r.ingresos.base;
                              const total = round2(base * (1 + iva / 100));
                              await updateDoc('obras', obra.id, { ingresosAprobados: { base, iva, total } });
                            }}
                            style={{ width: '100%', fontSize: '12px', padding: '5px 4px', background: '#fff' }}>
                            {IVA_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Total €</div>
                          <input type="number" value={r.ingresos.total || ''} placeholder="0"
                            onChange={async (e) => {
                              const total = Number(e.target.value) || 0;
                              const iva = r.ingresos.iva;
                              const base = round2(total / (1 + iva / 100));
                              await updateDoc('obras', obra.id, { ingresosAprobados: { base, iva, total } });
                            }}
                            style={{ width: '100%', textAlign: 'right', fontSize: '12px', padding: '5px 6px', boxSizing: 'border-box', background: '#fff' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    {/* 2. Gastos Totales */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Gastos Totales</div>
                      {[
                        { label: 'Base imponible', value: r.gastos.base },
                        { label: 'IVA soportado', value: r.gastos.ivaTotal },
                        { label: 'Total con IVA', value: r.gastos.total, bold: true },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                          <span style={{ fontWeight: row.bold ? 700 : 500, color: row.bold ? '#dc2626' : 'var(--text-main)' }}>{formatCurrency(row.value)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    {/* 3. IVA de la Obra */}
                    <div style={{ padding: '14px 16px', background: '#fafafa' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>IVA de la Obra</div>
                      {[
                        { label: 'IVA Repercutido', value: ivaRepercutido, color: '#16a34a' },
                        { label: 'IVA Soportado', value: ivaSoportado, color: '#dc2626' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                          <span style={{ fontWeight: 600, color: row.color }}>{formatCurrency(row.value)}</span>
                        </div>
                      ))}
                      <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-main)' }}>Resultado IVA</span>
                        <span style={{ color: resultadoIVA >= 0 ? '#dc2626' : '#16a34a' }}>
                          {formatCurrency(Math.abs(resultadoIVA))} {resultadoIVA >= 0 ? '(a pagar)' : '(a devolver)'}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    {/* 4. Beneficio Neto */}
                    <div style={{ padding: '14px 16px', background: r.beneficioNeto >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Beneficio Neto</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: getStatusColor(r.porcentaje) }}>{formatCurrency(r.beneficioNeto)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ingresos base − Gastos base</div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    {/* 5. Impuesto de Sociedades */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Impuesto de Sociedades</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <select value={IS_OPTIONS.includes(r.isPercent) ? r.isPercent : 'manual'}
                          onChange={async (e) => {
                            if (e.target.value !== 'manual') await updateDoc('obras', obra.id, { impuestoSociedades: Number(e.target.value) });
                          }}
                          style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }}>
                          {IS_OPTIONS.map(v => <option key={v} value={v}>{v}% {v === 25 ? '(General)' : '(Reducido)'}</option>)}
                          {!IS_OPTIONS.includes(r.isPercent) && <option value="manual">{r.isPercent}% (Manual)</option>}
                          <option value="manual">Manual...</option>
                        </select>
                        <input type="number" value={r.isPercent} min="0" max="100"
                          onChange={async (e) => {
                            await updateDoc('obras', obra.id, { impuestoSociedades: Number(e.target.value) || 0 });
                          }}
                          style={{ width: '60px', fontSize: '12px', padding: '5px 6px', textAlign: 'right' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-muted)' }}>IS calculado</span>
                        <span style={{ color: '#d97706' }}>{formatCurrency(r.isAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#16a34a' }}>
                    <Save size={14} /> Los datos se guardan automáticamente
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
