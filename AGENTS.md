# AGENTS.md - Proyecto JJ Studio

Este archivo contiene el contexto del proyecto, la arquitectura tecnológica, los requisitos funcionales y las directrices críticas de despliegue para asistentes de IA y desarrolladores.

## 📌 Resumen del Proyecto
**JJ Studio** es un sistema Web/SaaS de gestión operativa y comercial para una empresa de servicios de fotografía en cadenas hoteleras.

### Estructura Jerárquica:
`País` ➔ `Destino / Área` ➔ `Hotel`

---

## 👥 Roles y Niveles de Acceso
1. **Administrador (`ADMIN`)**: Acceso total global (países, destinos, hoteles, reportes, usuarios, comisiones, metas).
2. **Gerente de Área (`GERENTE`)**: Gestión y supervisión de su zona/país asignado (usuarios, agenda, comisiones, metas).
3. **Supervisor de Hotel (`SUPERVISOR`)**: Agenda, fotógrafos, ventas y metas de su hotel.
4. **Fotógrafo (`FOTOGRAFO`)**: Acceso móvil/web a su agenda, ventas registradas y metas personales.
5. **Contable (`CONTABLE`)**: Consulta de ventas, comisiones y liquidación de pagos.

---

## 🚀 Stack Tecnológico
* **Backend**: Node.js + TypeScript, Fastify, Prisma ORM, MariaDB (localhost:3306), Zod, dotenv.
* **Frontend**: Vue 3 (`<script setup lang="ts">`), Element Plus + PrimeVue, Lucide Icons (`@lucide/vue`), Pinia, Vue Router, Vite.
* **Estilo Arquitectónico**: Slices Verticales y Arquitectura Hexagonal.

---

