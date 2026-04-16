import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, FileText, Truck, Briefcase, X } from 'lucide-react';

const SEARCH_CATEGORIES = [
  {
    key: 'clientes',
    label: 'Clientes',
    icon: Users,
    route: '/clientes',
    fields: ['nombre', 'email', 'telefono', 'nif'],
    display: (item) => item.nombre,
    subtitle: (item) => [item.email, item.telefono].filter(Boolean).join(' · ')
  },
  {
    key: 'obras',
    label: 'Obras',
    icon: Building2,
    route: '/obras',
    fields: ['nombre', 'direccion', 'responsable'],
    display: (item) => item.nombre,
    subtitle: (item) => [item.direccion, item.estado].filter(Boolean).join(' · ')
  },
  {
    key: 'presupuestos',
    label: 'Presupuestos',
    icon: FileText,
    route: '/presupuestos',
    fields: ['id', 'etiqueta'],
    display: (item) => `${item.id} — ${item.etiqueta || 'Sin etiqueta'}`,
    subtitle: (item) => item.estado || ''
  },
  {
    key: 'trabajadores',
    label: 'Trabajadores',
    icon: Briefcase,
    route: '/trabajadores',
    fields: ['nombre', 'apellidos', 'email', 'telefono'],
    display: (item) => `${item.nombre} ${item.apellidos || ''}`.trim(),
    subtitle: (item) => item.rol || ''
  },
  {
    key: 'proveedores',
    label: 'Proveedores',
    icon: Truck,
    route: '/proveedores',
    fields: ['empresa', 'contacto', 'especialidad', 'email'],
    display: (item) => item.empresa,
    subtitle: (item) => [item.especialidad, item.contacto].filter(Boolean).join(' · ')
  }
];

export default function SearchModal({ isOpen, onClose, appData }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const results = normalizedQuery.length >= 2
    ? SEARCH_CATEGORIES.map(cat => {
        const items = (appData?.[cat.key] || []).filter(item =>
          cat.fields.some(field => {
            const val = item[field];
            return val && String(val).toLowerCase().includes(normalizedQuery);
          })
        ).slice(0, 5); // Max 5 por categoría
        return { ...cat, items };
      }).filter(cat => cat.items.length > 0)
    : [];

  const totalResults = results.reduce((sum, cat) => sum + cat.items.length, 0);

  const handleSelect = (route) => {
    navigate(route);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '580px',
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          maxHeight: '70vh',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <Search size={20} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar clientes, obras, presupuestos..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '16px', color: '#0f172a',
              fontFamily: 'inherit', background: 'transparent'
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', color: '#94a3b8', display: 'flex'
                }}
              >
                <X size={16} />
              </button>
            )}
            <kbd style={{
              padding: '2px 6px', background: '#f1f5f9',
              border: '1px solid #e2e8f0', borderRadius: '4px',
              fontSize: '11px', color: '#64748b', fontFamily: 'inherit'
            }}>ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
          {normalizedQuery.length < 2 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: '#94a3b8', fontSize: '14px'
            }}>
              Escribe al menos 2 caracteres para buscar...
            </div>
          ) : totalResults === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: '#94a3b8', fontSize: '14px'
            }}>
              No se encontraron resultados para "<strong>{query}</strong>"
            </div>
          ) : (
            results.map(cat => (
              <div key={cat.key}>
                {/* Category Header */}
                <div style={{
                  padding: '8px 20px',
                  fontSize: '11px', fontWeight: 600,
                  color: '#94a3b8', textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: '#f8fafc'
                }}>
                  {cat.label} ({cat.items.length})
                </div>

                {/* Items */}
                {cat.items.map(item => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(cat.route)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: '12px', padding: '10px 20px',
                        background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                        fontFamily: 'inherit'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '36px', height: '36px',
                        background: '#eff6ff', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={16} style={{ color: '#3b82f6' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: 500, color: '#0f172a',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {cat.display(item)}
                        </div>
                        {cat.subtitle(item) && (
                          <div style={{
                            fontSize: '12px', color: '#94a3b8', marginTop: '1px',
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
            ))
          )}
        </div>

        {/* Footer */}
        {totalResults > 0 && (
          <div style={{
            padding: '8px 20px', borderTop: '1px solid #e2e8f0',
            fontSize: '11px', color: '#94a3b8', textAlign: 'center'
          }}>
            {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
