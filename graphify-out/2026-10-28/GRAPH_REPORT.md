# Graph Report - JJ Studio  (2026-10-27)

## Corpus Check
- 165 files · ~284,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1556 nodes · 2125 edges · 115 communities (86 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `980ba874`
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
- AvatarCropperDialog.vue
- PaisesConfig.vue
- SaleAppointmentFormMobile.vue
- AuditLogTab.vue
- SaleAppointmentFormDesktop.vue
- ComisionesConfig.vue
- App.vue
- 1. Requisitos Funcionales
- usePhotoSessionForm.ts
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
- SaleAppointmentFormView.vue
- Guía de Estilo y Patrones Globales de UX/UI (JJ Studio)
- Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio)
- SupervisorHotelGoalCard.vue
- ContableEstadisticasTab.vue
- CalendarMobileHeader.vue
- commission.routes.ts
- frontend/src/features/goals/domain/goal.model.ts
- plugins
- JJ Studio
- PhotographerHotelGoalCard.vue
- google-calendar.service.ts
- typescript
- AgendadorHotelGoalCard.vue
- Guía de Uso de Iconos Lucide (`@lucide/vue`)
- confirmAction
- frontend/src/shared/permissions.ts
- Project
- Cambios Realizados
- SidebarNav.vue
- user-avatar.ts
- useSaleAppointmentForm.ts
- DirectSaleFormDesktop.vue
- eslint
- vue
- frontend/src/features/alerts/domain/alert.model.ts
- AlertConfigTab.vue
- DirectSaleFormMobile.vue
- .prettierrc.json
- Guía Paso a Paso: Conexión de Google Calendar por Hotel en JJ Studio
- CalendarDesktopToolbar.vue
- scripts
- devDependencies
- frontend/package.json
- dayjs
- frontend/tsconfig.json
- eslint-config-prettier
- eslint-plugin-oxlint
- @element-plus/icons-vue
- CalendarAlertsPanel.vue
- commission-excel-export.service.ts
- @fullcalendar/interaction
- pinia
- vue
- vue-advanced-cropper
- vue-i18n
- jiti
- vue-router
- LanguageSelector.vue
- ContableComisionesTab.vue
- CalendarEventCard.vue
- ForgotPasswordView.vue
- reminder.service.ts
- LoginView.vue
- src/index.ts
- sale.routes.ts
- user.routes.ts
- GoalProgressCard.vue
- session.routes.ts
- CalendarDeleteConfirmPopover.vue
- email.service.ts
- exceljs
- @fullcalendar/daygrid
- @fullcalendar/list
- CURRENCY_SUMMARY_PROPERTIES
- getDetalleTableData
- oxlint
- prettier
- @tsconfig/node24
- vue-eslint-parser
- vue-tsc
- @vue/tsconfig

