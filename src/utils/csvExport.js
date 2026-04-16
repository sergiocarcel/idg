/**
 * Exportar datos a CSV con descarga automática.
 * Compatible con Excel (BOM UTF-8 para acentos).
 *
 * @param {Array<Object>} data - Array de objetos a exportar
 * @param {Array<{key: string, label: string}>} columns - Definición de columnas
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
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