## 🎨 Estándares de Diseño UX/UI (Clean & Minimalist SaaS)
Todas las pantallas del sistema deben seguir las directrices globales de [.agents/rules/ux-design-rules.md](file:///.agents/rules/ux-design-rules.md):
* **Estilo:** Clean Design, minimalista, espaciado generoso y libre de fatiga de cajas (*Anti-Card Fatigue*).
* **Anatomía:** `.page-header` con H1 (1.8rem) + subtítulo + acción principal, `.toolbar-bar` con buscador/filtros en una fila y `.table-card` / `.matrix-card` con bordes sutiles.
* **Data-First:** Tipografía grande para números/porcentajes (`text-3xl`/`text-4xl`) contigua a controles fluidos (`el-slider`/`el-progress`).
* **Tokens Semánticos:** Colores por rol (Fotógrafo: esmeralda, Vendedor: azul, Supervisor: ámbar, Gerente: coral) y soporte Light/Dark (`--app-bg`, `--heading-color`, etc.).


---

## 📄 Requisitos Funcionales del Documento
- **Gestión de Agenda**: Registro de sesiones con límite configurable por hora/hotel y sincronización unidireccional a Google Calendar.
- **Ventas y Comisiones**: Registro de ventas asignando fotógrafo, supervisor y agendador, con cálculo automático de comisiones variables.
- **Metas y Objetivos**: Indicadores semafóricos (verde/rojo) del progreso de ventas vs metas mensuales por hotel y usuario.
- **Reporting y Auditoría**: Dashboards por rol y log de auditoría para cambios sensibles.

---

## 📚 Base de Conocimiento del Proyecto (`docs/`)
- **[docs/guia_iconos_lucide.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/guia_iconos_lucide.md)**: Guía y ejemplos de uso de la librería de iconos Lucide (`@lucide/vue`) en componentes Vue y Element Plus.
- **[docs/detalles_perfil_fotografos.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/detalles_perfil_fotografos.md)**: Requisitos acordados para el módulo de fotógrafos, visibilidad completa del calendario del hotel, datos mínimos para agendar sesiones y la matriz de comisiones (incluyendo tabla de porcentajes para México).
- **[docs/requisitos_y_plan_trabajo.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/requisitos_y_plan_trabajo.md)**: Documento integral de análisis de requisitos, arquitectura de base de datos (ERD), flujos de usuario detallados y plan de desarrollo en 8 fases.
- **[docs/arquitectura_seguridad_y_cifrado.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/arquitectura_seguridad_y_cifrado.md)**: Arquitectura de seguridad, cifrado AES-256-GCM de datos sensibles (usuarios y sesiones), blind indexing HMAC-SHA256 y hashing de contraseñas con bcrypt.
- **[docs/configuracion_servicio_email_y_dominios.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/configuracion_servicio_email_y_dominios.md)**: Guía paso a paso para la configuración del servicio de correo Postfix, registros DNS (A, SPF), SSL en FastPanel y migración de dominios.
- **[Control_acceso segun roles.md](file:///Users/hartumia/workspace/JJ%20Studio/Control_acceso%20segun%20roles.md)**: Resumen de la matriz de permisos RBAC y multi-tenancy.

---

## ⚠️ Reglas Inviolables de Entornos y Despliegue (Local vs VPS Producción)

### 1. Gestión de `.env` (NUNCA SUBIR A GIT):
- Los archivos `.env` deben estar SIEMPRE en `.gitignore` tanto en `backend/` como en `frontend/`.
- **Local (Mac)**: `backend/.env` tiene `DATABASE_URL="mysql://root:@localhost:3306/jj_studio"`.
- **Producción (VPS)**: `backend/.env` tiene `DATABASE_URL="mysql://jjstudio_har:JJStudio2026Pass@127.0.0.1:3306/jjstudio_har"`.
- `backend/src/index.ts` y `backend/src/shared/db.ts` deben importar SIEMPRE `import 'dotenv/config'` como primera línea.

### 2. Configuración de Proxy Vite (Prevenir Error 502):
- En `frontend/vite.config.ts`, el target del proxy para `/api` debe ser SIEMPRE `http://127.0.0.1:3000` (IPv4 explícito) para evitar que macOS intente resolver por IPv6 `::1`.

### 3. Pipeline CI/CD GitHub Actions (`deploy.yml`):
- Debe incluir siempre `git config --global --add safe.directory $TARGET_DIR`.
- Debe ejecutar `npx prisma db push` en el backend para aplicar cambios de esquema a MariaDB automáticamente sin alterar datos existentes.

### 4. Cabeceras HTTP en Frontend y Fastify 5 (Prevenir Error 400 `FST_ERR_CTP_EMPTY_JSON_BODY`):
- **Fastify 5 (`^5.10.0`)** rechaza con `400 Bad Request (FST_ERR_CTP_EMPTY_JSON_BODY)` cualquier petición HTTP que envíe la cabecera `Content-Type: application/json` con un cuerpo (*body*) vacío (típico en peticiones `DELETE` o `GET`).
- **Regla estricta en Stores/Servicios Frontend**: NUNCA incluir `Content-Type: application/json` de forma incondicional en helpers de headers (`getHeaders`/`getAuthHeaders`). Solo añadir `Content-Type: application/json` si la petición lleva un payload (`POST`, `PUT`, `PATCH` con body). En peticiones sin body (`DELETE`, `GET`), enviar únicamente `Authorization: Bearer <token>`.

---

## 🧼 Disciplina de Código, No-Sobreingeniería y Cero Código Muerto (Reglas Obligatorias)

1. **Reutilizar antes de inventar:**
   - Antes de escribir lógica nueva, componentes o alterar APIs, inspecciona cómo están resueltos problemas idénticos en otras pantallas del proyecto (ej. cómo `UsuariosView.vue` renderiza avatares, cómo se consumen los stores de Pinia, etc.).
   - Copia y adapta patrones probados existentes en vez de diseñar soluciones paralelas o custom.

2. **Principio de mínima intervención (No-Sobreingeniería):**
   - **NUNCA** modificar esquemas de BD, modelos ni endpoints del backend si la información requerida ya está disponible o es accesible desde el cliente (ej. en stores de Pinia precargados).
   - Mantén los cambios acotados únicamente al componente o función que requiere la mejora.

3. **Cero código muerto ni residuos (Zero Dead Code):**
   - Al refactorizar o sustituir una implementación por otra (ej. reemplazar un `div` con estilos custom por un `<el-avatar>`), **debes eliminar inmediatamente**:
     - Clases CSS, variables o animaciones que hayan quedado sin uso.
     - Imports de utilidades, funciones o iconos que ya no se llamen.
     - Métodos, propiedades reactivas (`ref`/`reactive`) o helpers huérfanos.
   - **Prohibido** dejar estilos huérfanos o funciones obsoletas "por si acaso". El código debe quedar limpio y pulido al terminar cada cambio.


---

## 🛠️ Comandos Principales
```bash
# Servidor MariaDB en Mac (automático)
brew services start mariadb

# Backend (Fastify + Prisma)
cd backend && pnpm dev

# Frontend (Vue 3 + Vite)
cd frontend && pnpm dev
```
