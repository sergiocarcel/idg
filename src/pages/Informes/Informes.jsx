import React, { useState, useMemo, useRef } from 'react';
import { FileDown, Download, BarChart3, TrendingUp, TrendingDown, Building2, Activity } from 'lucide-react';
import { generatePdfFromElement } from '../../utils/pdfUtils';
import { exportToCSV, fmtCurrency, fmtDate } from '../../utils/csvExport';
import { kpisFromObras, bucketByMonth, sumHorasByTrabajador } from '../../utils/rentabilidadUtils';
import ChartFacturacionMensual from './ChartFacturacionMensual';
import ChartObrasEstado from './ChartObrasEstado';
import ChartHorasEmpleado from './ChartHorasEmpleado';
import ChartComparativaAnual from './ChartComparativaAnual';

const today = new Date();
const DEFAULT_DESDE = `${today.getFullYear()}-01-01`;
const DEFAULT_HASTA = `${today.getFullYear()}-12-31`;

export default function Informes({ data }) {
  const obras = data?.obras || [];
  const presupuestos = data?.presupuestos || [];
  const registroHoras = data?.registroHoras || [];

  const [desde, setDesde] = useState(DEFAULT_DESDE);
  const [hasta, setHasta] = useState(DEFAULT_HASTA);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef(null);

  const setPreset = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (preset === 'mes') {
      setDesde(`${y}-${String(m + 1).padStart(2, '0')}-01`);
      const lastDay = new Date(y, m + 1, 0).getDate();
      setHasta(`${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`);
    } else if (preset === 'trimestre') {
      const q = Math.floor(m / 3);
      setDesde(`${y}-${String(q * 3 + 1).padStart(2, '0')}-01`);
      const endMonth = q * 3 + 3;
      const lastDay = new Date(y, endMonth, 0).getDate();
      setHasta(`${y}-${String(endMonth).padStart(2, '0')}-${lastDay}`);
    } else if (preset === 'anio') {
      setDesde(`${y}-01-01`);
      setHasta(`${y}-12-31`);
    } else if (preset === 'anterior') {
      setDesde(`${y - 1}-01-01`);
      setHasta(`${y - 1}-12-31`);
    }
  };

  const kpis = useMemo(
    () => kpisFromObras(obras, presupuestos, desde, hasta),
    [obras, presupuestos, desde, hasta]
  );

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setExportingPdf(true);
    try {
      const isoDate = new Date().toISOString().slice(0, 10);
      const { blob } = await generatePdfFromElement(printRef.current, `informe_${isoDate}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${isoDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    const meses = bucketByMonth(obras, presupuestos, desde, hasta);
    const horasPorMes = {};
    (registroHoras || []).forEach(h => {
      if (!h.aprobado) return;
      if (desde && h.fecha < desde) return;
      if (hasta && h.fecha > hasta) return;
      const key = h.fecha ? h.fecha.slice(0, 7) : '';
      if (!key) return;
      horasPorMes[key] = (horasPorMes[key] || 0) + Number(h.horas || 0);
    });

    const csvData = meses.map(m => ({
      mes: m.mes,
      ingresos: m.ingresos,
      gastos: m.gastos,
      margen: m.ingresos - m.gastos,
      obrasIniciadas: obras.filter(o => o.inicio && o.inicio.startsWith(m.mes)).length,
      horasTotales: horasPorMes[m.mes] || 0,
    }));

    exportToCSV(csvData, [
      { key: 'mes', label: 'Mes' },
      { key: r => fmtCurrency(r.ingresos), label: 'Ingresos (Base)' },
      { key: r => fmtCurrency(r.gastos), label: 'Gastos (Base)' },
      { key: r => fmtCurrency(r.margen), label: 'Margen' },
      { key: 'obrasIniciadas', label: 'Obras iniciadas' },
      { key: 'horasTotales', label: 'Horas aprobadas' },
    ], 'informe_datos');
  };

  return (
    <div className="page-container">
      {/* Cabecera */}
      <header className="page-header no-print">
        <div>
          <h1 className="page-title">Informes y Analítica</h1>
          <p className="page-subtitle">Visión financiera y operativa del negocio</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={handleExportCsv}>
            <Download size={15} /> Exportar datos
          </button>
          <button className="btn-primary" onClick={handleExportPdf} disabled={exportingPdf}>
            <FileDown size={15} /> {exportingPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px', padding: '14px 16px', background: 'var(--bg-card, #f8fafc)', border: '1px solid var(--border)', borderRadius: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Período:</span>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          style={{ fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>→</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          style={{ fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)' }} />
        <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
          {[
            { key: 'mes', label: 'Este mes' },
            { key: 'trimestre', label: 'Este trimestre' },
            { key: 'anio', label: 'Este año' },
            { key: 'anterior', label: 'Año pasado' },
          ].map(p => (
            <button key={p.key} className="btn-secondary" onClick={() => setPreset(p.key)}
              style={{ fontSize: '12px', padding: '5px 10px' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido imprimible */}
      <div ref={printRef}>

        {/* KPIs */}
        <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '8px' }}><TrendingUp size={18} color="#2563eb" /></div>
              <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Facturado (base)</h3>
            </div>
            <div className="stat-value" style={{ fontSize: '22px' }}>{fmtCurrency(kpis.facturado)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Ingresos aprobados en el período</div>
          </div>

          <div className="stat-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '8px' }}><TrendingDown size={18} color="#f97316" /></div>
              <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Gastos totales</h3>
            </div>
            <div className="stat-value" style={{ fontSize: '22px', color: '#dc2626' }}>{fmtCurrency(kpis.gastos)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Gastos reales imputados</div>
          </div>

          <div className="stat-card" style={{ padding: '20px', background: kpis.margen >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: kpis.margen >= 0 ? '#dcfce7' : '#fef2f2', borderRadius: '8px', padding: '8px' }}>
                <BarChart3 size={18} color={kpis.margen >= 0 ? '#16a34a' : '#dc2626'} />
              </div>
              <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Margen neto</h3>
            </div>
            <div className="stat-value" style={{ fontSize: '22px', color: kpis.margen >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmtCurrency(kpis.margen)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {kpis.facturado > 0 ? ((kpis.margen / kpis.facturado) * 100).toFixed(1) + '% rentabilidad' : '—'}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: '#f5f3ff', borderRadius: '8px', padding: '8px' }}><Building2 size={18} color="#7c3aed" /></div>
              <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Obras activas</h3>
            </div>
            <div className="stat-value" style={{ fontSize: '22px' }}>{kpis.obrasActivas}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>En estado "en curso" actualmente</div>
          </div>
        </div>

        {/* Gráfico: Facturación mensual */}
        <div className="stat-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Facturación mensual</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Ingresos vs gastos agrupados por fecha de inicio de obra</p>
          <ChartFacturacionMensual obras={obras} presupuestos={presupuestos} desde={desde} hasta={hasta} />
        </div>

        {/* Gráficos: Obras por estado + Horas por empleado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div className="stat-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Obras por estado</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Estado actual de todas las obras</p>
            <ChartObrasEstado obras={obras} />
          </div>
          <div className="stat-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Horas por empleado</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Solo horas aprobadas en el período (top 15)</p>
            <ChartHorasEmpleado registroHoras={registroHoras} desde={desde} hasta={hasta} />
          </div>
        </div>

        {/* Gráfico: Comparativa anual */}
        <div className="stat-card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>Comparativa anual</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Ingresos mensuales: {hasta ? new Date(hasta).getFullYear() : new Date().getFullYear()} vs {hasta ? new Date(hasta).getFullYear() - 1 : new Date().getFullYear() - 1}
          </p>
          <ChartComparativaAnual obras={obras} presupuestos={presupuestos} hasta={hasta} />
        </div>

      </div>
    </div>
  );
}
