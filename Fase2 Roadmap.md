# 🚀 CRM Fase 2 — Plan de Mejora y Comercialización (v2)

## Estado Actual (Fase 1 completada)


| Módulo                                                             | Estado |
| ------------------------------------------------------------------- | ------ |
| Dashboard (tareas, eventos, alertas)                                | ✅     |
| Clientes                                                            | ✅     |
| Obras (docs, colaboradores, actas, Gantt)                           | ✅     |
| Presupuestos (PDF, email, WhatsApp, firma electrónica, plantillas) | ✅     |
| Facturación                                                        | ✅     |
| Planificación (asignación, duplicar día/semana)                  | ✅     |
| Pedidos (notificaciones, albaranes)                                 | ✅     |
| Almacén / Proveedores                                              | ✅     |
| Calendario (Google Calendar sync)                                   | ✅     |
| Trabajadores / Gestión y RRHH                                      | ✅     |
| Configuración (empresa, usuarios, roles)                           | ✅     |
| Portal externo colaboradores                                        | ✅     |
| White-label (configurable por env)                                  | ✅     |

---

## Bloque 1: Mejoras Técnicas y Arquitectura

### 1.1 🔐 Gestión de Usuarios desde el CRM (Spark / Blaze configurable)

**Problema actual:** Los usuarios se crean a mano en Firebase Console → Authentication. Esto es un paso fuera del CRM que genera fricción y requiere conocimientos técnicos.

**Solución:** Hacer que el plan de Firebase sea configurable. Si el cliente usa Blaze (de pago), el CRM puede crear/eliminar usuarios directamente. Si usa Spark (gratuito), se mantiene el flujo manual actual.

#### Implementación técnica

**Nueva variable de entorno:**

<pre><div node="[object Object]" class="relative whitespace-pre-wrap word-break-all my-2 rounded-lg bg-list-hover-subtle border border-gray-500/20"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-gray-500/20 px-2 py-0.5"><div class="font-sans text-sm text-ide-text-color opacity-60">env</div><div class="flex flex-row gap-2 justify-end"><div class="cursor-pointer opacity-70 hover:opacity-100"></div></div></div><div class="p-3"><div class="w-full h-full text-xs cursor-text"><div class="code-block"><div class="code-line" data-line-number="1" data-line-start="1" data-line-end="1"><div class="line-content"><span class="mtk1"># Modo de gestión de usuarios:</span></div></div><div class="code-line" data-line-number="2" data-line-start="2" data-line-end="2"><div class="line-content"><span class="mtk1">#   spark  = gratuito, usuarios se crean manualmente en Firebase Console</span></div></div><div class="code-line" data-line-number="3" data-line-start="3" data-line-end="3"><div class="line-content"><span class="mtk1">#   blaze  = de pago, usuarios se crean/eliminan desde el propio CRM</span></div></div><div class="code-line" data-line-number="4" data-line-start="4" data-line-end="4"><div class="line-content"><span class="mtk1">VITE_FIREBASE_MODE=spark</span></div></div></div></div></div></div></pre>

**Modo Spark (actual, sin cambios):**

* El botón "Nuevo Usuario" en Configuración solo guarda el rol en Firestore
* Se muestra el aviso actual: "Crea la cuenta en Firebase Console"
* 0 € de coste de infraestructura

**Modo Blaze (nuevo):**

* Se despliega una **Cloud Function** (`createUser`, `deleteUser`) que usa el Admin SDK
* El botón "Nuevo Usuario" incluye campo de contraseña y crea la cuenta directamente
* El botón "Eliminar" borra tanto el rol como la cuenta de Firebase Auth
* También permite resetear contraseña desde el CRM
* Coste: \~0 € real (Cloud Functions gratis hasta 2M invocaciones/mes, pero requiere tarjeta)

**Arquitectura:**

