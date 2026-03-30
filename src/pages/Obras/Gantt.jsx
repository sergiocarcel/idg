import React, { useState, useRef } from 'react';
import { Plus, Trash2, X, PenTool, GripVertical, ChevronUp, ChevronDown, Scissors } from 'lucide-react';
import GanttPrint from './GanttPrint.jsx';

const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#a855f7'];
const DEFAULT_PHASES = ['Demolición y Desescombro','Instalación de Fontanería','Rozas e Instalación Eléctrica','Alisado y Pladur','Solados y Alicatados','Pintura y Acabados'];

export default function Gantt({ obra, onClose, empresa }) {
  const obraInicio = obra?.inicio ? new Date(obra.inicio) : new Date();
  const obraFin = obra?.fin ? new Date(obra.fin) : new Date(obraInicio.getTime() + 30 * 86400000);
  const totalDays = Math.max(Math.round((obraFin - obraInicio) / 86400000) + 1, 14);

  // Distribute default phases
  const distribute = (names, total) => {
    const n = names.length;
    const durBase = Math.floor(total / n);
    const remainder = total - durBase * n;
    let cursor = 0;
    return names.map((name, i) => {
      const dur = durBase + (i < remainder ? 1 : 0);
      const task = {
        id: Date.now() + i,
        groupId: 'G-' + (Date.now() + i),
        name: typeof name === 'string' ? name : name.name,
        startDay: cursor, duration: dur,
        progress: typeof name === 'object' ? (name.progress || 0) : 0,
        color: typeof name === 'object' ? name.color : COLORS[i % COLORS.length]
      };
      cursor += dur;
      return task;
    });
  };

  // Migration: ensure all tasks have groupId
  const migrateTask = (t) => t.groupId ? t : { ...t, groupId: 'G-' + t.id };

  const [tasks, setTasks] = useState(() => {
    if (obra?.ganttTareas?.length) return obra.ganttTareas.map(migrateTask);
    return distribute(DEFAULT_PHASES, totalDays);
  });

  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [editingDur, setEditingDur] = useState(null);
  const pointerRef = useRef(null);

  // ─── Grouping logic ───────────────────────────────
  const buildGroups = (taskList) => {
    const groups = [];
    const seen = new Map();
    taskList.forEach(task => {
      if (!seen.has(task.groupId)) {
        seen.set(task.groupId, groups.length);
        groups.push({ groupId: task.groupId, name: task.name, color: task.color, tasks: [task] });
      } else {
        groups[seen.get(task.groupId)].tasks.push(task);
      }
    });
    return groups;
  };

  const groups = buildGroups(tasks);

  const getGroupProgress = (group) => {
    const totalDur = group.tasks.reduce((s, t) => s + t.duration, 0);
    if (totalDur === 0) return 0;
    return Math.round(group.tasks.reduce((s, t) => s + t.progress * t.duration, 0) / totalDur);
  };

  const getGroupDuration = (group) => group.tasks.reduce((s, t) => s + t.duration, 0);

  // ─── Task operations ──────────────────────────────
  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const gId = 'G-' + Date.now();
    let startDay = 0;
    let duration = Math.max(1, Math.floor(totalDays / (groups.length + 1)));
    if (newTaskDate) {
      const selectedDate = new Date(newTaskDate);
      startDay = Math.max(0, Math.round((selectedDate - obraInicio) / 86400000));
      startDay = Math.min(startDay, totalDays - 1);
      duration = Math.min(duration, totalDays - startDay);
    }
    const newTask = { id: Date.now(), groupId: gId, name: newTaskName, startDay, duration, progress: 0, color: COLORS[groups.length % COLORS.length] };
    setTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskDate('');
  };

  const handleSplitTask = (groupId) => {
    const groupTasks = tasks.filter(t => t.groupId === groupId);
    const last = groupTasks[groupTasks.length - 1];
    if (!last) return;
    const newStart = Math.min(last.startDay + last.duration + 2, totalDays - 1);
    const newDur = Math.max(1, Math.min(Math.floor(last.duration / 2), totalDays - newStart));
    const newBlock = {
      id: Date.now(),
      groupId: last.groupId,
      name: last.name,
      color: last.color,
      startDay: newStart,
      duration: newDur,
      progress: 0
    };
    setTasks([...tasks, newBlock]);
  };

  const removeGroup = (groupId) => {
    const remaining = tasks.filter(t => t.groupId !== groupId);
    setTasks(remaining);
  };

  const updateProgress = (id, val) => setTasks(tasks.map(t => t.id === id ? { ...t, progress: parseInt(val) || 0 } : t));

  const updateGroupProgress = (groupId, val) => {
    const v = parseInt(val) || 0;
    setTasks(tasks.map(t => t.groupId === groupId ? { ...t, progress: v } : t));
  };

  const updateDuration = (id, newDur) => {
    const dur = Math.max(1, parseInt(newDur) || 1);
    setTasks(tasks.map(t => t.id === id ? { ...t, duration: dur } : t));
  };

  // Move group up/down
  const moveGroup = (groupIdx, direction) => {
    const newIdx = groupIdx + direction;
    if (newIdx < 0 || newIdx >= groups.length) return;
    const arr = [...groups];
    [arr[groupIdx], arr[newIdx]] = [arr[newIdx], arr[groupIdx]];
    setTasks(arr.flatMap(g => g.tasks));
  };

  // Drag and Drop (reorder groups)
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const arr = [...groups];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setTasks(arr.flatMap(g => g.tasks));
    setDragIdx(null);
  };

  // ─── Calendar helpers ─────────────────────────────
  const realDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(obraInicio.getTime() + i * 86400000);
    return { date: d, day: d.getDate(), month: d.getMonth(), weekday: d.getDay() };
  });
  const festivos = ['01/01','06/01','02/04','03/04','01/05','15/08','12/10','01/11','06/12','08/12','25/12'];
  const isFestivo = (d) => festivos.includes(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`);
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const dayW = Math.max(24, Math.min(36, Math.floor((typeof window !== 'undefined' ? window.innerWidth * 0.65 : 600) / totalDays)));
  const globalProgress = tasks.length ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length) : 0;

  // ─── Pointer drag/resize (per block) ──────────────
  const handleBarPointerDown = (e, taskId, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    e.target.setPointerCapture(e.pointerId);
    pointerRef.current = { taskId, mode, startX: e.clientX, origStart: task.startDay, origDur: task.duration };
  };

  const handleBarPointerMove = (e) => {
    if (!pointerRef.current) return;
    const { taskId, mode, startX, origStart, origDur } = pointerRef.current;
    const deltaPixels = e.clientX - startX;
    const deltaDays = Math.round(deltaPixels / dayW);

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (mode === 'move') {
        const newStart = Math.max(0, Math.min(origStart + deltaDays, totalDays - t.duration));
        return { ...t, startDay: newStart };
      } else if (mode === 'resize-right') {
        const newDur = Math.max(1, Math.min(origDur + deltaDays, totalDays - t.startDay));
        return { ...t, duration: newDur };
      } else if (mode === 'resize-left') {
        const newStart = Math.max(0, Math.min(origStart + deltaDays, origStart + origDur - 1));
        const newDur = origDur - (newStart - origStart);
        return { ...t, startDay: newStart, duration: newDur };
      }
      return t;
    }));
  };

  const handleBarPointerUp = () => { pointerRef.current = null; };

  // ─── Render bar (reused for each block) ───────────
  const renderBar = (task) => (
    <div
      key={task.id}
      onPointerMove={handleBarPointerMove}
      onPointerUp={handleBarPointerUp}
      style={{
        position: 'absolute', top: '7px', bottom: '7px',
        left: `${task.startDay * dayW}px`,
        width: `${Math.max(task.duration * dayW - 2, dayW - 2)}px`,
        background: `${task.color}22`, border: `1px solid ${task.color}`,
        borderRadius: '5px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        cursor: 'grab', touchAction: 'none'
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.progress}%`, background: task.color, transition: 'width 0.3s', pointerEvents: 'none' }} />
      <div onPointerDown={(e) => handleBarPointerDown(e, task.id, 'resize-left')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 2 }} />
      <div onPointerDown={(e) => handleBarPointerDown(e, task.id, 'move')} style={{ position: 'absolute', left: '6px', right: '6px', top: 0, bottom: 0, cursor: 'grab', zIndex: 1, display: 'flex', alignItems: 'center', padding: '0 5px', color: task.progress > 50 ? '#fff' : task.color, fontSize: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {task.duration}d
      </div>
      <div onPointerDown={(e) => handleBarPointerDown(e, task.id, 'resize-right')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 2 }} />
    </div>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '96vw', width: '96vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="modal-header" style={{ background: '#1a1a1a', color: '#fff', borderBottom: 'none', padding: '14px 20px', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '16px' }}>Cronograma Interactivo</h2>
            <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
              {obra?.nombre || 'Obra'} &middot; <strong>{totalDays} días</strong> &middot; {obraInicio.toLocaleDateString()} → {obraFin.toLocaleDateString()}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}><X size={18} /></button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          <input type="text" placeholder="Nueva fase..." value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', flex: '1 1 140px', minWidth: '120px' }} />
          <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} min={obra?.inicio} max={obra?.fin} title="Fecha inicio (opcional)" style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', width: '140px' }} />
          <button className="btn-primary" onClick={handleAddTask} style={{ padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}><Plus size={13} /> Añadir</button>
          <div style={{ flex: '0 0 1px', height: '20px', background: 'var(--border)' }} />
          <button className="btn-secondary" style={{ padding: '7px 12px', fontSize: '12px', color: '#8b5cf6', borderColor: '#c4b5fd', whiteSpace: 'nowrap' }} onClick={() => setIsPrintMode(true)}>
            <PenTool size={13} /> PDF + Firma
          </button>
        </div>

        {/* Gantt — Split Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT: Group names */}
          <div style={{ width: 'clamp(160px, 25vw, 260px)', flexShrink: 0, borderRight: '2px solid var(--border)', background: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 10px', background: '#f4f4f5', borderBottom: '2px solid var(--border)', fontWeight: 700, fontSize: '10px', color: 'var(--text-muted)', height: '40px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              FASES ({groups.length})
            </div>
            {groups.length === 0 && <div style={{ padding: '24px 10px', fontSize: '11px', color: '#a1a1aa', textAlign: 'center' }}>Añade la primera fase →</div>}
            {groups.map((group, gIdx) => {
              const gProgress = getGroupProgress(group);
              const gDuration = getGroupDuration(group);
              const segCount = group.tasks.length;
              return (
                <div
                  key={group.groupId}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(gIdx)}
                  style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', background: dragIdx === gIdx ? '#eff6ff' : (gIdx % 2 === 0 ? '#fff' : '#fafafa'), height: '48px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s' }}
                >
                  <div draggable onDragStart={() => handleDragStart(gIdx)} style={{ cursor: 'grab', flexShrink: 0, padding: '4px 2px', borderRadius: '3px', display: 'flex', alignItems: 'center' }} title="Arrastra para reordenar">
                    <GripVertical size={12} style={{ color: '#c4c4c4' }} />
                  </div>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {group.name}
                      {segCount > 1 && <span style={{ fontSize: '8px', background: `${group.color}20`, color: group.color, padding: '0 4px', borderRadius: '8px', fontWeight: 700 }}>{segCount} tramos</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                      <input type="range" min="0" max="100" step="5" value={gProgress} onChange={(e) => updateGroupProgress(group.groupId, e.target.value)} style={{ flex: 1, accentColor: group.color, height: '3px' }} />
                      <span style={{ fontSize: '8px', fontWeight: 700, color: group.color, width: '22px', textAlign: 'right' }}>{gProgress}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                    <button onClick={() => moveGroup(gIdx, -1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: gIdx === 0 ? '#e4e4e7' : '#94a3b8', lineHeight: 0 }}><ChevronUp size={11} /></button>
                    <button onClick={() => moveGroup(gIdx, 1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: gIdx === groups.length - 1 ? '#e4e4e7' : '#94a3b8', lineHeight: 0 }}><ChevronDown size={11} /></button>
                  </div>
                  <button onClick={() => setEditingDur(editingDur === group.groupId ? null : group.groupId)} style={{ background: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px', fontSize: '9px', fontWeight: 700, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>{gDuration}d</button>
                  <button onClick={() => handleSplitTask(group.groupId)} title="Dividir fase (crear tramo adicional)" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '1px', flexShrink: 0 }}><Scissors size={10} /></button>
                  <button onClick={() => removeGroup(group.groupId)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '1px', flexShrink: 0 }}><Trash2 size={10} /></button>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Timeline */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', background: '#fff' }}>
            <div style={{ width: `${totalDays * dayW}px`, minWidth: `${totalDays * dayW}px` }}>
              {/* Day headers */}
              <div style={{ display: 'flex', background: '#f4f4f5', borderBottom: '2px solid var(--border)', height: '40px', flexShrink: 0 }}>
                {realDays.map((day, i) => {
                  const isWeekend = day.weekday === 0 || day.weekday === 6;
                  const isHoliday = isFestivo(day.date);
                  const isFirstOfMonth = i === 0 || day.month !== realDays[i - 1]?.month;
                  return (
                    <div key={i} style={{ width: `${dayW}px`, minWidth: `${dayW}px`, borderRight: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: isHoliday ? '#dc2626' : (isWeekend ? '#ef4444' : '#71717a'), background: isHoliday ? '#fef2f2' : (isWeekend ? '#fff5f5' : 'transparent'), fontWeight: isHoliday || isFirstOfMonth ? 700 : 400, lineHeight: '1.1' }}>
                      <div style={{ fontSize: '10px' }}>{day.day}</div>
                      {isFirstOfMonth && <div style={{ fontSize: '7px', color: '#3b82f6' }}>{monthNames[day.month]}</div>}
                      {isHoliday && <div style={{ fontSize: '6px' }}>FEST</div>}
                    </div>
                  );
                })}
              </div>
              {/* Timeline rows — one per group, multiple bars per row */}
              {groups.map((group, gIdx) => (
                <div key={group.groupId} style={{ height: '48px', position: 'relative', display: 'flex', borderBottom: '1px solid var(--border)', background: gIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {realDays.map((day, i) => {
                    const isWeekend = day.weekday === 0 || day.weekday === 6;
                    const isHoliday = isFestivo(day.date);
                    return <div key={i} style={{ width: `${dayW}px`, minWidth: `${dayW}px`, borderRight: '1px solid #f4f4f5', background: isHoliday ? 'rgba(220,38,38,0.03)' : (isWeekend ? 'rgba(239,68,68,0.02)' : 'transparent') }} />;
                  })}
                  {group.tasks.map(task => renderBar(task))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', background: '#fff', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px', fontSize: '9px', color: '#71717a' }}>
            <span>⬜ Laboral</span><span style={{ color: '#ef4444' }}>🟥 Finde</span><span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Festivo</span>
          </div>
          <div style={{ flex: 1, minWidth: '80px', height: '7px', background: '#e4e4e7', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', width: `${globalProgress}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800 }}>{globalProgress}%</div>
        </div>
      </div>

      {isPrintMode && <GanttPrint obra={obra} tasks={tasks} onClose={() => setIsPrintMode(false)} empresa={empresa} />}
    </div>
  );
}
