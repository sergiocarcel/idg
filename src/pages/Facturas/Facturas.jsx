import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileBarChart, Save, Plus, Trash2, X } from 'lucide-react';
import { updateDoc } from '../../services/db';

const PREDEFINED_CATS = [
  { key: 'personal',             label: 'Personal (por trabajador/nómina)',  placeholder: 'Ej: Juan Fontanero', useSuggestions: 'trabajadores' },
  { key: 'materiales',           label: 'Materiales (por proveedor)',          placeholder: 'Ej: Leroy Merlín',   useSuggestions: 'proveedores' },
  { key: 'subcontratas',         label: 'Subcontratas (por empresa/gremio)',   placeholder: 'Ej: Fontanería López',useSuggestions: 'proveedores' },
  { key: 'gasolina_mantenimiento',label: 'Gasolina y Mantenimiento',            placeholder: 'Ej: Gasolina furgoneta', useSuggestions: null },
  { key: 'herramienta_alquileres',label: 'Herramienta y Alquileres',            placeholder: 'Ej: Alquiler andamio',   useSuggestions: null },
  { key: 'otros',                label: 'Otros gastos generales',              placeholder: 'Ej: Licencia de obra',   useSuggestions: null },
];

export default function Facturas({ data, setData }) {
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [vistaTemp, setVistaTemp] = useState('obra'); // 'obra' | 'mensual' | 'trimestral' | 'anual'
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];
  const trabajadores = data?.trabajadores || [];
  const proveedores = data?.proveedores || [];

  const updateGastos = async (obraId, field, value) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra) return;
    const actuales = obra.gastosReales || {};
    await updateDoc('obras', obraId, { gastosReales: { ...actuales, [field]: value } });
  };

  const sumLineas = (lineas) => {
    if (Array.isArray(lineas)) return lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0);
    return Number(lineas) || 0;
  };

  const getPresupuestoAceptado = (obraId) => {
    const ppto = presupuestos.find(p => p.obraId === obraId && p.estado === 'aceptado');
    if (!ppto) return 0;
    return ppto.capitulos.reduce((sum, cap) =>
      sum + cap.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0), 0);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const calculateRentabilidad = (obra) => {
    const presupuestado = getPresupuestoAceptado(obra.id);
    const g = obra.gastosReales || {};
    // Suma TODAS las categorías (predefinidas + custom), excluyendo _customLabels
    const gastosTotal = Object.entries(g)
      .filter(([k, v]) => k !== '_customLabels' && Array.isArray(v))
      .reduce((sum, [, lineas]) => sum + sumLineas(lineas), 0);
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

  const getStatusColor = (pct) => {
    if (pct > 15) return '#16a34a';
    if (pct > 0) return '#d97706';
    return '#dc2626';
  };

  // ── Agrupación temporal ──────────────────────────────────────
  const getPeriodKey = (obra) => {
    if (!obra.inicio) return 'Sin fecha';
    const d = new Date(obra.inicio);
    if (vistaTemp === 'mensual') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (vistaTemp === 'trimestral') return `${d.getFullYear()}-T${Math.ceil((d.getMonth() + 1) / 3)}`;
    if (vistaTemp === 'anual') return `${d.getFullYear()}`;
    return obra.id;
  };

  const periodLabel = (key) => {
    if (vistaTemp === 'mensual') {
      const [y, m] = key.split('-');
      return new Date(y, m - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    }
    if (vistaTemp === 'trimestral') return key.replace('-', ' ');
    return key;
  };

  const buildPeriodRows = () => {
    const map = new Map();
    obras.forEach(o => {
      const k = getPeriodKey(o);
      const r = calculateRentabilidad(o);
      if (!map.has(k)) map.set(k, { key: k, presupuestado: 0, gastos: 0, margen: 0, count: 0 });
      const row = map.get(k);
      row.presupuestado += r.presupuestado;
      row.gastos += r.gastosTotal;
      row.margen += r.margen;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.key > b.key ? 1 : -1);
  };

  // ── Categorías custom de la obra seleccionada ────────────────
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

  const renderCatSection = (cat, lineas, obra, suggestions) => (
    <div key={cat.key} style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{cat.label}</label>
          {lineas.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 7px', borderRadius: '10px' }}>
              {formatCurrency(sumLineas(lineas))}
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
            const updated = [...lineas, { concepto: '', importe: 0 }];
            updateGastos(obra.id, cat.key, updated);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={12} /> Añadir línea
          </button>
        </div>
      </div>
      {lineas.length === 0 && <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Sin líneas. Pulsa + para desglosar.</div>}
      {lineas.map((l, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          {suggestions && suggestions.length > 0 ? (
            <select value={l.concepto} onChange={(e) => {
              const updated = [...lineas]; updated[idx] = { ...updated[idx], concepto: e.target.value };
              updateGastos(obra.id, cat.key, updated);
            }} style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}>
              <option value="">{cat.placeholder}</option>
              {suggestions.map((s, i) => <option key={i} value={s}>{s}</option>)}
              {l.concepto && !suggestions.includes(l.concepto) && <option value={l.concepto}>{l.concepto}</option>}
            </select>
          ) : (
            <input type="text" value={l.concepto} placeholder={cat.placeholder} onChange={(e) => {
              const updated = [...lineas]; updated[idx] = { ...updated[idx], concepto: e.target.value };
              updateGastos(obra.id, cat.key, updated);
            }} style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }} />
          )}
          <div style={{ position: 'relative', width: '100px' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '11px' }}>€</span>
            <input type="number" value={l.importe || ''} placeholder="0" onChange={(e) => {
              const updated = [...lineas]; updated[idx] = { ...updated[idx], importe: Number(e.target.value) || 0 };
              updateGastos(obra.id, cat.key, updated);
            }} style={{ width: '100%', textAlign: 'right', fontSize: '12px', padding: '6px 8px 6px 22px' }} />
          </div>
          <button onClick={() => {
            const updated = lineas.filter((_, i) => i !== idx);
            updateGastos(obra.id, cat.key, updated);
          }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );

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
          <p className="page-subtitle">Control de desvíos, IVA y gastos reales vs presupuestados por obra.</p>
        </div>
      </header>

      {/* KPIs Globales */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Volumen Presupuestado (Aceptado)</h3>
          <div className="stat-value" style={{ fontSize: '24px' }}>{formatCurrency(totalsGlobales.presupuestado)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>IVA Repercutido Est.: {formatCurrency(totalsGlobales.presupuestado * 0.21)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gastos Reales Computados</h3>
          <div className="stat-value" style={{ fontSize: '24px', color: '#dc2626' }}>{formatCurrency(totalsGlobales.gastos)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>IVA Soportado Est.: {formatCurrency(totalsGlobales.gastos * 0.21)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: totalsGlobales.porcentaje > 15 ? '#f0fdf4' : (totalsGlobales.porcentaje > 0 ? '#fffbeb' : '#fef2f2'), borderColor: 'transparent' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-main)' }}>Margen Neto Global</h3>
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

      <div style={{ display: 'grid', gridTemplateColumns: vistaTemp === 'obra' ? '1fr 350px' : '1fr', gap: '24px' }}>

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
                <th style={{ textAlign: 'right' }}>Presupuestado</th>
                <th style={{ textAlign: 'right' }}>Coste Real</th>
                <th style={{ textAlign: 'right' }}>Margen</th>
                <th style={{ textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {vistaTemp === 'obra' ? (
                obras.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No hay obras para analizar</td></tr>
                  : obras.map(o => {
                    const rent = calculateRentabilidad(o);
                    return (
                      <tr key={o.id} onClick={() => setSelectedObraId(o.id)}
                        style={{ cursor: 'pointer', background: selectedObraId === o.id ? '#eff6ff' : 'transparent' }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{o.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.id}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(rent.presupuestado)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(rent.gastosTotal)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: getStatusColor(rent.porcentaje) }}>{formatCurrency(rent.margen)}</td>
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
                    const pct = row.presupuestado > 0 ? (row.margen / row.presupuestado) * 100 : 0;
                    return (
                      <tr key={row.key}>
                        <td><div style={{ fontWeight: 600 }}>{periodLabel(row.key)}</div></td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{row.count} obra{row.count !== 1 ? 's' : ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.presupuestado)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(row.gastos)}</td>
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

        {/* Panel editor de gastos — solo en vista "por obra" */}
        {vistaTemp === 'obra' && (
          <div className="stat-card" style={{ padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px' }}>
            {!selectedObraId ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                <FileBarChart size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px' }}>Selecciona una obra en la tabla para imputar sus gastos reales.</div>
              </div>
            ) : (() => {
              const obra = obras.find(o => o.id === selectedObraId);
              const r = calculateRentabilidad(obra);
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
                      <input
                        autoFocus
                        type="text"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomCat(obra.id); if (e.key === 'Escape') setShowNewCat(false); }}
                        placeholder="Nombre de la categoría..."
                        style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                      />
                      <button className="btn-primary" onClick={() => handleAddCustomCat(obra.id)} style={{ fontSize: '11px', padding: '6px 10px' }}>Crear</button>
                      <button className="btn-secondary" onClick={() => setShowNewCat(false)} style={{ fontSize: '11px', padding: '6px 10px' }}>✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowNewCat(true)}
                      style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Plus size={13} /> Añadir categoría personalizada
                    </button>
                  )}

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
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