<pre><div node="[object Object]" class="relative whitespace-pre-wrap word-break-all my-2 rounded-lg bg-list-hover-subtle border border-gray-500/20"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-gray-500/20 px-2 py-0.5"><div class="font-sans text-sm text-ide-text-color opacity-60"></div><div class="flex flex-row gap-2 justify-end"><div class="cursor-pointer opacity-70 hover:opacity-100"></div></div></div><div class="p-3"><div class="w-full h-full text-xs cursor-text"><div class="code-block"><div class="code-line" data-line-number="1" data-line-start="1" data-line-end="1"><div class="line-content"><span class="mtk1">┌─────────────────────────────────────────────────┐</span></div></div><div class="code-line" data-line-number="2" data-line-start="2" data-line-end="2"><div class="line-content"><span class="mtk1">│  CRM (Frontend)                                 │</span></div></div><div class="code-line" data-line-number="3" data-line-start="3" data-line-end="3"><div class="line-content"><span class="mtk1">│                                                 │</span></div></div><div class="code-line" data-line-number="4" data-line-start="4" data-line-end="4"><div class="line-content"><span class="mtk1">│  if VITE_FIREBASE_MODE === 'blaze'              │</span></div></div><div class="code-line" data-line-number="5" data-line-start="5" data-line-end="5"><div class="line-content"><span class="mtk1">│    → POST /createUser → Cloud Function          │</span></div></div><div class="code-line" data-line-number="6" data-line-start="6" data-line-end="6"><div class="line-content"><span class="mtk1">│    → POST /deleteUser → Cloud Function          │</span></div></div><div class="code-line" data-line-number="7" data-line-start="7" data-line-end="7"><div class="line-content"><span class="mtk1">│    → POST /resetPassword → Cloud Function       │</span></div></div><div class="code-line" data-line-number="8" data-line-start="8" data-line-end="8"><div class="line-content"><span class="mtk1">│  else                                           │</span></div></div><div class="code-line" data-line-number="9" data-line-start="9" data-line-end="9"><div class="line-content"><span class="mtk1">│    → Solo guarda rol en Firestore (actual)       │</span></div></div><div class="code-line" data-line-number="10" data-line-start="10" data-line-end="10"><div class="line-content"><span class="mtk1">│    → Muestra mensaje: "Crea cuenta en Console"  │</span></div></div><div class="code-line" data-line-number="11" data-line-start="11" data-line-end="11"><div class="line-content"><span class="mtk1">└─────────────────────────────────────────────────┘</span></div></div><div class="code-line" data-line-number="12" data-line-start="12" data-line-end="12"><div class="line-content"><span class="mtk1">         │</span></div></div><div class="code-line" data-line-number="13" data-line-start="13" data-line-end="13"><div class="line-content"><span class="mtk1">         ▼</span></div></div><div class="code-line" data-line-number="14" data-line-start="14" data-line-end="14"><div class="line-content"><span class="mtk1">┌─────────────────────────────────────────────────┐</span></div></div><div class="code-line" data-line-number="15" data-line-start="15" data-line-end="15"><div class="line-content"><span class="mtk1">│  Cloud Functions (solo se despliegan en Blaze)   │</span></div></div><div class="code-line" data-line-number="16" data-line-start="16" data-line-end="16"><div class="line-content"><span class="mtk1">│                                                 │</span></div></div><div class="code-line" data-line-number="17" data-line-start="17" data-line-end="17"><div class="line-content"><span class="mtk1">│  createUser(email, password, displayName)        │</span></div></div><div class="code-line" data-line-number="18" data-line-start="18" data-line-end="18"><div class="line-content"><span class="mtk1">│    → admin.auth().createUser(...)               │</span></div></div><div class="code-line" data-line-number="19" data-line-start="19" data-line-end="19"><div class="line-content"><span class="mtk1">│    → Devuelve uid                               │</span></div></div><div class="code-line" data-line-number="20" data-line-start="20" data-line-end="20"><div class="line-content"><span class="mtk1">│                                                 │</span></div></div><div class="code-line" data-line-number="21" data-line-start="21" data-line-end="21"><div class="line-content"><span class="mtk1">│  deleteUser(uid)                                │</span></div></div><div class="code-line" data-line-number="22" data-line-start="22" data-line-end="22"><div class="line-content"><span class="mtk1">│    → admin.auth().deleteUser(uid)               │</span></div></div><div class="code-line" data-line-number="23" data-line-start="23" data-line-end="23"><div class="line-content"><span class="mtk1">│                                                 │</span></div></div><div class="code-line" data-line-number="24" data-line-start="24" data-line-end="24"><div class="line-content"><span class="mtk1">│  resetPassword(email)                            │</span></div></div><div class="code-line" data-line-number="25" data-line-start="25" data-line-end="25"><div class="line-content"><span class="mtk1">│    → admin.auth().generatePasswordResetLink(...) │</span></div></div><div class="code-line" data-line-number="26" data-line-start="26" data-line-end="26"><div class="line-content"><span class="mtk1">└─────────────────────────────────────────────────┘</span></div></div></div></div></div></div></pre>

