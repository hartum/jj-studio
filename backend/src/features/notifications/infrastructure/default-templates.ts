export interface DefaultTemplate {
  tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA'
  asunto: string
  cuerpoHtml: string
  cuerpoTexto: string
}

export const DEFAULT_TEMPLATES: Record<
  'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA',
  DefaultTemplate
> = {
  RECORDATORIO_SESION: {
    tipo: 'RECORDATORIO_SESION',
    asunto:
      '📸 Recordatorio: Tu sesión fotográfica hoy en [hotel_nombre] / Reminder: Photo session today',
    cuerpoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Sesión Fotográfica - JJ Studio</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px 12px;
      color: #0f172a;
    }
    .container {
      max-width: 580px;
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
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 16px;
    }
    .highlight-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 1.5;
    }
    .info-label {
      font-weight: 600;
      color: #166534;
      min-width: 140px;
    }
    .info-value {
      color: #0f172a;
      font-weight: 500;
    }
    .divider {
      border: 0;
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
      padding-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">JJ <span class="logo-accent">STUDIO</span></div>
    </div>

    <h2>¡Hola, [nombre_cliente]! 👋</h2>

    <p>Te recordamos que tienes una <strong>sesión fotográfica programada para hoy</strong>.</p>

    <div class="highlight-box">
      <div style="font-size: 16px; font-weight: 700; color: #15803d; margin-bottom: 14px;">
        📸 Detalles de tu Sesión
      </div>
      <div class="info-row">
        <span class="info-label">📍 Hotel:</span>
        <span class="info-value">[hotel_nombre]</span>
      </div>
      <div class="info-row">
        <span class="info-label">🕒 Hora:</span>
        <span class="info-value"><strong>[hora_sesion]</strong> ([fecha_sesion])</span>
      </div>
      <div class="info-row">
        <span class="info-label">🚪 Habitación:</span>
        <span class="info-value">[numero_habitacion]</span>
      </div>
      <div class="info-row">
        <span class="info-label">✨ Concepto:</span>
        <span class="info-value">[concepto]</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      💡 <strong>Recomendación:</strong> Te sugerimos presentarte 5 minutos antes en el punto de encuentro acordado con tu fotógrafo.
    </p>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b; font-style: italic;">
      <strong>English:</strong> Friendly reminder that your photo session is scheduled for today at <strong>[hora_sesion]</strong> in <strong>[hotel_nombre]</strong>. We look forward to capturing your best moments!
    </p>

    <div class="footer">
      <p style="margin-bottom: 4px;">[hotel_nombre] • [hotel_direccion]</p>
      <p style="margin-top: 12px; font-size: 11px;">© JJ Studio. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`,
    cuerpoTexto: `¡Hola, [nombre_cliente]!

Te recordamos que tienes una sesión fotográfica programada para hoy:

📍 Hotel: [hotel_nombre]
🕒 Hora: [hora_sesion] ([fecha_sesion])
🚪 Habitación: [numero_habitacion]
✨ Concepto: [concepto]

English: Friendly reminder that your photo session is scheduled for today at [hora_sesion] at [hotel_nombre].

© JJ Studio`,
  },

  RECORDATORIO_VENTA: {
    tipo: 'RECORDATORIO_VENTA',
    asunto:
      '📅 Recordatorio: Cita de visualización y selección de fotos hoy en [hotel_nombre] / Photo viewing appointment',
    cuerpoHtml: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita de Venta - JJ Studio</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px 12px;
      color: #0f172a;
    }
    .container {
      max-width: 580px;
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
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 16px;
    }
    .highlight-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 1.5;
    }
    .info-label {
      font-weight: 600;
      color: #1e40af;
      min-width: 140px;
    }
    .info-value {
      color: #0f172a;
      font-weight: 500;
    }
    .divider {
      border: 0;
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
      padding-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">JJ <span class="logo-accent">STUDIO</span></div>
    </div>

    <h2>¡Hola, [nombre_cliente]! 👋</h2>

    <p>Tus fotos están listas para ser vistas. Te recordamos que tienes una <strong>cita de selección de fotografías hoy</strong>.</p>

    <div class="highlight-box">
      <div style="font-size: 16px; font-weight: 700; color: #1d4ed8; margin-bottom: 14px;">
        🏞️​ Detalles de tu Cita de Fotos
      </div>
      <div class="info-row">
        <span class="info-label">📍 Hotel:</span>
        <span class="info-value">[hotel_nombre]</span>
      </div>
      <div class="info-row">
        <span class="info-label">🕒 Hora de la Cita:</span>
        <span class="info-value"><strong>[hora_cita_venta]</strong> ([fecha_cita_venta])</span>
      </div>
      <div class="info-row">
        <span class="info-label">🚪 Habitación:</span>
        <span class="info-value">[numero_habitacion]</span>
      </div>
      <div class="info-row">
        <span class="info-label">👤 Asesor:</span>
        <span class="info-value">[vendedor_nombre]</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Te esperamos en el stand / oficina de JJ Studio del hotel para que elijas tus recuerdos favoritos.
    </p>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #64748b; font-style: italic;">
      <strong>English:</strong> Your photos are ready! Friendly reminder that your photo viewing appointment is scheduled for today at <strong>[hora_cita_venta]</strong> at <strong>[hotel_nombre]</strong>.
    </p>

    <div class="footer">
      <p style="margin-bottom: 4px;">[hotel_nombre] • [hotel_direccion]</p>
      <p style="margin-top: 12px; font-size: 11px;">© JJ Studio. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`,
    cuerpoTexto: `¡Hola, [nombre_cliente]!

Tus fotos están listas. Te recordamos que tienes una cita de selección de fotografías hoy:

📍 Hotel: [hotel_nombre]
🕒 Hora: [hora_cita_venta] ([fecha_cita_venta])
🚪 Habitación: [numero_habitacion]
👤 Asesor: [vendedor_nombre]

English: Your photos are ready! Photo viewing appointment today at [hora_cita_venta] at [hotel_nombre].

© JJ Studio`,
  },
}

