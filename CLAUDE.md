# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDG CRM — a construction/project management CRM for managing clients, projects (obras), budgets, invoices, purchases, materials, workers, HR, and scheduling. Built for Spanish-speaking construction companies.

**Stack:** React 19 + Vite 8 + Firebase (Firestore, Auth, Hosting) + Cloudinary (file uploads) + EmailJS (email sending) + html2pdf.js (PDF generation)

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run emulators    # Firebase emulators (Firestore :8080, Auth :9099, Storage :9199, UI :4000)
firebase deploy      # Deploy to Firebase Hosting
```

No test framework is currently configured.

## Architecture

**Monolithic SPA** with lifted state (no Redux/Context):

- `App.jsx` — Central routing hub and state owner. Holds `appData` object with all Firestore collections. Sets up real-time `onSnapshot` listeners and passes data + setters as props to pages.
- `src/services/db.js` — Firestore CRUD layer (`listenToCollection`, `saveDoc`, `deleteDoc`, `updateDoc`). All data operations go through here.
- `src/config/firebase.js` — Firebase initialization using compat SDK. Auto-connects to emulators when `import.meta.env.DEV` is true.
- `src/pages/` — 15 page modules, each a self-contained CRUD view (Clientes, Obras, Presupuestos, Facturas, Pedidos, Almacen, Proveedores, Trabajadores, RRHH, Calendario, Planificacion, Configuracion, Dashboard, Auth).
- `src/components/Layout/` — Layout wrapper + Sidebar with role-based menu filtering + NotificationBell (in-app notifications).
- `src/components/shared/` — Reusable cross-module components:
  - `SignatureCanvas.jsx` — HTML5 canvas signature capture (touch + mouse).
  - `SignatureFlow.jsx` — Wrapper for signature workflows: in-person signing or remote sending via WhatsApp/Email.
- `src/components/print/` — Shared PDF document components:
  - `PdfHeader.jsx` — Dynamic company header (reads `config.empresa`: logo, name, NIF, address).
  - `PdfFooter.jsx` — Dynamic legal footer (reads `config.empresa.pieFactura`).
- `src/utils/sendUtils.js` — Centralized WhatsApp (`openWhatsApp`) and Email (`sendEmail` via EmailJS, `openEmailComposer` as mailto fallback) utilities.
- `src/utils/mockData.js` — Seed data that auto-populates empty Firestore on first run.

**Data flow:** Firestore → `onSnapshot` listeners in App.jsx → props to pages → pages call `db.js` for writes → Firestore triggers listener → UI updates.

**Auth & RBAC:** Firebase email/password auth. Four roles (`admin`, `jefe`, `logistica`, `trabajador`) stored in `config` collection. Sidebar filters menu items by role. External collaborators (email in `obra.compartidoCon` but not in `config.usuarios`) get a restricted view with no pricing info (forced `colaboradores` mode on presupuestos).

**Key sub-components in Obras:**
- `Gantt.jsx` — Interactive Gantt chart with drag-to-move and resize handles (pointer events). Bars are draggable and resizable via left/right edge handles.
- `CarpetaObra.jsx` — File manager with timeline view merging photos, videos, and actas.
- `CarpetaColaboradores.jsx` — Collaborator management per obra with document uploads and external sharing (`compartidoCon`).
- `ActasModificacion.jsx` — Modification acts with signature capture.

**Planificacion module** (`src/pages/Planificacion/`) — Weekly board for assigning workers to obras. Rows = active obras, columns = weekdays (Mon-Fri). Workers are draggable chips. Click chip to edit hours/notes. Data stored in `planificacion` collection.

**Presupuesto modes:** Three PDF versions — `direccion` (all columns, coste prices), `cliente` (no unit price, total with IVA), `colaboradores` (no price or total columns).

## Conventions

- **UI labels in Spanish**, code identifiers in English/camelCase
- **ID prefixes:** `CLI-` (clientes), `OBR-` (obras), `PRE-` (presupuestos), `PED-` (pedidos), `MAT-` (materiales), `PROV-` (proveedores), `TRB-` (trabajadores), `EVT-` (eventos), `ACT-` (actas), `PLN-` (planificación), `COL-` (colaboradores), `NOTIF-` (notificaciones)
- **Component pattern:** Functional components with hooks. CRUD follows `openForm()` → `handleSave()` → `handleDelete()` with modal state lifted within each page component.
- **Styling:** CSS variables in `index.css` `:root` + mix of CSS classes and inline styles. Lucide React for icons.
- **Firebase compat SDK** (`firebase/compat/*`) is used throughout — not the modular SDK.
- **Environment variables** prefixed with `VITE_` (Vite requirement): Firebase credentials + Cloudinary config + EmailJS config in `.env`.

## Firestore Collections

`clientes`, `obras`, `presupuestos`, `facturas`, `pedidos`, `materiales`, `proveedores`, `trabajadores`, `registroHoras`, `documentosRRHH`, `catalogoPartidas`, `tareasDashboard`, `notificaciones`, `eventos`, `planificacion`, `config` (empresa data + usuarios with roles).

## Deployment

See `GUIA_DESPLIEGUE.md` for full Firebase project setup, Cloudinary integration, environment variables, and emulator configuration.
