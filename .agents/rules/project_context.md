---
description: Reglas y contexto de negocio del proyecto JJ Studio (Gestión de Fotografía en Hoteles)
globs: "**/*"
---

# Proyecto JJ Studio - Contexto de Negocio y Arquitectura

Este archivo define el contexto obligatorio, la estructura de negocio, los roles y las pautas de arquitectura para el proyecto **JJ Studio**.

## 1. Naturaleza del Negocio
**JJ Studio** es una plataforma SaaS/Web de gestión operativa para una empresa de servicios de fotografía profesional que opera en cadenas de hoteles distribuidos geográficamente.

### Estructura Jerárquica:
`País` ➔ `Destino / Área` ➔ `Hotel`

- Un **País** contiene múltiples **Destinos** (ej. Cancún, Punta Cana, Tenerife).
- Un **Destino** contiene múltiples **Hoteles**.
- Los **Supervisores** y **Fotógrafos** se asignan a uno o varios hoteles (`usuario_hotel_acceso`).

---

## 2. Roles de Usuario y Permisos (RBAC & Multi-Tenant Lógico)

1. **Administrador General / Dueño (`ADMIN`)**:
   - Acceso global a todos los países, destinos, hoteles, reportes y métricas.
   - Gestión de usuarios, asignaciones, configuración de comisiones y metas globales.
2. **Gerente de Área (`GERENTE`)**:
   - Control total de la operación de su país/área asignada.
3. **Supervisor de Hotel (`SUPERVISOR`)**:
   - Gestión de agenda de sesiones y fotógrafos de sus hoteles asignados.
   - Registro y edición de ventas del hotel.
   - Visualización de metas y comisiones de su equipo.
4. **Fotógrafo (`FOTOGRAFO`)**:
   - Acceso desde móvil/web para agendar sesiones y registrar sus ventas asociadas.
   - Visualización de su propia agenda, metas personales y rendimiento. Sin acceso a información de otros hoteles.
5. **Contable (`CONTABLE`)**:
   - Acceso a datos financieros: ventas, comisiones calculadas, pagos y conciliaciones. Sin métricas operativas sensibles.

---

## 3. Módulos Funcionales Clave y Reglas de Negocio

