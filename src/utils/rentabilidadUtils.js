export const round2 = (n) => Math.round(n * 100) / 100;

export const normalizeLine = (line) => {
  if ('importe' in line && !('base' in line)) {
    const base = Number(line.importe) || 0;
    return { concepto: line.concepto || '', base, iva: 21, total: round2(base * 1.21) };
  }
  return {
    concepto: line.concepto || '',
    base: Number(line.base) || 0,
    iva: line.iva !== undefined ? Number(line.iva) : 21,
    total: Number(line.total) || 0,
  };
};

export const sumLineas = (lineas) => {
  const items = (Array.isArray(lineas) ? lineas : []).map(normalizeLine);
  return {
    base: round2(items.reduce((s, l) => s + l.base, 0)),
    ivaTotal: round2(items.reduce((s, l) => s + (l.total - l.base), 0)),
    total: round2(items.reduce((s, l) => s + l.total, 0)),
  };
};

export const getPresupuestoAceptado = (obraId, presupuestos) => {
  const ppto = (presupuestos || []).find(p => p.obraId === obraId && p.estado === 'aceptado');
  if (!ppto) return 0;
  return (ppto.capitulos || []).reduce((sum, cap) =>
    sum + (cap.partidas || []).reduce((s, p) => s + (p.cantidad * p.precioVenta), 0), 0);
};

export const calculateRentabilidad = (obra, presupuestos) => {
  const g = obra.gastosReales || {};
  const gastosSum = Object.entries(g)
    .filter(([k, v]) => k !== '_customLabels' && Array.isArray(v))
    .reduce((acc, [, lineas]) => {
      const s = sumLineas(lineas);
      return { base: acc.base + s.base, ivaTotal: acc.ivaTotal + s.ivaTotal, total: acc.total + s.total };
    }, { base: 0, ivaTotal: 0, total: 0 });
  gastosSum.base = round2(gastosSum.base);
  gastosSum.ivaTotal = round2(gastosSum.ivaTotal);
  gastosSum.total = round2(gastosSum.total);

  const pptoBase = getPresupuestoAceptado(obra.id, presupuestos);
  let ingresos;
  if (obra.ingresosAprobados && (obra.ingresosAprobados.base || obra.ingresosAprobados.total)) {
    ingresos = {
      base: Number(obra.ingresosAprobados.base) || 0,
      iva: Number(obra.ingresosAprobados.iva) ?? 21,
      total: Number(obra.ingresosAprobados.total) || 0,
    };
  } else {
    const base = pptoBase;
    ingresos = { base, iva: 21, total: round2(base * 1.21) };
  }

  const isPercent = Number(obra.impuestoSociedades) || 25;
  const beneficioNeto = round2(ingresos.base - gastosSum.base);
  const isAmount = round2(beneficioNeto > 0 ? beneficioNeto * isPercent / 100 : 0);
  const margen = beneficioNeto;
  const porcentaje = ingresos.base > 0 ? (margen / ingresos.base) * 100 : 0;

  return { presupuestado: pptoBase, gastos: gastosSum, ingresos, beneficioNeto, isPercent, isAmount, margen, porcentaje, g };
};

export const getPeriodKey = (obra, vista) => {
  if (!obra.inicio) return 'Sin fecha';
  const d = new Date(obra.inicio);
  if (vista === 'mensual') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (vista === 'trimestral') return `${d.getFullYear()}-T${Math.ceil((d.getMonth() + 1) / 3)}`;
  if (vista === 'anual') return `${d.getFullYear()}`;
  return obra.id;
};

export const periodLabel = (key, vista) => {
  if (vista === 'mensual') {
    const [y, m] = key.split('-');
    return new Date(y, m - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }
  if (vista === 'trimestral') return key.replace('-', ' ');
  return key;
};

// --- Helpers de Informes ---

export const filterObrasByRange = (obras, desde, hasta) => {
  return (obras || []).filter(o => {
    if (!o.inicio) return false;
    if (desde && o.inicio < desde) return false;
    if (hasta && o.inicio > hasta) return false;
    return true;
  });
};

export const bucketByMonth = (obras, presupuestos, desde, hasta) => {
  const map = {};

  if (desde && hasta) {
    const cur = new Date(desde.slice(0, 7) + '-01');
    const end = new Date(hasta.slice(0, 7) + '-01');
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      map[key] = { mes: key, ingresos: 0, gastos: 0 };
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  filterObrasByRange(obras, desde, hasta).forEach(obra => {
    const d = new Date(obra.inicio);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { mes: key, ingresos: 0, gastos: 0 };
    const r = calculateRentabilidad(obra, presupuestos);
    map[key].ingresos = round2(map[key].ingresos + r.ingresos.base);
    map[key].gastos = round2(map[key].gastos + r.gastos.base);
  });

  return Object.values(map).sort((a, b) => a.mes > b.mes ? 1 : -1);
};

export const sumHorasByTrabajador = (registroHoras, desde, hasta) => {
  const map = {};
  (registroHoras || []).forEach(h => {
    if (!h.aprobado) return;
    if (desde && h.fecha < desde) return;
    if (hasta && h.fecha > hasta) return;
    const key = h.trabajador || 'Sin nombre';
    map[key] = (map[key] || 0) + Number(h.horas || 0);
  });
  return Object.entries(map)
    .map(([trabajador, horas]) => ({ trabajador, horas: round2(horas) }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 15);
};

export const countByEstado = (obras) => {
  const labels = { pendiente: 'Pendiente', en_curso: 'En curso', paralizada: 'Paralizada', finalizada: 'Finalizada' };
  const counts = { pendiente: 0, en_curso: 0, paralizada: 0, finalizada: 0 };
  (obras || []).forEach(o => {
    if (counts[o.estado] !== undefined) counts[o.estado]++;
  });
  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([estado, count]) => ({ estado, label: labels[estado] || estado, count }));
};

export const kpisFromObras = (obras, presupuestos, desde, hasta) => {
  let facturado = 0, gastos = 0;
  filterObrasByRange(obras, desde, hasta).forEach(obra => {
    const r = calculateRentabilidad(obra, presupuestos);
    facturado += r.ingresos.base;
    gastos += r.gastos.base;
  });
  const obrasActivas = (obras || []).filter(o => o.estado === 'en_curso').length;
  return {
    facturado: round2(facturado),
    gastos: round2(gastos),
    margen: round2(facturado - gastos),
    obrasActivas,
  };
};

export const bucketComparativa = (obras, presupuestos, anioActual) => {
  const anioAnterior = anioActual - 1;
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  const mapActual = {};
  const mapAnterior = {};
  months.forEach(m => {
    mapActual[m] = 0;
    mapAnterior[m] = 0;
  });

  (obras || []).forEach(obra => {
    if (!obra.inicio) return;
    const d = new Date(obra.inicio);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = calculateRentabilidad(obra, presupuestos);
    if (y === anioActual) mapActual[m] = round2(mapActual[m] + r.ingresos.base);
    if (y === anioAnterior) mapAnterior[m] = round2(mapAnterior[m] + r.ingresos.base);
  });

  return months.map(m => ({
    mes: m,
    actual: mapActual[m],
    anterior: mapAnterior[m],
  }));
};
