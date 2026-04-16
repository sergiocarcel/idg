import React, { useState } from 'react';
import { Key, FileText, Folder, Download, Building2, User, Lock, AlertCircle, LogOut } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function PortalColaborador() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null); // { colab }

  const handleLogin = async () => {
    if (!email || !pin) return setError('Introduce tu email y PIN');
    setLoading(true);
    setError('');
    
    try {
      const colabSnapshot = await getDocs(collection(db, 'colaboradores'));
      let foundColab = null;

      colabSnapshot.forEach((doc) => {
        if (foundColab) return;
        const colab = { id: doc.id, ...doc.data() };
        if (colab.email && colab.email.toLowerCase() === email.toLowerCase() && colab.pin === pin) {
          foundColab = colab;
        }
      });

      if (!foundColab) {
        setError('Email o PIN incorrectos. Verifica los datos e inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      setSessionData({ colab: foundColab });
    } catch (err) {
      console.error('Error accediendo al portal:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setSessionData(null);
    setEmail('');
    setPin('');
    setError('');
  };

  const totalDocs = sessionData 
    ? (sessionData.colab.carpetas || []).reduce((sum, f) => sum + (f.documentos || []).length, 0) 
    : 0;

  // LOGIN SCREEN
  if (!sessionData) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
              <Building2 size={32} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Portal Colaborador</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Accede a tus documentos de obra</p>
          </div>

          {/* Login Card */}
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#fca5a5' }}>{error}</span>
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && document.getElementById('pin-input')?.focus()}
                  placeholder="tu@email.com" 
                  style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '14px', color: '#fff', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIN de acceso</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  id="pin-input"
                  type="text" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="123456" maxLength={6}
                  style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '18px', letterSpacing: '0.3em', color: '#fff', outline: 'none', transition: 'border-color 0.2s', fontFamily: "'Inter', monospace", boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
            </div>

            <button 
              onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#3b82f6' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? 'Verificando...' : <><Key size={16} /> Acceder</>}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '24px' }}>
            Si no tienes PIN, contacta con la empresa que te lo proporcionó.
          </p>
        </div>
      </div>
    );
  }

  // DOCUMENT VIEW
  const { colab } = sessionData;
  const carpetas = colab.carpetas || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} style={{ color: '#3b82f6' }} /> {colab.obraNombre || 'Documentos'}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Hola, <strong>{colab.nombre}</strong> {colab.empresa && <>· {colab.empresa}</>} · {totalDocs} documentos
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontWeight: 500, fontFamily: 'inherit' }}
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        {totalDocs === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Folder size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#64748b' }}>Sin documentos aún</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Tu empresa aún no ha compartido documentos contigo en esta obra.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {carpetas.map(folder => (
              <div key={folder.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Folder size={18} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{folder.nombre}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>({(folder.documentos || []).length} archivos)</span>
                </div>
                
                <div style={{ padding: '8px 12px' }}>
                  {(folder.documentos || []).length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Carpeta vacía</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(folder.documentos || []).map(doc => (
                        <a 
                          key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                          onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div style={{ width: '36px', height: '36px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={16} style={{ color: '#3b82f6' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nombre}</div>
                              {doc.fecha && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  {new Date(doc.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                          <Download size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '24px', fontSize: '11px', color: '#94a3b8' }}>
        Portal de colaborador · {import.meta.env.VITE_APP_COMPANY || 'CRM'} {new Date().getFullYear()}
      </div>
    </div>
  );
}
