import React, { useState } from 'react';
import { auth } from '../../config/firebase';
import { Mail, Lock, LogIn, AlertCircle, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas o usuario no encontrado.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) return setError("Rellena email y contraseña para registrarte en el emulador.");
    setLoading(true);
    try {
      await auth.createUserWithEmailAndPassword(email, password);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-main)',
      padding: '24px'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent)', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px' }}>Acceso CRM</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Introduce tus credenciales corporativas</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group full-width" style={{ marginBottom: 0 }}>
            <label>Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{ paddingLeft: '44px', width: '100%' }}
                placeholder="usuario@empresa.es"
              />
            </div>
          </div>
          <div className="form-group full-width" style={{ marginBottom: 0 }}>
            <label>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ paddingLeft: '44px', width: '100%' }}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '8px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : <><LogIn size={18} /> Iniciar Sesión</>}
          </button>
        </form>
        
        {import.meta.env.DEV && (
          <div style={{ marginTop: '16px' }}>
             <button 
                type="button" 
                onClick={handleRegister}
                className="btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
                disabled={loading}
              >
                <UserPlus size={18} /> Crear esta cuenta en Emulador Local
              </button>
          </div>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#94a3b8' }}>
          <p>En desarrollo local usa cualquier email/pass si el emulador está vacío (Se creará auto) o configura uno en modo Admin.</p>
        </div>
      </div>
    </div>
  );
}
