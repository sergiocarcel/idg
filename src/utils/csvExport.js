export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtCurrency = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);

export const fmtBool = (v) => (v ? 'Sí' : 'No');

export function exportToCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const separator = ';'; // Separador compatible con Excel español
  const BOM = '\uFEFF'; // BOM para UTF-8

  // Header
  const header = columns.map(c => `"${c.label}"`).join(separator);

  // Rows
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : (row[c.key] ?? '');
      // Escapar comillas dobles
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(separator)
  );

  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
