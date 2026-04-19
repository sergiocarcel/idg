import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bucketComparativa } from '../../utils/rentabilidadUtils';
import { fmtCurrency } from '../../utils/csvExport';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const CustomTooltip = ({ active, payload, label, anioActual }) => {
  if (!active || !payload?.length) return null;
  const idx = parseInt(label, 10) - 1;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <div style={{ fontWeight: 700, marginBottom: '6px' }}>{MONTH_LABELS[idx]}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: {fmtCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function ChartComparativaAnual({ obras, presupuestos, hasta }) {
  const anioActual = hasta ? new Date(hasta).getFullYear() : new Date().getFullYear();

  const data = useMemo(
    () => bucketComparativa(obras, presupuestos, anioActual),
    [obras, presupuestos, anioActual]
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tickFormatter={m => MONTH_LABELS[parseInt(m, 10) - 1]} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => fmtCurrency(v).replace('€', '').trim()} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip anioActual={anioActual} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="actual" name={`${anioActual}`} fill="#2563eb" isAnimationActive={false} radius={[3, 3, 0, 0]} />
        <Bar dataKey="anterior" name={`${anioActual - 1}`} fill="#93c5fd" isAnimationActive={false} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
