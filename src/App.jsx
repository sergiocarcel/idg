import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Clientes from './pages/Clientes/Clientes.jsx';
import Obras from './pages/Obras/Obras.jsx';
import Presupuestos from './pages/Presupuestos/Presupuestos.jsx';
import Pedidos from './pages/Pedidos/Pedidos.jsx';
import Almacen from './pages/Almacen/Almacen.jsx';
import Facturas from './pages/Facturas/Facturas.jsx';
import Trabajadores from './pages/Trabajadores/Trabajadores.jsx';
import RRHH from './pages/RRHH/RRHH.jsx';
import Configuracion from './pages/Configuracion/Configuracion.jsx';
import Proveedores from './pages/Proveedores/Proveedores.jsx';
import Calendario from './pages/Calendario/Calendario.jsx';
import Planificacion from './pages/Planificacion/Planificacion.jsx';
import Login from './pages/Auth/Login.jsx';
import PortalColaborador from './pages/Portal/PortalColaborador.jsx';

import { listenToCollection, seedDatabaseIfNeeded } from './services/db';
import { auth } from './config/firebase';

function App() {
  const [appData, setAppData] = useState({
    clientes: [], obras: [], presupuestos: [], pedidos: [], materiales: [],
    proveedores: [], trabajadores: [], registroHoras: [], documentosRRHH: [],
    facturas: [], catalogoPartidas: [], tareasDashboard: [], notificaciones: [],
    eventos: [], planificacion: [], colaboradores: [], plantillasPresupuesto: [],
    config: { empresa: null, usuarios: [] }
  });

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Escuchar el estado de autenticación
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setLoading(true);
        await initDB();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const initDB = async () => {
      await seedDatabaseIfNeeded();
      
      const unsubs = [];
      const cols = ['clientes', 'obras', 'presupuestos', 'pedidos', 'materiales', 'proveedores', 'trabajadores', 'registroHoras', 'documentosRRHH', 'facturas', 'catalogoPartidas', 'tareasDashboard', 'notificaciones', 'eventos', 'planificacion', 'colaboradores', 'plantillasPresupuesto'];
      
      cols.forEach(col => {
        const unsub = listenToCollection(col, (data) => {
          setAppData(prev => ({ ...prev, [col]: data }));
        });
        unsubs.push(unsub);
      });

      // Config es un poco diferente
      const unsubConfigEmpresa = listenToCollection('config', (docs) => {
        const emp = docs.find(d => d.id === 'empresa');
        const usr = docs.find(d => d.id === 'usuarios');
        setAppData(prev => ({
          ...prev, 
          config: {
            empresa: emp || null,
            usuarios: usr?.list || []
          }
        }));
      });
      unsubs.push(unsubConfigEmpresa);

      setLoading(false);

      return () => unsubs.forEach(fn => fn && fn());
    };

  if (loading) {
    return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)'}}>Cargando CRM...</div>;
  }

  // Portal route — accessible without login
  if (window.location.pathname === '/portal') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/portal" element={<PortalColaborador />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (!user) {
    return <Login />;
  }

  const currentUserConfig = appData.config?.usuarios?.find(u => u.email === user.email);
  const userRole = currentUserConfig?.rol || 'trabajador';
  const userName = currentUserConfig?.nombre || 'Usuario CRM';
  const isColaboradorExterno = !currentUserConfig && (appData.obras || []).some(o => (o.compartidoCon || []).some(c => c.email === user.email));

  return (
    <BrowserRouter>
      <Layout userRole={userRole} userName={userName} notificaciones={(appData.notificaciones || []).filter(n => !n.destinatarios || n.destinatarios.length === 0 || n.destinatarios.some(e => e.toLowerCase() === (user.email || '').toLowerCase()))}>
        <Routes>
          <Route path="/" element={<Dashboard data={appData} setData={setAppData} />} />
          <Route path="/clientes" element={<Clientes data={appData} setData={setAppData} />} />
          <Route path="/obras" element={<Obras data={appData} setData={setAppData} />} />
          <Route path="/presupuestos" element={<Presupuestos data={appData} setData={setAppData} forceMode={isColaboradorExterno ? 'colaboradores' : null} />} />
          <Route path="/facturas" element={<Facturas data={appData} setData={setAppData} />} />
          <Route path="/pedidos" element={<Pedidos data={appData} setData={setAppData} userName={userName} userEmail={user.email} />} />
          <Route path="/materiales" element={<Almacen data={appData} setData={setAppData} />} />
          <Route path="/proveedores" element={<Proveedores data={appData} setData={setAppData} />} />
          <Route path="/trabajadores" element={<Trabajadores data={appData} setData={setAppData} />} />
          <Route path="/gestion" element={<RRHH data={appData} setData={setAppData} />} />
          <Route path="/config" element={<Configuracion data={appData} setData={setAppData} />} />
          <Route path="/calendario" element={<Calendario data={appData} setData={setAppData} />} />
          <Route path="/planificacion" element={<Planificacion data={appData} setData={setAppData} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
