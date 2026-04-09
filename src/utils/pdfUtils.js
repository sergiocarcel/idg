import { createRoot } from 'react-dom/client';
import React from 'react';
import html2pdf from 'html2pdf.js';
import PresupuestoPrint from '../pages/Presupuestos/PresupuestoPrint.jsx';

/**
 * Genera un PDF a partir de un elemento del DOM ya visible en pantalla.
 * Captura el elemento pasado como parámetro (omite elementos con clase .no-print).
 *
 * @param {HTMLElement} element - Elemento ya renderizado y visible
 * @param {string} filename - Nombre del archivo PDF resultante
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function generatePdfFromElement(element, filename) {
  const blob = await html2pdf()
    .from(element)
    .set({
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.classList.contains('no-print')
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
    .outputPdf('blob');
  return { blob, filename };
}

/**
 * Genera un PDF del presupuesto.
 * html2canvas necesita que el contenido esté VISIBLE y ON-SCREEN.
 * Usamos un contenedor visible brevemente, se elimina tras capturar.
 */
export async function generatePresupuestoPdf(ppto, data, mode = 'cliente') {
  return new Promise((resolve, reject) => {
    // Contenedor VISIBLE en pantalla para que html2canvas lo capture
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:100vh;overflow:auto;background:white;z-index:99999;';
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

    // Esperar render completo + recursos
    setTimeout(async () => {
      try {
        // Expandir el contenedor al tamaño real del contenido antes de capturar
        container.style.height = 'auto';
        container.style.overflow = 'visible';
        
        const blob = await html2pdf()
          .from(container)
          .set({
            margin: 10,
            filename: `Presupuesto_${ppto.id}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, windowHeight: container.scrollHeight },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .outputPdf('blob');

        cleanup();
        resolve({ blob, filename: `Presupuesto_${ppto.id}.pdf` });
      } catch (err) {
        cleanup();
        reject(err);
      }
    }, 1500);
  });
}
