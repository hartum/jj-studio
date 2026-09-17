# Graph Report - JJ Studio  (2026-09-17)

## Corpus Check
- 140 files · ~236,482 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1235 nodes · 1710 edges · 83 communities (72 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b59eebfc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- encryption.ts
- dependencies
- UsuarioFormView.vue
- devDependencies
- HotelCalendarMobile.vue
- PhotoSessionFormMobile.vue
- HotelFormView.vue
- GoalFormView.vue
- HotelCalendarDesktop.vue
- EmailTemplatesView.vue
- reminder.service.ts
- PaisesConfig.vue
- SaleAppointmentFormMobile.vue
- AuditLogTab.vue
- SaleAppointmentFormDesktop.vue
- ComisionesConfig.vue
- App.vue
- 1. Requisitos Funcionales
- vue
- PhotoSessionFormDesktop.vue
- CalendarioLaboral.vue
- compilerOptions
- Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones
- user.model.ts
- dependencies
- goal.routes.ts
- tsconfig.app.json
- AGENTS.md - Proyecto JJ Studio
- devDependencies
- GoalEvolutionChart.vue
- UsuariosView.vue
- Proyecto JJ Studio - Contexto de Negocio y Arquitectura
- Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio)
- ResetPasswordView.vue
- CalendarMobileDateNavigator.vue
- useSaleAppointmentForm.ts
- Guía de Estilo y Patrones Globales de UX/UI (JJ Studio)
- Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio)
- SupervisorHotelGoalCard.vue
- ContableDashboard.vue
- PhotoSessionFormView.vue
- ConfiguracionView.vue
- frontend/src/features/goals/domain/goal.model.ts
- plugins
- JJ Studio
- PhotographerHotelGoalCard.vue
- GoalProgressCard.vue
- backend/package.json
- AgendadorHotelGoalCard.vue
- Guía de Uso de Iconos Lucide (`@lucide/vue`)
- LoginView.vue
- frontend/src/shared/permissions.ts
- Project
- Cambios Realizados
- SidebarNav.vue
- user-avatar.ts
- SaleAppointmentFormView.vue
- CalendarEventCard.vue
- scripts
- email.service.ts
- ForgotPasswordView.vue
- CalendarHeader.vue
- CalendarDeleteConfirmPopover.vue
- .prettierrc.json
- CalendarAlertsPanel.vue
- CalendarDesktopToolbar.vue
- handleSave
- devDependencies
- useDashboard.ts
- auth.store.ts
- frontend/tsconfig.json
- googleapis
- node-cron
- HotelCalendarView.vue
- handleAccordionChange

## God Nodes (most connected - your core abstractions)
1. `vue` - 58 edges
2. `prisma` - 23 edges
3. `decryptUser()` - 23 edges
4. `decrypt()` - 19 edges
5. `encrypt()` - 18 edges
6. `Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones` - 15 edges
7. `syncSesionToGoogle()` - 14 edges
8. `blindIndex()` - 14 edges
9. `syncCitaVentaToGoogle()` - 13 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `useCalendarEvents()` --indirect_call--> `formatDateTime()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/useCalendarEvents.ts → frontend/src/features/photo-sessions/ui/components/CalendarAlertsPanel.vue
- `useCalendarEvents()` --indirect_call--> `getEventCountForDate()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/useCalendarEvents.ts → frontend/src/features/photo-sessions/ui/components/CalendarMobileHeader.vue
- `Props` --references--> `SesionFotografica`  [EXTRACTED]
  frontend/src/features/photo-sessions/ui/components/CalendarAlertsPanel.vue → frontend/src/features/photo-sessions/domain/session.model.ts
- `useSaleAppointmentForm()` --indirect_call--> `handleSave()`  [INFERRED]
  frontend/src/features/sales/composables/useSaleAppointmentForm.ts → frontend/src/features/users/ui/UsuarioFormView.vue
- `processSessionReminders()` --calls--> `decryptSesion()`  [EXTRACTED]
  backend/src/features/notifications/application/reminder.service.ts → backend/src/shared/encryption.ts

