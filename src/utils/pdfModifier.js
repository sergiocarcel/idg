import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Añade una página de firma al final de un documento PDF existente
 * @param {Blob|ArrayBuffer|string} pdfInput - PDF original (Blob, ArrayBuffer o base64)
 * @param {string} companySignatureUrl - Data URL de la firma de empresa (base64 PNG)
 * @returns {Promise<string>} - Devuelve el nuevo PDF en base64
 */
export async function addSignaturePageToPdf(pdfInput, companySignatureUrl) {
  let pdfDoc;
  
  if (pdfInput instanceof Blob) {
    const arrayBuffer = await pdfInput.arrayBuffer();
    pdfDoc = await PDFDocument.load(arrayBuffer);
  } else if (pdfInput instanceof ArrayBuffer) {
    pdfDoc = await PDFDocument.load(pdfInput);
  } else {
    // String (base64)
    pdfDoc = await PDFDocument.load(pdfInput);
  }

  // Crear una nueva página en blanco al final (A4 = 595.28 x 841.89)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Títulos
  page.drawText('Conformidad y Firma del Documento', {
    x: 50,
    y: height - 50,
    size: 20,
    color: rgb(0, 0, 0),
  });

  // Firma de la Empresa
  page.drawText('Firma de la Empresa:', {
    x: 50,
    y: height - 120,
    size: 14,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (companySignatureUrl) {
    try {
      const pngImageBytes = await fetch(companySignatureUrl).then((res) => res.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(pngImageBytes);
      const imgDims = pngImage.scale(0.5);
      
      page.drawImage(pngImage, {
        x: 50,
        y: height - 130 - imgDims.height,
        width: imgDims.width,
        height: imgDims.height,
      });
    } catch (e) {
      console.error('Error incrustando firma de empresa', e);
    }
  }

  // Hueco para la firma del Cliente/Trabajador (firma.dev)
  page.drawText('Conforme del Cliente / Trabajador:', {
    x: 300,
    y: height - 120,
    size: 14,
    color: rgb(0.2, 0.2, 0.2),
  });

  // El recuadro de firma.dev usa { x: 55, y: 9, width: 35, height: 10 } (en porcentaje)
  // X: 55% de 595.28 ~ 327
  // Y: 9% desde arriba, osea ~76 alto (firma.dev Y=0 está arriba)
  // Dejamos el recuadro visual orientativo (opcional):
  page.drawRectangle({
    x: 300,
    y: height - 250, // un poco más abajo
    width: 200,
    height: 100,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });

  const pdfBytes = await pdfDoc.saveAsBase64();
  const pageCount = pdfDoc.getPageCount();
  return { base64: pdfBytes, pageCount };
}
