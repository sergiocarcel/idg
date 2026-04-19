import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell.jsx';
import SearchModal from './SearchModal.jsx';
import { Menu, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteDoc } from '../../services/db';

export default function Layout({ children, userRole, userName, notificaciones = [], data }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          <div style={{ marginLeft: 'auto', marginRight: '16px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setSearchOpen(true)}
              title="Buscar (⌘K)"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center',
                color: 'var(--text-muted)', transition: 'background 0.2s'
              }}
            >
              <Search size={20} />
            </button>
            <NotificationBell
              notificaciones={notificaciones}
              onNavigate={(link) => navigate(link)}
              onDelete={(notif) => deleteDoc('notificaciones', notif.id)}
            />
          </div>
        </div>
        {children}
      </main>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        data={data}
        userRole={userRole}
      />
    </div>
  );
}