## Import Cycles
- None detected.

## Communities (83 total, 11 thin omitted)

### Community 0 - "encryption.ts"
Cohesion: 0.05
Nodes (89): main(), prisma, seedUser(), AuditParams, DIAS_SEMANA, formatAuditDateTime(), formatCreadorOriginal(), MESES (+81 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (47): dayjs, element-plus, @element-plus/icons-vue, dependencies, dayjs, element-plus, @element-plus/icons-vue, @fullcalendar/core (+39 more)

### Community 2 - "UsuarioFormView.vue"
Cohesion: 0.04
Nodes (37): activeTab, assignableProfiles, assignedAreaIdsByOtherRoleUsers, assignedAreaNames, assignedHotelIdsByOtherSupervisores, assignedHotelNames, assignedNames, authStore (+29 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (37): eslint, eslint-config-prettier, eslint-plugin-oxlint, eslint-plugin-vue, devDependencies, eslint, eslint-config-prettier, eslint-plugin-oxlint (+29 more)

### Community 4 - "HotelCalendarMobile.vue"
Cohesion: 0.06
Nodes (28): {
  calendarEvents,
  eventsCountByDate,
  clearEventHighlights,
}, calendarOptions, calendarRef, canCreateEvents, canDeleteEvents, canEditEvents, currentCalendarTitle, currentCalendarView (+20 more)

### Community 5 - "PhotoSessionFormMobile.vue"
Cohesion: 0.07
Nodes (19): estadoOptions, minuteSlots, mobileCheckoutPreview, mobileCitaVentaPreview, mobileSessionPreview, motivoOptions, props, salesCountByHour (+11 more)

### Community 6 - "HotelFormView.vue"
Cohesion: 0.08
Nodes (21): CreateHotelPayload, Hotel, UpdateHotelPayload, useHotelStore, allAreasFlat, areaFilter, countryStore, filteredHotels (+13 more)

### Community 7 - "GoalFormView.vue"
Cohesion: 0.07
Nodes (26): AreaGroup, assignedPhotographers, authStore, availableHotels, CountryGroup, countryStore, currentHotel, customPhotographerGoals (+18 more)

### Community 8 - "HotelCalendarDesktop.vue"
Cohesion: 0.06
Nodes (25): useCalendarScope(), {
  calendarEvents,
  highlightEventAndAssociated,
  clearEventHighlights,
}, calendarOptions, calendarRef, canCreateEvents, canDeleteEvents, canEditEvents, currentCalendarTitle (+17 more)

### Community 9 - "EmailTemplatesView.vue"
Cohesion: 0.08
Nodes (21): EmailTemplate, PreviewResult, useEmailTemplates(), VariableInfo, activeTab, authStore, categorizedVariables, currentTemplate (+13 more)

### Community 10 - "reminder.service.ts"
Cohesion: 0.20
Nodes (21): formatDateDisplay(), formatTimeDisplay(), getMailTransporter(), getTemplate(), isValidEmail(), processAllReminders(), processSaleAppointmentReminders(), processSessionReminders() (+13 more)

### Community 11 - "PaisesConfig.vue"
Cohesion: 0.12
Nodes (18): AreaItem, HotelItem, Pais, WORLD_COUNTRIES, WorldCountry, useCountryStore, addingAreaCountryId, availableSelectCountries (+10 more)

### Community 12 - "SaleAppointmentFormMobile.vue"
Cohesion: 0.09
Nodes (11): isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly, selectedMinuteOnly, showAllTimeSlots (+3 more)

### Community 13 - "AuditLogTab.vue"
Cohesion: 0.12
Nodes (11): AuditLogEntry, AuditLogFilters, AuditLogResponse, useAuditLogStore, auditStore, dateShortcuts, expandedItems, filters (+3 more)

### Community 14 - "SaleAppointmentFormDesktop.vue"
Cohesion: 0.09
Nodes (11): SaleAppointmentFormContext, formattedSelectedSaleDateTime, isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly (+3 more)

### Community 15 - "ComisionesConfig.vue"
Cohesion: 0.07
Nodes (22): Comision, ComisionConfig, ComisionUsuarioConfig, ResumenComisiones, useCommissionStore, AreaGroup, commissionStore, countryStore (+14 more)

### Community 16 - "App.vue"
Cohesion: 0.11
Nodes (15): authStore, canSeeAgenda, canSeeConfig, canSeeUsers, closeMobileDrawer(), countryStore, filteredCountriesTree, handleSelectHotelNode() (+7 more)

### Community 17 - "1. Requisitos Funcionales"
Cohesion: 0.11
Nodes (18): 1. Requisitos Funcionales, 2. Requisitos Técnicos y de Arquitectura, 3. Diseño de Base de Datos (Propuesta de Entidades), 4. Flujos de Usuario Detallados, 5. Plan de Trabajo por Fases, 6. Consideraciones Especiales de Negocio, A. Gestión de Estructura Organizativa, Análisis de Requisitos y Plan de Trabajo - Proyecto JJ Studio (+10 more)

### Community 18 - "vue"
Cohesion: 0.24
Nodes (12): useCalendarAlerts(), DeletableCalendarEvent, useCalendarDelete(), EventTooltipInfo, ExtendedEventProps, HotelDisponibilidad, CreateSesionPayload, EstadoSesion (+4 more)

### Community 19 - "PhotoSessionFormDesktop.vue"
Cohesion: 0.11
Nodes (10): PhotoSessionFormContext, minuteSlots, motivoOptions, props, salesCountByHour, selectedCitaVentaHourOnly, selectedCitaVentaMinuteOnly, selectedHourOnly (+2 more)

### Community 20 - "CalendarioLaboral.vue"
Cohesion: 0.15
Nodes (11): CalendarioLaboralFotografo, CreateCalendarioLaboralPayload, MotivoCalendarioLaboral, useCalendarioLaboralStore, formatDateIso(), getCellClassName(), isSubmitting, motivoOptions (+3 more)

### Community 21 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, paths, rootDir (+9 more)

### Community 22 - "Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones"
Cohesion: 0.11
Nodes (17): 10. Permisos de Edición de Comisiones, 11. Configuración Editable, 12. Definición de Metas del Hotel, 13. Prioridad de Desarrollo Acordada, 14. Resumen Funcional del Módulo de Fotógrafo, 1. Pantalla Inicial del Fotógrafo, 2. Visibilidad del Calendario, 3. Motivo de Ver Todo el Calendario (+9 more)

### Community 23 - "user.model.ts"
Cohesion: 0.18
Nodes (9): UserRepositoryPort, Perfil, TipoContrato, User, UserInput, UserStatus, UserWithProfile, useProfileStore (+1 more)

### Community 24 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcryptjs, dotenv, fastify, @fastify/cors, @fastify/jwt, nodemailer, @prisma/client (+9 more)

### Community 25 - "goal.routes.ts"
Cohesion: 0.20
Nodes (15): AlcanceTipo, CreateOrUpdateMetaInput, EvolucionMetasResponse, FotografoProgreso, HotelProgresoResumen, MetaDTO, PuntoDiaEvolucion, PuntoMesEvolucion (+7 more)

### Community 26 - "tsconfig.app.json"
Cohesion: 0.12
Nodes (16): compilerOptions, noUncheckedIndexedAccess, paths, tsBuildInfoFile, exclude, extends, include, src/**/* (+8 more)

### Community 27 - "AGENTS.md - Proyecto JJ Studio"
Cohesion: 0.12
Nodes (15): 1. Gestión de `.env` (NUNCA SUBIR A GIT):, 2. Configuración de Proxy Vite (Prevenir Error 502):, 3. Pipeline CI/CD GitHub Actions (`deploy.yml`):, 4. Cabeceras HTTP en Frontend y Fastify 5 (Prevenir Error 400 `FST_ERR_CTP_EMPTY_JSON_BODY`):, AGENTS.md - Proyecto JJ Studio, 📚 Base de Conocimiento del Proyecto (`docs/`), 🛠️ Comandos Principales, 🧼 Disciplina de Código, No-Sobreingeniería y Cero Código Muerto (Reglas Obligatorias) (+7 more)

### Community 28 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, prisma, tsx, @types/bcryptjs, @types/node, @types/node-cron, @types/nodemailer, typescript (+7 more)

### Community 29 - "GoalEvolutionChart.vue"
Cohesion: 0.13
Nodes (14): activeTab, anioCoordinates, anioPoints, currentCoords, currentMax, hoveredIndex, hoveredPoint, maxValAnio (+6 more)

### Community 30 - "UsuariosView.vue"
Cohesion: 0.13
Nodes (9): authStore, countryStore, currentUser, filteredUsers, profileStore, router, searchQuery, userStore (+1 more)

### Community 31 - "Proyecto JJ Studio - Contexto de Negocio y Arquitectura"
Cohesion: 0.14
Nodes (13): 1. Naturaleza del Negocio, 2. Roles de Usuario y Permisos (RBAC & Multi-Tenant Lógico), 3. Módulos Funcionales Clave y Reglas de Negocio, 4. Stack Tecnológico Acordado, 5. Reglas Críticas de Entornos y Despliegue (Local vs VPS Producción), 6. Disciplina de Desarrollo: Anti-Sobreingeniería y Cero Código Muerto, 7. Instrucciones Generales para el Agente AI, A. Gestión Estricta de Archivos `.env` (¡NUNCA SUBIR A GIT!): (+5 more)

### Community 32 - "Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio)"
Cohesion: 0.14
Nodes (13): 1. 🎯 Objetivos de Seguridad, 2. 🛡️ Estrategia Criptográfica Implementada, 3. 📦 Librerías y Módulos Utilizados, 4. 🔑 Gestión de Claves y Variables de Entorno, 5. 🏗️ Arquitectura de Código y Módulos, 6. 🚀 Scripts de Migración y Verificación, A. Cifrado Simétrico Reversible: AES-256-GCM, Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio) (+5 more)

### Community 33 - "ResetPasswordView.vue"
Cohesion: 0.14
Nodes (12): confirmPassword, isCheckingToken, isCompleted, isLoading, isTokenValid, password, route, router (+4 more)

### Community 34 - "CalendarMobileDateNavigator.vue"
Cohesion: 0.14
Nodes (13): currentDayjs, emit, endDayNumber, endOfWeek, formattedDayNumber, formattedMonth, formattedWeekday, isWeekMode (+5 more)

### Community 35 - "useSaleAppointmentForm.ts"
Cohesion: 0.24
Nodes (11): SaleAppointmentFormData, SessionContextInfo, VendedorDisponibilidadItem, VendedoresDisponibilidadResponse, CitaVenta, ConflictoCitaVenta, CreateCitaVentaPayload, EstadoCitaVenta (+3 more)

### Community 36 - "Guía de Estilo y Patrones Globales de UX/UI (JJ Studio)"
Cohesion: 0.15
Nodes (12): 1. Filosofía de Diseño: *Clean, Minimalist & Data-First*, 2. Anatomía Estándar de una Pantalla, 3. Jerarquía Visual y Datos Protagonistas (*Data-First*), 4. Paleta de Colores y Tokens Semánticos, 5. Convenciones de Stack y Componentes, 6. Reglas Críticas de Intervención en CSS y Componentes, A. Cabecera de Página (`.page-header`), B. Barra de Filtros y Herramientas (`.toolbar-bar` / `.toolbar-card`) (+4 more)

### Community 37 - "Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio)"
Cohesion: 0.15
Nodes (12): 1.1. Registro Tipo A (Dirección Web), 1.2. Registro Tipo TXT (SPF - Autenticación Antispam para Google/Outlook), 5.1. Prueba rápida de envío desde la terminal del VPS:, 5.2. Comprobar los logs de entrega en tiempo real:, 5.3. Comprobar la cola de correo:, Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio), 🛠️ Paso 1: Configuración de Registros DNS (Panel del Registrador de Dominio), 🔒 Paso 2: Servidor Web y Certificado SSL (FastPanel / Nginx) (+4 more)

