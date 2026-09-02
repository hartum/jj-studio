# Detalles Acordados sobre el Perfil de Fotógrafos y Reglas de Comisiones

Este documento recopila las definiciones funcionales, la visibilidad de agenda, el comportamiento esperado para la pantalla inicial del fotógrafo y las reglas relativas al reparto y configuración de comisiones en el sistema **JJ Studio**.

---

## 1. Pantalla Inicial del Fotógrafo
* Al entrar en la app, lo primero que debe ver el fotógrafo es un **calendario muy accesible** desde el menú.
* **El calendario debe mostrar**:
  * Sesiones del día, semana o mes.
  * Ventas del día, semana o mes.
  * **Todo el calendario del hotel**, no solo las sesiones asignadas a ese fotógrafo.
* **Objetivo**: Que el fotógrafo vea la operación completa del hotel para coordinarse mejor con otros fotógrafos.

---

## 2. Visibilidad del Calendario
* Un fotógrafo puede ver el calendario de los **hoteles a los que está asignado**.
* **No debe ver** hoteles ajenos a su asignación.
* **Propósito operativo**: Saber qué más está ocurriendo en el hotel para evitar solapes y retrasos.

---

## 3. Motivo de Ver Todo el Calendario
* Se quiere evitar que un fotógrafo agende una sesión larga justo después de otra sesión grande.
  * *Ejemplo comentado en reunión*: Si hay reservada una familia de 8 personas, el fotógrafo debe ver esa sesión para saber que no podrá encajar otra sesión de una hora inmediatamente después sin riesgo.
* También sirve para que otro fotógrafo pueda apoyar o avisar si ve una carga de trabajo mal distribuida.

---

## 4. Datos Necesarios para Agendar una Sesión
Para crear/agendar una sesión fotográfica, los datos mínimos requeridos son:
* **Nombre del cliente**
* **Email**
* **Teléfono / Contacto**
* **Nº de habitación** (si aplica)
* **Número de personas**
* **Fecha y hora de la sesión**
* **Concepto o motivo de la sesión**:
  * Ejemplos predefinidos: Boda, Familia, Pareja, Pedida de mano, Cumpleaños, Revelación de género, etc.
  * Debe existir siempre la opción **"Otro"**.

---

## 5. Metas y Objetivos
* Las metas y comisiones se calculan y evalúan por **mes**.
* Existen **dos niveles de meta**:
  1. **Meta del fotógrafo** (personal).
  2. **Meta del hotel** (global).
* **Reparto de la meta del hotel**: La meta del hotel se reparte a partes iguales (igualitaria) entre los fotógrafos activos asignados al hotel en ese mes.
* **Visualización para el fotógrafo**: Debe consultar de forma diaria en su pantalla inicial:
  * Cómo va su meta personal.
  * Cómo va la meta del hotel.

---

## 6. Comisiones
* **Momento de cálculo**: La comisión NO se calcula al agendar la sesión, sino cuando se pasa el cargo a la habitación o cuando la venta queda procesada/confirmada.
* **Consulta**: El fotógrafo debe poder consultar en una pantalla independiente cómo va su comisión acumulada del mes.
* También debe ser visible el estado general de la comisión del hotel.

---

## 7. Tipos de Perfiles Implicados en la Venta
En el flujo operativo de venta participan distintos roles:
* **Fotógrafo**: Realiza la sesión fotográfica.
* **Agendador / Vendedor / Captador**: Capta la reserva o agenda la cita.
* **Supervisor**: Supervisa la operación del hotel.
* **Contable**: Audita y liquida pagos.

---

## 8. Reparto de Comisiones y Matriz de Porcentajes

### Reglas Generales de Reparto (según estado de contratación):
* **Proceso completo**: Si el fotógrafo agenda y realiza la sesión fotográfica, recibe la comisión completa o combinada.
* **Fotógrafo Contratado (Asalariado)**: Percibe un **14%** de comisión sobre las ventas asignadas.
* **Fotógrafo No Contratado (Sin salario / Comisión pura)**: Percibe un **20%** de comisión sobre las ventas asignadas.
* **Vendedor / Agendador Contratado (Asalariado)**: Percibe un **6%** de comisión por captar/agendar la venta.
* **Vendedor / Agendador No Contratado (Sin salario)**: Percibe un **8%** de comisión por captar/agendar la venta.
* **Reparto combinado si no hace todo el proceso**: Si el fotógrafo no hace la captación/agenda, el agendador se lleva su comisión correspondiente (6% u 8%, o el 5% estándar mencionado en la conversación).
* **Supervisor**: Percibe una comisión fija del **2%** sobre la venta total del hotel/grupo.
* **Gerente**: Percibe una comisión fija del **2%** de las ventas en todos los hoteles de su área.

### Matriz de Porcentajes de Comisión (Tabla México):

| Rol / Perfil | Alcance de Comisión | Asalariado (Con salario) | Sin salario (Comisión pura) |
| :--- | :--- | :---: | :---: |
| **Gerente** | De venta en todos los hoteles de su área/país | **2%** | - |
| **Supervisor** | De la venta total de su hotel asignado | **2%** | - |
| **Fotógrafo** | De las ventas asignadas | **14%** | **20%** |
| **Vendedor / Agendador** | De las ventas captadas/agendadas | **6%** | **8%** |

---

## 9. Variación y Flexibilidad de Comisiones
* Aunque las comisiones base se definan por contrato, en la aplicación el sistema debe ser capaz de estructurarse según las reglas y porcentajes aplicables.
* Las comisiones pueden variar en función de:
  * **Hotel**
  * **País**
  * **Tipo de contrato** (Asalariado vs Sin salario)
* La lógica del backend y frontend debe permitir actualizar esos valores cuando se definan cambios en la estructura de comisiones.

---

## 10. Permisos de Edición de Comisiones
* **Pueden editar comisiones**:
  * Administrador general / Dueño (`ADMIN` / `SUPERUSUARIO`)
  * Gerente de Área (`GERENTE`)
  * Contable (`CONTABLE`)
* **NO pueden editar comisiones**:
  * Fotógrafos
  * Supervisores
  * Otros perfiles operativos

---

## 11. Configuración Editable
* Debe existir un panel de configuración en el sistema para cambiar y ajustar las comisiones sin necesidad de modificar código fuente o redesplegar el software.

---

## 12. Definición de Metas del Hotel
* Las metas del hotel las establece principalmente el **Gerente de Área** o el **Administrador**.
* Los supervisores no definen las metas globales directamente.

---

## 13. Prioridad de Desarrollo Acordada
1. Prioridad 1: Módulo y pantalla operativa del **Fotógrafo**.
2. Prioridad 2: Panel e indicadores para el **Supervisor**.

---

## 14. Resumen Funcional del Módulo de Fotógrafo
El módulo de fotógrafo debe permitir:
1. Ver el **calendario completo** del hotel al que pertenece.
2. Ver **sesiones y ventas** registradas.
3. Consultar **metas mensuales** (personales y del hotel).
4. Consultar **comisión acumulada mensual**.
5. Aplicar las reglas de comisión según contrato y rol.
