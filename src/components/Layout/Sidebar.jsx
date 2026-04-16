import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, Briefcase, FileText, FileBarChart, Package,
  Truck, ClipboardList, Calendar, User, Settings, FolderKanban, LogOut, ShoppingCart, X, LayoutGrid
} from 'lucide-react';
import { auth } from '../../config/firebase';

const menuItems = [
  { k: "dashboard", l: "Dashboard", i: Home },
  { k: "clientes", l: "Clientes", i: Users },
  { k: "obras", l: "Obras", i: Briefcase },
  { k: "presupuestos", l: "Presupuestos", i: FileText },
  { k: "facturas", l: "Facturación", i: FileBarChart },
  { k: "planificacion", l: "Planificación", i: LayoutGrid },
  { k: "pedidos", l: "Pedidos", i: ShoppingCart },
  { k: "materiales", l: "Almacén", i: Package },
  { k: "proveedores", l: "Proveedores", i: Truck },
  { k: "calendario", l: "Calendario", i: Calendar },
  { k: "trabajadores", l: "Trabajadores", i: User },
  { k: "gestion", l: "Gestión y RRHH", i: FolderKanban },
  { k: "config", l: "Configuración", i: Settings }
];

export default function Sidebar({ userRole = 'trabajador', userName = 'Usuario', onClose }) {
  const roleAccess = {
    admin: ['dashboard', 'clientes', 'obras', 'presupuestos', 'facturas', 'planificacion', 'pedidos', 'materiales', 'proveedores', 'calendario', 'trabajadores', 'gestion', 'config'],
    jefe: ['dashboard', 'clientes', 'obras', 'presupuestos', 'planificacion', 'pedidos', 'materiales', 'calendario', 'trabajadores'],
    logistica: ['dashboard', 'pedidos', 'materiales', 'proveedores'],
    trabajador: ['dashboard', 'pedidos', 'trabajadores']
  };

  const allowed = roleAccess[userRole] || roleAccess['trabajador'];

  const groups = [
    { title: 'GESTIÓN', keys: ['dashboard', 'clientes', 'obras', 'presupuestos', 'facturas'] },
    { title: 'OPERACIONES', keys: ['planificacion', 'pedidos', 'materiales', 'proveedores', 'calendario'] },
    { title: 'SISTEMA', keys: ['trabajadores', 'gestion', 'config'] }
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo-placeholder">{import.meta.env.VITE_APP_NAME || 'CRM'}</div>
        <button className="mobile-close-btn" onClick={onClose}><X size={20} /></button>
      </div>
      
      <nav className="sidebar-nav">
        {groups.map(g => {
          const items = g.keys.filter(k => allowed.includes(k)).map(k => menuItems.find(m => m.k === k)).filter(Boolean);
          if (items.length === 0) return null;
          
          return (
            <React.Fragment key={g.title}>
              <div className="nav-group-title">{g.title}</div>
              {items.map((item) => (
                <NavLink 
                  key={item.k} 
                  to={item.k === 'dashboard' ? '/' : `/${item.k}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.i className="nav-icon" size={18} />
                  <span>{item.l}</span>
                </NavLink>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</span>
            <span className="cloud-status">Rol: {userRole}</span>
          </div>
          <button className="logout-btn" title="Cerrar sesión" onClick={() => auth.signOut()}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
