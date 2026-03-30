import React, { useState } from 'react';
import { Plus, X, Trash2, FileText, PenTool } from 'lucide-react';
import { saveDoc } from '../../services/db';
import SignatureCanvas from '../../components/shared/SignatureCanvas.jsx';

export default function ActasModificacion({ obra, onClose }) {
  const [actas, setActas] = useState(obra.actas || []);
  const [showForm, setShowForm] = useState(false);
  const [printActa, setPrintActa] = useState(null);
  const [signature, setSignature] = useState(null);
  const [form, setForm] = useState({ descripcion: '', impactoDias: 0, impactoCoste: 0 });

  const handleSave = async () => {
    if (!form.descripcion.trim()) return;
    const newActa = {
      id: 'ACT-' + Date.now(),
      fecha: new Date().toISOString(),
      ...form,
      firmada: false,
      firmaImg: null
    };
    const updated = [newActa, ...actas];
    setActas(updated);
    await saveDoc('obras', obra.id, { ...obra, actas: updated });
    setShowForm(false);
    setForm({ descripcion: '', impactoDias: 0, impactoCoste: 0 });
  };

  const handleRemove = async (id) => {
    if (!window.confirm('¿Eliminar acta?')) return;
    const updated = actas.filter(a => a.id !== id);
    setActas(updated);
    await saveDoc('obras', obra.id, { ...obra, actas: updated });
  };

  const handleFirmar = async (acta) => {
    if (!signature) return alert('El cliente debe firmar antes de guardar.');
    const updated = actas.map(a => a.id === acta.id ? { ...a, firmada: true, firmaImg: signature } : a);
    setActas(updated);
    await saveDoc('obras', obra.id, { ...obra, actas: updated });
    setPrintActa(null);
    setSignature(null);
  };

  const formatCur = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);

  return (
    <div className="modal-overlay" style={{ zIndex: 101 }}>
      <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h2>Actas de Modificación</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{obra.nombre} · {actas.length} actas</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ padding: '8px 14px' }}><Plus size={14} /> Nueva Acta</button>
            <button className="icon-btn" onClick={onClose} style={{ background: 'none' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {actas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '14px' }}>No hay actas de modificación registradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {actas.map(a => (
                <div key={a.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', background: '#fff', borderLeft: `3px solid ${a.firmada ? '#16a34a' : '#d97706'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.id} · {new Date(a.fecha).toLocaleDateString()}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>{a.descripcion}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {a.firmada ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>✓ FIRMADA</span>
                      ) : (
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setPrintActa(a)}><PenTool size={12} /> Firmar</button>
                      )}
                      <button onClick={() => handleRemove(a.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px' }}>
                    <span style={{ color: a.impactoDias > 0 ? '#dc2626' : '#16a34a' }}>Impacto plazo: {a.impactoDias > 0 ? '+' : ''}{a.impactoDias} días</span>
                    <span style={{ color: a.impactoCoste > 0 ? '#dc2626' : '#16a34a' }}>Impacto coste: {a.impactoCoste > 0 ? '+' : ''}{formatCur(a.impactoCoste)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay" style={{ zIndex: 102 }}>
            <div className="modal-content" style={{ maxWidth: '450px' }}>
              <div className="modal-header"><h2>Nueva Acta de Modificación</h2><button className="icon-btn" onClick={() => setShowForm(false)} style={{ background: 'none' }}><X size={18} /></button></div>
              <div className="modal-body form-grid">
                <div className="form-group full-width">
                  <label>Descripción del cambio</label>
                  <textarea rows="3" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Cambiar distribución del baño principal..." />
                </div>
                <div className="form-group half-width">
                  <label>Impacto en plazo (días)</label>
                  <input type="number" value={form.impactoDias} onChange={e => setForm({...form, impactoDias: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group half-width">
                  <label>Impacto en coste (€)</label>
                  <input type="number" value={form.impactoCoste} onChange={e => setForm({...form, impactoCoste: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave}>Registrar Acta</button>
              </div>
            </div>
          </div>
        )}

        {/* Print/Sign Modal */}
        {printActa && (
          <div className="modal-overlay" style={{ zIndex: 102 }}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div className="modal-header"><h2>Firmar Acta {printActa.id}</h2><button className="icon-btn" onClick={() => setPrintActa(null)} style={{ background: 'none' }}><X size={18} /></button></div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                  <strong>Descripción:</strong> {printActa.descripcion}<br/>
                  <strong>Impacto plazo:</strong> {printActa.impactoDias} días | <strong>Impacto coste:</strong> {formatCur(printActa.impactoCoste)}
                </div>
                <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>Firma del cliente:</div>
                <SignatureCanvas onSign={setSignature} />
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setPrintActa(null)}>Cancelar</button>
                <button className="btn-primary" onClick={() => handleFirmar(printActa)}>Confirmar y Archivar Firma</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
