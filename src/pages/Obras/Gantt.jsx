import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, X, Maximize2, PenTool } from 'lucide-react';
import GanttPrint from './GanttPrint.jsx';

export default function Gantt({ obra, onClose }) {
  // Generamos algunas tareas iniciales mockeadas para la demo premium
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Demolición y Desescombro', startDay: 0, duration: 3, progress: 100, color: '#ef4444' },
    { id: 2, name: 'Instalación de Fontanería', startDay: 3, duration: 4, progress: 80, color: '#3b82f6' },
    { id: 3, name: 'Rozas e Instalación Eléctrica', startDay: 5, duration: 5, progress: 40, color: '#eab308' },
    { id: 4, name: 'Alisado y Pladur', startDay: 10, duration: 6, progress: 0, color: '#10b981' },
    { id: 5, name: 'Solados y Alicatados', startDay: 16, duration: 7, progress: 0, color: '#8b5cf6' },
    { id: 6, name: 'Pintura y Acabados', startDay: 23, duration: 4, progress: 0, color: '#ec4899' },
  ]);

  const [newTaskName, setNewTaskName] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);
  const totalDays = 30;

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const lastTask = tasks[tasks.length - 1];
    const start = lastTask ? lastTask.startDay + lastTask.duration : 0;
    
    setTasks([...tasks, {
      id: Date.now(),
      name: newTaskName,
      startDay: Math.min(start, totalDays - 2),
      duration: 3,
      progress: 0,
      color: ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#8b5cf6'][tasks.length % 5]
    }]);
    setNewTaskName('');
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateProgress = (id, newProgress) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, progress: parseInt(newProgress) } : t));
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '1000px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: '#1a1a1a', color: '#fff', borderBottom: 'none' }}>
          <div>
            <h2 style={{ color: '#fff' }}>Cronograma Interactivo</h2>
            <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
              Proyecto: {obra?.nombre || 'Obra actual'} &middot; {totalDays} días
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}><X size={18} /></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
          
          {/* Top Toolbar */}
          <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Nombre nueva fase..." 
              value={newTaskName} 
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '240px', outline: 'none' }}
            />
            <button className="btn-primary" onClick={handleAddTask} style={{ padding: '8px 14px' }}>
              <Plus size={14} /> Añadir Fase
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Arrastra el progreso para actualizar.
            </div>
            <button className="btn-secondary" style={{ padding: '8px 14px', color: '#8b5cf6', borderColor: '#c4b5fd' }} onClick={() => setIsPrintMode(true)}>
              <PenTool size={14} /> Firmar y Exportar PDF
            </button>
          </div>

          {/* Gantt Chart Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', position: 'relative' }}>
            
            <div style={{ minWidth: '800px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              
              {/* Timeline Header */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: '#f4f4f5' }}>
                <div style={{ width: '280px', flexShrink: 0, padding: '12px 16px', fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                  FASES Y PARTIDAS
                </div>
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={i} style={{ flex: 1, borderRight: '1px solid #e4e4e7', padding:'8px 0', textAlign: 'center', fontSize: '10px', color: '#71717a', background: i % 7 === 5 || i % 7 === 6 ? '#fef2f2' : 'transparent' }}>
                      D{i+1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#a1a1aa', fontSize: '13px' }}>
                    No hay fases definidas. Añade la primera.
                  </div>
                )}
                {tasks.map((task, index) => (
                  <div key={task.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? '#fff' : '#fafafa', position: 'relative' }}>
                    
                    {/* Task Info Left */}
                    <div style={{ width: '280px', flexShrink: 0, padding: '12px 16px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: task.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input 
                            type="range" min="0" max="100" step="5" value={task.progress} 
                            onChange={(e) => updateProgress(task.id, e.target.value)}
                            style={{ flex: 1, accentColor: task.color, height: '4px' }}
                          />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: task.color, width: '24px' }}>{task.progress}%</span>
                        </div>
                      </div>
                      <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Timeline Graph Right */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative', background: 'transparent' }}>
                      {/* Background Grid Lines */}
                      {Array.from({ length: totalDays }).map((_, i) => (
                        <div key={`bg-${i}`} style={{ flex: 1, borderRight: '1px solid #f4f4f5', background: i % 7 === 5 || i % 7 === 6 ? 'rgba(239,68,68,0.02)' : 'transparent' }} />
                      ))}

                      {/* Task Bar */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        bottom: '12px', 
                        left: `${(task.startDay / totalDays) * 100}%`, 
                        width: `${(task.duration / totalDays) * 100}%`,
                        zIndex: 2,
                      }}>
                        <div style={{ 
                          width: '100%', height: '100%', background: `${task.color}22`, 
                          border: `1px solid ${task.color}`, borderRadius: '6px', 
                          position: 'relative', overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          cursor: 'pointer'
                        }}>
                          {/* Progress Fill */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.progress}%`, background: task.color, transition: 'width 0.3s ease' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', color: task.progress > 50 ? '#fff' : task.color, fontSize: '10px', fontWeight: 700, textShadow: task.progress > 50 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none', transition: 'color 0.3s ease' }}>
                            {task.duration} d
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Global Progress */}
            <div style={{ marginTop: '20px', background: '#fff', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Progreso Global de la Obra</div>
              <div style={{ flex: 1, height: '10px', background: '#e4e4e7', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', 
                  width: `${tasks.length ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length) : 0}%`,
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a1a' }}>
                {tasks.length ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length) : 0}%
              </div>
            </div>

          </div>
        </div>
      </div>

      {isPrintMode && (
        <GanttPrint 
          obra={obra} 
          tasks={tasks} 
          onClose={() => setIsPrintMode(false)} 
        />
      )}
    </div>
  );
}