### Community 38 - "SupervisorHotelGoalCard.vue"
Cohesion: 0.27
Nodes (10): getProgressColor(), getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), getSemaforoTagType(), getSemaforoText(), isSinMeta() (+2 more)

### Community 39 - "ContableDashboard.vue"
Cohesion: 0.05
Nodes (27): AreaGroup, CountryGroup, {
  countryStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilters,
  yearsOptions,
  totalUsers,
  activeUsers,
  totalCountries,
  totalAreas,
  totalHotels,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  goToConfig,
  goToUsers,
  formatCurrency,
  handleNavigateToGoalForm,
  globalMonthlyCommissions,
}, groupedHotelsByCountry, {
  commissionStore,
  selectedMes,
  selectedAnio,
  agendadorHotels,
  agendadorHotelGoals,
  getTodaySessionsForHotel,
  getTodaySalesForHotel,
  formatTime,
  goToAgenda,
  formatCurrency,
  myMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
}, router, activeTab, AreaGroup (+19 more)

### Community 40 - "PhotoSessionFormView.vue"
Cohesion: 0.40
Nodes (3): usePhotoSessionForm(), form, isMobile

### Community 41 - "ConfiguracionView.vue"
Cohesion: 0.15
Nodes (11): activeTab, authStore, canManageCommissions, canManageEmailTemplates, canManageGoals, defaultTab, isSuperOrAdmin, pageSubtitle (+3 more)

