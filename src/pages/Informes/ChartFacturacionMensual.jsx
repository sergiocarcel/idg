import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bucketByMonth } from '../../utils/rentabilidadUtils';
import { fmtCurrency } from '../../utils/csvExport';

const fmtMes = (mes) => {
  const [y, m] = mes.split('-');
  return new Date(y, m - 1).toLocaleString('es-ES', { month: 'short' }).replace('.', '') + " '" + y.slice(2);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>{fmtMes(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: {fmtCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function ChartFacturacionMensual({ obras, presupuestos, desde, hasta }) {
  const data = useMemo(
    () => bucketByMonth(obras, presupuestos, desde, hasta),
    [obras, presupuestos, desde, hasta]
  );

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Sin datos en el período seleccionado</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => fmtCurrency(v).replace('€', '').trim()} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ingresos" name="Ingresos" fill="#2563eb" isAnimationActive={false} radius={[3, 3, 0, 0]} />
        <Bar dataKey="gastos" name="Gastos" fill="#f97316" isAnimationActive={false} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
