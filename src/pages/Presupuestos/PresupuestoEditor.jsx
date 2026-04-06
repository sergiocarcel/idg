import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Save, FileText } from 'lucide-react';

export default function PresupuestoEditor({ ppto, data, onSave, onClose }) {
  const [activeSearch, setActiveSearch] = useState({ capIdx: null, partIdx: null });
  const [formData, setFormData] = useState(ppto || {
    id: 'PRE-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    clienteId: '',
    obraId: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'borrador',
    notas: '',
    capitulos: [
      { id: 'CAP-1', nombre: 'Capítulo 1', partidas: [{ descripcion: '', unidad: 'ud', cantidad: 1, precioCoste: 0, precioVenta: 0 }] }
    ]
  });

  const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

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
    newCaps[capIndex].partidas.push({ descripcion: '', unidad: 'ud', cantidad: 1, precioCoste: 0, precioVenta: 0 });
    setFormData({ ...formData, capitulos: newCaps });
  };

  const updatePartida = (capIndex, partIndex, field, value) => {
    const newCaps = [...formData.capitulos];
    const val = (field === 'descripcion' || field === 'unidad') ? value : (parseFloat(value) || 0);
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

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} className="text-blue-600" />
              {ppto ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} &middot; {formData.id}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', marginRight: '16px' }}>
              Total: {formatCurrency(totalPresupuesto)}
            </span>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Form Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', background: '#fafafa', padding: '24px' }}>
          
          <div className="stat-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div className="form-grid">
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
              <div className="form-group half-width">
                <label>Estado</label>
                <select value={formData.estado} onChange={handleChange('estado')}>
                  <option value="borrador">Borrador</option>
                  <option value="enviado">Enviado al Cliente</option>
                  <option value="aceptado">Aceptado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
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
                  <input 
                    type="text" value={cap.nombre} 
                    onChange={(e) => {
                      const newCaps = [...formData.capitulos];
                      newCaps[capIdx].nombre = e.target.value;
                      setFormData({ ...formData, capitulos: newCaps });
                    }} 
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid transparent', background: 'transparent', fontWeight: 600, fontSize: '14px', outline: 'none' }}
                    onFocus={e => e.target.style.background = '#fff'}
                    onBlur={e => e.target.style.background = 'transparent'}
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
                              <input 
                                type="text" value={partida.descripcion || ''} 
                                onChange={(e) => updatePartida(capIdx, partIdx, 'descripcion', e.target.value)}
                                onFocus={() => setActiveSearch({ capIdx, partIdx })}
                                onBlur={() => setTimeout(() => setActiveSearch({ capIdx: null, partIdx: null }), 200)}
                                style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px' }}
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
                              type="text" value={partida.unidad || 'ud'} 
                              onChange={(e) => updatePartida(capIdx, partIdx, 'unidad', e.target.value)}
                              style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', fontSize: '13px', color: '#475569' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input 
                              type="number" value={partida.cantidad} 
                              onChange={(e) => updatePartida(capIdx, partIdx, 'cantidad', e.target.value)}
                              style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number" value={partida.precioVenta}
                              onChange={(e) => updatePartida(capIdx, partIdx, 'precioVenta', e.target.value)}
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

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ background: '#fff' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(formData)}>
            <Save size={16} /> Guardar Presupuesto
          </button>
        </div>

      </div>
    </div>
  );
}
