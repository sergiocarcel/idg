# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDG CRM — a construction/project management CRM for managing clients, projects (obras), budgets, invoices, purchases, materials, workers, HR, and scheduling. Built for Spanish-speaking construction companies.

**Stack:** React 19 + Vite 8 + Firebase (Firestore, Auth, Hosting) + Cloudinary (file uploads) + EmailJS (email sending) + html2pdf.js (PDF generation) + firma.dev (electronic signatures)

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run emulators    # Firebase emulators (Firestore :8080, Auth :9099, Storage :9199, UI :4000)
firebase deploy --only firestore,hosting   # Deploy (Storage not enabled on this project)
```

No test framework is currently configured.

## Architecture

**Monolithic SPA** with lifted state (no Redux/Context):

- `App.jsx` — Central routing hub and state owner. Holds `appData` object with all Firestore collections. Sets up real-time `onSnapshot` listeners and passes data + setters as props to pages.
- `src/services/db.js` — Firestore CRUD layer (`listenToCollection`, `saveDoc`, `deleteDoc`, `updateDoc`). All data operations go through here.
- `src/services/firmadev.js` — firma.dev API client. Exports `blobToBase64`, `createAndSendSigningRequest`, `checkSigningStatus`. Calls `https://api.firma.dev/functions/v1/signing-request-api` directly from the frontend using `VITE_FIRMADEV_API_KEY`. No backend/Cloud Functions required — polling-based approach instead of webhooks.
- `src/config/firebase.js` — Firebase initialization using compat SDK. Auto-connects to emulators when `import.meta.env.DEV` is true.
- `src/pages/` — 16 page modules, each a self-contained CRUD view (Clientes, Obras, Presupuestos, Facturas, Pedidos, Almacen, Proveedores, Trabajadores, RRHH, Calendario, Planificacion, Configuracion, Dashboard, Auth, Portal). `Portal/PortalColaborador.jsx` is the public collaborator portal at `/portal` — no Firebase Auth required, login via email + 6-digit PIN stored in `colaboradores` collection.
- `src/components/Layout/` — Layout wrapper + Sidebar with role-based menu filtering + NotificationBell (in-app notifications).
- `src/components/shared/` — Reusable cross-module components:
  - `SignatureCanvas.jsx` — HTML5 canvas signature capture (touch + mouse).
  - `SignatureFlow.jsx` — Wrapper for signature workflows: in-person signing or remote sending via WhatsApp/Email.
- `src/components/print/` — Shared PDF document components:
  - `PdfHeader.jsx` — Dynamic company header (reads `config.empresa`: logo URL, name, NIF, address).
  - `PdfFooter.jsx` — Dynamic legal footer (reads `config.empresa.pieFactura`). `extraText` prop accepts either JSX or an HTML string (rendered via `dangerouslySetInnerHTML`) — used for condiciones generales with bold/italic formatting.
- `src/utils/sendUtils.js` — Centralized WhatsApp (`openWhatsApp`) and Email (`sendEmail` via EmailJS, `openEmailComposer` as mailto fallback) utilities.
- `src/utils/pdfUtils.js` — Two functions:
  - `generatePdfFromElement(element, filename)`: captures an already-visible DOM element as PDF blob (html2pdf.js + html2canvas, scale 2, ignores `.no-print`).
  - `generatePresupuestoPdf(ppto, data, mode)`: headless/programmatic — mounts `PresupuestoPrint` in a temporary fixed container, waits 1500ms for render, captures as PDF blob, cleans up. Use this when no preview modal is on screen.
- `src/utils/mockData.js` — Seed data that auto-populates empty Firestore on first run.

**Data flow:** Firestore → `onSnapshot` listeners in App.jsx → props to pages → pages call `db.js` for writes → Firestore triggers listener → UI updates.

