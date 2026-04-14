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
6. [Configurar EmailJS (Envío de Emails)](#6-configurar-emailjs-envío-de-emails)
7. [Configurar firma.dev (Firma Electrónica)](#7-configurar-firmadev-firma-electrónica)
8. [Variables de Entorno (.env)](#8-variables-de-entorno-env)
9. [Compilar y Desplegar](#9-compilar-y-desplegar)
10. [Configurar Google Calendar (Opcional)](#10-configurar-google-calendar-opcional)
11. [Gestión de Usuarios](#11-gestión-de-usuarios)
12. [Desarrollo Local con Emuladores](#12-desarrollo-local-con-emuladores)
13. [Cambiar de Cuenta en Cada Servicio](#13-cambiar-de-cuenta-en-cada-servicio)
14. [Notas y Futuro](#14-notas-y-futuro)

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

## 6. Configurar EmailJS (Envío de Emails)

EmailJS permite enviar emails directamente desde el navegador (sin servidor propio), funcionando en PC y móvil.  
**Plan gratuito:** 200 emails/mes.  
**Usado para:** enviar credenciales de acceso al portal a colaboradores.

### Paso 1: Crear cuenta y conectar servicio de email
1. Ir a [emailjs.com](https://emailjs.com) → Registrarse (gratis, sin tarjeta)
2. Panel izquierdo → **Email Services** → **Add New Service**
3. Seleccionar proveedor (ej: Gmail) → conectar con la cuenta de correo del cliente
4. Copiar el **Service ID** (ej: `service_abc1234`)

### Paso 2: Crear el template de acceso al portal
1. Panel izquierdo → **Email Templates** → **Create New Template**
2. El nombre es solo decorativo (ej: "Acceso Portal Colaboradores")
3. Configurar los campos:
   - **To email:** `{{to_email}}`
   - **From name:** `{{from_name}}`
   - **Subject:** `{{subject}}`
   - **Content:** modo texto, escribir solo: `{{message}}`
4. Guardar → copiar el **Template ID** (ej: `template_abc1234`)

### Paso 3: Obtener la Public Key
1. Panel superior derecho → **Account** → pestaña **General**
2. Sección **"API Keys"** → copiar la **Public Key**

---

## 7. Configurar firma.dev (Firma Electrónica)

firma.dev permite enviar presupuestos para que el cliente los firme electrónicamente desde su email, sin necesidad de instalar nada. El CRM lo usa en el módulo de Presupuestos → "Enviar para Firmar".

**Coste:** ~0,03 € por sobre enviado (sin suscripción mensual).  
**Plan gratuito:** No existe — cada envío tiene coste, pero se factura por uso real.

### Paso 1: Crear cuenta en firma.dev
1. Ir a [firma.dev](https://firma.dev) → Registrarse
2. Verificar el email y completar el perfil

### Paso 2: Obtener la API Key
1. Dentro del panel de firma.dev, ir a **Configuración** → **API** (o **Workspace Settings**)
2. Copiar la **API Key** del workspace (empieza por `fdk_...` o similar)
3. Esta clave identifica tu workspace y se usará para todos los envíos

### Paso 3: Configurar el template de firma (opcional pero recomendado)
El CRM envía los sobres con una firma posicionada automáticamente en la última página del PDF. No requiere configurar templates en firma.dev — el posicionamiento se hace via API directamente desde el código.

### Cómo funciona el flujo en el CRM
1. El usuario abre un presupuesto → menú "..." → **Enviar para Firmar**
2. El CRM genera el PDF, lo convierte a base64 y lo envía a la API de firma.dev
3. firma.dev envía un email al cliente con un enlace para firmar
4. El cliente firma desde su móvil o PC (sin registro)
5. El CRM permite comprobar el estado con el botón **Comprobar Firma**
6. Cuando el cliente firma, el PDF firmado se descarga automáticamente y se guarda en:
   - El presupuesto (campo `pdfFirmadoUrl`)
   - Los archivos de la obra vinculada (carpeta de documentos)

### Coste estimado
| Uso | Coste aprox. |
|---|---|
| 10 presupuestos/mes firmados | ~0,30 €/mes |
| 50 presupuestos/mes firmados | ~1,50 €/mes |
| 100 presupuestos/mes firmados | ~3,00 €/mes |

> ℹ️ Solo se cobra cuando el cliente efectivamente firma. Los envíos rechazados o no firmados también consumen crédito en el momento del envío.

### Cambiar de cuenta firma.dev (nuevo cliente)
1. Registrar una nueva cuenta en [firma.dev](https://firma.dev)
2. Obtener la nueva API Key
3. Actualizar `VITE_FIRMADEV_API_KEY` en `.env`

---

## 8. Variables de Entorno (.env)

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

# ═══════════════════════════════════════════════
# EMAILJS — Obtener del Paso 6
# ═══════════════════════════════════════════════
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx
VITE_EMAILJS_TEMPLATE_PORTAL=template_xxxxxxx

# ═══════════════════════════════════════════════
# FIRMA.DEV — Obtener del Paso 7
# ═══════════════════════════════════════════════
VITE_FIRMADEV_API_KEY=fdk_xxxxxxxxxxxxxxxxxxxxxxxx

# ═══════════════════════════════════════════════
# GOOGLE CALENDAR — Obtener del Paso 10 (Opcional)
# ═══════════════════════════════════════════════
VITE_GOOGLE_OAUTH_CLIENT_ID=XXXXXXXXX.apps.googleusercontent.com
```

> 🔒 Este archivo **NUNCA** se sube al repositorio (está en `.gitignore`). Cada entorno (dev, producción, otro cliente) tiene su propio `.env`.

---

## 9. Compilar y Desplegar

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
firebase deploy --only firestore,hosting
```

Tras ~30 segundos, la web estará disponible en:  
**`https://tu-proyecto.web.app`**

> ⚠️ Se usa `--only firestore,hosting` porque Firebase Storage no está habilitado en este proyecto (los archivos van a Cloudinary). Si se añade Storage en el futuro, usar `firebase deploy` sin flags.

---

## 10. Configurar Google Calendar (Opcional)

Esta integración permite a los empleados sincronizar su Google Calendar con el CRM (bidireccional). **Es opcional** — sin ella, el calendario del CRM funciona de forma local. **Coste: 0 €.**

> ℹ️ La integración usa **Google Identity Services (GIS)**, completamente separado de Firebase Auth. Vincular el calendario NO afecta la sesión ni el rol del usuario en el CRM.

### Paso 1: Habilitar la Google Calendar API
1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Comprobar que arriba a la izquierda está seleccionado el **proyecto correcto** (el mismo que Firebase, ej: `idg-crm`)
3. Menú lateral → **APIs y Servicios** → **Biblioteca**
4. Buscar **"Google Calendar API"** → clic → pulsar **"Habilitar"**

### Paso 2: Configurar la Pantalla de Consentimiento OAuth
1. Menú lateral → **APIs y Servicios** → **Pantalla de consentimiento de OAuth**
2. Elegir tipo de usuario:
   - **"Interno"** si la empresa usa Google Workspace (solo emails del dominio corporativo)
   - **"Externo"** si usan cuentas @gmail normales ← lo más habitual
3. Rellenar campos obligatorios:
   - **Nombre de la aplicación:** `CRM [Nombre Empresa]`
   - **Email de asistencia al usuario:** email del administrador
   - **Dominios autorizados:** `tu-proyecto.web.app`
   - **Información de contacto del desarrollador:** email del administrador
4. Pulsar **Guardar y continuar** (los Scopes se gestionan solos desde el código, no hace falta añadirlos aquí)
5. En la pantalla de **"Estado de publicación"**: pulsar **"Publicar aplicación"**
   - Esto permite que **cualquier cuenta de Google** pueda vincular su calendario, sin necesidad de añadirla como usuario de prueba
   - Es gratuito y no requiere verificación adicional para el scope de Calendar

### Paso 3: Crear la Credencial OAuth 2.0
1. Menú lateral → **APIs y Servicios** → **Credenciales**
2. Pulsar **"+ Crear credenciales"** → **"ID de cliente de OAuth 2.0"**
3. Tipo de aplicación: **"Aplicación web"**
4. Nombre: `CRM Web` (o el que quieras)
5. En **"Orígenes de JavaScript autorizados"**, añadir:
   - `http://localhost:5173` (para desarrollo local)
   - `https://tu-proyecto.web.app` (producción — sin barra final)
6. Pulsar **Crear**
7. Copiar el **ID de cliente** — tiene el formato `XXXXXXXXX.apps.googleusercontent.com`

### Paso 4: Añadir al .env
```env
VITE_GOOGLE_OAUTH_CLIENT_ID=XXXXXXXXX.apps.googleusercontent.com
```

Tras añadirlo, hacer un nuevo build y desplegar (paso 9).

### Uso por cada empleado
1. El empleado entra al CRM → pestaña **Calendario**
2. Pulsa **"Vincular Google Calendar"** → aparece el selector de cuenta de Google → acepta los permisos
3. Sus eventos de Google Calendar aparecen en el CRM automáticamente
4. Los eventos creados desde el CRM se sincronizan a Google Calendar
5. El token se renueva automáticamente sin pedirle nada al usuario

> ℹ️ Funciona tanto en localhost (desarrollo) como en producción, en cualquier navegador y dispositivo.

---

## 11. Gestión de Usuarios

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

## 12. Desarrollo Local con Emuladores

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

## 13. Cambiar de Cuenta en Cada Servicio

Cuando despliegues para un nuevo cliente, cada servicio tiene su propio proceso para obtener nuevas credenciales. Solo necesitas actualizar el archivo `.env` y hacer un nuevo build.

---

### 🔥 Firebase (base de datos + hosting)

**Cambiar de proyecto Firebase:**
```bash
# Ver proyectos vinculados
firebase projects:list

# Cambiar al proyecto del nuevo cliente
firebase use nombre-del-proyecto

# O añadir un nuevo alias
firebase use --add
```

**Obtener nuevas claves:**
1. [console.firebase.google.com](https://console.firebase.google.com) → seleccionar el proyecto
2. Icono ⚙️ → **Configuración del proyecto** → pestaña **General**
3. Sección "Tus apps" → apartado **"Configuración del SDK"** → modo **"Config"**
4. Copiar el objeto `firebaseConfig` y mapear los valores a las variables `VITE_FIREBASE_*`

**Cambiar de cuenta de Google:**
```bash
# Cerrar sesión
firebase logout

# Iniciar sesión con la nueva cuenta
firebase login
```

---

### 🖼️ Cloudinary (almacenamiento de fotos, PDFs, documentos)

**Cambiar de cuenta Cloudinary:**
1. Registrarse en [cloudinary.com](https://cloudinary.com) con la nueva cuenta
2. Dashboard → copiar el **Cloud Name**
3. Settings → Upload → crear nuevo **Upload Preset** (modo `Unsigned`)
4. Actualizar en `.env`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=nuevo_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=nuevo_preset
   ```

> ⚠️ Los archivos subidos a Cloudinary pertenecen a esa cuenta. Si cambias de cuenta, los enlaces de documentos anteriores dejarán de funcionar. Migrar archivos requiere hacerlo manualmente desde el panel de Cloudinary.

---

### ✉️ EmailJS (envío de emails a colaboradores)

**Cambiar de cuenta EmailJS:**
1. Registrarse en [emailjs.com](https://emailjs.com) con la nueva cuenta
2. Crear un nuevo servicio de email (paso 6 de esta guía)
3. Crear el template `template_portal_access` (paso 6 de esta guía)
4. Actualizar en `.env`:
   ```
   VITE_EMAILJS_SERVICE_ID=service_nuevo
   VITE_EMAILJS_PUBLIC_KEY=clave_nueva
   VITE_EMAILJS_TEMPLATE_PORTAL=template_nuevo
   ```

> ℹ️ El plan gratuito de EmailJS permite 200 emails/mes. Si el cliente envía más, considerar el plan básico (~$15/mes) o reutilizar la misma cuenta EmailJS para varios clientes (cada uno con su propio servicio de email conectado).

---

### Flujo completo para un nuevo cliente

```
1. Crear proyecto Firebase nuevo        →  obtener VITE_FIREBASE_*
2. Crear cuenta Cloudinary nueva        →  obtener VITE_CLOUDINARY_*
3. Crear cuenta (o reusar) EmailJS      →  obtener VITE_EMAILJS_*
4. Crear cuenta firma.dev nueva         →  obtener VITE_FIRMADEV_API_KEY
5. (Opcional) Configurar Google Calendar →  obtener VITE_GOOGLE_OAUTH_CLIENT_ID (Paso 10)
6. Actualizar .env con todas las claves nuevas
7. npm run build
8. firebase login  (si es otra cuenta Google)
9. firebase use --add  (seleccionar el nuevo proyecto)
10. firebase deploy --only firestore,hosting
```

---

## 14. Notas y Futuro

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

### 🤖 Atención Asistente IA (Antigravity / Claude)
Para futuros despliegues automatizados desde este entorno asistido, debido a que `npm` y `firebase` pueden no estar en el `PATH` base, **debes** usar exactamente este comando para desplegar correctamente:
```bash
PATH=/opt/homebrew/bin:$PATH zsh -c "source ~/.zshrc && npm run build && npx firebase deploy --only firestore,hosting"
```

---

*Documento generado para el proyecto CRM IDG. Última actualización: Abril 2026.*
