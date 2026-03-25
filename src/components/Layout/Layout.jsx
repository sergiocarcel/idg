import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Layout({ children, userRole, userName }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

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
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        {children}
      </main>
    </div>
  );
}
