---
trigger: always_on
description: Estándares y directrices globales de diseño UX/UI para el proyecto JJ Studio.
---

# Guía de Estilo y Patrones Globales de UX/UI (JJ Studio)

Al concebir, diseñar o maquetar nuevas pantallas, vistas o componentes en **JJ Studio**, debes seguir estrictamente los siguientes principios globales de diseño:

---

## 1. Filosofía de Diseño: *Clean, Minimalist & Data-First*
* **Minimalismo B2B SaaS:** Interfaces limpias, con amplio respiro visual (espacio en blanco intencional), sin saturación de cajas o tarjetas anidadas (*Anti-Card Fatigue*).
* **Jerarquía Clara:** La navegación y la información siguen la estructura operativa del negocio: `País ➔ Destino / Área ➔ Hotel`.
* **Tono Humano y Accesible:** Textos y etiquetas concisos, directos y naturales en lugar de formulaciones burocráticas o técnicas.

---

## 2. Anatomía Estándar de una Pantalla

### A. Cabecera de Página (`.page-header`)
* **Título H1:** Prominente (`font-size: 1.8rem`, `font-weight: 700`, color `--heading-color: #0f172a`).
* **Subtítulo:** Texto explicativo en una o dos líneas (`font-size: 0.9rem`, color `--nav-link-color: #64748b`).
* **Acción Principal:** Botón primario en la esquina superior derecha (`el-button type="primary" size="large"` con icono).

### B. Barra de Filtros y Herramientas (`.toolbar-bar` / `.toolbar-card`)
* Estructurada en una sola fila (`display: flex; justify-content: space-between; align-items: center;`).
* Controles de búsqueda (`el-input :prefix-icon="Search" size="large"`) y selectores geográficos (`el-select size="large"`) alineados a la izquierda.
* Acciones secundarias o de recálculo/exportación alineadas a la derecha con botones `plain` o tipo outline.

### C. Contenedores de Datos y Formularios (`.table-card` / `.matrix-card`)
* Un único contenedor unificado con bordes sutiles (`1px solid var(--toolbar-border, #e2e8f0)`), esquinas redondeadas (`border-radius: 10px` a `12px`) y sombra casi imperceptible.
* En lugar de meter cada campo en una caja independiente, separa las secciones temáticas mediante espacio en blanco y separadores discretos (`el-divider border-style="dashed"`).

---

## 3. Jerarquía Visual y Datos Protagonistas (*Data-First*)
* **Métricas y Números en Grande:** Los porcentajes, KPIs y montos clave deben mostrarse en tipografía gigante (`font-size: 1.4rem` a `3rem`, `font-weight: 700` a `800`) contiguos a sus controles.
* **Controles Visuales Fluidos:** Emplea controles deslizantes (`el-slider`) y barras de progreso (`el-progress`) para valores continuos o porcentuales en lugar de inputs numéricos rígidos con botones `+/-`.
* **Badges y Etiquetas Suaves:** Identificadores de rol y estados con esquinas redondeadas suaves (*soft pills*), fondo pastel y avatar/emoji temático con descripción en línea.

---

## 4. Paleta de Colores y Tokens Semánticos

### Variables Base (Soporte Light / Dark):
* **Fondo de App (`--app-bg`):** `#f8fafc` (Slate 50) | Dark: `#121212`
* **Contenedores/Tarjetas (`--toolbar-bg`, `--sidebar-bg`):** `#ffffff` | Dark: `#1d1e1f`
* **Bordes (`--sidebar-border`, `--toolbar-border`):** `#e2e8f0` (Slate 200) | Dark: `#363637`
* **Texto Principal (`--heading-color`):** `#0f172a` (Slate 900) | Dark: `#ffffff`
* **Texto Secundario (`--nav-link-color`):** `#64748b` (Slate 500) | Dark: `#a1a1aa`
* **Acento Primario JJ Studio:** `#409eff` / `#3b82f6`

### Colores Semánticos por Rol:
* **Fotógrafo:** Verde / Esmeralda (`#10b981` / `#67c23a`, tag `success` / `salaried`)
* **Vendedor / Agendador:** Azul (`#3b82f6` / `#2563eb`, tag `primary` / `commission-only`)
* **Supervisor:** Ámbar (`#e6a23c`, tag `warning`)
* **Gerente:** Rojo coral (`#f56c6c`, tag `danger`)
* **Contable:** Gris / Pizarra (`#909399`, tag `info`)

---

## 5. Convenciones de Stack y Componentes
* **Framework:** Vue 3 (Composition API `<script setup lang="ts">`).
* **Componentes UI:** Element Plus (`el-card`, `el-table`, `el-slider`, `el-tabs`, `el-select`, `el-dialog`, `el-button`, `el-tag`, `el-avatar`, `el-progress`).
* **Iconografía:** `@element-plus/icons-vue` y `@lucide/vue` (`Building2`, etc.).
* **Diálogos de Confirmación:** Modales compactos (`width: 400px` - `420px`) con icono de advertencia y acciones explícitas (*Cancelar* / *Eliminar*).
* **Feedback:** Notificaciones no intrusivas con `ElMessage.success()` y `ElMessage.error()`.

---

## 6. Reglas Críticas de Intervención en CSS y Componentes
* **Principio de Mínima Intervención:** No parchear o reescribir bordes, radios de esquina (`border-radius`) o paddings globales para resolver problemas locales de desborde/alineación. Identificar y aplicar la propiedad puntual exacta (ej. `overflow: hidden;` en contenedores) sin alterar la integridad del componente.
* **Respeto a los Componentes Base:** Respetar la estructura y comportamiento nativo de los componentes de Element Plus (como `type="card"` en `el-tabs`). NUNCA desarmar sus bordes ni redefinir estilos internos a menos que se solicite un rediseño completo explícito.
* **Verificación Visual Estricta:** Al validar cambios en navegador, verificar exhaustivamente que no se hayan roto o eliminado `border-radius`, bordes superiores/inferiores o alineaciones existentes en las áreas adyacentes.

