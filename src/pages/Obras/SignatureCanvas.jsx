import React, { useRef, useState, useEffect } from 'react';
import { Eraser } from 'lucide-react';

export default function SignatureCanvas({ onSign }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const context = canvas.getContext('2d');
      // Mejorar tacto de firma
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#0f172a';
      context.lineWidth = 2.5;
      setCtx(context);
    }
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    // Evita el scroll en móviles
    if(e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if(e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      ctx.closePath();
      setIsDrawing(false);
      onSign(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onSign(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#fafafa', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ width: '100%', height: '120px', cursor: 'crosshair', touchAction: 'none' }}
      />
      <button 
        type="button"
        className="icon-btn" 
        onClick={clear}
        title="Borrar y repetir"
        style={{ position: 'absolute', top: '8px', right: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Eraser size={14} />
      </button>
      <div style={{ position: 'absolute', bottom: '8px', left: '16px', fontSize: '11px', color: '#94a3b8', pointerEvents: 'none' }}>
        Firma manuscrita del cliente aquí
      </div>
    </div>
  );
}
