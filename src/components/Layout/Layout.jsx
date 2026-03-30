import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell.jsx';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Layout({ children, userRole, userName, notificaciones = [] }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Cerrar menú al navegar en móvil
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar userRole={userRole} userName={userName} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="app-main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div style={{ marginLeft: 'auto', marginRight: '16px', marginTop: '8px' }}>
            <NotificationBell notificaciones={notificaciones} onNavigate={(link) => navigate(link)} />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