**Auth & RBAC:** Firebase email/password auth. Four roles (`admin`, `jefe`, `logistica`, `trabajador`) stored in `config` collection. Sidebar filters menu items by role. External collaborators (email in `obra.compartidoCon` but not in `config.usuarios`) get a restricted view with no pricing info (forced `colaboradores` mode on presupuestos).

**Key sub-components in Obras:**
- `Gantt.jsx` — Interactive Gantt chart with drag-to-move and resize handles (pointer events). Bars are draggable and resizable via left/right edge handles.
- `CarpetaObra.jsx` — File manager with timeline view merging photos, videos, and actas. Uploads go to Cloudinary folder `obras/{obra.id}`.
- `CarpetaColaboradores.jsx` — Collaborator management per obra: document uploads (Cloudinary), folder management, and direct portal access email via EmailJS (`sendEmail` from `sendUtils.js`, template `template_vecke19`).
- `ActasModificacion.jsx` — Modification acts with signature capture.

**Planificacion module** (`src/pages/Planificacion/`) — Weekly board for assigning workers to obras. Rows = active obras, columns = weekdays (Mon-Fri). Workers are draggable chips. Click chip to edit hours/notes. Data stored in `planificacion` collection.

**Presupuesto modes:** Three PDF versions — `direccion` (all columns, coste prices), `cliente` (no unit price, total with IVA), `colaboradores` (no price or total columns).

**Presupuesto sending flow** (`Presupuestos.jsx`): Three channels available from the dropdown:
1. **Email (PDF)** — generates PDF → uploads to Cloudinary `presupuestos/{id}` → sends link via EmailJS template `template_vecke19`.
2. **WhatsApp (PDF)** — same Cloudinary upload → opens `wa.me` with pre-filled message.
3. **Enviar para Firmar** — generates PDF → converts to base64 → calls `firmadev.createAndSendSigningRequest()` → firma.dev sends signing email to client → saves `firmaRequestId`, `firmaEstado: 'enviado'`, `firmaUrl` to Firestore → optional WhatsApp link sharing. Status check via "Comprobar firma" button (polling `checkSigningStatus()`) → on completion downloads signed PDF → uploads to Cloudinary `obras/{obraId}` (or `presupuestos/{id}` if no obra) → saves `pdfFirmadoUrl` to presupuesto AND adds file entry to `obra.archivos`.

**Presupuesto–Obra linking flow:** When a presupuesto is accepted (manually via "Marcar como Aceptado" or via firma): if no `obraId`, opens `linkObraModal` to pick an obra → on confirm, writes `obraId` to presupuesto and `presupuestoId` to obra → then generates PDF `direccion` headlessly via `generatePresupuestoPdf` → uploads to Cloudinary `obras/{obraId}` → adds file entry to `obra.archivos`. If the presupuesto already has an `obraId` when accepted, the PDF generation also triggers automatically.

**Presupuesto firma fields on Firestore document:**
- `firmaRequestId` — firma.dev signing request UUID
- `firmaEstado` — `'enviado'` | `'firmado'` | `'rechazado'`
- `firmaUrl` — client signing URL (`https://app.firma.dev/signing/...`)
- `firmaFecha` — ISO date when sent
- `firmaFechaFirmado` — ISO date when signed
- `pdfFirmadoUrl` — Cloudinary URL of signed PDF

**Presupuesto conditions field:** Each presupuesto has `condicionesPresupuesto` (HTML string, supports `<b>`/`<i>` tags). In the PDF, priority is: `ppto.condicionesPresupuesto` → `config.empresa.condicionesPresupuesto` → hardcoded fallback. Both fields support bold/italic via toolbar in the editor. Templates (`plantillasPresupuesto`) also save/load `condicionesPresupuesto`.

**Facturas module** (`src/pages/Facturas/Facturas.jsx`) — Named "Análisis de Rentabilidad". Data lives on `obra.gastosReales` (not a separate collection). Each cost line: `{ concepto, base, iva, total }` — bidirectional calculation (edit base → recalculates total, edit total → recalculates base). Old data with `importe` field is normalized on read via `normalizeLine()`. Financial summary panel per obra: Ingresos Aprobados (editable, stored in `obra.ingresosAprobados`), Gastos Totales, IVA de la Obra, Beneficio Neto, IS (stored in `obra.impuestoSociedades`).

