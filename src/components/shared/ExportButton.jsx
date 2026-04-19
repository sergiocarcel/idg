import React from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/csvExport';

export default function ExportButton({ data, columns, filename }) {
  const empty = !data || data.length === 0;
  return (
    <button
      className="btn-secondary"
      onClick={() => exportToCSV(data, columns, filename)}
      disabled={empty}
      title={empty ? 'No hay datos para exportar' : 'Exportar a CSV'}
    >
      <Download size={16} /> Exportar
    </button>
  );
}
