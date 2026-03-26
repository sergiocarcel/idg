import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Save, Search, BookOpen } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';

export default function CatalogoPartidas({ data, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ id: '', codigo: '', concepto: '', unidad: 'ud', coste: 0, margen: 0 });

  const partidas = data?.catalogoPartidas || [];

  const filteredPartidas = partidas.filter(p => 
    p.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);

  const handleEdit = (p) => {
    setFormData(p);
    setEditingId(p.id);
  };

  const handleAddNew = () => {
    setFormData({ id: 'PART-' + Date.now(), codigo: '', concepto: '', unidad: 'ud', coste: 0, margen: 0 });
    setEditingId('new');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ id: '', codigo: '', concepto: '', unidad: 'ud', coste: 0, margen: 0 });
  };

  const handleSave = async () => {
    if (!formData.concepto || formData.coste < 0) return alert('Completa los campos correctamente');
    
    // Auto calcular precio venta
    const precioVenta = Number(formData.coste) * (1 + (Number(formData.margen) / 100));
    const partidaToSave = { ...formData, coste: Number(formData.coste), margen: Number(formData.margen), precioVenta };

    await saveDoc('catalogoPartidas', partidaToSave.id, partidaToSave);
    handleCancelEdit();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Borrar esta partida del catálogo maestro? NO afectará a los presupuestos ya creados.')) {
      await deleteDoc('catalogoPartidas', id);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', color: '#3b82f6' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', color: 'var(--text-main)', margin: 0 }}>Catálogo Maestro de Partidas</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{partidas.length} elementos predefinidos (Materiales, Mano de Obra, etc)</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '20px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por código o concepto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>
          <button className="btn-primary" onClick={handleAddNew} disabled={editingId !== null}>
            <Plus size={16} /> Añadir Nueva Partida
          </button>
        </div>

        {/* Listado / Editor */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          
          <table className="data-table" style={{ background: '#fff' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Código</th>
                <th style={{ width: '40%' }}>Concepto</th>
                <th style={{ width: '10%' }}>Unidad</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Coste Real</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Margen</th>
                <th style={{ width: '12%', textAlign: 'right' }}>P.Venta</th>
                <th style={{ width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {editingId === 'new' && (
                <tr style={{ background: '#eff6ff' }}>
                  <td><input type="text" placeholder="REF-01" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} style={{ width: '100%', padding: '6px' }} /></td>
                  <td><input type="text" placeholder="Descripción resumida..." value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} style={{ width: '100%', padding: '6px' }} /></td>
                  <td>
                    <select value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} style={{ width: '100%', padding: '6px' }}>
                      <option value="ud">ud</option>
                      <option value="m">m</option>
                      <option value="m2">m2</option>
                      <option value="m3">m3</option>
                      <option value="ml">ml</option>
                      <option value="kg">kg</option>
                      <option value="h">h</option>
                      <option value="jornada">jornada</option>
                      <option value="mes">mes</option>
                      <option value="paq">paq</option>
                      <option value="glb">glb</option>
                    </select>
                  </td>
                  <td><input type="number" value={formData.coste} onChange={e => setFormData({...formData, coste: e.target.value})} style={{ width: '100%', padding: '6px', textAlign: 'right' }} /></td>
                  <td style={{ position: 'relative' }}>
                    <input type="number" value={formData.margen} onChange={e => setFormData({...formData, margen: e.target.value})} style={{ width: '100%', padding: '6px', textAlign: 'center' }} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatCurrency(Number(formData.coste) * (1 + (Number(formData.margen) / 100)))}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button className="icon-btn" onClick={handleSave} style={{ color: '#16a34a' }}><Save size={16}/></button>
                      <button className="icon-btn" onClick={handleCancelEdit} style={{ color: '#ef4444' }}><X size={16}/></button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredPartidas.map(p => {
                if (editingId === p.id) {
                  return (
                    <tr key={p.id} style={{ background: '#eff6ff' }}>
                      <td><input type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} style={{ width: '100%', padding: '6px' }} /></td>
                      <td><input type="text" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} style={{ width: '100%', padding: '6px' }} /></td>
                      <td>
                        <select value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} style={{ width: '100%', padding: '6px' }}>
                          <option value="ud">ud</option>
                          <option value="m">m</option>
                          <option value="m2">m2</option>
                          <option value="m3">m3</option>
                          <option value="ml">ml</option>
                          <option value="kg">kg</option>
                          <option value="h">h</option>
                          <option value="jornada">jornada</option>
                          <option value="mes">mes</option>
                          <option value="paq">paq</option>
                          <option value="glb">glb</option>
                        </select>
                      </td>
                      <td><input type="number" value={formData.coste} onChange={e => setFormData({...formData, coste: e.target.value})} style={{ width: '100%', padding: '6px', textAlign: 'right' }} /></td>
                      <td><input type="number" value={formData.margen} onChange={e => setFormData({...formData, margen: e.target.value})} style={{ width: '100%', padding: '6px', textAlign: 'center' }} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(Number(formData.coste) * (1 + (Number(formData.margen) / 100)))}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button className="icon-btn" onClick={handleSave} style={{ color: '#16a34a' }}><Save size={16}/></button>
                          <button className="icon-btn" onClick={handleCancelEdit} style={{ color: '#ef4444' }}><X size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={p.id}>
                    <td style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{p.codigo || '-'}</td>
                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{p.concepto}</td>
                    <td style={{ color: '#64748b' }}>{p.unidad}</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{formatCurrency(p.coste)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{p.margen}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(p.precioVenta)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button className="icon-btn" onClick={() => handleEdit(p)}><Edit2 size={14}/></button>
                        <button className="icon-btn" onClick={() => handleDelete(p.id)} style={{ color: '#ef4444' }}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredPartidas.length === 0 && editingId !== 'new' && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No se han encontrado partidas en el catálogo maestro. Añade tu primera tarifa de precios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