**Obras module:** Obra ID is generated from the obra name (slugified, e.g. "Reforma Cocina" → `reforma-cocina`). File uploads in `CarpetaObra` go to Cloudinary folder `obras/{obra.id}`.

**Pedidos module:** Simplified model `{ descripcion, obraId, prioridad, notas, albaranUrl, solicitante, solicitanteNombre, estado, createdAt }`. Two states: `pedido` / `entregado`. Priority: `urgente` / `no_urgente`. Solicitante auto-assigned from logged-in user.

**Plantillas de presupuesto:** Stored in `plantillasPresupuesto` Firestore collection. Created from "Guardar como Plantilla" in presupuesto dropdown. Loaded in `PresupuestoEditor` via "Cargar Plantilla" button (only shown when creating new presupuesto). Template fields: `{ id, nombre, capitulos, extras, condicionesPresupuesto, createdAt }`.

## Conventions

- **UI labels in Spanish**, code identifiers in English/camelCase
- **ID prefixes:** `CLI-` (clientes), `OBR-` (obras — now slug-based from name), `PRE-` (presupuestos), `PED-` (pedidos), `MAT-` (materiales), `PROV-` (proveedores), `TRB-` (trabajadores), `EVT-` (eventos), `ACT-` (actas), `PLN-` (planificación), `COL-` (colaboradores), `NOTIF-` (notificaciones), `TPL-` (plantillas presupuesto)
- **Component pattern:** Functional components with hooks. CRUD follows `openForm()` → `handleSave()` → `handleDelete()` with modal state lifted within each page component.
- **Styling:** CSS variables in `index.css` `:root` + mix of CSS classes and inline styles. Lucide React for icons.
- **Firebase compat SDK** (`firebase/compat/*`) is used throughout — not the modular SDK.
- **Environment variables** prefixed with `VITE_` (Vite requirement): Firebase credentials + Cloudinary config + EmailJS config + firma.dev API key in `.env`.

## Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET       # unsigned preset, allows "folder" param
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_PUBLIC_KEY
VITE_EMAILJS_TEMPLATE_PORTAL        # template_vecke19 — used for all emails (portal access + presupuestos)
VITE_FIRMADEV_API_KEY               # firma.dev workspace API key (~0.029€/envelope)
VITE_GOOGLE_OAUTH_CLIENT_ID         # OAuth 2.0 Client ID (tipo Web) de Google Cloud Console — usado por Calendario.jsx para Google Calendar via GIS (NO usa Firebase Auth signInWithPopup)
```

## Firestore Collections

`clientes`, `obras`, `presupuestos`, `facturas` (unused), `pedidos`, `materiales`, `proveedores`, `trabajadores`, `registroHoras`, `documentosRRHH`, `catalogoPartidas`, `tareasDashboard`, `notificaciones`, `eventos`, `planificacion`, `colaboradores`, `plantillasPresupuesto`, `config` (empresa data + usuarios with roles).

## Cloudinary Upload Pattern

All uploads use unsigned preset `VITE_CLOUDINARY_UPLOAD_PRESET`. The `folder` param organizes files:
- `config/` — company logo (`empresa.logoId` stores the Cloudinary URL, not base64)
- `presupuestos/{ppto.id}` — presupuesto PDFs sent via email/WhatsApp
- `obras/{obra.id}` — obra documents/photos, signed PDFs, and presupuesto-direccion PDFs generated on linking
- No `overwrite` param (not allowed with unsigned presets)

## Deployment

See `GUIA_DESPLIEGUE.md` for full Firebase project setup, Cloudinary integration, EmailJS setup, firma.dev setup, environment variables, and emulator configuration.