### Community 42 - "frontend/src/features/goals/domain/goal.model.ts"
Cohesion: 0.23
Nodes (9): AlcanceTipo, EvolucionMetasResponse, FotografoProgreso, HotelProgresoResumen, Meta, PuntoDiaEvolucion, PuntoMesEvolucion, SaveMetaPayload (+1 more)

### Community 43 - "plugins"
Cohesion: 0.18
Nodes (10): categories, correctness, env, browser, plugins, $schema, eslint, oxc (+2 more)

### Community 44 - "JJ Studio"
Cohesion: 0.20
Nodes (9): Compile and Hot-Reload for Development, Customize configuration, JJ Studio, Lint with [ESLint](https://eslint.org/), Project Setup, Recommended Browser Setup, Recommended IDE Setup, Type-Check, Compile and Minify for Production (+1 more)

### Community 45 - "PhotographerHotelGoalCard.vue"
Cohesion: 0.22
Nodes (4): displayHotelTitle, fotografoSubtitle, numFotografos, props

### Community 46 - "GoalProgressCard.vue"
Cohesion: 0.20
Nodes (8): SemaforoEstado, cappedPercentage, isSinMeta, props, semaforoBgLight, semaforoColor, semaforoIcon, semaforoLabel

### Community 47 - "backend/package.json"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, main, name, type, version

### Community 48 - "AgendadorHotelGoalCard.vue"
Cohesion: 0.33
Nodes (7): displayHotelTitle, getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), isSinMeta(), props

