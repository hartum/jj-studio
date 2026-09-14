# Graph Report - .  (2026-09-07)

## Corpus Check
- 200 files · ~229,953 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1187 nodes · 1695 edges · 82 communities (74 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend Seed and Migration Services
- Frontend Core Dependencies
- User Form and Profile Management
- ESLint and Code Quality Tooling
- Photo Sessions Mobile Calendar
- Photo Session Mobile Form
- Hotel Management Store and Models
- Sales Goals and Targets UI
- Hotel Calendar Desktop View
- Email Templates Management UI
- Email Reminder Backend Service
- Country and Region Configuration
- Sale Appointment Mobile Form
- Audit Log Store and Views
- Sale Appointment Desktop Form
- Commission Configuration and Store
- App Shell Navigation and Router
- Requirements and Roadmap Documentation
- Calendar Events and Alerts Logic
- Photo Session Desktop Form
- Work Schedule and Calendar Store
- Backend TypeScript Configuration
- Photographer Profile Specs
- User Repository and Profiles Store
- Backend Server Dependencies
- Goals Goal.Model
- Tsconfig App
- Agents
- Package
- Goals Goalevolutionchart
- Users Usuariosview
- Project_Context
- Docs Arquitectura_Seguridad_Y_Cifrado
- Auth Resetpasswordview
- Photo-sessions Calendarmobiledatenavigator
- Sales Usesaleappointmentform
- Ux Design Rules
- Docs Configuracion_Servicio_Email_Y_Dominios
- Goals Supervisorhotelgoalcard
- Home Agendadordashboard
- Home Auth.Store
- Configuration Configuracionview
- Goals Goal.Model
-  Oxlintrc
- Readme
- Goals Goal.Model
- Goals Goal.Model
- Package
- Goals Agendadorhotelgoalcard
- Docs Guia_Iconos_Lucide
- Auth Loginview
- Permissions
- Project-management Project.Repository
- Control_Acceso Segun Roles
- Sidebarnav
- Users Usephotosessionform
- Sales Calendaralertspanel
- Photo-sessions Calendareventcard
- Package
- Email Service
- Auth Forgotpasswordview
- Home Admindashboard
- Photo-sessions Calendarheader
-  Prettierrc
- Photo-sessions Calendaralertspanel
- Photo-sessions Calendardesktoptoolbar
- Photo-sessions Calendarmobileheader
- Photo-sessions Photosessionformview
- Package
- Photo-sessions Calendardeleteconfirmpopover
- Photo-sessions Hotelcalendarview
- Tsconfig
- Package
- Package
- Photo-sessions Photosessionformmobile

## God Nodes (most connected - your core abstractions)
1. `vue` - 57 edges
2. `decryptUser()` - 30 edges
3. `prisma` - 23 edges
4. `decrypt()` - 22 edges
5. `encrypt()` - 20 edges
6. `saleRoutes()` - 17 edges
7. `syncSesionToGoogle()` - 16 edges
8. `sessionRoutes()` - 15 edges
9. `blindIndex()` - 15 edges
10. `Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones` - 15 edges

## Surprising Connections (you probably didn't know these)
- `useDashboard()` --indirect_call--> `formatCurrency()`  [INFERRED]
  frontend/src/features/home/composables/useDashboard.ts → frontend/src/features/goals/ui/GoalProgressCard.vue
- `useCalendarEvents()` --indirect_call--> `getEventCountForDate()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/useCalendarEvents.ts → frontend/src/features/photo-sessions/ui/components/CalendarMobileHeader.vue
- `useCalendarEvents()` --indirect_call--> `formatDateTime()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/useCalendarEvents.ts → frontend/src/features/photo-sessions/ui/components/CalendarAlertsPanel.vue
- `usePhotoSessionForm()` --indirect_call--> `formatDateIso()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/usePhotoSessionForm.ts → frontend/src/features/users/ui/CalendarioLaboral.vue
- `usePhotoSessionForm()` --indirect_call--> `getUserBgColor()`  [INFERRED]
  frontend/src/features/photo-sessions/composables/usePhotoSessionForm.ts → frontend/src/features/users/utils/user-avatar.ts

## Import Cycles
- None detected.

## Communities (82 total, 8 thin omitted)

### Community 0 - "Backend Seed and Migration Services"
Cohesion: 0.06
Nodes (82): main(), prisma, seedUser(), AuditParams, DIAS_SEMANA, formatAuditDateTime(), formatCreadorOriginal(), MESES (+74 more)

### Community 1 - "Frontend Core Dependencies"
Cohesion: 0.04
Nodes (47): dayjs, element-plus, @element-plus/icons-vue, dependencies, dayjs, element-plus, @element-plus/icons-vue, @fullcalendar/core (+39 more)

### Community 2 - "User Form and Profile Management"
Cohesion: 0.04
Nodes (35): activeTab, assignableProfiles, assignedAreaIdsByOtherGerentes, assignedAreaNames, assignedHotelIdsByOtherSupervisores, assignedHotelNames, assignedNames, authStore (+27 more)

### Community 3 - "ESLint and Code Quality Tooling"
Cohesion: 0.05
Nodes (37): eslint, eslint-config-prettier, eslint-plugin-oxlint, eslint-plugin-vue, devDependencies, eslint, eslint-config-prettier, eslint-plugin-oxlint (+29 more)

### Community 4 - "Photo Sessions Mobile Calendar"
Cohesion: 0.06
Nodes (26): useCalendarScope(), {
  calendarEvents,
  eventsCountByDate,
  clearEventHighlights,
}, calendarOptions, calendarRef, canDeleteEvents, currentCalendarTitle, currentCalendarView, { currentUser, userHotels, selectedHotelIds, selectedHotelName, initSelectedHotel } (+18 more)

### Community 5 - "Photo Session Mobile Form"
Cohesion: 0.06
Nodes (21): estadoOptions, handleSave(), minuteSlots, mobileCheckoutPreview, mobileCitaVentaPreview, mobileSessionPreview, motivoOptions, props (+13 more)

### Community 6 - "Hotel Management Store and Models"
Cohesion: 0.08
Nodes (21): CreateHotelPayload, Hotel, UpdateHotelPayload, useHotelStore, allAreasFlat, areaFilter, countryStore, filteredHotels (+13 more)

### Community 7 - "Sales Goals and Targets UI"
Cohesion: 0.07
Nodes (26): AreaGroup, assignedPhotographers, authStore, availableHotels, CountryGroup, countryStore, currentHotel, customPhotographerGoals (+18 more)

### Community 8 - "Hotel Calendar Desktop View"
Cohesion: 0.07
Nodes (21): {
  calendarEvents,
  highlightEventAndAssociated,
  clearEventHighlights,
}, calendarOptions, calendarRef, canDeleteEvents, currentCalendarTitle, currentCalendarView, currentPeriodStats, { currentUser, userHotels, selectedHotelIds, selectedHotelName, initSelectedHotel } (+13 more)

### Community 9 - "Email Templates Management UI"
Cohesion: 0.08
Nodes (21): EmailTemplate, PreviewResult, useEmailTemplates(), VariableInfo, activeTab, authStore, categorizedVariables, currentTemplate (+13 more)

### Community 10 - "Email Reminder Backend Service"
Cohesion: 0.20
Nodes (21): formatDateDisplay(), formatTimeDisplay(), getMailTransporter(), getTemplate(), isValidEmail(), processAllReminders(), processSaleAppointmentReminders(), processSessionReminders() (+13 more)

### Community 11 - "Country and Region Configuration"
Cohesion: 0.12
Nodes (18): AreaItem, HotelItem, Pais, WORLD_COUNTRIES, WorldCountry, useCountryStore, addingAreaCountryId, availableSelectCountries (+10 more)

### Community 12 - "Sale Appointment Mobile Form"
Cohesion: 0.09
Nodes (11): isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly, selectedMinuteOnly, showAllTimeSlots (+3 more)

### Community 13 - "Audit Log Store and Views"
Cohesion: 0.12
Nodes (11): AuditLogEntry, AuditLogFilters, AuditLogResponse, useAuditLogStore, auditStore, dateShortcuts, expandedItems, filters (+3 more)

### Community 14 - "Sale Appointment Desktop Form"
Cohesion: 0.09
Nodes (10): formattedSelectedSaleDateTime, isSellerPhotographer, minuteSlots, props, router, salesCountByHour, selectedHourOnly, selectedMinuteOnly (+2 more)

### Community 15 - "Commission Configuration and Store"
Cohesion: 0.13
Nodes (14): Comision, ComisionConfig, ResumenComisiones, useCommissionStore, AreaGroup, commissionStore, countryStore, formData (+6 more)

### Community 16 - "App Shell Navigation and Router"
Cohesion: 0.11
Nodes (15): authStore, canSeeAgenda, canSeeConfig, canSeeUsers, closeMobileDrawer(), countryStore, filteredCountriesTree, handleSelectHotelNode() (+7 more)

### Community 17 - "Requirements and Roadmap Documentation"
Cohesion: 0.11
Nodes (18): 1. Requisitos Funcionales, 2. Requisitos Técnicos y de Arquitectura, 3. Diseño de Base de Datos (Propuesta de Entidades), 4. Flujos de Usuario Detallados, 5. Plan de Trabajo por Fases, 6. Consideraciones Especiales de Negocio, A. Gestión de Estructura Organizativa, Análisis de Requisitos y Plan de Trabajo - Proyecto JJ Studio (+10 more)

### Community 18 - "Calendar Events and Alerts Logic"
Cohesion: 0.22
Nodes (12): useCalendarAlerts(), DeletableCalendarEvent, useCalendarDelete(), EventTooltipInfo, ExtendedEventProps, useCalendarEvents(), HotelDisponibilidad, CreateSesionPayload (+4 more)

### Community 19 - "Photo Session Desktop Form"
Cohesion: 0.11
Nodes (10): PhotoSessionFormContext, minuteSlots, motivoOptions, props, salesCountByHour, selectedCitaVentaHourOnly, selectedCitaVentaMinuteOnly, selectedHourOnly (+2 more)

### Community 20 - "Work Schedule and Calendar Store"
Cohesion: 0.15
Nodes (11): CalendarioLaboralFotografo, CreateCalendarioLaboralPayload, MotivoCalendarioLaboral, useCalendarioLaboralStore, formatDateIso(), getCellClassName(), isSubmitting, motivoOptions (+3 more)

### Community 21 - "Backend TypeScript Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, paths, rootDir (+9 more)

### Community 22 - "Photographer Profile Specs"
Cohesion: 0.11
Nodes (17): 10. Permisos de Edición de Comisiones, 11. Configuración Editable, 12. Definición de Metas del Hotel, 13. Prioridad de Desarrollo Acordada, 14. Resumen Funcional del Módulo de Fotógrafo, 1. Pantalla Inicial del Fotógrafo, 2. Visibilidad del Calendario, 3. Motivo de Ver Todo el Calendario (+9 more)

### Community 23 - "User Repository and Profiles Store"
Cohesion: 0.19
Nodes (9): UserRepositoryPort, Perfil, TipoContrato, User, UserInput, UserStatus, UserWithProfile, useProfileStore (+1 more)

### Community 24 - "Backend Server Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcryptjs, dotenv, fastify, @fastify/cors, @fastify/jwt, nodemailer, @prisma/client (+9 more)

### Community 25 - "Goals Goal.Model"
Cohesion: 0.20
Nodes (15): AlcanceTipo, CreateOrUpdateMetaInput, EvolucionMetasResponse, FotografoProgreso, HotelProgresoResumen, MetaDTO, PuntoDiaEvolucion, PuntoMesEvolucion (+7 more)

### Community 26 - "Tsconfig App"
Cohesion: 0.12
Nodes (16): compilerOptions, noUncheckedIndexedAccess, paths, tsBuildInfoFile, exclude, extends, include, src/**/* (+8 more)

### Community 27 - "Agents"
Cohesion: 0.12
Nodes (15): 1. Gestión de `.env` (NUNCA SUBIR A GIT):, 2. Configuración de Proxy Vite (Prevenir Error 502):, 3. Pipeline CI/CD GitHub Actions (`deploy.yml`):, 4. Cabeceras HTTP en Frontend y Fastify 5 (Prevenir Error 400 `FST_ERR_CTP_EMPTY_JSON_BODY`):, AGENTS.md - Proyecto JJ Studio, 📚 Base de Conocimiento del Proyecto (`docs/`), 🛠️ Comandos Principales, 🧼 Disciplina de Código, No-Sobreingeniería y Cero Código Muerto (Reglas Obligatorias) (+7 more)

### Community 28 - "Package"
Cohesion: 0.13
Nodes (15): devDependencies, prisma, tsx, @types/bcryptjs, @types/node, @types/node-cron, @types/nodemailer, typescript (+7 more)

### Community 29 - "Goals Goalevolutionchart"
Cohesion: 0.13
Nodes (14): activeTab, anioCoordinates, anioPoints, currentCoords, currentMax, hoveredIndex, hoveredPoint, maxValAnio (+6 more)

### Community 30 - "Users Usuariosview"
Cohesion: 0.13
Nodes (9): authStore, countryStore, currentUser, filteredUsers, profileStore, router, searchQuery, userStore (+1 more)

### Community 31 - "Project_Context"
Cohesion: 0.14
Nodes (13): 1. Naturaleza del Negocio, 2. Roles de Usuario y Permisos (RBAC & Multi-Tenant Lógico), 3. Módulos Funcionales Clave y Reglas de Negocio, 4. Stack Tecnológico Acordado, 5. Reglas Críticas de Entornos y Despliegue (Local vs VPS Producción), 6. Disciplina de Desarrollo: Anti-Sobreingeniería y Cero Código Muerto, 7. Instrucciones Generales para el Agente AI, A. Gestión Estricta de Archivos `.env` (¡NUNCA SUBIR A GIT!): (+5 more)

### Community 32 - "Docs Arquitectura_Seguridad_Y_Cifrado"
Cohesion: 0.14
Nodes (13): 1. 🎯 Objetivos de Seguridad, 2. 🛡️ Estrategia Criptográfica Implementada, 3. 📦 Librerías y Módulos Utilizados, 4. 🔑 Gestión de Claves y Variables de Entorno, 5. 🏗️ Arquitectura de Código y Módulos, 6. 🚀 Scripts de Migración y Verificación, A. Cifrado Simétrico Reversible: AES-256-GCM, Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio) (+5 more)

### Community 33 - "Auth Resetpasswordview"
Cohesion: 0.14
Nodes (12): confirmPassword, isCheckingToken, isCompleted, isLoading, isTokenValid, password, route, router (+4 more)

### Community 34 - "Photo-sessions Calendarmobiledatenavigator"
Cohesion: 0.14
Nodes (13): currentDayjs, emit, endDayNumber, endOfWeek, formattedDayNumber, formattedMonth, formattedWeekday, isWeekMode (+5 more)

### Community 35 - "Sales Usesaleappointmentform"
Cohesion: 0.25
Nodes (10): SaleAppointmentFormContext, SaleAppointmentFormData, SessionContextInfo, VendedorDisponibilidadItem, VendedoresDisponibilidadResponse, CitaVenta, ConflictoCitaVenta, CreateCitaVentaPayload (+2 more)

### Community 36 - "Ux Design Rules"
Cohesion: 0.15
Nodes (12): 1. Filosofía de Diseño: *Clean, Minimalist & Data-First*, 2. Anatomía Estándar de una Pantalla, 3. Jerarquía Visual y Datos Protagonistas (*Data-First*), 4. Paleta de Colores y Tokens Semánticos, 5. Convenciones de Stack y Componentes, 6. Reglas Críticas de Intervención en CSS y Componentes, A. Cabecera de Página (`.page-header`), B. Barra de Filtros y Herramientas (`.toolbar-bar` / `.toolbar-card`) (+4 more)

### Community 37 - "Docs Configuracion_Servicio_Email_Y_Dominios"
Cohesion: 0.15
Nodes (12): 1.1. Registro Tipo A (Dirección Web), 1.2. Registro Tipo TXT (SPF - Autenticación Antispam para Google/Outlook), 5.1. Prueba rápida de envío desde la terminal del VPS:, 5.2. Comprobar los logs de entrega en tiempo real:, 5.3. Comprobar la cola de correo:, Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio), 🛠️ Paso 1: Configuración de Registros DNS (Panel del Registrador de Dominio), 🔒 Paso 2: Servidor Web y Certificado SSL (FastPanel / Nginx) (+4 more)

### Community 38 - "Goals Supervisorhotelgoalcard"
Cohesion: 0.27
Nodes (11): getProgressColor(), getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), getSemaforoTagType(), getSemaforoText(), isSinMeta() (+3 more)

### Community 39 - "Home Agendadordashboard"
Cohesion: 0.15
Nodes (8): {
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
}, router, {
  countryStore,
  hotelStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  yearsOptions,
  formatCurrency,
  globalMonthlyCommissions,
  handleUpdateCommissionStatus,
}, {
  commissionStore,
  selectedMes,
  photographerHotels,
  photographerPersonalGoals,
  getTodaySessionsForHotel,
  getTodaySalesForHotel,
  formatTime,
  goToAgenda,
  formatCurrency,
  myMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
}, {
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilter,
  formatCurrency,
  supervisorHotels,
  supervisorMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
}, authStore, currentUser, userRole

### Community 40 - "Home Auth.Store"
Cohesion: 0.17
Nodes (9): AuthUser, useAuthStore, monthsOptions, PhotographerHotelData, AreaGroup, CountryGroup, {
  countryStore,
  hotelStore,
  goalStore,
  commissionStore,
  selectedAnio,
  selectedMes,
  selectedHotelFilters,
  yearsOptions,
  currentHotelProgreso,
  filteredProgresoHoteles,
  globalProgresoTotals,
  selectedHotelsSummary,
  getSemaforoTagType,
  getSemaforoText,
  getProgressColor,
  formatCurrency,
  handleNavigateToGoalForm,
  managerAreas,
  managerHotels,
  managerTeam,
  gerenteMonthlyCommissions,
  myCommissionFormula,
  myCommissionTooltip,
}, groupedManagerHotelsByCountry (+1 more)

### Community 41 - "Configuration Configuracionview"
Cohesion: 0.18
Nodes (9): activeTab, authStore, canManageCommissions, canManageEmailTemplates, defaultTab, isSuperOrAdmin, route, router (+1 more)

### Community 42 - "Goals Goal.Model"
Cohesion: 0.25
Nodes (8): AlcanceTipo, EvolucionMetasResponse, HotelProgresoResumen, Meta, PuntoDiaEvolucion, PuntoMesEvolucion, SaveMetaPayload, useGoalStore

### Community 43 - " Oxlintrc"
Cohesion: 0.18
Nodes (10): categories, correctness, env, browser, plugins, $schema, eslint, oxc (+2 more)

### Community 44 - "Readme"
Cohesion: 0.20
Nodes (9): Compile and Hot-Reload for Development, Customize configuration, JJ Studio, Lint with [ESLint](https://eslint.org/), Project Setup, Recommended Browser Setup, Recommended IDE Setup, Type-Check, Compile and Minify for Production (+1 more)

### Community 45 - "Goals Goal.Model"
Cohesion: 0.20
Nodes (5): FotografoProgreso, displayHotelTitle, fotografoSubtitle, numFotografos, props

### Community 46 - "Goals Goal.Model"
Cohesion: 0.20
Nodes (9): SemaforoEstado, cappedPercentage, formatCurrency(), isSinMeta, props, semaforoBgLight, semaforoColor, semaforoIcon (+1 more)

### Community 47 - "Package"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, main, name, type, version

### Community 48 - "Goals Agendadorhotelgoalcard"
Cohesion: 0.33
Nodes (7): displayHotelTitle, getSemaforoBg(), getSemaforoColor(), getSemaforoIcon(), getSemaforoLabel(), isSinMeta(), props

### Community 49 - "Docs Guia_Iconos_Lucide"
Cohesion: 0.25
Nodes (7): 1. Importación y Uso Básico, 2. Integración con Element Plus, 💡 Buenas Prácticas, 🎨 Formas de Uso, Guía de Uso de Iconos Lucide (`@lucide/vue`), 📦 Paquete Instalado, ⚙️ Propiedades Principales de los Iconos

### Community 50 - "Auth Loginview"
Cohesion: 0.25
Nodes (6): authStore, email, isLoading, password, rememberMe, router

### Community 51 - "Permissions"
Cohesion: 0.32
Nodes (7): canAccessRoute(), canDeleteUser(), canEditUser(), getRolePermissions(), PERMISSION_MATRIX, RoleCode, RoleConfig

### Community 53 - "Control_Acceso Segun Roles"
Cohesion: 0.29
Nodes (6): 1. Módulo Core de Permisos y Auth Store, 2. Capa de Frontend, 3. Capa de Backend, Cambios Realizados, Resumen de Implementación de Permisos y Matriz RBAC Multi-Tenant, Verificación

### Community 54 - "Sidebarnav"
Cohesion: 0.38
Nodes (6): AreaNode, CountryNode, emit, handleHotelClick(), handleNavClick(), HotelNode

### Community 55 - "Users Usephotosessionform"
Cohesion: 0.33
Nodes (4): usePhotoSessionForm(), getUserBgColor(), getUserInitials(), svgMap

### Community 56 - "Sales Calendaralertspanel"
Cohesion: 0.29
Nodes (5): formatDateTime(), useSaleAppointmentForm(), useSaleStore, form, isMobile

### Community 57 - "Photo-sessions Calendareventcard"
Cohesion: 0.29
Nodes (5): emit, eventStatus, Props, STATUS_MAP, StatusConfig

### Community 58 - "Package"
Cohesion: 0.33
Nodes (6): scripts, build, db:push, db:seed, dev, start

### Community 59 - "Email Service"
Cohesion: 0.53
Nodes (5): escapeHtml(), getAppBaseUrl(), getMailTransporter(), sendPasswordResetEmail(), SendPasswordResetParams

### Community 60 - "Auth Forgotpasswordview"
Cohesion: 0.33
Nodes (4): email, isLoading, isSubmitted, router

### Community 61 - "Home Admindashboard"
Cohesion: 0.33
Nodes (4): AreaGroup, CountryGroup, {
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
}, groupedHotelsByCountry

### Community 62 - "Photo-sessions Calendarheader"
Cohesion: 0.33
Nodes (5): AreaGroup, CountryGroup, emit, groupedHotelsByCountry, Props

### Community 63 - " Prettierrc"
Cohesion: 0.33
Nodes (5): htmlWhitespaceSensitivity, printWidth, $schema, semi, singleQuote

### Community 64 - "Photo-sessions Calendaralertspanel"
Cohesion: 0.40
Nodes (4): activeAlertPanels, Props, router, totalAlertsCount

### Community 65 - "Photo-sessions Calendardesktoptoolbar"
Cohesion: 0.50
Nodes (3): emit, PeriodStats, Props

### Community 66 - "Photo-sessions Calendarmobileheader"
Cohesion: 0.50
Nodes (3): emit, getEventCountForDate(), Props

### Community 68 - "Package"
Cohesion: 0.50
Nodes (3): devDependencies, @types/node, @types/node

## Knowledge Gaps
- **596 isolated node(s):** `$schema`, `eslint`, `typescript`, `unicorn`, `oxc` (+591 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `Home Auth.Store` to `User Form and Profile Management`, `Photo Sessions Mobile Calendar`, `Photo Session Mobile Form`, `Hotel Management Store and Models`, `Sales Goals and Targets UI`, `Hotel Calendar Desktop View`, `Email Templates Management UI`, `Country and Region Configuration`, `Sale Appointment Mobile Form`, `Audit Log Store and Views`, `Sale Appointment Desktop Form`, `Commission Configuration and Store`, `App Shell Navigation and Router`, `Calendar Events and Alerts Logic`, `Photo Session Desktop Form`, `Work Schedule and Calendar Store`, `User Repository and Profiles Store`, `Goals Goalevolutionchart`, `Users Usuariosview`, `Auth Resetpasswordview`, `Photo-sessions Calendarmobiledatenavigator`, `Sales Usesaleappointmentform`, `Goals Supervisorhotelgoalcard`, `Home Agendadordashboard`, `Configuration Configuracionview`, `Goals Goal.Model`, ` Oxlintrc`, `Goals Goal.Model`, `Goals Goal.Model`, `Goals Agendadorhotelgoalcard`, `Auth Loginview`, `Sales Calendaralertspanel`, `Photo-sessions Calendareventcard`, `Auth Forgotpasswordview`, `Home Admindashboard`, `Photo-sessions Calendarheader`, `Photo-sessions Calendaralertspanel`, `Photo-sessions Photosessionformview`, `Photo-sessions Hotelcalendarview`?**
  _High betweenness centrality (0.282) - this node is a cross-community bridge._
- **Why does `usePhotoSessionForm()` connect `Users Usephotosessionform` to `Calendar Events and Alerts Logic`, `Photo-sessions Photosessionformview`, `Work Schedule and Calendar Store`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `ESLint and Code Quality Tooling` to `Frontend Core Dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `$schema`, `eslint`, `typescript` to the rest of the system?**
  _596 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Seed and Migration Services` be split into smaller, more focused modules?**
  _Cohesion score 0.06118850290953976 - nodes in this community are weakly interconnected._
- **Should `Frontend Core Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `User Form and Profile Management` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._