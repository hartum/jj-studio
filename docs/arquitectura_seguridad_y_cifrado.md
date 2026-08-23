# Arquitectura de Seguridad y Cifrado de Datos Sensibles (JJ Studio)

Este documento detalla la arquitectura de seguridad, la estrategia criptográfica, las librerías empleadas y los flujos de migración y verificación implementados en **JJ Studio** para la protección de datos personales identificables (PII) en reposo y en tránsito.

---

## 1. 🎯 Objetivos de Seguridad

1. **Privacidad y Cumplimiento Normativo (RGPD / Protección de Datos):**
   - Proteger los datos personales de los empleados (usuarios) y clientes (huéspedes de hotel) frente a posibles filtraciones de volcados de base de datos (*database dumps*).
2. **Cifrado Reversible para la Operativa:**
   - La aplicación necesita visualizar y editar nombres, emails y teléfonos legítimos en la interfaz SaaS y sincronizarlos con calendarios externos (Google Calendar).
3. **Imposibilidad de Recuperar Contraseñas:**
   - Las credenciales de acceso permanecen bajo algoritmos de función unidireccional (*one-way cryptographic hash*), garantizando que nadie (ni administradores ni atacantes) pueda conocer las contraseñas en texto plano.
4. **Búsqueda Eficiente sin Comprometer la Seguridad:**
   - Permitir autenticación (`login`) y validación de unicidad en milisegundos sin necesidad de recorrer ni desencriptar toda la base de datos en memoria.

---

## 2. 🛡️ Estrategia Criptográfica Implementada

### A. Cifrado Simétrico Reversible: AES-256-GCM
Para los datos personales sensibles que la aplicación debe consultar y renderizar:

* **Algoritmo:** `AES-256-GCM` (*Advanced Encryption Standard* en modo *Galois/Counter Mode* con clave de 256 bits).
* **Propiedades:** Cifrado Autenticado (*Authenticated Encryption with Associated Data - AEAD*). Proporciona simultáneamente **confidencialidad** (nadie puede leer el dato) e **integridad** (cualquier modificación corrupta o maliciosa en base de datos es detectada inmediatamente y rechazada).
* **Vector de Inicialización (IV):** Generado de forma aleatoria y única para cada campo (`12 bytes` / 96 bits con `crypto.randomBytes(12)`). Esto garantiza que dos usuarios con el mismo nombre o correo tengan textos cifrados completamente distintos en la base de datos, evitando ataques de inferencia por frecuencia.
* **Tag de Autenticación (Auth Tag):** `16 bytes` (128 bits) generados por el cifrador GCM.
* **Formato de Almacenamiento:**
  ```text
  enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
  ```
  *(Ejemplo: `enc:v1:9ac9a18906833a5bf21d6e4a:4993f583dab43bd46ba26638ae93d3c7:8061007ddb19`)*

#### Campos protegidos con AES-256-GCM:
* **Tabla `usuarios` (`Usuario`):**
  * `nombre` (`VARCHAR(512)`)
  * `apellidos` (`VARCHAR(512)`)
  * `email` (`VARCHAR(512)`)
  * `telefono` (`VARCHAR(512)`)
* **Tabla `sesiones_fotograficas` (`SesionFotografica`):**
  * `cliente_nombre` (`VARCHAR(512)`)
  * `cliente_email` (`VARCHAR(512)`)
  * `cliente_telefono` (`VARCHAR(512)`)

---

### B. Búsqueda y Unicidad: Blind Index (HMAC-SHA256)
Dado que los emails están cifrados con un IV aleatorio diferente en cada guardado, no es posible hacer una consulta SQL directa de tipo `WHERE email = '...'`.

* **Solución:** Índice Ciego (*Blind Index*).
* **Algoritmo:** `HMAC-SHA256` utilizando la clave maestra del servidor (`ENCRYPTION_KEY`).
* **Normalización:** Antes de calcular el hash, el texto se normaliza (se eliminan espacios en los extremos y se pasa a minúsculas: `email.trim().toLowerCase()`).
* **Columna en Base de Datos:** `email_hash` (`VARCHAR(64)` con restricción `@unique` en la tabla `usuarios`).
* **Flujo de Login / Búsqueda:**
  1. El usuario introduce `usuario@ejemplo.com` en el login.
  2. El backend calcula `blindIndex("usuario@ejemplo.com")` -> genera `e543b137b2382...`.
  3. Ejecuta una búsqueda indexada instantánea en MariaDB: `WHERE email_hash = 'e543b137b2382...'`.

