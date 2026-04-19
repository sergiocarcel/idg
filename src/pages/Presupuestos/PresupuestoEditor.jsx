import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Save, FileText, LayoutTemplate, Trash } from 'lucide-react';
import ActivityTimeline from '../../components/shared/ActivityTimeline.jsx';
import { deleteDoc } from '../../services/db';

function ContentEditableCell({ initialValue, onChange, onFocus, onBlur, placeholder }) {
  const ref = useRef(null);
  const focusedRef = useRef(false);
  const [focused, setFocused] = useState(false);

  // Set initial content on mount
  useEffect(() => {
    if (ref.current && ref.current.innerHTML === '') {
      ref.current.innerHTML = initialValue || '';
    }
  }, []);

  // Only sync external changes when NOT focused
  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.innerHTML !== (initialValue || '')) {
      ref.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  return (
    <div style={{ position: 'relative' }}>
       <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', position: 'absolute', top: '-24px', left: 0, opacity: focused ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: focused ? 'auto' : 'none', background: '#fff', padding: '2px', border: '1px solid var(--border)', borderRadius: '4px', zIndex: 10 }}>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => document.execCommand('bold', false, null)} style={{ padding: '2px 6px', fontWeight: 700, fontSize: '10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>B</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => document.execCommand('italic', false, null)} style={{ padding: '2px 6px', fontStyle: 'italic', fontSize: '10px', border: 'none', background: 'transparent', cursor: 'pointer' }}>I</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => { focusedRef.current = true; setFocused(true); if(onFocus) onFocus(); }}
        onBlur={(e) => { 
          focusedRef.current = false;
          setFocused(false); 
          onChange(e.currentTarget.innerHTML); 
          if(onBlur) onBlur(); 
        }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', minHeight: '34px', outline: 'none', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.4', background: '#fff', cursor: 'text' }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

export default function PresupuestoEditor({ ppto, data, plantillas = [], onSave, onClose }) {
  const [activeSearch, setActiveSearch] = useState({ capIdx: null, partIdx: null });
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editorTab, setEditorTab] = useState('datos');
  const condicionesRef = useRef(null);
  const isNew = !ppto;

  const generateNextId = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const existing = (data?.presupuestos || [])
      .map(p => p.id)
      .filter(id => typeof id === 'string' && id.endsWith(`-${year}`))
      .map(id => parseInt(id.split('-')[0], 10))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${String(next).padStart(3, '0')}-${year}`;
  };

  const [formData, setFormData] = useState(ppto || {
    id: generateNextId(),
    etiqueta: '',
    clienteId: '',
    obraId: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'borrador',
    notas: '',
    condicionesPresupuesto: '',
    capitulos: [
      { id: 'CAP-1', nombre: 'Capítulo 1', partidas: [{ descripcion: '', unidad: '', cantidad: 1, precioCoste: 0, precioVenta: 0 }] }
    ],
    extras: []
  });

  const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleCondicionesFormat = (command) => {
    document.execCommand(command, false, null);
    if (condicionesRef.current) {
      setFormData(prev => ({ ...prev, condicionesPresupuesto: condicionesRef.current.innerHTML }));
    }
  };

  const addCapitulo = () => {
    setFormData({
      ...formData,
      capitulos: [...formData.capitulos, { id: 'CAP-' + Date.now(), nombre: 'Nuevo Capítulo', partidas: [] }]
    });
  };

  const removeCapitulo = (index) => {
    const newCaps = [...formData.capitulos];
    newCaps.splice(index, 1);
    setFormData({ ...formData, capitulos: newCaps });
  };

  const addPartida = (capIndex) => {
    const newCaps = [...formData.capitulos];
    newCaps[capIndex].partidas.push({ descripcion: '', unidad: '', cantidad: 1, precioCoste: 0, precioVenta: 0 });
    setFormData({ ...formData, capitulos: newCaps });
  };

  const updatePartida = (capIndex, partIndex, field, value) => {
    const newCaps = [...formData.capitulos];
    const val = (field === 'descripcion' || field === 'unidad') ? value : (value === '' ? '' : (parseFloat(value) || 0));
    newCaps[capIndex].partidas[partIndex][field] = val;
    setFormData({ ...formData, capitulos: newCaps });
  };

  const removePartida = (capIndex, partIndex) => {
    const newCaps = [...formData.capitulos];
    newCaps[capIndex].partidas.splice(partIndex, 1);
    setFormData({ ...formData, capitulos: newCaps });
  };

  const totalPresupuesto = formData.capitulos.reduce((sum, cap) => {
    return sum + cap.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
  }, 0);

  const totalExtras = (formData.extras || []).reduce((sum, cap) => {
    return sum + cap.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
  }, 0);

  const addExtra = () => {
    setFormData({
      ...formData,
      extras: [...(formData.extras || []), { id: 'EXT-' + Date.now(), nombre: 'Nuevo Extra', partidas: [] }]
    });
  };

  const removeExtra = (index) => {
    const newExtras = [...(formData.extras || [])];
    newExtras.splice(index, 1);
    setFormData({ ...formData, extras: newExtras });
  };

  const addPartidaExtra = (extIdx) => {
    const newExtras = [...(formData.extras || [])];
    newExtras[extIdx].partidas.push({ descripcion: '', unidad: '', cantidad: 1, precioCoste: 0, precioVenta: 0 });
    setFormData({ ...formData, extras: newExtras });
  };

  const updatePartidaExtra = (extIdx, partIdx, field, value) => {
    const newExtras = [...(formData.extras || [])];
    const val = (field === 'descripcion' || field === 'unidad') ? value : (value === '' ? '' : (parseFloat(value) || 0));
    newExtras[extIdx].partidas[partIdx][field] = val;
    setFormData({ ...formData, extras: newExtras });
  };

  const removePartidaExtra = (extIdx, partIdx) => {
    const newExtras = [...(formData.extras || [])];
    newExtras[extIdx].partidas.splice(partIdx, 1);
    setFormData({ ...formData, extras: newExtras });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const autoResize = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} className="text-blue-600" />
              {ppto ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} · {formData.id || '(sin ID)'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', marginRight: '8px' }}>
              Total: {formatCurrency(totalPresupuesto)}
              {totalExtras > 0 && <span style={{ fontSize: '13px', color: '#d97706', marginLeft: '8px' }}>+ Extras: {formatCurrency(totalExtras)}</span>}
            </span>
            {isNew && plantillas.length > 0 && (
              <button className="btn-secondary" style={{ fontSize: '12px', color: '#7c3aed', borderColor: '#c4b5fd' }} onClick={() => setShowTemplateSelector(true)}>
                <LayoutTemplate size={14} /> Cargar Plantilla
              </button>
            )}
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Tabs (only when editing existing) */}
        {!isNew && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', background: '#f8fafc' }}>
            {['datos', 'historial'].map(tab => (
              <button key={tab} onClick={() => setEditorTab(tab)} style={{
                padding: '10px 14px 10px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                borderBottom: editorTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: editorTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: editorTab === tab ? 600 : 500, marginRight: '12px',
              }}>
                {tab === 'datos' ? 'Editar' : 'Historial'}
              </button>
            ))}
          </div>
        )}

        {/* Historial Tab */}
        {!isNew && editorTab === 'historial' && (
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            <ActivityTimeline entidad="presupuestos" entidadId={ppto?.id} logs={data?.logs || []} usuarios={data?.config?.usuarios || []} />
          </div>
        )}

        {/* Form Body */}
        {(isNew || editorTab === 'datos') && (
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', background: '#fafafa', padding: '24px' }}>
          
          <div className="stat-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div className="form-grid">
              <div className="form-group half-width">
                <label>Nº Presupuesto</label>
                <input
                  type="text"
                  value={formData.id}
                  disabled
                  style={{ fontWeight: 600, fontSize: '15px', background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group half-width">
                <label>Etiqueta / Nombre descriptivo</label>
                <input
                  type="text"
                  value={formData.etiqueta || ''}
                  onChange={handleChange('etiqueta')}
                  placeholder="Ej: Reforma cocina García, Fachada calle Mayor..."
                  autoFocus={isNew}
                />
              </div>
              <div className="form-group half-width">
                <label>Cliente</label>
                <select value={formData.clienteId} onChange={handleChange('clienteId')}>
                  <option value="">Seleccione cliente...</option>
                  {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Obra / Proyecto</label>
                <select value={formData.obraId} onChange={handleChange('obraId')}>
                  <option value="">Seleccione obra (opcional)...</option>
                  {data.obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div className="form-group half-width">
                <label>Fecha Emisión</label>
                <input type="date" value={formData.fecha} onChange={handleChange('fecha')} />
              </div>
              <div className="form-group full-width">
                <label>Condiciones Generales de Presupuestos (Aparecen al pie del PDF)</label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleCondicionesFormat('bold')} style={{ padding: '2px 8px', fontWeight: 700, fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', background: '#f8fafc', cursor: 'pointer' }}>B</button>
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleCondicionesFormat('italic')} style={{ padding: '2px 8px', fontStyle: 'italic', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', background: '#f8fafc', cursor: 'pointer' }}>I</button>
                </div>
                <div
                  ref={condicionesRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setFormData(prev => ({ ...prev, condicionesPresupuesto: condicionesRef.current.innerHTML }))}
                  dangerouslySetInnerHTML={{ __html: formData.condicionesPresupuesto || '' }}
                  style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', minHeight: '72px', fontSize: '13px', lineHeight: '1.5', background: '#fff', outline: 'none', cursor: 'text' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Si se rellena, sustituirá las condiciones generales de la empresa. Selecciona texto y pulsa B o I para formatear.</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Desglose Económico</h3>
            <button className="btn-secondary" onClick={addCapitulo}>
              <Plus size={14} /> Añadir Capítulo
            </button>
          </div>

          {formData.capitulos.map((cap, capIdx) => {
            const capTotal = cap.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
            return (
              <div key={cap.id} className="stat-card" style={{ padding: '0', marginBottom: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                
                {/* Cap Header */}
                <div style={{ padding: '12px 16px', background: '#f1f5f9', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#475569', fontSize: '12px', minWidth: '80px' }}>CAPÍTULO {capIdx + 1}</div>
                  <textarea
                    value={cap.nombre}
                    rows={1}
                    onChange={(e) => {
                      const newCaps = [...formData.capitulos];
                      newCaps[capIdx].nombre = e.target.value;
                      setFormData({ ...formData, capitulos: newCaps });
                      autoResize(e.target);
                    }}
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid transparent', background: 'transparent', fontWeight: 600, fontSize: '14px', outline: 'none', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: '1.4' }}
                    onFocus={e => { e.target.style.background = '#fff'; autoResize(e.target); }}
                    onBlur={e => e.target.style.background = 'transparent'}
                    ref={el => autoResize(el)}
                    placeholder="Nombre del capítulo..."
                  />
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#1a1a1a' }}>{formatCurrency(capTotal)}</div>
                  <button className="icon-btn danger" onClick={() => removeCapitulo(capIdx)}><Trash2 size={14} /></button>
                </div>

                {/* Partidas */}
                <div style={{ padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingBottom: '8px', color: 'var(--text-muted)' }}>Concepto / Descripción</th>
                        <th style={{ width: '60px', textAlign: 'center', paddingBottom: '8px', color: 'var(--text-muted)' }}>Unid</th>
                        <th style={{ width: '70px', textAlign: 'center', paddingBottom: '8px', color: 'var(--text-muted)' }}>Cant</th>
                        <th style={{ width: '90px', textAlign: 'right', paddingBottom: '8px', color: 'var(--text-muted)' }}>Precio</th>
                        <th style={{ width: '100px', textAlign: 'right', paddingBottom: '8px', color: 'var(--text-muted)' }}>Total</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cap.partidas.map((partida, partIdx) => (
                        <tr key={partIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 0' }}>
                            <div style={{ position: 'relative' }}>
                              <ContentEditableCell
                                initialValue={partida.descripcion || ''}
                                onChange={(val) => updatePartida(capIdx, partIdx, 'descripcion', val)}
                                onFocus={() => setActiveSearch({ capIdx, partIdx })}
                                onBlur={() => setTimeout(() => setActiveSearch({ capIdx: null, partIdx: null }), 200)}
                                placeholder="Escribe para buscar o añade libremente..."
                              />
                              
                              {activeSearch.capIdx === capIdx && activeSearch.partIdx === partIdx && partida.descripcion?.length > 2 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                  {data.catalogoPartidas?.filter(p => p.concepto.toLowerCase().includes(partida.descripcion.toLowerCase()) || p.codigo?.toLowerCase().includes(partida.descripcion.toLowerCase())).map(p => (
                                    <div 
                                      key={p.id} 
                                      onClick={() => {
                                          const newCaps = [...formData.capitulos];
                                          newCaps[capIdx].partidas[partIdx] = { ...newCaps[capIdx].partidas[partIdx], descripcion: p.concepto, precioCoste: p.coste, precioVenta: p.precioVenta, unidad: p.unidad };
                                          setFormData({ ...formData, capitulos: newCaps });
                                          setActiveSearch({ capIdx: null, partIdx: null });
                                      }}
                                      style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.concepto}</div>
                                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Ref: {p.codigo || 'S/N'} &middot; Venta: {formatCurrency(p.precioVenta)} / {p.unidad}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text" value={partida.unidad || ''} placeholder="ud"
                              onChange={(e) => updatePartida(capIdx, partIdx, 'unidad', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', fontSize: '13px', color: '#475569' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                              <input
                                type="number" step="any" value={partida.cantidad === '' ? '' : partida.cantidad}
                                onChange={(e) => updatePartida(capIdx, partIdx, 'cantidad', e.target.value)}
                                onFocus={(e) => e.target.value === '1' ? e.target.select() : e.target.select()}
                                style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center' }}
                              />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                              <input
                                type="number" step="any" value={partida.precioVenta === '' ? '' : partida.precioVenta}
                                onChange={(e) => updatePartida(capIdx, partIdx, 'precioVenta', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'right' }}
                              />
                          </td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(partida.cantidad * partida.precioVenta)}
                          </td>
                          <td style={{ padding: '6px 0', textAlign: 'right' }}>
                            <button onClick={() => removePartida(capIdx, partIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '12px' }}>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => addPartida(capIdx)}>
                      <Plus size={12} /> Añadir Línea
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Separador y sección EXTRAS */}
          <div style={{ marginTop: '32px', borderTop: '3px dashed #d97706', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>Extras (Fuera del Presupuesto Base)</h3>
                <p style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>Estos bloques aparecerán debajo del total del presupuesto como partidas adicionales opcionales.</p>
              </div>
              <button className="btn-secondary" style={{ borderColor: '#fbbf24', color: '#92400e', background: '#fffbeb' }} onClick={addExtra}>
                <Plus size={14} /> Añadir Bloque Extra
              </button>
            </div>

            {(formData.extras || []).map((ext, extIdx) => {
              const extTotal = ext.partidas.reduce((s, p) => s + (p.cantidad * p.precioVenta), 0);
              return (
                <div key={ext.id} className="stat-card" style={{ padding: '0', marginBottom: '16px', border: '2px solid #fbbf24', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '12px', minWidth: '60px' }}>EXTRA {extIdx + 1}</div>
                    <textarea
                      rows={1}
                      value={ext.nombre}
                      onChange={(e) => {
                        const newExtras = [...(formData.extras || [])];
                        newExtras[extIdx].nombre = e.target.value;
                        setFormData({ ...formData, extras: newExtras });
                        autoResize(e.target);
                      }}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid transparent', background: 'transparent', fontWeight: 600, fontSize: '14px', outline: 'none', color: '#92400e', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: '1.4' }}
                      onFocus={e => { e.target.style.background = '#fff'; autoResize(e.target); }}
                      onBlur={e => e.target.style.background = 'transparent'}
                      ref={el => autoResize(el)}
                      placeholder="Nombre del extra..."
                    />
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#92400e' }}>{formatCurrency(extTotal)}</div>
                    <button className="icon-btn danger" onClick={() => removeExtra(extIdx)}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', paddingBottom: '8px', color: 'var(--text-muted)' }}>Concepto</th>
                          <th style={{ width: '60px', textAlign: 'center', paddingBottom: '8px', color: 'var(--text-muted)' }}>Unid</th>
                          <th style={{ width: '70px', textAlign: 'center', paddingBottom: '8px', color: 'var(--text-muted)' }}>Cant</th>
                          <th style={{ width: '90px', textAlign: 'right', paddingBottom: '8px', color: 'var(--text-muted)' }}>Precio</th>
                          <th style={{ width: '100px', textAlign: 'right', paddingBottom: '8px', color: 'var(--text-muted)' }}>Total</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ext.partidas.map((partida, partIdx) => (
                          <tr key={partIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 0' }}>
                              <ContentEditableCell
                                initialValue={partida.descripcion || ''}
                                onChange={(val) => updatePartidaExtra(extIdx, partIdx, 'descripcion', val)}
                                placeholder="Descripción del extra..."
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input type="text" value={partida.unidad || ''} placeholder="ud" onChange={(e) => updatePartidaExtra(extIdx, partIdx, 'unidad', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', fontSize: '13px' }} />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input type="number" step="any" value={partida.cantidad === '' ? '' : partida.cantidad} onChange={(e) => updatePartidaExtra(extIdx, partIdx, 'cantidad', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center' }} />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input type="number" step="any" value={partida.precioVenta === '' ? '' : partida.precioVenta} onChange={(e) => updatePartidaExtra(extIdx, partIdx, 'precioVenta', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'right' }} />
                            </td>
                            <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(partida.cantidad * partida.precioVenta)}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                              <button onClick={() => removePartidaExtra(extIdx, partIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop: '12px' }}>
                      <button className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => addPartidaExtra(extIdx)}>
                        <Plus size={12} /> Añadir Línea Extra
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        )}

        {/* Footer */}
        <div className="modal-footer" style={{ background: '#fff' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(formData)}>
            <Save size={16} /> Guardar Presupuesto
          </button>
        </div>

      </div>

      {/* Modal selector de plantillas */}
      {showTemplateSelector && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2><LayoutTemplate size={18} style={{ marginRight: '8px' }} />Cargar Plantilla</h2>
              <button className="icon-btn" onClick={() => setShowTemplateSelector(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ paddingBottom: '8px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Selecciona una plantilla para cargar sus capítulos y extras. Sustituirá el contenido actual del presupuesto.
              </p>
              {plantillas.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '13px' }}>No hay plantillas guardadas.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plantillas.map(tpl => {
                    const capCount = (tpl.capitulos || []).length;
                    const extCount = (tpl.extras || []).length;
                    const partCount = (tpl.capitulos || []).reduce((s, c) => s + (c.partidas || []).length, 0);
                    return (
                      <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{tpl.nombre}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {capCount} capítulo{capCount !== 1 ? 's' : ''} · {partCount} partida{partCount !== 1 ? 's' : ''}
                            {extCount > 0 ? ` · ${extCount} extra${extCount !== 1 ? 's' : ''}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}
                            onClick={() => {
                              if (window.confirm(`¿Cargar la plantilla "${tpl.nombre}"? Se reemplazará el contenido actual.`)) {
                                setFormData(prev => ({
                                  ...prev,
                                  capitulos: JSON.parse(JSON.stringify(tpl.capitulos || [])),
                                  extras: JSON.parse(JSON.stringify(tpl.extras || [])),
                                  condicionesPresupuesto: tpl.condicionesPresupuesto || '',
                                }));
                                setShowTemplateSelector(false);
                              }
                            }}>
                            Cargar
                          </button>
                          <button className="icon-btn danger" title="Eliminar plantilla"
                            onClick={async () => {
                              if (window.confirm(`¿Eliminar la plantilla "${tpl.nombre}"?`)) {
                                await deleteDoc('plantillasPresupuesto', tpl.id);
                              }
                            }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowTemplateSelector(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
