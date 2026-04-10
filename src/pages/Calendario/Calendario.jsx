import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, MapPin, Clock, RefreshCw, X } from 'lucide-react';
import { auth } from '../../config/firebase';
import { saveDoc, deleteDoc, updateDoc } from '../../services/db';
import { sendEmail } from '../../utils/sendUtils';

export default function Calendario({ data, setData }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Eventos desde Firestore (ya vienen via App.jsx listener)
  const eventos = data?.eventos || [];

  const [gcalToken, setGcalToken] = useState(localStorage.getItem('gcal_token'));
  const [gcalExpiresAt, setGcalExpiresAt] = useState(() => {
    const s = localStorage.getItem('gcal_token_expires');
    return s ? Number(s) : null;
  });
  const tokenClientRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal State for New Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', location: '', type: 'reunion', participantes: [], notificarAntes: 60 });

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
      case 'gcal': return { bg: '#e0e7ff', color: '#3730a3' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  // ─── Google Calendar Sync ─────────────────────────────

  const GCAL_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const calcEndTime = (date, time) => {
    const t = (time && time !== 'Todo el día') ? time : '10:00';
    const h = parseInt(t.split(':')[0]) + 1;
    const m = t.split(':')[1] || '00';
    return `${date}T${String(h).padStart(2, '0')}:${m}:00`;
  };

  const clearGcalToken = (expired = false) => {
    setGcalToken(null);
    setGcalExpiresAt(null);
    localStorage.removeItem('gcal_token');
    localStorage.removeItem('gcal_token_expires');
    tokenClientRef.current = null;
    if (expired) alert('La sesión de Google Calendar ha expirado. Vuelve a hacer clic en "Vincular Google Calendar" para reconectar.');
  };

  const handleGoogleSync = () => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      alert('Falta VITE_GOOGLE_OAUTH_CLIENT_ID en el .env. Consulta GUIA_DESPLIEGUE.md para configurarlo.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      alert('El script de Google Identity Services no ha cargado todavía. Refresca la página e inténtalo de nuevo.');
      return;
    }
    setIsSyncing(true);
    const isReconnect = !!gcalToken;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('GIS error:', tokenResponse);
          setIsSyncing(false);
          return;
        }
        const token = tokenResponse.access_token;
        const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000;
        localStorage.setItem('gcal_token', token);
        localStorage.setItem('gcal_token_expires', String(expiresAt));
        setGcalToken(token);
        setGcalExpiresAt(expiresAt);

        // Importar eventos de GCal → Firestore
        await loadGoogleEvents(token);

        // Push de eventos locales existentes → GCal
        const localEvents = eventos.filter(e => e.type !== 'gcal' && !e.googleEventId);
        for (const evt of localEvents) {
          try {
            const gcalEvt = {
              summary: evt.title,
              location: evt.location || '',
              start: { dateTime: `${evt.date}T${(evt.time && evt.time !== 'Todo el día') ? evt.time : '10:00'}:00`, timeZone: 'Europe/Madrid' },
              end: { dateTime: calcEndTime(evt.date, evt.time), timeZone: 'Europe/Madrid' },
            };
            const res = await fetch(GCAL_EVENTS_URL, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(gcalEvt)
            });
            if (res.ok) {
              const created = await res.json();
              await updateDoc('eventos', evt.id, { googleEventId: created.id });
            }
          } catch (_) {}
        }
        setIsSyncing(false);
      }
    });
    tokenClientRef.current = client;
    // Primera vez: pedir consentimiento explícito. Reconexión: silencioso.
    client.requestAccessToken({ prompt: isReconnect ? '' : 'consent' });
  };

  const loadGoogleEvents = async (token) => {
    if (!token) return;
    try {
      setIsSyncing(true);

      // Rango extendido: mes anterior + actual + siguiente
      const startD = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const endD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59).toISOString();

      const res = await fetch(`${GCAL_EVENTS_URL}?timeMin=${startD}&timeMax=${endD}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        clearGcalToken(true);
        return;
      }

      const gcalData = await res.json();
      const mappedEvents = (gcalData.items || []).map(i => ({
        id: 'gcal-' + i.id,
        title: i.summary || '(Sin título)',
        date: i.start.dateTime ? i.start.dateTime.split('T')[0] : i.start.date,
        time: i.start.dateTime ? new Date(i.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Todo el día',
        location: i.location || '',
        type: 'gcal',
        googleEventId: i.id
      }));

      for (const evt of mappedEvents) {
        const existing = eventos.find(e => e.googleEventId === evt.googleEventId);
        if (!existing) {
          await saveDoc('eventos', evt.id, evt);
        }
      }
    } catch (err) {
      console.error(err);
      clearGcalToken(false);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!gcalToken) return;
    // Si el token ha expirado, intentar refresco silencioso
    if (!gcalExpiresAt || Date.now() >= gcalExpiresAt) {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
      if (!clientId || !window.google?.accounts?.oauth2) {
        clearGcalToken(true);
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (tokenResponse) => {
          if (tokenResponse.error) { clearGcalToken(true); return; }
          const token = tokenResponse.access_token;
          const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000;
          localStorage.setItem('gcal_token', token);
          localStorage.setItem('gcal_token_expires', String(expiresAt));
          setGcalToken(token);
          setGcalExpiresAt(expiresAt);
          loadGoogleEvents(token);
        }
      });
      tokenClientRef.current = client;
      client.requestAccessToken({ prompt: '' });
      return;
    }
    loadGoogleEvents(gcalToken);
  }, [currentDate, gcalToken]);

  // ─── CRUD Eventos ─────────────────────────────────────

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;

    const eventId = 'EVT-' + Date.now();
    const eventData = {
      ...newEvent,
      id: eventId,
      createdBy: auth.currentUser?.email || 'sistema',
      createdAt: new Date().toISOString()
    };

    await saveDoc('eventos', eventId, eventData);

    // Crear notificación in-app para cada participante
    if (newEvent.participantes.length > 0) {
      for (const participante of newEvent.participantes) {
        const notifId = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        await saveDoc('notificaciones', notifId, {
          id: notifId,
          tipo: 'info',
          mensaje: `Nuevo evento: "${newEvent.title}" el ${new Date(newEvent.date).toLocaleDateString()} a las ${newEvent.time}. Participante: ${participante}`,
          leida: false,
          fecha: new Date().toISOString(),
          link: '/calendario'
        });
      }
    }

    // Enviar email a participantes que tengan email (buscar en trabajadores)
    const trabajadores = data?.trabajadores || [];
    for (const nombre of newEvent.participantes) {
      const trab = trabajadores.find(t => t.nombre === nombre || (t.nombre + ' ' + (t.apellidos || '')).trim() === nombre);
      if (trab?.email) {
        try {
          await sendEmail(trab.email, `Evento: ${newEvent.title}`, `Has sido invitado al evento "${newEvent.title}" el ${new Date(newEvent.date).toLocaleDateString()} a las ${newEvent.time}. Lugar: ${newEvent.location || 'Por definir'}.`);
        } catch (err) {
          console.error('Error enviando email a', trab.email, err);
        }
      }
    }

    setShowEventModal(false);
    setNewEvent({ title: '', date: '', time: '10:00', location: '', type: 'reunion', participantes: [], notificarAntes: 60 });

    // Si GCal está enlazado y el token es válido, crear en Google Calendar también
    if (gcalToken && gcalExpiresAt && Date.now() < gcalExpiresAt) {
      const gcalEvt = {
        summary: newEvent.title,
        location: newEvent.location || '',
        start: { dateTime: `${newEvent.date}T${newEvent.time}:00`, timeZone: 'Europe/Madrid' },
        end: { dateTime: calcEndTime(newEvent.date, newEvent.time), timeZone: 'Europe/Madrid' },
      };
      try {
        const res = await fetch(GCAL_EVENTS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${gcalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalEvt)
        });
        if (res.ok) {
          const created = await res.json();
          await updateDoc('eventos', eventId, { googleEventId: created.id });
        } else {
          console.warn('No se pudo crear el evento en Google Calendar.');
        }
      } catch (err) {
        console.error("No se pudo crear evento en GCal", err);
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('¿Eliminar evento?')) return;
    const evt = eventos.find(e => e.id === eventId);
    if (gcalToken && gcalExpiresAt && Date.now() < gcalExpiresAt && evt?.googleEventId) {
      try {
        await fetch(`${GCAL_EVENTS_URL}/${evt.googleEventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${gcalToken}` }
        });
      } catch (_) {}
    }
    await deleteDoc('eventos', eventId);
  };

  // Filtrar eventos del mes actual para la sidebar
  const currentMonthEvents = eventos
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    })
    .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Calendario Corporativo</h1>
          <p className="page-subtitle">Sincronizado vía Google Calendar API.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleGoogleSync} disabled={isSyncing}
            style={{ background: isSyncing ? '#f1f5f9' : gcalToken ? '#f0fdf4' : '#fff', color: gcalToken ? '#16a34a' : undefined, borderColor: gcalToken ? '#86efac' : undefined }}>
            <RefreshCw size={16} style={isSyncing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {isSyncing ? 'Sincronizando…' : gcalToken ? '✓ Google Calendar vinculado' : 'Vincular Google Calendar'}
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
                <div key={d} onClick={() => { setNewEvent({...newEvent, date: fullDateStr}); setShowEventModal(true); }} style={{ minHeight: '100px', background: '#fff', border: isToday ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <div style={{ fontSize: '14px', fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'var(--text-main)', marginBottom: '4px' }}>
                    {d}
                  </div>
                  {dayEvents.map(e => {
                    const style = getTypeStyle(e.type);
                    return (
                      <div key={e.id} style={{ borderLeft: `2px solid ${style.color}`, background: style.bg, color: style.color, fontSize: '10px', fontWeight: 600, padding: '4px 6px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                        {e.time} - {e.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Proximos Eventos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="stat-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalIcon size={16} /> Próximos Eventos
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentMonthEvents.map(e => (
                <div key={e.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', marginBottom: '6px' }}>{e.title}</div>
                    <span style={{ ...getTypeStyle(e.type), padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: getTypeStyle(e.type).bg, color: getTypeStyle(e.type).color }}>
                      {e.type?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Clock size={12} /> {new Date(e.date).toLocaleDateString()} a las {e.time}
                  </div>
                  {e.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {e.location}
                    </div>
                  )}
                  {e.participantes?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {e.participantes.map((p, i) => (
                        <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600 }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {currentMonthEvents.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No hay eventos este mes.</div>
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
              <div className="form-group half-width">
                <label>Tipo</label>
                <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                  <option value="reunion">Reunión</option>
                  <option value="visita">Visita</option>
                  <option value="entrega">Entrega</option>
                  <option value="obra">Obra</option>
                </select>
              </div>
              <div className="form-group half-width">
                <label>Ubicación</label>
                <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="Dirección o Meet" />
              </div>
              <div className="form-group full-width">
                <label>Participantes</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {(newEvent.participantes || []).map((p, i) => (
                    <span key={i} style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {p}
                      <button onClick={() => setNewEvent({...newEvent, participantes: newEvent.participantes.filter((_, idx) => idx !== i)})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, fontSize: '14px', lineHeight: 1 }}>&times;</button>
                    </span>
                  ))}
                </div>
                <select onChange={e => { if (e.target.value && !newEvent.participantes.includes(e.target.value)) { setNewEvent({...newEvent, participantes: [...newEvent.participantes, e.target.value]}); } e.target.value = ''; }}>
                  <option value="">Añadir participante...</option>
                  {(data?.trabajadores || []).filter(t => !newEvent.participantes.includes(t.nombre)).map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre} {t.apellidos || ''} — {t.rol || 'Operario'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Notificar antes (minutos)</label>
                <select value={newEvent.notificarAntes} onChange={e => setNewEvent({...newEvent, notificarAntes: Number(e.target.value)})}>
                  <option value={0}>Sin recordatorio</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={1440}>1 día antes</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEventModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateEvent}>
                {gcalToken ? 'Añadir al CRM y Google Calendar' : 'Guardar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
