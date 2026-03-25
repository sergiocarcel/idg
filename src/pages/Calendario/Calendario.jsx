import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, MapPin, Clock, Video } from 'lucide-react';

export default function Calendario({ data, setData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dummy events for demo since GAPI is not fully authorized yet
  const eventos = data?.eventos || [
    { id: 1, title: 'Visita Obra A', date: new Date().toISOString().split('T')[0], type: 'visita', time: '10:00', location: 'Calle Mayor 12' },
    { id: 2, title: 'Reunión Presupuesto', date: new Date().toISOString().split('T')[0], type: 'reunion', time: '16:30', location: 'Oficina' },
  ];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajustar para Lunes como primer día
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getTypeStyle = (type) => {
    switch(type) {
      case 'visita': return { bg: '#dcfce7', color: '#16a34a' };
      case 'reunion': return { bg: '#dbeafe', color: '#2563eb' };
      case 'entrega': return { bg: '#fef3c7', color: '#d97706' };
      case 'obra': return { bg: '#f3e8ff', color: '#9333ea' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Calendario Corporativo</h1>
          <p className="page-subtitle">Sincronizado vía Google Calendar API.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => alert('La validación de Google oAuth se debe configurar en el puerto final (Netlify) para Google Client ID.')}>
            Sincronizar GAPI
          </button>
          <button className="btn-primary">
            <Plus size={16} /> Crear Evento
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px' }}>
        
        {/* Main Calendar View */}
        <div className="stat-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', margin: 0 }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-btn" onClick={prevMonth} style={{ background: '#f8fafc' }}><ChevronLeft size={18} /></button>
              <button className="btn-secondary" onClick={() => setCurrentDate(new Date())}>Hoy</button>
              <button className="icon-btn" onClick={nextMonth} style={{ background: '#f8fafc' }}><ChevronRight size={18} /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {blanks.map(b => (
              <div key={`blank-${b}`} style={{ minHeight: '100px', background: '#f8fafc', borderRadius: '8px', opacity: 0.5 }}></div>
            ))}
            {days.map(d => {
              const fullDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = new Date().toISOString().split('T')[0] === fullDateStr;
              const dayEvents = eventos.filter(e => e.date === fullDateStr);

              return (
                <div key={d} style={{ minHeight: '100px', background: '#fff', border: isToday ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'var(--text-main)', marginBottom: '4px' }}>
                    {d}
                  </div>
                  {dayEvents.map(e => {
                    const style = getTypeStyle(e.type);
                    return (
                      <div key={e.id} style={{ background: style.bg, color: style.color, fontSize: '10px', fontWeight: 600, padding: '4px 6px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                        {e.time} - {e.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar Proximos Eventos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="stat-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalIcon size={16} className="text-blue-500" /> Próximos Eventos
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {eventos.map(e => (
                <div key={e.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginBottom: '6px' }}>{e.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Clock size={12} /> {new Date(e.date).toLocaleDateString()} a las {e.time}
                  </div>
                  {e.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {e.location}
                    </div>
                  )}
                </div>
              ))}
              {eventos.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No hay eventos próximos.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