---

### C. Almacenamiento de Contraseñas: Bcrypt
Las contraseñas **NUNCA** se cifran de forma reversible.

* **Algoritmo:** `bcryptjs` con 10 rondas de salteo (*salt rounds*).
* **Prefijo:** `$2a$` / `$2b$`.
* **Verificación:** Se utiliza exclusivamente `bcrypt.compare(passwordPlana, user.passwordHash)`.

---

## 3. 📦 Librerías y Módulos Utilizados

| Módulo | Tipo | Propósito |
|---|---|---|
| `node:crypto` | Módulo nativo de Node.js | Cifrado y descifrado `AES-256-GCM`, generación de IV aleatorios con `randomBytes`, cálculo de hashes HMAC-SHA256 (*Blind Index*) y SHA-256 para tokens. Cero dependencias externas y máximo rendimiento a nivel de C++. |
| `bcryptjs` | Dependencia npm | Hashing seguro de contraseñas con sal y coste configurable. |
| `prisma` & `@prisma/client` | ORM | Mapeo objeto-relacional y sincronización del esquema con MariaDB. |
| `dotenv` | Configuración | Carga segura de variables de entorno (`.env`) sin exponer secretos al control de versiones. |

---

## 4. 🔑 Gestión de Claves y Variables de Entorno

* **Variable:** `ENCRYPTION_KEY`
* **Formato recomendado:** Clave hexadecimal de 64 caracteres (256 bits) generada criptográficamente (ejemplo: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
* **Aislamiento:**
  * Cada entorno (Desarrollo Local vs Servidor de Producción VPS) dispone de su propio archivo `.env` en `backend/.env`.
  * **Regla Inviolable:** Los archivos `.env` están rigurosamente ignorados en `.gitignore` y **nunca** se suben a repositorios Git.

---

## 5. 🏗️ Arquitectura de Código y Módulos

```
backend/src/
├── shared/
│   ├── encryption.ts         # Motor criptográfico: encrypt, decrypt, blindIndex, decryptUser, decryptSesion
│   └── db.ts                 # Instancia global de Prisma Client
├── features/
│   ├── users/
│   │   └── infrastructure/
│   │       └── user.routes.ts # Cifrado al crear/editar usuarios, login por emailHash, descifrado en listados
│   ├── photo-sessions/
│   │   └── infrastructure/
│   │       └── session.routes.ts # Cifrado de datos de cliente al agendar/editar, descifrado en agenda
│   ├── sales/
│   │   └── infrastructure/
│   │       └── sale.routes.ts # Descifrado de clientes y vendedores en citas de venta
│   ├── commissions/
│   │   └── infrastructure/
│   │       └── commission.routes.ts # Descifrado de clientes y usuarios en liquidación de comisiones
│   └── integrations/
│       └── google-calendar/
│           └── google-calendar.service.ts # Descifrado al vuelo para alimentar eventos de Google Calendar
└── scripts/
    ├── migrate-encrypt-all.ts       # Script de migración en lote para aplicar cifrado en BD existente
    ├── test-crypto.ts               # Test unitario básico de primitivas criptográficas
    └── verify-encryption-e2e.ts     # Suite integral de verificación End-to-End
```

---

## 6. 🚀 Scripts de Migración y Verificación

### Script de Migración Unificado (`migrate-encrypt-all.ts`):
Es idempotente. Puede ejecutarse tantas veces como sea necesario; si un registro ya está cifrado (`enc:v1:...`), lo mantiene intacto sin doble cifrado.
```bash
npx tsx src/scripts/migrate-encrypt-all.ts
```

### Script de Verificación End-to-End (`verify-encryption-e2e.ts`):
Valida todo el ciclo:
1. Comprueba formato `enc:v1:` y longitud en base de datos cruda.
2. Comprueba descifrado correcto para la capa de aplicación.
3. Inserta un usuario de prueba cifrado y lo recupera por su `Blind Index`.
4. Valida el funcionamiento de `bcrypt.compare`.
5. Comprueba el cifrado de las sesiones fotográficas.
6. Limpia los datos de prueba.

```bash
npx tsx src/scripts/verify-encryption-e2e.ts
```
