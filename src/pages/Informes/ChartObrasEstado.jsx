import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { countByEstado } from '../../utils/rentabilidadUtils';

const COLORS = {
  pendiente: '#94a3b8',
  en_curso: '#2563eb',
  paralizada: '#d97706',
  finalizada: '#16a34a',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { label, count } = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
      <span style={{ fontWeight: 700 }}>{label}:</span> {count} obra{count !== 1 ? 's' : ''}
    </div>
  );
};

export default function ChartObrasEstado({ obras }) {
  const data = useMemo(() => countByEstado(obras), [obras]);

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Sin obras registradas</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.estado} fill={COLORS[entry.estado] || '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => value} />
      </PieChart>
    </ResponsiveContainer>
  );
}