export const AVAILABLE_VARIABLES = [
  {
    key: '[nombre_cliente]',
    label: 'Nombre del Cliente',
    example: 'John Smith',
    category: 'Cliente',
  },
  {
    key: '[email_cliente]',
    label: 'Email del Cliente',
    example: 'john@example.com',
    category: 'Cliente',
  },
  {
    key: '[telefono_cliente]',
    label: 'Teléfono del Cliente',
    example: '+1 555 123 4567',
    category: 'Cliente',
  },
  { key: '[numero_habitacion]', label: 'Número de Habitación', example: '402', category: 'Sesión' },
  {
    key: '[concepto]',
    label: 'Concepto de la Sesión',
    example: 'Familiar / Playa',
    category: 'Sesión',
  },
  { key: '[num_adultos]', label: 'Número de Adultos', example: '2', category: 'Sesión' },
  { key: '[num_ninos]', label: 'Número de Niños', example: '1', category: 'Sesión' },
  {
    key: '[fecha_sesion]',
    label: 'Fecha de la Sesión',
    example: '2 de Septiembre, 2026',
    category: 'Sesión',
  },
  { key: '[hora_sesion]', label: 'Hora de la Sesión', example: '10:30', category: 'Sesión' },
  {
    key: '[fotografo_nombre]',
    label: 'Nombre del Fotógrafo',
    example: 'Carlos Martínez',
    category: 'Sesión',
  },
  {
    key: '[fecha_cita_venta]',
    label: 'Fecha Cita de Venta',
    example: '2 de Septiembre, 2026',
    category: 'Venta',
  },
  { key: '[hora_cita_venta]', label: 'Hora Cita de Venta', example: '16:00', category: 'Venta' },
  {
    key: '[vendedor_nombre]',
    label: 'Nombre del Vendedor / Asesor',
    example: 'Laura García',
    category: 'Venta',
  },
  {
    key: '[hotel_nombre]',
    label: 'Nombre del Hotel',
    example: 'Grand Palladium Riviera',
    category: 'Hotel',
  },
  {
    key: '[hotel_direccion]',
    label: 'Dirección del Hotel',
    example: 'Carretera Chetumal-Pto. Juárez Km 256',
    category: 'Hotel',
  },
  {
    key: '[hotel_cadena]',
    label: 'Cadena Hotelera',
    example: 'Palladium Hotel Group',
    category: 'Hotel',
  },
  {
    key: '[notas]',
    label: 'Notas Adicionales',
    example: 'Traer cambio de ropa',
    category: 'General',
  },
]
