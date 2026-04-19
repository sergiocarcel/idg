import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { sumHorasByTrabajador } from '../../utils/rentabilidadUtils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
      <span style={{ fontWeight: 700 }}>{payload[0].payload.trabajador}:</span> {payload[0].value} h
    </div>
  );
};

export default function ChartHorasEmpleado({ registroHoras, desde, hasta }) {
  const data = useMemo(
    () => sumHorasByTrabajador(registroHoras, desde, hasta),
    [registroHoras, desde, hasta]
  );

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Sin horas aprobadas en el período</div>;
  }

  const barHeight = Math.max(240, data.length * 36);

  return (
    <ResponsiveContainer width="100%" height={barHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} unit=" h" />
        <YAxis type="category" dataKey="trabajador" width={120} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="horas" name="Horas" fill="#7c3aed" isAnimationActive={false} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