**Cambios en la UI de Configuración → Usuarios:**


| Acción              | Spark                               | Blaze                                                       |
| -------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Crear usuario        | Solo rol + aviso "crea en Console"  | Formulario completo: email + contraseña + rol → crea todo |
| Eliminar usuario     | Solo rol + aviso "borra en Console" | Elimina rol + cuenta Auth                                   |
| Resetear contraseña | No disponible                       | Envía email de reset desde el CRM                          |
| Suspender/reactivar  | Solo toggle visual en Firestore     | Toggle + deshabilitar cuenta en Auth                        |

* **Impacto comercial:** 🔴 Crítico — elimina la mayor barrera de adopción
* **Esfuerzo:** 2 días (Cloud Functions + UI condicional)

---

### 1.2 🔔 Notificaciones In-App

* Campana 🔔 en el header con badge de pendientes
* Notificar: pedidos nuevos, presupuestos firmados, documentos por caducar, tareas asignadas
* Opcionalmente en Blaze: push notifications con Firebase Cloud Messaging
* **Impacto:** 🔴 Alto
* **Esfuerzo:** 2 días

### 1.3 🔍 Búsqueda Global (Cmd+K)

* Barra de búsqueda tipo Spotlight que busque en clientes, obras, presupuestos, trabajadores...
* Acceso rápido con atajo de teclado
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 1 día

### 1.4 📤 Exportación de Datos (Excel/CSV)

* Botón "Exportar" en cada tabla del CRM
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 0.5 días

### 1.5 📝 Historial de Actividad (Logs)

* etRegistro automático de cambios: quién, qué, cuándo
* Timeline visible en cada entidad
* **Impacto:** 🟢 Bajo-medio
* **Esfuerzo:** 2 días

---

## Bloque 2: Nuevas Funcionalidades (diferenciadores)

### 2.1 📊 Informes y Analítica

* Dashboard avanzado con gráficos: facturación mensual, obras activas vs cerradas, horas por empleado
* Comparativa año anterior vs actual
* Exportar informes a PDF
* **Impacto:** 🔴 Crítico — lo primero que pregunta un gerente
* **Esfuerzo:** 2-3 días

### 2.2 💰 Control de Rentabilidad por Obra

* Presupuesto aceptado vs gastos reales (pedidos + horas × coste/hora + facturas proveedor)
* Indicador visual: 🟢 margen sano / 🟡 ajustado / 🔴 pérdidas
* "Esta obra lleva 8.400€ de 12.000€ (70%)"
* **Impacto:** 🔴 Crítico — el killer feature para construcción
* **Esfuerzo:** 2-3 días

### 2.3 📋 Partes de Trabajo Diarios

* El trabajador registra cada día: horas por obra, materiales, incidencias
* El jefe valida/aprueba los partes
* Cruce automático con Planificación para detectar desvíos
* **Impacto:** 🔴 Alto
* **Esfuerzo:** 2 días

### 2.4 🧾 Facturación Auto desde Presupuesto

* Presupuesto aceptado → generar factura automáticamente (o parciales/certificaciones)
* Numeración configurable (ej: `F-2026/001`)
* Series: factura, rectificativa, proforma
* **Impacto:** 🟡 Alto
* **Esfuerzo:** 2 días

### 2.5 📨 Pipeline Comercial (CRM de Ventas Ligero)

* Kanban: Contacto → Visita → Presupuesto → Aceptado → En obra
* Seguimiento de leads con recordatorios
* Métricas: ratio conversión, valor medio
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 2-3 días

### 2.6 🗓️ Vista "Mi Día" (Agenda Personal)

* Para rol trabajador: mis obras, mis pedidos, mis partes
* Acceso simplificado sin ver todo el CRM
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 1 día

### 2.7 📱 PWA Mejorada + Cámara

* Offline mode con Service Worker
* Cámara rápida: foto → subir como albarán o doc de obra
* Icono propio en homescreen
* **Impacto:** 🔴 Alto
* **Esfuerzo:** 3-4 días

---

## Bloque 3: Experiencia y Personalización

### 3.1 🎨 Temas de Color Configurables

* En Configuración: elegir color principal (sidebar, botones, acentos)
* Dark mode / Light mode
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 1 día

