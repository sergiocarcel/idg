# 🚀 Guía de Despliegue — CRM IDG

Guía completa para desplegar este CRM en un nuevo proyecto Firebase (nuevo cliente).  
**Tiempo estimado:** 20-30 minutos. **Coste:** 0 € (todo gratuito).

---

## Índice
1. [Requisitos Previos](#1-requisitos-previos)
2. [Crear Proyecto Firebase](#2-crear-proyecto-firebase)
3. [Configurar Autenticación](#3-configurar-autenticación)
4. [Configurar Firestore (Base de Datos)](#4-configurar-firestore-base-de-datos)
5. [Configurar Cloudinary (Almacenamiento)](#5-configurar-cloudinary-almacenamiento)
6. [Variables de Entorno (.env)](#6-variables-de-entorno-env)
7. [Compilar y Desplegar](#7-compilar-y-desplegar)
8. [Configurar Google Calendar (Opcional)](#8-configurar-google-calendar-opcional)
9. [Gestión de Usuarios](#9-gestión-de-usuarios)
10. [Desarrollo Local con Emuladores](#10-desarrollo-local-con-emuladores)
11. [Notas y Futuro](#11-notas-y-futuro)

---

## 1. Requisitos Previos

- **Node.js** v18+ instalado (`node -v` para comprobar)
- **npm** v9+ (viene con Node)
- **Firebase CLI** instalado globalmente:
  ```bash
  npm install -g firebase-tools
  ```
- Una **cuenta de Google** (la misma que se usará como admin)

---

## 2. Crear Proyecto Firebase

1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Pulsar **"Agregar proyecto"**
3. Nombre del proyecto: el que quieras (ej: `empresa-crm`)
4. Desactivar Google Analytics si no lo necesitas → **Crear proyecto**
5. Una vez creado, en la vista principal del proyecto:
   - Pulsar el icono **`</>`** (Web) para registrar una app web
   - Nombre: `CRM Web`
   - ✅ Marcar "Also set up Firebase Hosting"
   - Pulsar **"Registrar app"**
6. **COPIAR** las claves que aparecen (`apiKey`, `authDomain`, `projectId`, etc.) — las necesitarás en el paso 6

---

## 3. Configurar Autenticación

1. En la consola de Firebase → menú lateral → **Authentication**
2. Pulsar **"Comenzar"** (Get Started)
3. En la pestaña **Sign-in method**:
   - Habilitar **"Correo electrónico/Contraseña"** → Guardar
   - *(Opcional, para Calendar)* Habilitar **"Google"** → rellenar email de soporte → Guardar

---

## 4. Configurar Firestore (Base de Datos)

1. En la consola de Firebase → menú lateral → **Firestore Database**
2. Pulsar **"Crear base de datos"**
3. Elegir ubicación del servidor (recomendado: `europe-west1` o `eur3` para España)
4. Elegir **"Modo de producción"** → Crear
5. Las reglas de seguridad se subirán automáticamente con el deploy (archivo `firestore.rules` del repo)

> ⚠️ El archivo `firestore.rules` del proyecto ya está configurado para permitir lectura/escritura a cualquier usuario autenticado. Para más restricciones, editar ese archivo.

---

## 5. Configurar Cloudinary (Almacenamiento de Archivos)

Usamos Cloudinary en vez de Firebase Storage para evitar el plan Blaze (de pago).  
**Plan gratuito:** 25 GB de almacenamiento + 25 GB de ancho de banda mensual.

1. Ir a [cloudinary.com](https://cloudinary.com) → Registrarse (gratis, sin tarjeta)
2. Una vez dentro del Dashboard, copiar el **Cloud Name** (ej: `dwilhw9eh`)
3. Ir a **Settings** → pestaña **Upload**
4. Buscar la sección **"Upload presets"** → pulsar **"Add upload preset"**
5. Configurar:
   - **Upload preset name:** el que quieras (ej: `crmpreset`)
   - **Signing Mode:** `Unsigned` ← **MUY IMPORTANTE**
   - Guardar
6. Anotar el nombre del preset — lo necesitarás en el paso 6

---

## 6. Variables de Entorno (.env)

Crear (o modificar) el archivo **`.env`** en la raíz del proyecto con las claves del nuevo cliente:

```env
# ═══════════════════════════════════════════════
# FIREBASE — Obtener del Paso 2 (Configuración de la Web App)
# ═══════════════════════════════════════════════
VITE_FIREBASE_API_KEY=AIzaSy_TU_CLAVE_AQUI
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxx

# ═══════════════════════════════════════════════
# CLOUDINARY — Obtener del Paso 5
# ═══════════════════════════════════════════════
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_preset
```

> 🔒 Este archivo **NUNCA** se sube al repositorio (está en `.gitignore`). Cada entorno (dev, producción, otro cliente) tiene su propio `.env`.

---

## 7. Compilar y Desplegar

### Primera vez (vincular el proyecto Firebase al repo local)
```bash
# Loguearse con la cuenta Google del nuevo cliente
firebase login

# Vincular el proyecto (seleccionar el creado en el Paso 2)
firebase use --add
```

### Cada vez que se quiera actualizar la web
```bash
# 1. Empaquetar el código
npm run build

# 2. Subir a los servidores de Google
npx firebase deploy --only hosting
```

Tras ~30 segundos, la web estará disponible en:  
**`https://tu-proyecto.web.app`**

Para subir también las reglas de Firestore:
```bash
npx firebase deploy
```

---

## 8. Configurar Google Calendar (Opcional)

Esta integración permite a los empleados sincronizar su calendario de Google con el CRM (bidireccional). **Es opcional** — sin ella, el calendario del CRM funciona de forma local.

### Paso 1: Habilitar la API de Calendar en Google Cloud
1. Ir a [console.cloud.google.com](https://console.cloud.google.com) con la cuenta del proyecto
2. Comprobar que arriba a la izquierda está seleccionado el proyecto correcto (mismo que en Firebase)
3. Menú lateral → **APIs y Servicios** → **Biblioteca**
4. Buscar **"Google Calendar API"** → clic → pulsar **"Habilitar"**

### Paso 2: Configurar la Pantalla de Consentimiento OAuth
1. Menú lateral → **APIs y Servicios** → **Pantalla de consentimiento de OAuth**
2. Elegir tipo:
   - **"Interno"** si la empresa usa Google Workspace (solo emails corporativos pueden vincular)
   - **"Externo"** si usan cuentas @gmail normales
3. Rellenar campos obligatorios:
   - **Nombre de la aplicación:** `CRM [Nombre Empresa]`
   - **Email de asistencia:** email del administrador
   - **Dominios autorizados:** `tu-proyecto.web.app`
4. En **Scopes (Permisos)** → "Añadir o quitar scopes" → añadir:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Guardar y continuar

### Paso 3: Habilitar Google como proveedor en Firebase Auth
1. [console.firebase.google.com](https://console.firebase.google.com) → tu proyecto
2. **Authentication** → **Sign-in method** → proveedor **"Google"** → Activar → Guardar

### Uso por cada empleado
1. El empleado entra al CRM → pestaña **"Calendario"**
2. Pulsa **"Vincular Google"** → acepta los permisos
3. Sus eventos de Google Calendar aparecen automáticamente en el CRM
4. Los eventos creados desde el CRM se sincronizan a su móvil

> ⚠️ La vinculación solo funciona desde la URL de producción (`https://...web.app`), NO en localhost.

---

## 9. Gestión de Usuarios

El CRM NO tiene un panel de auto-registro público. Los usuarios se crean manualmente:

### Dar acceso a un nuevo empleado (30 segundos)

**Paso 1 — Crear la cuenta en Firebase:**
1. [console.firebase.google.com](https://console.firebase.google.com) → **Authentication** → **Users**
2. Pulsar **"Agregar usuario"**
3. Introducir email (ej: `juan@empresa.es`) y contraseña
4. No hace falta que el email exista; Firebase lo usa solo como identificador

**Paso 2 — Asignar permisos en el CRM:**
1. Entrar al CRM como Administrador
2. Ir a **Configuración** → pestaña **Usuarios y Permisos**
3. Pulsar "Crear Acceso" → poner el **mismo email exacto** del Paso 1
4. Asignar rol (Jefe de Obra, Logística, Trabajador, etc.)

---

## 10. Desarrollo Local con Emuladores

Para trabajar en local sin tocar la base de datos real:

```bash
# Terminal 1: Arrancar los emuladores de Firebase
npm run emulators

# Terminal 2: Arrancar el servidor de desarrollo
npm run dev
```

- La app estará en `http://localhost:5173`
- Panel de emuladores en `http://localhost:4000`
- Los datos del emulador son efímeros (se borran al cerrar)

---

## 11. Notas y Futuro

### Almacenamiento de Vídeo
Los 25 GB gratuitos de Cloudinary son suficientes para PDFs y fotos, pero si el equipo sube vídeos pesados (4K, tours), se agotarán rápido. Opciones:
1. **YouTube Oculto (Recomendado, 100% gratis):** Subir vídeos como "Ocultos" a YouTube y pegar el enlace en las notas de la obra
2. **Google Drive:** Si la empresa tiene Google Workspace (2TB+), usar carpetas compartidas de Drive
3. **Cloudinary/Firebase de pago:** Escalar a planes por uso (solo si hay volumen justificado)

### Estructura de archivos clave
```
├── .env                    ← 🔑 Claves del cliente (NO se sube a git)
├── firebase.json           ← Configuración de hosting y emuladores
├── firestore.rules         ← Reglas de seguridad de la BBDD
├── storage.rules           ← Reglas de Storage (no usado activamente)
├── src/
│   ├── config/firebase.js  ← Inicialización de Firebase (lee el .env)
│   ├── services/db.js      ← Funciones CRUD reutilizables
│   ├── pages/              ← Todos los módulos del CRM
│   └── App.jsx             ← Estado global + listeners Firestore
└── dist/                   ← Build de producción (se genera con npm run build)
```

---

*Documento generado para el proyecto CRM IDG. Última actualización: Marzo 2026.*
