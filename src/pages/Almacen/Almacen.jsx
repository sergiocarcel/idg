import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Package, MoveRight } from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';
import ExportButton from '../../components/shared/ExportButton.jsx';
import { fmtDate } from '../../utils/csvExport';

export default function Almacen({ data, setData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMat, setSelectedMat] = useState(null);
  const [filterObra, setFilterObra] = useState('todas');
  
  const initialForm = {
    nombre: '', cantidad: '', responsable: '', obraId: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const materiales = data?.materiales || [];
  const obras = data?.obras || [];

  const getObraName = (id) => obras.find(o => o.id === id)?.nombre || 'Almacén Central (Stock general)';

  const generateId = () => 'MAT-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const handleInputChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSave = async () => {
    const docId = selectedMat ? selectedMat.id : generateId();
    const docData = selectedMat ? { ...formData, id: docId } : { ...formData, id: docId, createdAt: new Date().toISOString() };
    await saveDoc('materiales', docId, docData);
    setIsModalOpen(false);
    setSelectedMat(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Dar de baja este material?")) return;
    await deleteDoc('materiales', id);
  };

  const openForm = (mat = null) => {
    if (mat) {
      setFormData(mat);
      setSelectedMat(mat);
    } else {
      setFormData({ ...initialForm, obraId: filterObra === 'todas' ? '' : filterObra });
      setSelectedMat(null);
    }
    setIsModalOpen(true);
  };

  // Movemos material duplicando o reasignando
  const handleMove = (mat) => {
    setFormData(mat);
    setSelectedMat(mat);
    setIsModalOpen(true);
  };

  const filteredMateriales = filterObra === 'todas' ? materiales : materiales.filter(m => m.obraId === filterObra);

  // Group materials by obra for overview
  const materialsByObra = { '': 0 };
  obras.forEach(o => materialsByObra[o.id] = 0);
  materiales.forEach(m => {
    if (materialsByObra[m.obraId] !== undefined) materialsByObra[m.obraId]++;
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Almacén de Herramientas y Material</h1>
          <p className="page-subtitle">Control simple de material asignado a cada obra.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ExportButton
            data={filteredMateriales}
            filename="materiales"
            columns={[
              { key: 'nombre', label: 'Nombre' },
              { key: 'cantidad', label: 'Cantidad' },
              { key: (m) => getObraName(m.obraId), label: 'Obra' },
              { key: 'responsable', label: 'Responsable' },
              { key: (m) => fmtDate(m.createdAt), label: 'Fecha alta' },
            ]}
          />
          <button className="btn-primary" onClick={() => openForm()}>
            <Plus size={16} /> Añadir Material
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        
        {/* Sidebar de filtros (Obras) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Destinos</div>
          
          <button 
            onClick={() => setFilterObra('todas')}
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filterObra === 'todas' ? '#2563eb' : 'transparent', color: filterObra === 'todas' ? '#fff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: filterObra === 'todas' ? 600 : 500 }}>Resumen Total</span>
            <span style={{ background: filterObra === 'todas' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterObra === 'todas' ? '#fff' : '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{materiales.length}</span>
          </button>
          
          <button 
            onClick={() => setFilterObra('')}
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filterObra === '' ? '#2563eb' : 'transparent', color: filterObra === '' ? '#fff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontWeight: filterObra === '' ? 600 : 500 }}>Almacén Central</span>
            <span style={{ background: filterObra === '' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterObra === '' ? '#fff' : '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{materialsByObra[''] || 0}</span>
          </button>
          
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {obras.map(o => (
              <button 
                key={o.id}
                onClick={() => setFilterObra(o.id)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filterObra === o.id ? '#2563eb' : 'transparent', color: filterObra === o.id ? '#fff' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}
              >
                <div style={{ minWidth: 0, paddingRight: '10px' }}>
                  <div style={{ fontWeight: filterObra === o.id ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{o.nombre}</div>
                </div>
                <span style={{ flexShrink: 0, background: filterObra === o.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterObra === o.id ? '#fff' : '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{materialsByObra[o.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listado Materiales */}
        <div className="stat-card" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} className="text-blue-600" />
              {filterObra === 'todas' ? 'Inventario Global' : getObraName(filterObra)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredMateriales.length} elementos</div>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Material y Cantidad</th>
                {filterObra === 'todas' && <th>Ubicación / Obra</th>}
                <th>Responsable de custodia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredMateriales.length === 0 && (
                <tr><td colSpan="4" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>Vacío. No hay material asignado aquí.</td></tr>
              )}
              {filteredMateriales.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }} title={m.nombre}>{m.nombre}</div>
                    <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, marginTop: '2px' }}>{m.cantidad}</div>
                  </td>
                  {filterObra === 'todas' && (
                    <td style={{ fontSize: '12px', fontWeight: 500, maxWidth: '200px' }}>
                      <span style={{ background: m.obraId ? '#e0e7ff' : '#f1f5f9', color: m.obraId ? '#3730a3' : '#475569', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {getObraName(m.obraId)}
                      </span>
                    </td>
                  )}
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{m.responsable || '—'}</td>
                 
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => handleMove(m)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#4f46e5', borderColor: '#e0e7ff', background: '#eef2ff', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <MoveRight size={12} /> Mover
                      </button>
                      <button className="icon-btn" onClick={() => openForm(m)} title="Editar"><Edit2 size={14} /></button>
                      <button className="icon-btn danger" onClick={() => handleDelete(m.id)} title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>{selectedMat ? 'Editar material' : 'Añadir / Mover Material'}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{background: 'none'}}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Nombre del material o herramienta</label>
                <input type="text" value={formData.nombre} onChange={handleInputChange('nombre')} placeholder="Ej: Hormigonera, Lijadora de yeso..." autoFocus />
              </div>
              <div className="form-group full-width">
                <label>Cantidad (Uds, Sacos, Metros)</label>
                <input type="text" value={formData.cantidad} onChange={handleInputChange('cantidad')} placeholder="Ej: 2 unidades, 150 m2..." />
              </div>
              <div className="form-group full-width">
                <label>Responsable que lo recibe / lo custodia</label>
                <input type="text" value={formData.responsable} onChange={handleInputChange('responsable')} placeholder="Nombre del trabajador..." />
              </div>
              <div className="form-group full-width">
                <label>Asignar a Obra (Ubicación)</label>
                <select value={formData.obraId} onChange={handleInputChange('obraId')}>
                  <option value="">Almacén Central (Stock general)</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  El material físico se considera entregado en esta ubicación.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>{selectedMat ? 'Guardar Cambios' : 'Añadir al Almacén'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
