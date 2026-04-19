import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, FileText, Truck, Briefcase, X, ShoppingCart, Calendar } from 'lucide-react';

const ROLE_ACCESS = {
  admin: ['clientes', 'obras', 'presupuestos', 'trabajadores', 'proveedores', 'pedidos', 'calendario'],
  jefe: ['clientes', 'obras', 'presupuestos', 'trabajadores', 'pedidos', 'calendario'],
  logistica: ['proveedores', 'pedidos'],
  trabajador: ['pedidos', 'trabajadores']
};

const ALL_CATEGORIES = [
  {
    key: 'clientes', sidebarKey: 'clientes', label: 'Clientes', icon: Users, route: '/clientes',
    fields: ['nombre', 'email', 'telefono', 'nif'],
    display: (item) => item.nombre,
    subtitle: (item) => [item.email, item.telefono].filter(Boolean).join(' · ')
  },
  {
    key: 'obras', sidebarKey: 'obras', label: 'Obras', icon: Building2, route: '/obras',
    fields: ['nombre', 'direccion', 'responsable'],
    display: (item) => item.nombre,
    subtitle: (item) => [item.direccion, item.estado].filter(Boolean).join(' · ')
  },
  {
    key: 'presupuestos', sidebarKey: 'presupuestos', label: 'Presupuestos', icon: FileText, route: '/presupuestos',
    fields: ['id', 'etiqueta'],
    display: (item) => `${item.id} — ${item.etiqueta || 'Sin etiqueta'}`,
    subtitle: (item) => item.estado || ''
  },
  {
    key: 'trabajadores', sidebarKey: 'trabajadores', label: 'Trabajadores', icon: Briefcase, route: '/trabajadores',
    fields: ['nombre', 'apellidos', 'email', 'telefono'],
    display: (item) => `${item.nombre} ${item.apellidos || ''}`.trim(),
    subtitle: (item) => item.rol || ''
  },
  {
    key: 'proveedores', sidebarKey: 'proveedores', label: 'Proveedores', icon: Truck, route: '/proveedores',
    fields: ['empresa', 'contacto', 'especialidad', 'email'],
    display: (item) => item.empresa,
    subtitle: (item) => [item.especialidad, item.contacto].filter(Boolean).join(' · ')
  },
  {
    key: 'pedidos', sidebarKey: 'pedidos', label: 'Pedidos', icon: ShoppingCart, route: '/pedidos',
    fields: ['descripcion', 'solicitanteNombre', 'notas'],
    display: (item) => item.descripcion,
    subtitle: (item) => [item.solicitanteNombre, item.estado].filter(Boolean).join(' · ')
  },
  {
    key: 'eventos', sidebarKey: 'calendario', label: 'Eventos', icon: Calendar, route: '/calendario',
    fields: ['title', 'location'],
    display: (item) => item.title,
    subtitle: (item) => item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES') : ''
  }
];

const kbdStyle = {
  padding: '1px 5px', background: '#f1f5f9',
  border: '1px solid var(--border)', borderRadius: '3px',
  fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'inherit'
};

export default function SearchModal({ isOpen, onClose, data, userRole }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const allowed = ROLE_ACCESS[userRole] || ROLE_ACCESS.trabajador;
    return ALL_CATEGORIES.filter(cat => allowed.includes(cat.sidebarKey));
  }, [userRole]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    return categories
      .map(cat => ({
        ...cat,
        items: (data?.[cat.key] || [])
          .filter(item => cat.fields.some(f => String(item[f] || '').toLowerCase().includes(q)))
          .slice(0, 5)
      }))
      .filter(cat => cat.items.length > 0);
  }, [query, categories, data]);

  const flatResults = useMemo(() => {
    const flat = [];
    results.forEach(cat => cat.items.forEach(item => flat.push({ cat, item })));
    return flat;
  }, [results]);

  const itemIndexMap = useMemo(() => {
    const map = new Map();
    flatResults.forEach(({ item }, idx) => map.set(item.id, idx));
    return map;
  }, [flatResults]);

  useEffect(() => { setSelectedIndex(-1); }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (flatResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        const { cat, item } = flatResults[selectedIndex];
        navigate(cat.route, { state: { openId: item.id } });
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatResults, selectedIndex, navigate]);

  if (!isOpen) return null;

  const handleSelect = (cat, item) => {
    navigate(cat.route, { state: { openId: item.id } });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '580px',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', maxHeight: '70vh',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderBottom: '1px solid var(--border)'
        }}>
          <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar clientes, obras, presupuestos..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '16px', color: 'var(--text-main)', background: 'transparent',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            )}
            <kbd style={kbdStyle}>ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {query.trim().length < 2 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              <div style={{ marginBottom: '12px' }}>Escribe para buscar...</div>
              <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <span><kbd style={kbdStyle}>↑↓</kbd> navega</span>
                <span><kbd style={kbdStyle}>↵</kbd> abre</span>
                <span><kbd style={kbdStyle}>Esc</kbd> cierra</span>
              </div>
            </div>
          ) : flatResults.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Sin resultados para "<strong>{query}</strong>"
            </div>
          ) : (
            results.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <div style={{
                    padding: '8px 20px', fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', background: '#f8fafc'
                  }}>
                    {cat.label} ({cat.items.length})
                  </div>
                  {cat.items.map(item => {
                    const isSelected = itemIndexMap.get(item.id) === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(cat, item)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          gap: '12px', padding: '10px 20px',
                          background: isSelected ? 'var(--accent)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.1s', fontFamily: 'inherit'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                          background: isSelected ? 'rgba(255,255,255,0.2)' : '#eff6ff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Icon size={16} style={{ color: isSelected ? '#fff' : 'var(--accent)' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '14px', fontWeight: 500,
                            color: isSelected ? '#fff' : 'var(--text-main)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {cat.display(item)}
                          </div>
                          {cat.subtitle(item) && (
                            <div style={{
                              fontSize: '12px', marginTop: '1px',
                              color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {cat.subtitle(item)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {flatResults.length > 0 && (
          <div style={{
            padding: '8px 20px', borderTop: '1px solid var(--border)',
            fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center'
          }}>
            {flatResults.length} resultado{flatResults.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
