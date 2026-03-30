# produccion-asistida-gomitas

PWA mobile-first para producción guiada de gomitas, trazabilidad por lote, evidencia fotográfica y auditoría admin. Está pensada para correr en iPhone y también verse bien en desktop, con frontend estático en GitHub Pages y backend serverless en Firebase.

## Stack

- Frontend: Vite + React
- Backend: Firebase Authentication, Cloud Firestore y Firebase Storage
- Deploy frontend: GitHub Pages
- Persistencia offline UI/formularios: Firestore local cache
- PWA: `manifest.webmanifest` + `service worker`

## Módulos incluidos

1. Configuración de recetas
   - Solo admin
   - Alta y edición de recetas
   - Configuración paso a paso
   - Evidencia requerida, tolerancias, criticidad y tiempos esperados

2. Ejecución de producción
   - Inicio de lote con checklist obligatorio
   - Flujo secuencial por pasos
   - Bloqueo si falta foto o dato requerido
   - Validación de rango numérico
   - Cierre de lote con firma simple

3. Verificación / auditoría
   - Solo admin
   - Filtros por fecha, operario, receta, producto y estado
   - Detalle completo del lote en línea de tiempo
   - Revisión final y cambio de estado a aprobado / observado / rechazado

## Estructura principal

```text
.
├─ public/
│  ├─ manifest.webmanifest
│  ├─ sw.js
│  └─ icons/
├─ scripts/
│  └─ seed-demo.mjs
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ context/
│  ├─ features/
│  ├─ lib/
│  └─ styles/
├─ firestore.rules
├─ storage.rules
├─ firebase.json
└─ README.md
```

## Modelo de datos en Firestore

- `users/{uid}`
  - `fullName`, `email`, `role`, `active`, `createdAt`, `updatedAt`
- `recipes/{recipeId}`
  - `name`, `product`, `version`, `active`, `description`
- `recipes/{recipeId}/steps/{stepId}`
  - `title`, `description`, `order`, `requiresPhoto`, `evidenceText`
  - `referencePhotoUrl`, `requiresNumeric`, `unit`
  - `targetValue`, `tolerance`, `critical`, `expectedMinutes`
  - `helpText`, `outOfRangePolicy`, `expertSummary`
- `lots/{lotId}`
  - datos generales del lote
  - `checklist`
  - `mode`
  - `status`
  - `participantIds`
  - `totalDurationMinutes`
- `lots/{lotId}/steps/{stepId}`
  - snapshot del paso de receta
  - `startedAt`, `completedAt`, `durationMinutes`
  - `photos[]`
  - `numericValue`, `numericWithinRange`
  - `observations`, `overExpectedTime`
- `auditLogs/{logId}`
  - eventos de lote, pasos, recetas y usuarios
- `settings/app`
  - bootstrap inicial y ajustes globales

## Requisitos previos

- Node.js 18 o superior
- Cuenta / proyecto Firebase
- Firebase CLI

## Instalación local

1. Instalar dependencias:

```bash
npm install
```

2. El proyecto ya trae un `.env.local` funcional con la configuración que compartiste. Si querés regenerarlo:

```bash
copy .env.example .env.local
```

3. Ejecutar en desarrollo:

```bash
npm run dev
```

## Configuración Firebase

En la consola de Firebase asegurate de tener:

1. Authentication habilitado con `Email/Password`
2. Cloud Firestore creado en modo producción o test
3. Firebase Storage habilitado

Luego desplegá reglas:

```bash
firebase login
firebase use guia-de-coccion
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Seed demo

El seed crea:

- 1 admin demo
- 1 operario demo
- 1 receta demo con 8 pasos

Ejecutar:

```bash
npm run seed
```

Credenciales demo por defecto:

- Admin: `admin@gomitas-demo.local` / `DemoAdmin123!`
- Operario: `operario@gomitas-demo.local` / `DemoOperario123!`

## Build

```bash
npm run build
```

## Deploy a GitHub Pages

El repo objetivo que me pasaste es `Gastonmaluff/Guiadecoccion`, así que el script ya contempla build con base `/Guiadecoccion/`.

1. Crear build para GitHub Pages:

```bash
npm run build:pages
```

2. Publicar con rama `gh-pages`:

```bash
npm run deploy
```

3. En GitHub:
   - ir a `Settings > Pages`
   - seleccionar `Deploy from a branch`
   - elegir rama `gh-pages`
   - carpeta `/ (root)`

## Flujo recomendado de puesta en marcha

1. `npm install`
2. `firebase deploy --only firestore:rules,firestore:indexes,storage`
3. `npm run seed`
4. `npm run dev`
5. probar login con admin demo
6. revisar receta demo
7. arrancar un lote con operario demo
8. `npm run deploy`

## Comportamiento offline

- La UI y las escrituras simples a Firestore quedan cacheadas/offline gracias a persistencia local.
- Las fotos en Storage requieren conexión.
- La app muestra un mensaje claro cuando se intenta subir evidencia sin internet.

## Seguridad incluida

- Solo usuarios autenticados pueden entrar
- Admins pueden ver y editar todo
- Operarios trabajan solo sobre lotes donde participan
- Storage organiza evidencias por lote y paso
- El bootstrap del primer admin se resuelve con `settings/app` para evitar backend propio

## Extensiones ya encaminadas

- Exportación a PDF de lote
- Dashboard más avanzado
- Más de una foto por paso crítico
- Observaciones por paso
- Modo experto / aprendizaje

## Notas

- El frontend no usa backend propio, todo se resuelve con Firebase.
- La creación de usuarios por parte del admin se resuelve hoy por registro desde la app o por seed. Desde el panel admin se gestionan rol y estado.
- Para GitHub Pages se usa navegación por hash, así evitamos problemas de rutas en hosting estático.