### Community 49 - "Guía de Uso de Iconos Lucide (`@lucide/vue`)"
Cohesion: 0.25
Nodes (7): 1. Importación y Uso Básico, 2. Integración con Element Plus, 💡 Buenas Prácticas, 🎨 Formas de Uso, Guía de Uso de Iconos Lucide (`@lucide/vue`), 📦 Paquete Instalado, ⚙️ Propiedades Principales de los Iconos

### Community 50 - "LoginView.vue"
Cohesion: 0.25
Nodes (6): authStore, email, isLoading, password, rememberMe, router

### Community 51 - "frontend/src/shared/permissions.ts"
Cohesion: 0.32
Nodes (7): canAccessRoute(), canDeleteUser(), canEditUser(), getRolePermissions(), PERMISSION_MATRIX, RoleCode, RoleConfig

### Community 53 - "Cambios Realizados"
Cohesion: 0.29
Nodes (6): 1. Módulo Core de Permisos y Auth Store, 2. Capa de Frontend, 3. Capa de Backend, Cambios Realizados, Resumen de Implementación de Permisos y Matriz RBAC Multi-Tenant, Verificación

### Community 54 - "SidebarNav.vue"
Cohesion: 0.38
Nodes (6): AreaNode, CountryNode, emit, handleHotelClick(), handleNavClick(), HotelNode