> [!NOTE]
> Documentación detallada en la base de conocimiento del proyecto:
> - [docs/detalles_perfil_fotografos.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/detalles_perfil_fotografos.md) (Detalles de pantalla de fotógrafo, agenda completa del hotel y matriz de comisiones).
> - [docs/requisitos_y_plan_trabajo.md](file:///Users/hartumia/workspace/JJ%20Studio/docs/requisitos_y_plan_trabajo.md) (Análisis completo de requisitos, diseño DB, flujos de usuario y plan de 8 fases).

1. **Gestión de Agenda & Sesiones Fotográficas**:
   - Pantalla inicial del fotógrafo: Muestra el **calendario completo del hotel** para coordinación de equipo y evitar solapes de sesiones grandes (ej. familias de 8 pax).
   - **Datos requeridos para agendar**: Nombre cliente, Email, Teléfono/Contacto, Nº Habitación, Nº Personas, Fecha/Hora, Motivo (Boda, Familia, Pareja, Pedida de mano, Cumpleaños, Revelación género, "Otro").
   - **Control de Capacidad**: Validación del número máximo configurable de sesiones por hora/hotel.
   - **Sincronización externa**: Integración unidireccional hacia Google Calendar.
2. **Control de Ventas & Cálculo de Comisiones**:
   - Registro de ventas asociadas a sesiones, asignando fotógrafo, supervisor y agendador/captador.
   - Momento de cálculo: Al pasar el cargo a la habitación o confirmar la venta.
   - **Matriz de Comisiones Base (Ejemplo México)**:
     - **Gerente**: 2% de venta en todos los hoteles de su área.
     - **Supervisor**: 2% de la venta total de su hotel.
     - **Fotógrafo**: 14% (Asalariado con sueldo) | 20% (Sin salario / comisión pura).
     - **Vendedor / Agendador**: 6% (Asalariado) | 8% (Sin salario).
   - **Permisos de Edición**: Únicamente editable por Administrador (`ADMIN`) y Contable (`CONTABLE`) desde un panel configurable.
3. **Metas y Objetivos (KPIs)**:
   - Definición de metas mensuales por hotel y usuario. Reparto igualitario de la meta del hotel entre fotógrafos activos.
   - Indicadores semafóricos (Verde/Amarillo/Rojo) de progreso monetario y pacing diario.
4. **Dashboards & Reporting**:
   - Métricas de ventas totales, promedio por sesión, número de ventas y rendimiento por fotógrafo.
   - Vistas comparativas y reportes de cierre diario/mensual.
5. **Auditoría de Eventos**:
   - Registro de trazabilidad para cambios sensibles en ventas, sesiones y comisiones.

---

## 4. Stack Tecnológico Acordado

* **Backend**: Node.js + TypeScript, Fastify framework, Prisma ORM, MariaDB (puerto 3306), Zod para validaciones.
* **Frontend**: Vue 3 (Composition API `<script setup lang="ts">`), Element Plus + PrimeVue, Pinia para estado, Vue Router, Vite.
* **Arquitectura**: Arquitectura Hexagonal y Slices Verticales (`backend/src/features/` y `frontend/src/features/`).

---

## 5. Reglas Críticas de Entornos y Despliegue (Local vs VPS Producción)

### A. Gestión Estricta de Archivos `.env` (¡NUNCA SUBIR A GIT!):
1. **Los archivos `.env` (tanto en `backend/` como en `frontend/`) NUNCA deben incluirse en commits de Git**. Deben permanecer siempre en `.gitignore`.
2. **Entorno Local (Mac)**:
   - `backend/.env`: Contiene `DATABASE_URL="mysql://root:@localhost:3306/jj_studio"`.
   - `frontend/.env`: Contiene `VITE_API_URL=/api`.
3. **Entorno Producción (VPS Contabo con FASTPANEL)**:
   - `backend/.env`: Contiene `DATABASE_URL="mysql://jjstudio_har:JJStudio2026Pass@127.0.0.1:3306/jjstudio_har"`.
   - `frontend/.env`: Contiene `VITE_API_URL=/api`.
4. **Carga Obligatoria de `dotenv` en Backend**:
   - `backend/src/index.ts` y `backend/src/shared/db.ts` **DEBEN** importar siempre `import 'dotenv/config'` como primera línea para garantizar que PM2 y Prisma carguen las variables de entorno en producción.

### B. Configuración de Red y Proxy de Vite (Prevención de Error 502):
- En `frontend/vite.config.ts`, el target del proxy para `/api` en desarrollo local **SIEMPRE debe apuntar a la IP IPv4 directa `http://127.0.0.1:3000`** (NUNCA a `http://localhost:3000`, ya que macOS intenta resolver por IPv6 `::1` provocando errores `502 Bad Gateway`).

### C. Pipeline de Despliegue CI/CD (`.github/workflows/deploy.yml`):
- El script de despliegue en el VPS **DEBE incluir siempre**:
  1. `git config --global --add safe.directory $TARGET_DIR` para prevenir fallos por propiedad de archivos (`dubious ownership`).
  2. `npx prisma db push` en el backend para aplicar cambios de esquema a MariaDB sin resetear ni borrar datos de producción.
  3. `pnpm install` limpio (sin flags no soportados).
  4. Reinicio de proceso PM2 `jjstudio-backend`.
  5. Asignación de permisos al usuario web: `chown -R jjstudio_har_usr:jjstudio_har_usr $TARGET_DIR`.

### D. Cabeceras HTTP en Frontend y Fastify 5 (Prevenir Error 400 `FST_ERR_CTP_EMPTY_JSON_BODY`):
- **Fastify 5 (`^5.10.0`)** rechaza con `400 Bad Request (FST_ERR_CTP_EMPTY_JSON_BODY)` cualquier petición HTTP que envíe la cabecera `Content-Type: application/json` con un cuerpo (*body*) vacío (típico en peticiones `DELETE` o `GET`).
- **Regla estricta en Stores/Servicios Frontend**: NUNCA incluir `Content-Type: application/json` de forma incondicional en helpers de headers (`getHeaders`/`getAuthHeaders`). Solo añadir `Content-Type: application/json` si la petición lleva un payload (`POST`, `PUT`, `PATCH` con body). En peticiones sin body (`DELETE`, `GET`), enviar únicamente `Authorization: Bearer <token>`.

---

## 6. Instrucciones Generales para el Agente AI
- Siempre mantén la separación de responsabilidades y la restricción de visibilidad por rol y por hotel.
- No borres ni simplifiques la lógica de negocio descrita en este documento.
- Asegúrate de que las consultas y mutaciones respeten el tipado estricto de TypeScript sin usar `any`.
- Respeta estrictamente la regla de NO commitear archivos `.env` bajo ninguna circunstancia.
- Asegúrate de que las peticiones sin cuerpo (`DELETE`/`GET`) no envíen cabecera `Content-Type: application/json` para no provocar el error `400 FST_ERR_CTP_EMPTY_JSON_BODY` de Fastify 5.
