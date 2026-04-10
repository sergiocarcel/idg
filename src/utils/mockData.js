export const initialData = {
  clientes: [
    { id: 'CLI-A', nombre: 'Juan Pérez', nif: '12345678A', email: 'juan@demo.es', telefono: '600000000', direccion: 'Madrid', notas: 'Cliente top VIP' },
    { id: 'CLI-B', nombre: 'María García', nif: '87654321B', email: 'maria@demo.es', telefono: '611111111', direccion: 'Barcelona', notas: '' }
  ],
  obras: [
    { id: 'OBR-A', nombre: 'Reforma Integral Cocina', clienteId: 'CLI-A', direccion: 'Calle Larios 45', inicio: '2026-04-01', fin: '2026-04-20', presupuestoId: 'PRE-01', avance: 25, estado: 'en_curso', responsable: 'Carlos O.', color: '#3b82f6', notas: 'Ojo con el tubo de gas.' },
    { id: 'OBR-B', nombre: 'Baño Principal', clienteId: 'CLI-B', direccion: 'Paseo de Gracia 12', inicio: '2026-05-10', fin: '2026-05-15', presupuestoId: '', avance: 0, estado: 'pendiente', responsable: '', color: '#d97706', notas: '' }
  ],
  presupuestos: [
    {
      id: 'PRE-01', clienteId: 'CLI-A', obraId: 'OBR-A', fecha: '2026-03-20', estado: 'aceptado', notas: '',
      capitulos: [
        { id: 'CAP-1', nombre: 'Actuaciones Previas', partidas: [{ id: 'PT-1', descripcion: 'Demolición', cantidad: 1, precioCoste: 500, precioVenta: 800 }] }
      ]
    },
    {
      id: 'PRE-02', clienteId: 'CLI-B', obraId: 'OBR-B', fecha: '2026-03-24', estado: 'enviado', notas: '',
      capitulos: [
        { id: 'CAP-1', nombre: 'Baño', partidas: [{ id: 'PT-2', descripcion: 'Alicatado paredes', cantidad: 30, precioCoste: 15, precioVenta: 25 }] }
      ]
    }
  ],
  pedidos: [
    { id: 'PED-1', descripcion: '10 sacos de cemento rápido', obraId: 'OBR-A', prioridad: 'urgente', estado: 'pedido', solicitante: 'admin@idg.es', solicitanteNombre: 'Admin', notas: 'Para terminar la rampa.', createdAt: new Date().toISOString() }
  ],
  materiales: [
    { id: 'MAT-1', nombre: 'Hormigonera eléctrica 140L', cantidad: '1 ud', stock: 1, minimo: 1, responsable: 'Carlos O.', obraId: 'OBR-A', proveedorId: 'PROV-2', createdAt: '2026-03-20' },
    { id: 'MAT-2', nombre: 'Andamio tubular ancho', cantidad: '4 cuerpos', stock: 4, minimo: 2, responsable: 'Gestión Central', obraId: '', proveedorId: '', createdAt: '2026-01-10' }
  ],
  proveedores: [
    { id: 'PROV-1', empresa: 'Cerámicas Gil', especialidad: 'Revestimientos', contacto: 'Juan', telefono: '612 000 111', email: 'juan@cergil.es', plazo: '2-3 días', pago: '30 días', notas: '5% Dto habitual' },
    { id: 'PROV-2', empresa: 'BuildMax', especialidad: 'Material general', contacto: 'Sara', telefono: '655 000 222', email: 'sara@buildmax.es', plazo: '1 día', pago: 'Contado', notas: '' }
  ],
  trabajadores: [
    { id: 'TRB-1', nombre: 'Carlos Ortega', rol: 'Jefe de Obra' },
    { id: 'TRB-2', nombre: 'Miguel Sánchez', rol: 'Albañil 1a' }
  ],
  registroHoras: [
    { id: 'REG-1', trabajador: 'Miguel Sánchez', fecha: '2026-03-24', horas: 3.5, concepto: 'Descubrimiento de bajante imprevista', obraId: 'OBR-B', aprobado: false }
  ],
  documentosRRHH: [
    { id: 'DOC-1', nombre: 'Seguro Furgoneta Opel Vivaro', categoria: 'vehiculos', fechaVencimiento: '2026-04-10', coste: 450, fechaSubida: '2025-04-10T10:00:00Z' },
    { id: 'DOC-2', nombre: 'Contrato Miguel Sánchez', categoria: 'contratos', fechaVencimiento: '', coste: '', fechaSubida: '2025-01-15T09:00:00Z' }
  ],
  facturas: [],
  config: {
    empresa: {
      nombre: 'Innovate Design Group',
      nif: 'B-12345678',
      direccion: 'Calle Principal 123, Madrid',
      telefono: '+34 600 000 000',
      email: 'contacto@idg.es',
      iban: 'ES00 0000 0000 0000 0000 0000',
      pieFactura: 'Inscrita en el Registro Mercantil...',
      logoId: ''
    },
    usuarios: [
      { id: 'U1', nombre: 'Admin Total', email: 'admin@idg.es', rol: 'admin', activo: true },
      { id: 'U2', nombre: 'Jefe Obra', email: 'jefe@idg.es', rol: 'jefe', activo: true },
      { id: 'U3', nombre: 'Logística', email: 'logistica@idg.es', rol: 'logistica', activo: true },
      { id: 'U4', nombre: 'Trabajador Base', email: 'trabajador@idg.es', rol: 'trabajador', activo: true }
    ]
  }
};