### Community 56 - "SaleAppointmentFormView.vue"
Cohesion: 0.33
Nodes (4): useSaleAppointmentForm(), form, isMobile, handleSave()

### Community 57 - "CalendarEventCard.vue"
Cohesion: 0.29
Nodes (5): emit, eventStatus, Props, STATUS_MAP, StatusConfig

### Community 58 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, db:push, db:seed, dev, start

### Community 59 - "email.service.ts"
Cohesion: 0.53
Nodes (5): escapeHtml(), getAppBaseUrl(), getMailTransporter(), sendPasswordResetEmail(), SendPasswordResetParams

### Community 60 - "ForgotPasswordView.vue"
Cohesion: 0.33
Nodes (4): email, isLoading, isSubmitted, router

### Community 61 - "CalendarHeader.vue"
Cohesion: 0.33
Nodes (5): AreaGroup, CountryGroup, emit, groupedHotelsByCountry, Props

### Community 63 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): htmlWhitespaceSensitivity, printWidth, $schema, semi, singleQuote

### Community 64 - "CalendarAlertsPanel.vue"
Cohesion: 0.18
Nodes (9): useCalendarEvents(), activeAlertPanels, formatDateTime(), Props, router, totalAlertsCount, emit, getEventCountForDate() (+1 more)

### Community 65 - "CalendarDesktopToolbar.vue"
Cohesion: 0.50
Nodes (3): emit, PeriodStats, Props

### Community 68 - "devDependencies"
Cohesion: 0.50
Nodes (3): devDependencies, @types/node, @types/node

## Knowledge Gaps
- **625 isolated node(s):** `router`, `hotelStore`, `userStore`, `profileStore`, `sessionStore` (+620 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `UsuarioFormView.vue`, `HotelCalendarMobile.vue`, `PhotoSessionFormMobile.vue`, `HotelFormView.vue`, `GoalFormView.vue`, `HotelCalendarDesktop.vue`, `EmailTemplatesView.vue`, `PaisesConfig.vue`, `SaleAppointmentFormMobile.vue`, `AuditLogTab.vue`, `SaleAppointmentFormDesktop.vue`, `ComisionesConfig.vue`, `App.vue`, `PhotoSessionFormDesktop.vue`, `CalendarioLaboral.vue`, `user.model.ts`, `GoalEvolutionChart.vue`, `UsuariosView.vue`, `ResetPasswordView.vue`, `CalendarMobileDateNavigator.vue`, `useSaleAppointmentForm.ts`, `SupervisorHotelGoalCard.vue`, `ContableDashboard.vue`, `PhotoSessionFormView.vue`, `ConfiguracionView.vue`, `frontend/src/features/goals/domain/goal.model.ts`, `plugins`, `PhotographerHotelGoalCard.vue`, `GoalProgressCard.vue`, `AgendadorHotelGoalCard.vue`, `LoginView.vue`, `SaleAppointmentFormView.vue`, `CalendarEventCard.vue`, `ForgotPasswordView.vue`, `CalendarHeader.vue`, `CalendarAlertsPanel.vue`, `useDashboard.ts`, `auth.store.ts`, `HotelCalendarView.vue`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `vue`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `router`, `hotelStore`, `userStore` to the rest of the system?**
  _625 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `encryption.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051389535786368574 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `UsuarioFormView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._