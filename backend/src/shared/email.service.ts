import 'dotenv/config'
import nodemailer from 'nodemailer'

interface SendPasswordResetParams {
  toEmail: string
  nombre: string
  resetToken: string
}

function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '')
  }
  // En producción por defecto usar el dominio oficial, en desarrollo localhost
  if (process.env.NODE_ENV === 'production') {
    return 'https://jjstudio.hartum.net'
  }
  return 'http://localhost:5173'
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST || '127.0.0.1'
  const port = Number(process.env.SMTP_PORT || 25)
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  const transportConfig: any = {
    host,
    port,
    secure: isSecure,
    tls: {
      rejectUnauthorized: false,
    },
  }

  if (user && pass) {
    transportConfig.auth = { user, pass }
  }

  return nodemailer.createTransport(transportConfig)
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m] || m))
}

/**
 * Envía el correo electrónico con el enlace para restablecer la contraseña.
 */
export async function sendPasswordResetEmail({
  toEmail,
  nombre,
  resetToken,
}: SendPasswordResetParams): Promise<{ success: boolean; resetLink: string }> {
  const baseUrl = getAppBaseUrl()
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`
  const fromAddress = process.env.SMTP_FROM || '"JJ Studio" <no-reply@jjstudio.hartum.net>'

  const safeNombre = escapeHtml(nombre ? nombre.trim() : 'Usuario')
  const safeResetLink = escapeHtml(resetLink)

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña - JJ Studio</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 36px 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .logo-accent {
      color: #3b82f6;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button {
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      display: inline-block;
    }
    .reset-button:hover {
      background-color: #2563eb;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
      padding-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .fallback-link {
      word-break: break-all;
      font-size: 12px;
      color: #3b82f6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">JJ <span class="logo-accent">STUDIO</span></div>
    </div>
    
    <h2>Hola ${safeNombre},</h2>
    
    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>JJ Studio</strong>.</p>
    
    <p>Haz clic en el siguiente botón para definir una nueva contraseña:</p>
    
    <div class="button-container">
      <a href="${safeResetLink}" target="_blank" class="reset-button">Restablecer mi Contraseña</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b;">
      ⏱️ Este enlace es válido durante <strong>30 minutos</strong> y solo puede usarse una vez.
    </p>
    
    <p style="font-size: 13px; color: #64748b;">
      Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual no se modificará.
    </p>
    
    <div class="footer">
      <p style="margin-bottom: 8px;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
      <a href="${safeResetLink}" class="fallback-link">${safeResetLink}</a>
      <p style="margin-top: 16px; font-size: 11px;">© ${new Date().getFullYear()} JJ Studio. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`

  const textContent = `
Hola ${nombre || 'Usuario'},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en JJ Studio.

Para crear una nueva contraseña, abre el siguiente enlace en tu navegador:
${resetLink}

Este enlace caduca en 30 minutos y solo puede ser utilizado una vez.

Si no has solicitado este restablecimiento, puedes ignorar este mensaje.

© ${new Date().getFullYear()} JJ Studio
`

  try {
    const transporter = getMailTransporter()
    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Restablecer contraseña - JJ Studio',
      text: textContent,
      html: htmlContent,
    })

    console.log(`✉️ Correo de recuperación enviado con éxito a: [${toEmail}]`)
    return { success: true, resetLink }
  } catch (err: unknown) {
    console.warn(`⚠️ No se pudo enviar el correo vía SMTP (${toEmail}):`, err instanceof Error ? err.message : err)
    console.log(`[DEV/FALLBACK] Enlace de recuperación generado: ${resetLink}`)
    return { success: false, resetLink }
  }
}
