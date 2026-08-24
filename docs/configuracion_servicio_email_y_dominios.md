# Guía de Configuración del Servicio de Correo y Migración de Dominios (JJ Studio)

Esta guía documenta la infraestructura del servicio de correo electrónico (Postfix local + Nodemailer) y todos los pasos necesarios para configurar o **cambiar el dominio del sistema** en el futuro.

---

## 📌 Tabla Rápida de Variables a Reemplazar ante un Cambio de Dominio

Cuando cambies el dominio actual por uno nuevo, reemplaza los siguientes valores en los archivos y configuraciones correspondientes:

| Parámetro | Valor Actual | Nuevo Dominio (Ejemplo) |
|---|---|---|
| **Dominio de la App** | `jjstudio.hartum.net` | `app.nuevodominio.com` |
| **IPv4 del Servidor VPS** | `5.189.175.42` | `TU_IPV4_DEL_VPS` |
| **Remitente de Correos** | `no-reply@jjstudio.hartum.net` | `no-reply@nuevodominio.com` |
| **URL Base de la App** | `https://jjstudio.hartum.net` | `https://app.nuevodominio.com` |

---

## 🛠️ Paso 1: Configuración de Registros DNS (Panel del Registrador de Dominio)

En el panel de gestión DNS de tu nuevo dominio (DonDominio, Cloudflare, Namecheap, etc.):

### 1.1. Registro Tipo A (Dirección Web)
* **Tipo:** `A`
* **Nombre / Host:** `app` (o `@` si es el dominio raíz)
* **Valor:** `5.189.175.42` *(IPv4 de tu servidor VPS)*
* **TTL:** Automático o 300 segundos.

> [!WARNING]
> **No crear registro AAAA (IPv6)** a menos que Nginx/FastPanel esté explícitamente configurado para escuchar en IPv6 (`[::]:80` y `[::]:443`), de lo contrario los navegadores que usen IPv6 verán la página por defecto del hosting.

### 1.2. Registro Tipo TXT (SPF - Autenticación Antispam para Google/Outlook)
* **Tipo:** `TXT`
* **Nombre / Host:** `app` (o `@` para todo el dominio)
* **Valor:**
  ```text
  v=spf1 a mx ip4:5.189.175.42 ~all
  ```
* **Propósito:** Autoriza a la IP de tu VPS a emitir correos en nombre de tu dominio. Sin este registro, Gmail y otros proveedores rebotan los correos con error `550-5.7.26 Unauthenticated`.

---

## 🔒 Paso 2: Servidor Web y Certificado SSL (FastPanel / Nginx)

Al dar de alta el nuevo dominio en el servidor:

1. **Crear el sitio en FastPanel:**
   * Apuntar la raíz web (`DocumentRoot`) a: `/var/www/<usuario>/data/www/<nuevo_dominio>/frontend/dist`
2. **Activar Certificado SSL (HTTPS):**
   * En FastPanel ➔ Sitio ➔ **Certificados SSL** ➔ **Nuevo Certificado** ➔ **Let's Encrypt** (gratuito).
   * Si no se activa SSL, cualquier enlace `https://` mostrará la pantalla de error por defecto del VPS.
3. **Reescritura para Single Page Application (Vue Router):**
   * En la configuración de Nginx del sitio, asegúrate de que el bloque `location /` contiene la directiva de fallback:
     ```nginx
     location / {
         try_files $uri $uri/ /index.html;
     }
     ```
   * Esto permite que enlaces directos como `/reset-password?token=...` carguen la aplicación sin dar error 404.

---

## ✉️ Paso 3: Configuración de Postfix en el Servidor (VPS)

Postfix se encarga de enviar los correos locales directamente a los destinatarios sin necesidad de servicios externos.

1. **Configurar el nombre de host y protocolos en Postfix:**
   ```bash
   postconf -e "myhostname = app.nuevodominio.com"
   postconf -e "inet_interfaces = loopback-only"
   postconf -e "inet_protocols = ipv4"
   ```
   * `myhostname`: Nombre del dominio que identifica al servidor en los envíos.
   * `inet_interfaces = loopback-only`: Postfix solo escucha en `127.0.0.1:25` (evita que terceros usen tu servidor como relay abierto de spam).
   * `inet_protocols = ipv4`: Asegura que las conexiones a Gmail/Outlook salgan por IPv4, evitando bloqueos estrictos de reputación IPv6.

2. **Reiniciar Postfix:**
   ```bash
   systemctl restart postfix
   ```

---

## ⚙️ Paso 4: Variables de Entorno del Backend (`backend/.env`)

En el archivo `/var/www/<usuario>/data/www/<nuevo_dominio>/backend/.env`, actualiza las siguientes líneas con el nuevo dominio:

```env
# URL base de la aplicación (usada para generar los enlaces de recuperación de contraseña)
APP_BASE_URL="https://app.nuevodominio.com"

# Configuración del remitente de correos
SMTP_FROM="JJ Studio <no-reply@nuevodominio.com>"

# Conexión local a Postfix (No suele cambiar)
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_SECURE=false
```

Una vez guardado el archivo `.env`, reinicia el backend con PM2:
```bash
pm2 restart jjstudio-backend
```

---

## 🧪 Paso 5: Pruebas y Diagnóstico

### 5.1. Prueba rápida de envío desde la terminal del VPS:
```bash
echo "Prueba de correo JJ Studio" | mail -s "Test Email" tu_correo_personal@gmail.com
```

### 5.2. Comprobar los logs de entrega en tiempo real:
```bash
tail -n 20 /var/log/mail.log
```
* **`status=sent (250 2.0.0 OK ...)`:** ✅ Correo entregado y aceptado con éxito por el servidor de destino.
* **`status=bounced (550 ... SPF did not pass)`:** ❌ Falta propagar o corregir el registro TXT (SPF) en el DNS del dominio.

### 5.3. Comprobar la cola de correo:
```bash
mailq
```
*(Si la cola está vacía, no hay correos retenidos).*