## God Nodes (most connected - your core abstractions)
1. `vue` - 68 edges
2. `prisma` - 29 edges
3. `decryptUser()` - 23 edges
4. `encrypt()` - 20 edges
5. `decrypt()` - 19 edges
6. `Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones` - 15 edges
7. `blindIndex()` - 14 edges
8. `syncSesionToGoogle()` - 12 edges
9. `saleRoutes()` - 11 edges
10. `syncCitaVentaToGoogle()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `runAvatarMigration()` --calls--> `ensureAvatarsDir()`  [EXTRACTED]
  backend/src/scripts/migrate-avatars-to-disk.ts → backend/src/features/users/application/avatar-storage.service.ts
- `commissionRoutes()` --calls--> `registrarAlerta()`  [EXTRACTED]
  backend/src/features/commissions/infrastructure/commission.routes.ts → backend/src/features/alerts/application/alert.service.ts
- `goalRoutes()` --calls--> `registrarAlerta()`  [EXTRACTED]
  backend/src/features/goals/infrastructure/goal.routes.ts → backend/src/features/alerts/application/alert.service.ts
- `alertRoutes()` --calls--> `evaluarCaso1SesionesSospechosas()`  [EXTRACTED]
  backend/src/features/alerts/infrastructure/alert.routes.ts → backend/src/features/alerts/application/alert.service.ts
- `sessionRoutes()` --calls--> `evaluarCaso1SesionesSospechosas()`  [EXTRACTED]
  backend/src/features/photo-sessions/infrastructure/session.routes.ts → backend/src/features/alerts/application/alert.service.ts

## Import Cycles
- None detected.

## Communities (115 total, 29 thin omitted)

### Community 0 - "encryption.ts"
Cohesion: 0.21
Nodes (18): main(), prisma, seedUser(), migrateAll(), migrateSessions(), migrateUsers(), testCrypto(), testPasswordResetFlow() (+10 more)

### Community 1 - "dependencies"
Cohesion: 0.15
Nodes (13): element-plus, dependencies, element-plus, @fullcalendar/core, @fullcalendar/timegrid, @fullcalendar/vue3, @lucide/vue, vue-ios-style-datepicker (+5 more)

### Community 2 - "UsuarioFormView.vue"
Cohesion: 0.04
Nodes (40): activeTab, assignableProfiles, assignedAreaIdsByOtherRoleUsers, assignedAreaNames, assignedHotelIdsByOtherSupervisores, assignedHotelNames, assignedNames, authStore (+32 more)

### Community 3 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint-plugin-vue, devDependencies, eslint-plugin-vue, npm-run-all2, vite, vite-plugin-vue-devtools, @vitejs/plugin-vue, @vue/eslint-config-typescript (+5 more)

### Community 4 - "HotelCalendarMobile.vue"
Cohesion: 0.05
Nodes (39): AgendaMobileSavedState, {
  calendarEvents,
  eventsCountByDate,
  clearEventHighlights,
  canEditCalendarEvent,
}, calendarOptions, calendarRef, canCreateDirectSale, canCreateEvents, canDeleteEvents, canEditEvents (+31 more)

### Community 5 - "PhotoSessionFormMobile.vue"
Cohesion: 0.06
Nodes (24): estadoOptions, handleAccordionChange(), handleSave(), minuteSlots, mobileCheckoutPreview, mobileCitaVentaPreview, mobileSessionPreview, motivoOptions (+16 more)

### Community 6 - "HotelFormView.vue"
Cohesion: 0.06
Nodes (30): CreateHotelPayload, GoogleCalendarConfigPayload, GoogleCalendarTestResult, Hotel, UpdateHotelPayload, useHotelStore, allAreasFlat, areaFilter (+22 more)

### Community 7 - "GoalFormView.vue"
Cohesion: 0.06
Nodes (32): activePhotographersCount, AreaGroup, assignedTeamMembers, authStore, availableHotels, CountryGroup, countryStore, currentHotel (+24 more)

### Community 8 - "HotelCalendarDesktop.vue"
Cohesion: 0.05
Nodes (31): useCalendarScope(), AgendaSavedState, {
  calendarEvents,
  highlightEventAndAssociated,
  clearEventHighlights,
  canEditCalendarEvent,
}, calendarOptions, calendarRef, canCreateDirectSale, canCreateEvents, canDeleteEvents (+23 more)

### Community 9 - "EmailTemplatesView.vue"
Cohesion: 0.08
Nodes (22): EmailTemplate, PreviewResult, useEmailTemplates(), VariableInfo, activeTab, authStore, categorizedVariables, currentTemplate (+14 more)

### Community 10 - "AvatarCropperDialog.vue"
Cohesion: 0.32
Nodes (5): cropperRef, emit, handleCancel(), handleSave(), { t }

### Community 11 - "PaisesConfig.vue"
Cohesion: 0.10
Nodes (18): AreaItem, HotelItem, Pais, WORLD_COUNTRIES, WorldCountry, useCountryStore, addingAreaCountryId, availableSelectCountries (+10 more)

### Community 12 - "SaleAppointmentFormMobile.vue"
Cohesion: 0.08
Nodes (13): isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly, selectedMinuteOnly, showAllTimeSlots (+5 more)

### Community 13 - "AuditLogTab.vue"
Cohesion: 0.11
Nodes (12): AuditLogEntry, AuditLogFilters, AuditLogResponse, useAuditLogStore, auditStore, dateShortcuts, expandedItems, filters (+4 more)

### Community 14 - "SaleAppointmentFormDesktop.vue"
Cohesion: 0.08
Nodes (12): formattedSelectedSaleDateTime, isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly, selectedMinuteOnly (+4 more)

### Community 15 - "ComisionesConfig.vue"
Cohesion: 0.07
Nodes (23): Comision, ComisionConfig, ComisionUsuarioConfig, ResumenComisiones, useCommissionStore, AreaGroup, commissionStore, countryStore (+15 more)

### Community 16 - "App.vue"
Cohesion: 0.06
Nodes (23): authStore, avatarFileInput, canSeeAgenda, canSeeConfig, canSeeUsers, closeMobileDrawer(), countryStore, cropperDialogVisible (+15 more)

### Community 17 - "1. Requisitos Funcionales"
Cohesion: 0.11
Nodes (18): 1. Requisitos Funcionales, 2. Requisitos Técnicos y de Arquitectura, 3. Diseño de Base de Datos (Propuesta de Entidades), 4. Flujos de Usuario Detallados, 5. Plan de Trabajo por Fases, 6. Consideraciones Especiales de Negocio, A. Gestión de Estructura Organizativa, Análisis de Requisitos y Plan de Trabajo - Proyecto JJ Studio (+10 more)

### Community 18 - "usePhotoSessionForm.ts"
Cohesion: 0.20
Nodes (12): useCalendarAlerts(), DeletableCalendarEvent, useCalendarDelete(), EventTooltipInfo, ExtendedEventProps, useCalendarEvents(), HotelDisponibilidad, CreateSesionPayload (+4 more)

### Community 19 - "PhotoSessionFormDesktop.vue"
Cohesion: 0.08
Nodes (14): PhotoSessionFormContext, usePhotoSessionForm(), minuteSlots, motivoOptions, props, salesCountByHour, selectedCitaVentaHourOnly, selectedCitaVentaMinuteOnly (+6 more)

### Community 20 - "CalendarioLaboral.vue"
Cohesion: 0.14
Nodes (12): CalendarioLaboralFotografo, CreateCalendarioLaboralPayload, MotivoCalendarioLaboral, useCalendarioLaboralStore, formatDateIso(), getCellClassName(), isSubmitting, motivoOptions (+4 more)

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
Cohesion: 0.05
Nodes (38): author, dependencies, bcryptjs, dotenv, fastify, @fastify/cors, @fastify/jwt, @fastify/static (+30 more)

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
Cohesion: 0.14
Nodes (14): devDependencies, prisma, tsx, @types/bcryptjs, @types/node, @types/node-cron, @types/nodemailer, @types/node (+6 more)

### Community 29 - "GoalEvolutionChart.vue"
Cohesion: 0.13
Nodes (14): activeTab, anioCoordinates, anioPoints, currentCoords, currentMax, hoveredIndex, hoveredPoint, maxValAnio (+6 more)

### Community 30 - "UsuariosView.vue"
Cohesion: 0.07
Nodes (23): allColumnKeys, authStore, ColumnConfig, columnDefinitions, countryStore, currentUser, defaultVisibleColumns, filteredUsers (+15 more)

### Community 31 - "Proyecto JJ Studio - Contexto de Negocio y Arquitectura"
Cohesion: 0.14
Nodes (13): 1. Naturaleza del Negocio, 2. Roles de Usuario y Permisos (RBAC & Multi-Tenant Lógico), 3. Módulos Funcionales Clave y Reglas de Negocio, 4. Stack Tecnológico Acordado, 5. Reglas Críticas de Entornos y Despliegue (Local vs VPS Producción), 6. Disciplina de Desarrollo: Anti-Sobreingeniería y Cero Código Muerto, 7. Instrucciones Generales para el Agente AI, A. Gestión Estricta de Archivos `.env` (¡NUNCA SUBIR A GIT!): (+5 more)

### Community 32 - "Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio)"
Cohesion: 0.14
Nodes (13): 1. 🎯 Objetivos de Seguridad, 2. 🛡️ Estrategia Criptográfica Implementada, 3. 📦 Librerías y Módulos Utilizados, 4. 🔑 Gestión de Claves y Variables de Entorno, 5. 🏗️ Arquitectura de Código y Módulos, 6. 🚀 Scripts de Migración y Verificación, A. Cifrado Simétrico Reversible: AES-256-GCM, Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio) (+5 more)

### Community 33 - "ResetPasswordView.vue"
Cohesion: 0.13
Nodes (13): confirmPassword, isCheckingToken, isCompleted, isLoading, isTokenValid, password, route, router (+5 more)

### Community 34 - "CalendarMobileDateNavigator.vue"
Cohesion: 0.14
Nodes (13): currentDayjs, emit, endDayNumber, endOfWeek, formattedDayNumber, formattedMonth, formattedWeekday, isWeekMode (+5 more)

### Community 35 - "SaleAppointmentFormView.vue"
Cohesion: 0.40
Nodes (3): useSaleAppointmentForm(), form, isMobile

### Community 36 - "Guía de Estilo y Patrones Globales de UX/UI (JJ Studio)"
Cohesion: 0.15
Nodes (12): 1. Filosofía de Diseño: *Clean, Minimalist & Data-First*, 2. Anatomía Estándar de una Pantalla, 3. Jerarquía Visual y Datos Protagonistas (*Data-First*), 4. Paleta de Colores y Tokens Semánticos, 5. Convenciones de Stack y Componentes, 6. Reglas Críticas de Intervención en CSS y Componentes, A. Cabecera de Página (`.page-header`), B. Barra de Filtros y Herramientas (`.toolbar-bar` / `.toolbar-card`) (+4 more)

### Community 37 - "Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio)"
Cohesion: 0.15
Nodes (12): 1.1. Registro Tipo A (Dirección Web), 1.2. Registro Tipo TXT (SPF - Autenticación Antispam para Google/Outlook), 5.1. Prueba rápida de envío desde la terminal del VPS:, 5.2. Comprobar los logs de entrega en tiempo real:, 5.3. Comprobar la cola de correo:, Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio), 🛠️ Paso 1: Configuración de Registros DNS (Panel del Registrador de Dominio), 🔒 Paso 2: Servidor Web y Certificado SSL (FastPanel / Nginx) (+4 more)

### Community 38 - "SupervisorHotelGoalCard.vue"
Cohesion: 0.18
Nodes (14): getProgressColor(), getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), getSemaforoTagType(), getSemaforoText(), groupBonusShare (+6 more)

### Community 39 - "ContableEstadisticasTab.vue"
Cohesion: 0.05
Nodes (30): AreaGroup, CountryGroup, {
  countryStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMonthDate,
  selectedMonthLabel,
  selectedHotelFilters,
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
  selectedAnio,
  selectedMonthDate,
  selectedMonthLabel,
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
}, router, commissionStore, ContableHotelSummary (+22 more)

### Community 41 - "commission.routes.ts"
Cohesion: 0.14
Nodes (22): doSyncMonthlyBonuses(), inFlightSyncs, syncMonthlyBonuses(), calculateAndSaveCommissionsForSale(), calculateUserCommission(), DEFAULT_GLOBAL_CONFIG, deleteUserCommissionConfig(), getAllCommissionConfigs() (+14 more)

### Community 42 - "frontend/src/features/goals/domain/goal.model.ts"
Cohesion: 0.25
Nodes (8): AlcanceTipo, EvolucionMetasResponse, HotelProgresoResumen, Meta, PuntoDiaEvolucion, PuntoMesEvolucion, SaveMetaPayload, useGoalStore

### Community 43 - "plugins"
Cohesion: 0.18
Nodes (10): categories, correctness, env, browser, plugins, $schema, eslint, oxc (+2 more)

### Community 44 - "JJ Studio"
Cohesion: 0.20
Nodes (9): Compile and Hot-Reload for Development, Customize configuration, JJ Studio, Lint with [ESLint](https://eslint.org/), Project Setup, Recommended Browser Setup, Recommended IDE Setup, Type-Check, Compile and Minify for Production (+1 more)

### Community 45 - "PhotographerHotelGoalCard.vue"
Cohesion: 0.13
Nodes (10): FotografoProgreso, displayHotelTitle, fotografoSubtitle, groupBonusShare, hasGroupBonus, hasIndividualBonus, numFotografos, props (+2 more)

### Community 46 - "google-calendar.service.ts"
Cohesion: 0.21
Nodes (19): googleCalendarRoutes(), deleteCitaVentaFromGoogle(), deleteSesionFromGoogle(), __dirname, __filename, formatDateLongSpanish(), formatEmailHtml(), formatPaxDisplay() (+11 more)

### Community 47 - "typescript"
Cohesion: 0.67
Nodes (3): typescript, typescript, typescript

### Community 48 - "AgendadorHotelGoalCard.vue"
Cohesion: 0.15
Nodes (15): authStore, displayHotelTitle, getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), groupBonusShare, hasAnyBonus (+7 more)

### Community 49 - "Guía de Uso de Iconos Lucide (`@lucide/vue`)"
Cohesion: 0.25
Nodes (7): 1. Importación y Uso Básico, 2. Integración con Element Plus, 💡 Buenas Prácticas, 🎨 Formas de Uso, Guía de Uso de Iconos Lucide (`@lucide/vue`), 📦 Paquete Instalado, ⚙️ Propiedades Principales de los Iconos

### Community 50 - "confirmAction"
Cohesion: 0.29
Nodes (7): confirmAction(), handleBulkApprove(), handleBulkPay(), handleBulkReject(), handleUserApprove(), handleUserPay(), handleUserReject()

### Community 51 - "frontend/src/shared/permissions.ts"
Cohesion: 0.32
Nodes (7): canAccessRoute(), canDeleteUser(), canEditUser(), getRolePermissions(), PERMISSION_MATRIX, RoleCode, RoleConfig

### Community 53 - "Cambios Realizados"
Cohesion: 0.29
Nodes (6): 1. Módulo Core de Permisos y Auth Store, 2. Capa de Frontend, 3. Capa de Backend, Cambios Realizados, Resumen de Implementación de Permisos y Matriz RBAC Multi-Tenant, Verificación

### Community 54 - "SidebarNav.vue"
Cohesion: 0.38
Nodes (6): AreaNode, CountryNode, emit, handleHotelClick(), handleNavClick(), HotelNode

### Community 56 - "useSaleAppointmentForm.ts"
Cohesion: 0.18
Nodes (14): FormPagoItem, SaleAppointmentFormContext, SaleAppointmentFormData, SessionContextInfo, VendedorDisponibilidadItem, VendedoresDisponibilidadResponse, CitaVenta, ConflictoCitaVenta (+6 more)

### Community 57 - "DirectSaleFormDesktop.vue"
Cohesion: 0.10
Nodes (13): DirectSaleFormContext, DirectSaleFormData, SellerUser, useDirectSaleForm(), CreateVentaDirectaPayload, MODO_COBRO_OPTIONS, isPhotographerColored, isSellerPhotographer (+5 more)

### Community 59 - "vue"
Cohesion: 0.09
Nodes (14): AuthUser, useAuthStore, MONTH_KEYS, PhotographerHotelData, AreaGroup, CountryGroup, emit, groupedHotelsByCountry (+6 more)

### Community 60 - "frontend/src/features/alerts/domain/alert.model.ts"
Cohesion: 0.36
Nodes (6): AlertaFilters, AlertaItem, AlertaListResponse, GravedadAlerta, TipoCasoAlerta, useAlertStore

### Community 61 - "AlertConfigTab.vue"
Cohesion: 0.06
Nodes (30): { alerts, total, unreadCount, criticalCount, readCount, currentPage, pageSize, isLoading }, alertStore, availableHotels, CASE_BADGES, detailDialogVisible, filters, GRAVITY_BADGES, handleFilterChange() (+22 more)

### Community 62 - "DirectSaleFormMobile.vue"
Cohesion: 0.11
Nodes (12): isPhotographerColored, isSellerPhotographer, props, showPhotographersList, showSellersList, stepHotel, stepMiscelaneo, stepNotes (+4 more)

### Community 63 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): htmlWhitespaceSensitivity, printWidth, $schema, semi, singleQuote

### Community 64 - "Guía Paso a Paso: Conexión de Google Calendar por Hotel en JJ Studio"
Cohesion: 0.18
Nodes (10): 1. ¿Qué ocurre si un hotel no tiene configurado Google Calendar?, 2. ¿Qué eventos se sincronizan en Google Calendar?, 3. Si se elimina o cancela una sesión en JJ Studio, ¿se elimina de Google Calendar?, 📌 ¿Cómo Funciona la Integración?, Guía Paso a Paso: Conexión de Google Calendar por Hotel en JJ Studio, 🛠️ Paso 1: Configurar el Calendario en la Cuenta de Google del Hotel, 📋 Paso 2: Obtener el ID del Calendario, ⚙️ Paso 3: Registrar el ID en JJ Studio (+2 more)

### Community 65 - "CalendarDesktopToolbar.vue"
Cohesion: 0.50
Nodes (3): emit, PeriodStats, Props

### Community 67 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, build-only, dev, format, lint, lint:eslint, lint:oxlint (+2 more)

### Community 68 - "devDependencies"
Cohesion: 0.50
Nodes (3): devDependencies, @types/node, @types/node

### Community 69 - "frontend/package.json"
Cohesion: 0.29
Nodes (6): engines, node, name, private, type, version

### Community 77 - "CalendarAlertsPanel.vue"
Cohesion: 0.33
Nodes (4): activeAlertPanels, Props, router, totalAlertsCount

### Community 82 - "commission-excel-export.service.ts"
Cohesion: 0.40
Nodes (5): BORDER_THIN, BORDER_TOTAL, CommissionExcelExportOptions, exportComisionesToExcel(), getAvatarImageForExcel()

### Community 91 - "ContableComisionesTab.vue"
Cohesion: 0.04
Nodes (31): availableContableUsers, BonusCalculationContext, BonusDetalle, comisionUsuarioFilter, commissionStore, ConfirmActionOptions, ContableAreaSummary, ContableHotelSummary (+23 more)

### Community 92 - "CalendarEventCard.vue"
Cohesion: 0.29
Nodes (5): emit, eventStatus, Props, StatusConfig, { t }

### Community 93 - "ForgotPasswordView.vue"
Cohesion: 0.29
Nodes (5): email, isLoading, isSubmitted, router, { t }

### Community 94 - "reminder.service.ts"
Cohesion: 0.21
Nodes (20): formatDateDisplay(), formatTimeDisplay(), getMailTransporter(), getTemplate(), isValidEmail(), processAllReminders(), processSaleAppointmentReminders(), processSessionReminders() (+12 more)

### Community 95 - "LoginView.vue"
Cohesion: 0.22
Nodes (7): authStore, email, isLoading, password, rememberMe, router, { t }

### Community 96 - "src/index.ts"
Cohesion: 0.11
Nodes (23): alertRoutes(), getAuthUserId(), verifySuperOrAdmin(), AuditParams, DIAS_SEMANA, formatAuditDateTime(), formatCreadorOriginal(), MESES (+15 more)

### Community 97 - "sale.routes.ts"
Cohesion: 0.18
Nodes (17): evaluarCaso1SesionesSospechosas(), registrarAlerta(), RegistrarAlertaParams, AlertaFilterQuery, AlertaItem, AlertaListResponse, GravedadAlerta, TipoCasoAlerta (+9 more)

### Community 98 - "user.routes.ts"
Cohesion: 0.18
Nodes (16): AVATARS_DIR, deleteAvatarFile(), __dirname, ensureAvatarsDir(), __filename, getAvatarsDir(), saveAvatarFromBase64(), getAuthUser() (+8 more)

### Community 99 - "GoalProgressCard.vue"
Cohesion: 0.20
Nodes (9): SemaforoEstado, cappedPercentage, isSinMeta, props, semaforoBgLight, semaforoColor, semaforoIcon, semaforoLabel (+1 more)

### Community 100 - "session.routes.ts"
Cohesion: 0.67
Nodes (5): getAuthUserId(), getHotelAvailability(), parseDateOnly(), parseLocalDateTime(), sessionRoutes()

### Community 102 - "email.service.ts"
Cohesion: 0.53
Nodes (5): escapeHtml(), getAppBaseUrl(), getMailTransporter(), sendPasswordResetEmail(), SendPasswordResetParams

## Knowledge Gaps
- **806 isolated node(s):** `__filename`, `__dirname`, `AVATARS_DIR`, `__filename`, `__dirname` (+801 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `UsuarioFormView.vue`, `HotelCalendarMobile.vue`, `PhotoSessionFormMobile.vue`, `HotelFormView.vue`, `GoalFormView.vue`, `HotelCalendarDesktop.vue`, `EmailTemplatesView.vue`, `AvatarCropperDialog.vue`, `PaisesConfig.vue`, `SaleAppointmentFormMobile.vue`, `AuditLogTab.vue`, `SaleAppointmentFormDesktop.vue`, `ComisionesConfig.vue`, `App.vue`, `usePhotoSessionForm.ts`, `PhotoSessionFormDesktop.vue`, `CalendarioLaboral.vue`, `user.model.ts`, `GoalEvolutionChart.vue`, `UsuariosView.vue`, `ResetPasswordView.vue`, `CalendarMobileDateNavigator.vue`, `SaleAppointmentFormView.vue`, `SupervisorHotelGoalCard.vue`, `ContableEstadisticasTab.vue`, `frontend/src/features/goals/domain/goal.model.ts`, `plugins`, `PhotographerHotelGoalCard.vue`, `AgendadorHotelGoalCard.vue`, `useSaleAppointmentForm.ts`, `DirectSaleFormDesktop.vue`, `frontend/src/features/alerts/domain/alert.model.ts`, `AlertConfigTab.vue`, `DirectSaleFormMobile.vue`, `CalendarAlertsPanel.vue`, `ContableComisionesTab.vue`, `CalendarEventCard.vue`, `ForgotPasswordView.vue`, `LoginView.vue`, `GoalProgressCard.vue`?**
  _High betweenness centrality (0.344) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `vue`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`, `eslint-config-prettier`, `eslint-plugin-oxlint`, `oxlint`, `prettier`, `@tsconfig/node24`, `typescript`, `vue-eslint-parser`, `vue-tsc`, `@vue/tsconfig`, `jiti`, `eslint`, `devDependencies`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `AVATARS_DIR` to the rest of the system?**
  _806 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UsuarioFormView.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._
- **Should `HotelCalendarMobile.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05391120507399577 - nodes in this community are weakly interconnected._
- **Should `PhotoSessionFormMobile.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06050420168067227 - nodes in this community are weakly interconnected._