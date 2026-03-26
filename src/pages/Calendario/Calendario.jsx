import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, MapPin, Clock, Video, RefreshCw, X } from 'lucide-react';
import { auth, firebase } from '../../config/firebase';

export default function Calendario({ data, setData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dummy local fallback events
  const [eventos, setEventos] = useState(data?.eventos || [
    { id: 1, title: 'Reunión Presupuesto', date: new Date().toISOString().split('T')[0], type: 'reunion', time: '16:30', location: 'Oficina' },
  ]);
  const [gcalToken, setGcalToken] = useState(localStorage.getItem('gcal_token'));
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modal State for New Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', location: '' });

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

  const handleGoogleSync = async () => {
    try {
      setIsSyncing(true);
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await auth.signInWithPopup(provider);
      const credential = result.credential || firebase.auth.GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        localStorage.setItem('gcal_token', token);
        setGcalToken(token);
        await loadGoogleEvents(token);
      }
    } catch (error) {
      console.error("Error OAuth Sync:", error);
      alert("Para activar la sincronización, Google Requiere que configures el ID de Cliente OAuth en tu consola Firebase/GCP y uses el modo producción (Sin Emuladores Locales).");
    } finally {
      setIsSyncing(false);
    }
  };

  const loadGoogleEvents = async (token) => {
    if (!token) return;
    try {
      setIsSyncing(true);
      
      const startD = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startD}&timeMax=${endD}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if(!res.ok) throw new Error("Token caducado o inválido");
      
      const data = await res.json();
      const mappedEvents = data.items.map(i => ({
        id: i.id,
        title: i.summary || '(Sin título)',
        date: i.start.dateTime ? i.start.dateTime.split('T')[0] : i.start.date,
        time: i.start.dateTime ? new Date(i.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Todo el día',
        location: i.location || '',
        type: 'gcal'
      }));
      setEventos(mappedEvents);
    } catch(err) {
      console.error(err);
      setGcalToken(null);
      localStorage.removeItem('gcal_token');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (gcalToken) loadGoogleEvents(gcalToken);
  }, [currentDate, gcalToken]);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    
    // Optimistic UI Update local
    const dummyId = 'loc-' + Date.now();
    setEventos([...eventos, { id: dummyId, ...newEvent, type: 'reunion' }]);
    setShowEventModal(false);

    // Si GCal está enlazado, forzamos sincronización externa POST
    if (gcalToken) {
      const gcalEvt = {
        summary: newEvent.title,
        location: newEvent.location,
        start: { dateTime: `${newEvent.date}T${newEvent.time}:00+01:00`, timeZone: 'Europe/Madrid' },
        end: { dateTime: `${newEvent.date}T${String(parseInt(newEvent.time.split(':')[0]) + 1).padStart(2,'0')}:${newEvent.time.split(':')[1]}:00+01:00`, timeZone: 'Europe/Madrid' },
      };
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${gcalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalEvt)
        });
        loadGoogleEvents(gcalToken); // Recargar info veraz
      } catch(err) {
        console.error("No se pudo crear evento en GCal", err);
      }
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
          <button className="btn-secondary" onClick={handleGoogleSync} disabled={isSyncing} style={{ background: isSyncing ? '#f1f5f9' : '#fff' }}>
            {isSyncing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />} 
            {gcalToken ? 'Sincronizado' : 'Vincular Google'}
          </button>
          <button className="btn-primary" onClick={() => setShowEventModal(true)}>
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
                    const style = e.type === 'gcal' ? { bg: '#e0e7ff', color: '#3730a3' } : getTypeStyle(e.type);
                    return (
                      <div key={e.id} style={{ borderLeft: `2px solid ${style.color}`, background: style.bg, color: style.color, fontSize: '10px', fontWeight: 600, padding: '4px 6px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
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

      {/* Nuevo Evento Modal */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Nuevo Evento</h2>
              <button className="icon-btn" onClick={() => setShowEventModal(false)} style={{ background: 'none' }}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group full-width">
                <label>Título (Reunión, Visita...)</label>
                <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Asunto" autoFocus/>
              </div>
              <div className="form-group half-width">
                <label>Fecha</label>
                <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <div className="form-group half-width">
                <label>Hora</label>
                <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Ubicación</label>
                <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="Dirección física o Google Meet" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEventModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateEvent}>
                {gcalToken ? 'Añadir al CRM y Google Calendar' : 'Guardar interno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
