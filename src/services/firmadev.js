const API_BASE = 'https://api.firma.dev/functions/v1/signing-request-api';

const getHeaders = () => ({
  'Authorization': import.meta.env.VITE_FIRMADEV_API_KEY,
  'Content-Type': 'application/json',
});

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result = "data:application/pdf;base64,JVBERi0x..."
      // firma.dev solo quiere la parte base64 sin el prefijo
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function createAndSendSigningRequest(base64Pdf, cliente, docName, pageNumber = 1, customY = 9) {
  const nameParts = (cliente.nombre || '').trim().split(' ');
  const firstName = nameParts[0] || 'Cliente';
  const lastName = nameParts.slice(1).join(' ') || '-';

  const body = {
    name: docName,
    document: base64Pdf,
    recipients: [
      {
        id: 'temp_1',
        first_name: firstName,
        last_name: lastName,
        email: cliente.email,
        designation: 'Signer',
        order: 1,
      },
    ],
    fields: [
      {
        // El bloque de firmas siempre ocupa su propia última página (pageBreakBefore: always).
        type: 'signature',
        recipient_id: 'temp_1',
        page_number: pageNumber,
        position: { x: 55, y: customY, width: 35, height: 10 },
        required: true,
      },
      {
        type: 'date',
        recipient_id: 'temp_1',
        page_number: pageNumber,
        position: { x: 55, y: customY + 11, width: 20, height: 5 },
        required: true,
        date_signing_default: true,
      },
    ],
    settings: {
      send_signing_email: true,
      send_finish_email: true,
      allow_download: true,
      attach_pdf_on_finish: true,
    },
  };

  const res = await fetch(`${API_BASE}/signing-requests/create-and-send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status} en firma.dev`);
  return data;
}

export async function checkSigningStatus(signingRequestId) {
  const res = await fetch(`${API_BASE}/signing-requests/${signingRequestId}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status} consultando firma`);
  return data;
}
