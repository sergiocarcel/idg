import React from 'react';

export default function Dashboard() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general de actividad</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Obras Activas</h3>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <h3>Presupuestos Pendientes</h3>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <h3>Facturación este mes</h3>
          <div className="stat-value">0,00 €</div>
        </div>
      </div>
    </div>
  );
}
