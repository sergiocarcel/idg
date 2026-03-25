import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Download, Copy, Eye, Send, Lock } from 'lucide-react';
import { saveDoc } from '../../services/db';
import PresupuestoEditor from './PresupuestoEditor.jsx';
import PresupuestoPrint from './PresupuestoPrint.jsx';

export default function Presupuestos({ data, setData }) {
  const [filter, setFilter] = useState('todos');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPpto, setSelectedPpto] = useState(null);
  const [printPpto, setPrintPpto] = useState(null);
  const [printMode, setPrintMode] = useState('cliente');

  const presupuestos = data?.presupuestos || [];
  const clientes = data?.clientes || [];

  const getClientName = (id) => clientes.find(c => c.id === id)?.nombre || 'Cliente desconocido';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'borrador': return { bg: '#f1f5f9', color: '#475569', label: 'Borrador' };
      case 'enviado': return { bg: '#dbeafe', color: '#2563eb', label: 'Enviado' };
      case 'aceptado': return { bg: '#dcfce7', color: '#16a34a', label: 'Aceptado' };
      case 'rechazado': return { bg: '#fef2f2', color: '#dc2626', label: 'Rechazado' };
      default: return { bg: '#fef3c7', color: '#d97706', label: 'Pendiente' };
    }
  };

  const handleCreate = () => {
    setSelectedPpto(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (ppto) => {
    setSelectedPpto(ppto);
    setIsEditorOpen(true);
  };

  const handleSave = async (savedPpto) => {
    await saveDoc('presupuestos', savedPpto.id, savedPpto);
    setIsEditorOpen(false);
  };

  const calculateTotal = (ppto) => {
    if (!ppto.capitulos) return 0;
    return ppto.capitulos.reduce((totalCap, cap) => {
      const capTotal = cap.partidas?.reduce((sum, p) => sum + (p.cantidad * p.precioVenta), 0) || 0;
      return totalCap + capTotal;
    }, 0);
  };

  const filteredPptos = filter === 'todos' ? presupuestos : presupuestos.filter(p => p.estado === filter);

  const totalAceptado = presupuestos.filter(p => p.estado === 'aceptado').reduce((sum, p) => sum + calculateTotal(p), 0);
  const totalEnviado = presupuestos.filter(p => p.estado === 'enviado').reduce((sum, p) => sum + calculateTotal(p), 0);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-subtitle">Gestiona las valoraciones económicas de tus obras.</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus size={16} /> Nuevo Presupuesto
        </button>
      </header>

      {/* Tarjetas resumen */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '12px' }}>Total Aceptados</h3>
          <div className="stat-value" style={{ color: '#16a34a' }}>{formatCurrency(totalAceptado)}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '12px' }}>Pendientes de Respuesta</h3>
          <div className="stat-value" style={{ color: '#2563eb' }}>{formatCurrency(totalEnviado)}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {presupuestos.filter(p => p.estado === 'enviado').length} documentos enviados
          </p>
        </div>
      </div>

      {/* Lista contenedora */}
      <div className="stat-card" style={{ padding: 0 }}>
        
        {/* Toolbar de filtros */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'todos', label: 'Todos los Pptos.' },
            { id: 'borrador', label: 'Borradores' },
            { id: 'enviado', label: 'Enviados' },
            { id: 'aceptado', label: 'Aceptados' },
            { id: 'rechazado', label: 'Rechazados' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: filter === f.id ? 'var(--text-main)' : 'rgba(0,0,0,0.03)',
                color: filter === f.id ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: filter === f.id ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabla principal */}
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha de Creación</th>
              <th>Importe Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPptos.length === 0 && (
              <tr><td colSpan="6" style={{textAlign:'center', padding:'32px', color:'#94a3b8'}}>No hay presupuestos en esta categoría</td></tr>
            )}
            {filteredPptos.map(ppto => {
              const status = getStatusStyle(ppto.estado);
              return (
                <tr key={ppto.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{ppto.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{getClientName(ppto.clienteId)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ref: {ppto.obraId || 'S/N'}</div>
                  </td>
                  <td>{new Date(ppto.fecha).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '600' }}>{formatCurrency(calculateTotal(ppto))}</td>
                  <td>
                    <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      {status.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="icon-btn" onClick={() => handleEdit(ppto)} title="Ver / Editar"><Edit2 size={14} /></button>
                      
                      {ppto.estado !== 'borrador' && (
                         <a 
                            href={`https://wa.me/34${clientes.find(c => c.id === ppto.clienteId)?.telefono?.replace(/\D/g,'') || ''}?text=${encodeURIComponent('Hola '+getClientName(ppto.clienteId)+', te enviamos el estado de tu presupuesto '+ppto.id+'. Saludos desde IDG.')}`} 
                            target="_blank" rel="noreferrer" 
                            className="icon-btn" 
                            title="Avisar por WhatsApp"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366' }}
                         >
                           <Send size={14} />
                         </a>
                      )}
                      
                      <button className="icon-btn" onClick={() => { setPrintMode('cliente'); setPrintPpto(ppto); }} title="Generar PDF (Cliente)"><Download size={14} /></button>
                      <button className="icon-btn" onClick={() => { setPrintMode('interno'); setPrintPpto(ppto); }} title="Generar PDF (Interno)" style={{ color: '#8b5cf6' }}><Lock size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isEditorOpen && (
        <PresupuestoEditor 
          ppto={selectedPpto} 
          data={data} 
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSave}
        />
      )}

      {printPpto && (
        <PresupuestoPrint
          ppto={printPpto}
          data={data}
          mode={printMode}
          onClose={() => setPrintPpto(null)}
        />
      )}
    </div>
  );
}
