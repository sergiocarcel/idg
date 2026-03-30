import { createRoot } from 'react-dom/client';
import React from 'react';
import html2pdf from 'html2pdf.js';
import PresupuestoPrint from '../pages/Presupuestos/PresupuestoPrint.jsx';

/**
 * Genera un PDF del presupuesto en modo 'cliente' (para email).
 * Usa html2pdf.js renderizando PresupuestoPrint offscreen.
 * @param {Object} ppto - Documento presupuesto
 * @param {Object} data - appData con clientes, config, etc.
 * @param {string} mode - 'cliente' | 'direccion' | 'colaboradores'
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function generatePresupuestoPdf(ppto, data, mode = 'cliente') {
  return new Promise((resolve, reject) => {
    // Contenedor offscreen
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;';
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };

    root.render(
      React.createElement(PresupuestoPrint, {
        ppto,
        data,
        mode,
        printOnMount: false,
        onClose: () => {}
      })
    );

    // Esperar render + recursos (imágenes, fuentes)
    setTimeout(async () => {
      try {
        const blob = await html2pdf()
          .from(container)
          .set({
            margin: 10,
            filename: `Presupuesto_${ppto.id}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .outputPdf('blob');

        cleanup();
        resolve({ blob, filename: `Presupuesto_${ppto.id}.pdf` });
      } catch (err) {
        cleanup();
        reject(err);
      }
    }, 800);
  });
}