### 3.2 📐 Dashboard Personalizable

* Elegir qué widgets ver, arrastrar/reordenar
* Distintos dashboards por rol
* **Impacto:** 🟢 Bajo
* **Esfuerzo:** 2 días

### 3.3 🔔 Email Resumen Semanal

* Cada lunes: resumen automático al admin (obras, presupuestos, caducidades)
* Requiere Cloud Function (solo Blaze)
* **Impacto:** 🟡 Medio
* **Esfuerzo:** 1-2 días

### 3.4 🌐 Multi-idioma (i18n)

* Inglés, francés, portugués
* Archivo JSON de traducciones + hook `useTranslation`
* **Impacto:** 🟡 Medio — abre mercado internacional
* **Esfuerzo:** 3-4 días

---

## Bloque 4: Preparación Comercial (al final, cuando todo esté listo)

> Se hace al final porque las funcionalidades nuevas cambian lo que se muestra y se vende.

### 4.1 Demo Online Pública

* Proyecto Firebase aparte con datos ficticios
* URL tipo `demo.tucrm.es`, acceso sin registro
* **Esfuerzo:** 0.5 días

### 4.2 Landing Page / Web de Venta

* Página estática con screenshots actualizados, lista de funcionalidades, precios, formulario de contacto
* **Esfuerzo:** 1 día

### 4.3 Onboarding Guiado

* Wizard de primera configuración + tour interactivo con tooltips
* **Esfuerzo:** 1-2 días

### 4.4 Manual de Usuario

* Documentación PDF/web con capturas de cada módulo
* **Esfuerzo:** 1 día

---

## Orden de Implementación Recomendado


| Fase         | Qué                                 | Esfuerzo  | Bloque |
| ------------ | ------------------------------------ | --------- | ------ |
| **Sprint 1** | Gestión Usuarios Spark/Blaze        | 2 días   | B1     |
| **Sprint 1** | Exportar Excel/CSV                   | 0.5 días | B1     |
| **Sprint 1** | Búsqueda Global (Cmd+K)             | 1 día    | B1     |
| **Sprint 2** | Informes y Analítica                | 2-3 días | B2     |
| **Sprint 2** | Rentabilidad por Obra                | 2-3 días | B2     |
| **Sprint 3** | Partes de Trabajo                    | 2 días   | B2     |
| **Sprint 3** | Notificaciones In-App                | 2 días   | B1     |
| **Sprint 4** | Facturación auto                    | 2 días   | B2     |
| **Sprint 4** | Temas de color                       | 1 día    | B3     |
| **Sprint 5** | Pipeline Comercial                   | 2-3 días | B2     |
| **Sprint 5** | Vista "Mi Día"                      | 1 día    | B2     |
| **Sprint 6** | PWA + Cámara                        | 3-4 días | B2     |
| **Sprint 7** | Historial de Actividad               | 2 días   | B1     |
| **Sprint 7** | Email resumen semanal                | 1-2 días | B3     |
| **Sprint 8** | Multi-idioma                         | 3-4 días | B3     |
| **Sprint 9** | Demo + Landing + Onboarding + Manual | 3-4 días | B4     |

**Total estimado: \~32-40 días de desarrollo**

---

## Modelo de Pricing (actualizado con planes)


| Plan             | Precio/mes          | Firebase        | Gestión Usuarios | Extras                                      |
| ---------------- | ------------------- | --------------- | ----------------- | ------------------------------------------- |
| **Starter**      | 49 €/mes           | Spark (gratis)  | Manual (Console)  | 3 usuarios, todos módulos core             |
| **Professional** | 99 €/mes           | Spark (gratis)  | Manual (Console)  | 10 usuarios, firma electrónica, portal     |
| **Premium**      | 149 €/mes          | Blaze (tarjeta) | Desde el CRM ✅   | 20 usuarios, informes, push notifications   |
| **Enterprise**   | 249 €/mes          | Blaze (tarjeta) | Desde el CRM ✅   | Ilimitado, pipeline, email semanal, soporte |
| **Setup**        | 299-499 € (único) | —              | —                | Configuración, logo, formación 1h         |

> En la práctica, el plan Blaze de Firebase sale a 0€ para casi todos los usos (el tier gratuito incluye 50K lecturas/día, 2M invocaciones Cloud Functions/mes). Solo requiere tener una tarjeta asociada.
