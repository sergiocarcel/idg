import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, FileText, TrendingUp, TrendingDown, AlertTriangle,
  Calendar, Clock, CheckCircle2, Circle, Plus, X, Trash2,
  DollarSign, Receipt
} from 'lucide-react';
import { saveDoc, deleteDoc } from '../../services/db';
import { auth } from '../../config/firebase';
import { notifyTareaAsignada } from '../../services/notifications';

export default function Dashboard({ data, setData }) {
  const navigate = useNavigate();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newTask, setNewTask] = useState({ titulo: '', prioridad: 'media', fechaVencimiento: '', asignadoA: '' });

  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];
  const usuariosCRM = data?.config?.usuarios || [];
  const clientes = data?.clientes || [];
  const eventos = data?.eventos || [];
  const tareasPendientes = data?.tareasDashboard || [];

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  // ══════════════════════════════════════
  // KPIs PRINCIPALES (fila superior)
  // ══════════════════════════════════════
  const obrasActivas = obras.filter(o => o.estado === 'en_curso').length;
  const pptosPendientes = presupuestos.filter(p => p.estado === 'enviado' || p.estado === 'borrador').length;
  const pptosAceptados = presupuestos.filter(p => p.estado === 'aceptado');

  const volumenAceptado = pptosAceptados.reduce((sum, p) => {
    return sum + (p.capitulos || []).reduce((s, cap) => 
      s + cap.partidas.reduce((s2, pt) => s2 + (pt.cantidad * pt.precioVenta), 0), 0);
  }, 0);

  const sumField = (val) => Array.isArray(val) ? val.reduce((s, l) => s + (Number(l.importe) || 0), 0) : (Number(val) || 0);

  const gastosRealesTotal = obras.reduce((sum, o) => {
    const g = o.gastosReales || {};
    return sum + sumField(g.personal) + sumField(g.materiales) + sumField(g.subcontratas) + sumField(g.otros);
  }, 0);

  const margenGlobal = volumenAceptado - gastosRealesTotal;
  const margenPct = volumenAceptado > 0 ? (margenGlobal / volumenAceptado) * 100 : 0;

  // ══════════════════════════════════════
  // ALERTAS AUTOMÁTICAS
  // ══════════════════════════════════════
  const alertas = [];

  // Presupuestos caducados (+7 días sin respuesta)
  presupuestos.filter(p => p.estado === 'enviado').forEach(p => {
    const diasPasados = Math.floor((Date.now() - new Date(p.fecha).getTime()) / 86400000);
    if (diasPasados > 7) {
      alertas.push({
        id: `ppto-${p.id}`,
        tipo: 'warning',
        texto: `Presupuesto ${p.id} lleva ${diasPasados} días sin respuesta del cliente`,
        color: '#d97706'
      });
    }
  });

  // Obras paralizadas
  obras.filter(o => o.estado === 'paralizada').forEach(o => {
    alertas.push({
      id: `obra-par-${o.id}`,
      tipo: 'danger',
      texto: `Obra "${o.nombre}" está PARALIZADA`,
      color: '#dc2626'
    });
  });

  // Obras con avance bajo y fecha fin próxima
  obras.filter(o => o.estado === 'en_curso' && o.fin).forEach(o => {
    const diasRestantes = Math.floor((new Date(o.fin).getTime() - Date.now()) / 86400000);
    if (diasRestantes < 7 && diasRestantes >= 0 && (o.avance || 0) < 80) {
      alertas.push({
        id: `obra-plazo-${o.id}`,
        tipo: 'warning',
        texto: `Obra "${o.nombre}" vence en ${diasRestantes} días y va al ${o.avance || 0}%`,
        color: '#d97706'
      });
    }
  });

  // Margen negativo
  obras.forEach(o => {
    const pptoObra = pptosAceptados.find(p => p.obraId === o.id);
    if (!pptoObra) return;
    const ingresos = (pptoObra.capitulos || []).reduce((s, cap) => s + cap.partidas.reduce((s2, pt) => s2 + (pt.cantidad * pt.precioVenta), 0), 0);
    const g = o.gastosReales || {};
    const costes = sumField(g.personal) + sumField(g.materiales) + sumField(g.subcontratas) + sumField(g.otros);
    if (costes > ingresos && ingresos > 0) {
      alertas.push({
        id: `obra-neg-${o.id}`,
        tipo: 'danger',
        texto: `Obra "${o.nombre}" tiene margen NEGATIVO (${formatCurrency(ingresos - costes)})`,
        color: '#dc2626'
      });
    }
  });

  // ══════════════════════════════════════
  // EVENTOS PRÓXIMOS (próximos 7 días)  
  // ══════════════════════════════════════
  const hoy = new Date();
  const en7Dias = new Date(hoy); en7Dias.setDate(en7Dias.getDate() + 7);
  const hoyStr = hoy.toISOString().split('T')[0];

  const proximosEventos = eventos
    .filter(e => e.date >= hoyStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // También simular eventos con fechas de obra
  const obrasProximas = obras.filter(o => o.inicio && new Date(o.inicio) >= hoy && new Date(o.inicio) <= en7Dias);

  // ══════════════════════════════════════
  // TAREAS PENDIENTES  (Firestore: col tareasDashboard)
  // ══════════════════════════════════════
  const handleSaveTask = async () => {
    if (!newTask.titulo.trim()) return;
    if (editingTaskId) {
      await saveDoc('tareasDashboard', editingTaskId, { ...newTask });
    } else {
      const id = 'TASK-' + Date.now();
      const autorEmail = auth.currentUser?.email;
      const tarea = { ...newTask, id, completada: false, fecha: new Date().toISOString() };
      await Promise.all([
        saveDoc('tareasDashboard', id, tarea),
        notifyTareaAsignada({ tarea, autorEmail, usuarios: data?.config?.usuarios || [] }),
      ]);
    }
    setShowTaskModal(false);
    setEditingTaskId(null);
    setNewTask({ titulo: '', prioridad: 'media', fechaVencimiento: '', asignadoA: '' });
  };

  const handleEditTask = (t) => {
    setNewTask({ ...t });
    setEditingTaskId(t.id);
    setShowTaskModal(true);
  };

  const handleOpenNewTask = () => {
    setNewTask({ titulo: '', prioridad: 'media', fechaVencimiento: '', asignadoA: '' });
    setEditingTaskId(null);
    setShowTaskModal(true);
  };

  const toggleTask = async (task) => {
    await saveDoc('tareasDashboard', task.id, { ...task, completada: !task.completada });
  };

  const removeTask = async (task) => {
    await deleteDoc('tareasDashboard', task.id);
  };

  // ══════════════════════════════════════
  // FACTURACIÓN DESGLOSADA
  // ══════════════════════════════════════
  const ivaRepercutido = volumenAceptado * 0.21;
  const ivaSoportado = gastosRealesTotal * 0.21;
  const ivaAPagar = ivaRepercutido - ivaSoportado;

  // ══════════════════════════════════════
  // SEMÁFORO DE URGENCIA
  // ══════════════════════════════════════
  const getSemaforoColor = (dateStr) => {
    if (!dateStr) return '#16a34a';
    const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff <= 1) return '#dc2626';      // rojo: hoy o mañana
    if (diff <= 7) return '#d97706';      // amarillo: esta semana
    return '#16a34a';                     // verde: sin urgencia
  };

  // Helper para deducir ruta de navegación desde alerta
  const getAlertRoute = (alertId) => {
    if (alertId.startsWith('ppto-')) return '/presupuestos';
    if (alertId.startsWith('obra-')) return '/obras';
    return '/';
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general de actividad · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      {/* ═══ FILA 1: TAREAS / EVENTOS / AVISOS (prioridad máxima) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* ── WIDGET 1: TAREAS PENDIENTES ── */}
        <div className="stat-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> Tareas Pendientes
            </h3>
            <button className="icon-btn" onClick={handleOpenNewTask} style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Plus size={14} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {tareasPendientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '13px' }}>
                No hay tareas pendientes. Pulsa + para crear una.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...tareasPendientes].sort((a,b) => (a.completada ? 1 : 0) - (b.completada ? 1 : 0)).map(t => {
                  const semaforoColor = getSemaforoColor(t.fechaVencimiento);
                  return (
                    <div key={t.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${t.completada ? '#cbd5e1' : semaforoColor}`, display: 'flex', alignItems: 'center', gap: '12px', opacity: t.completada ? 0.5 : 1 }}>
                      <button onClick={() => toggleTask(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.completada ? '#16a34a' : '#cbd5e1', padding: 0 }}>
                        {t.completada ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleEditTask(t)}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)', textDecoration: t.completada ? 'line-through' : 'none' }}>{t.titulo}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          {t.fechaVencimiento && <span style={{ fontSize: '10px', color: semaforoColor, fontWeight: 600 }}>{new Date(t.fechaVencimiento).toLocaleDateString('es-ES')}</span>}
                          {t.asignadoA && <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '10px' }}>🙋🏻‍♂️ {t.asignadoA}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                        background: t.prioridad === 'alta' ? '#fef2f2' : (t.prioridad === 'baja' ? '#f0fdf4' : '#fffbeb'),
                        color: t.prioridad === 'alta' ? '#dc2626' : (t.prioridad === 'baja' ? '#16a34a' : '#d97706')
                      }}>{t.prioridad?.toUpperCase()}</span>
                      <button onClick={() => removeTask(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '2px' }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── WIDGET 2: EVENTOS PRÓXIMOS (con semáforo) ── */}
        <div className="stat-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => navigate('/calendario')}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: '#2563eb' }} /> Próximos Eventos
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {proximosEventos.length === 0 && obrasProximas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '13px' }}>
                No hay eventos próximos esta semana.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {obrasProximas.map(o => (
                  <div key={`o-${o.id}`} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${getSemaforoColor(o.inicio)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Briefcase size={16} style={{ color: getSemaforoColor(o.inicio) }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Inicio: {o.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(o.inicio).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {proximosEventos.map(e => (
                  <div key={e.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${getSemaforoColor(e.date)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={16} style={{ color: getSemaforoColor(e.date) }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{e.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString()} · {e.time} · {e.location || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── WIDGET 3: AVISOS Y ALERTAS (clicables) ── */}
        <div className="stat-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#d97706' }} /> Avisos y Alertas
              {alertas.length > 0 && <span style={{ background: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 }}>{alertas.length}</span>}
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {alertas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#16a34a', fontSize: '13px' }}>
                Sin alertas. Todo está en orden.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alertas.map(a => (
                  <div key={a.id} onClick={() => navigate(getAlertRoute(a.id))} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', borderLeft: `3px solid ${a.color}`, display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <AlertTriangle size={14} style={{ color: a.color, flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.4' }}>{a.texto}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FILA 2: KPIs PRINCIPALES (clicables) ═══ */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/obras')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}><Briefcase size={18} /></div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Obras Activas</h3>
          </div>
          <div className="stat-value" style={{ fontSize: '32px' }}>{obrasActivas}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{obras.length} total · {obras.filter(o => o.estado === 'finalizada').length} finalizadas</div>
        </div>

        <div className="stat-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/presupuestos')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><FileText size={18} /></div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Presupuestos Pendientes</h3>
          </div>
          <div className="stat-value" style={{ fontSize: '32px' }}>{pptosPendientes}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{pptosAceptados.length} aceptados · {presupuestos.filter(p => p.estado === 'rechazado').length} rechazados</div>
        </div>

        <div className="stat-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/facturas')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: margenPct > 15 ? 'rgba(22,163,74,0.1)' : (margenPct > 0 ? 'rgba(217,119,6,0.1)' : 'rgba(220,38,38,0.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: margenPct > 15 ? '#16a34a' : (margenPct > 0 ? '#d97706' : '#dc2626') }}>
              {margenGlobal >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Margen Neto Global</h3>
          </div>
          <div className="stat-value" style={{ fontSize: '28px', color: margenPct > 15 ? '#16a34a' : (margenPct > 0 ? '#d97706' : '#dc2626') }}>{formatCurrency(margenGlobal)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{margenPct.toFixed(1)}% rentabilidad</div>
        </div>

        <div className="stat-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/clientes')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}><DollarSign size={18} /></div>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Clientes</h3>
          </div>
          <div className="stat-value" style={{ fontSize: '32px' }}>{clientes.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{clientes.filter(c => obras.some(o => o.clienteId === c.id && o.estado === 'en_curso')).length} con obra en curso</div>
        </div>
      </div>

      {/* ═══ FILA 3: DESGLOSE FACTURACIÓN AMPLIADO ═══ */}
      <div className="stat-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={16} style={{ color: '#8b5cf6' }} /> Facturación — Desglose Completo
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border)', flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FACTURADO (PVP)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{formatCurrency(volumenAceptado)}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Base imponible total</div>
          </div>
          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '6px', fontWeight: 600 }}>GASTOS REALES</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(gastosRealesTotal)}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Costes imputados</div>
          </div>
          <div style={{ padding: '16px', background: margenGlobal >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', border: `1px solid ${margenGlobal >= 0 ? '#bbf7d0' : '#fecaca'}`, flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: margenGlobal >= 0 ? '#166534' : '#991b1b', marginBottom: '6px', fontWeight: 600 }}>MARGEN BRUTO</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: margenGlobal >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(margenGlobal)}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{margenPct.toFixed(1)}% rentabilidad</div>
          </div>
          <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '6px', fontWeight: 600 }}>IVA REPERCUTIDO</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>{formatCurrency(ivaRepercutido)}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>21% sobre facturado</div>
          </div>
          <div style={{ padding: '16px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #ddd6fe', flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ fontSize: '11px', color: '#6b21a8', marginBottom: '6px', fontWeight: 600 }}>IVA A PAGAR (Est.)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{formatCurrency(ivaAPagar)}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Repercutido − Soportado</div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL NUEVA TAREA ═══ */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingTaskId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="icon-btn" onClick={() => setShowTaskModal(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Descripción de la tarea</label>
                <input type="text" value={newTask.titulo} onChange={e => setNewTask({...newTask, titulo: e.target.value})} placeholder="Ej: Llamar al fontanero de la Obra B" autoFocus />
              </div>
              <div className="form-group half-width">
                <label>Prioridad</label>
                <select value={newTask.prioridad} onChange={e => setNewTask({...newTask, prioridad: e.target.value})}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="form-group half-width">
                <label>Fecha Vencimiento</label>
                <input type="date" value={newTask.fechaVencimiento} onChange={e => setNewTask({...newTask, fechaVencimiento: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Asignado a</label>
                <select value={newTask.asignadoA || ''} onChange={e => setNewTask({...newTask, asignadoA: e.target.value})}>
                  <option value="">(Sin asignar)</option>
                  {usuariosCRM.map((u, i) => (
                    <option key={i} value={u.nombre || u.email}>{u.nombre || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowTaskModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveTask}>{editingTaskId ? 'Guardar Cambios' : 'Añadir Tarea'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
