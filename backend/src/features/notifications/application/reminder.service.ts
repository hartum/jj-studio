import 'dotenv/config'
import nodemailer from 'nodemailer'
import { prisma } from '../../../shared/db.js'
import { decryptSesion, decryptUser } from '../../../shared/encryption.js'
import { DEFAULT_TEMPLATES } from '../infrastructure/default-templates.js'

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

export async function getTemplate(tipo: 'RECORDATORIO_SESION' | 'RECORDATORIO_VENTA') {
  const dbTemplate = await prisma.plantillaEmail.findUnique({
    where: { tipo },
  })

  if (dbTemplate) {
    return {
      id: dbTemplate.id,
      tipo: dbTemplate.tipo,
      asunto: dbTemplate.asunto,
      cuerpoHtml: dbTemplate.cuerpoHtml,
      cuerpoTexto: dbTemplate.cuerpoTexto || '',
      updatedAt: dbTemplate.updatedAt,
    }
  }

  return {
    id: 0,
    ...DEFAULT_TEMPLATES[tipo],
    updatedAt: new Date(),
  }
}

export function resolveVariables(
  templateText: string,
  context: Record<string, string | number | null | undefined>,
): string {
  if (!templateText) return ''
  let result = templateText

  for (const [key, val] of Object.entries(context)) {
    const placeholder = key.startsWith('[') && key.endsWith(']') ? key : `[${key}]`
    const replacement = val !== null && val !== undefined ? String(val) : ''
    result = result.split(placeholder).join(replacement)
  }

  return result
}

function formatDateDisplay(d: Date): string {
  try {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function formatTimeDisplay(d: Date): string {
  return d.toISOString().slice(11, 16)
}

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const trimmed = email.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || '"JJ Studio" <no-reply@jjstudio.hartum.net>'
  try {
    const transporter = getMailTransporter()
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || '',
    })
    return true
  } catch (err) {
    console.error(`❌ Error al enviar email a [${to}]:`, err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Procesa el envío de recordatorios de sesiones fotográficas pendientes para hoy.
 */
export async function processSessionReminders(targetDate?: Date) {
  const date = targetDate || new Date()
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  )
  const endOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  )

  const sesionesRaw = await prisma.sesionFotografica.findMany({
    where: {
      deletedAt: null,
      estado: 'PROGRAMADA',
      emailRecordatorioEnviado: false,
      clienteEmail: { not: null },
      fechaHoraInicio: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      hotel: true,
      fotografo: true,
    },
  })

  const template = await getTemplate('RECORDATORIO_SESION')
  let sentCount = 0
  let failedCount = 0

  for (const raw of sesionesRaw) {
    const sesion = decryptSesion(raw)!
    const email = sesion.clienteEmail?.trim()

    if (!isValidEmail(email)) {
      console.warn(`⚠️ Sesión #${sesion.id} tiene un email inválido o vacío: "${email}"`)
      continue
    }

    const fotografoNombre = sesion.fotografo
      ? `${sesion.fotografo.nombre} ${sesion.fotografo.apellidos}`.trim()
      : 'Fotógrafo asignado'

    const context: Record<string, string> = {
      '[nombre_cliente]': sesion.clienteNombre || 'Cliente',
      '[email_cliente]': email || '',
      '[telefono_cliente]': sesion.clienteTelefono || '',
      '[numero_habitacion]': sesion.numeroHabitacion || 'N/A',
      '[num_adultos]': String(sesion.numAdultos ?? 1),
      '[num_ninos]': String(sesion.numNinos ?? 0),
      '[concepto]': sesion.concepto || 'Sesión fotográfica',
      '[fecha_sesion]': formatDateDisplay(sesion.fechaHoraInicio),
      '[hora_sesion]': formatTimeDisplay(sesion.fechaHoraInicio),
      '[fotografo_nombre]': fotografoNombre,
      '[hotel_nombre]': sesion.hotel?.nombre || 'Hotel',
      '[hotel_direccion]': sesion.hotel?.direccion || '',
      '[hotel_cadena]': sesion.hotel?.cadenaHotelera || '',
      '[notas]': sesion.notas || '',
    }

    const subject = resolveVariables(template.asunto, context)
    const html = resolveVariables(template.cuerpoHtml, context)
    const text = resolveVariables(template.cuerpoTexto, context)

    const success = await sendEmail({ to: email!, subject, html, text })

    if (success) {
      await prisma.sesionFotografica.update({
        where: { id: sesion.id },
        data: { emailRecordatorioEnviado: true },
      })
      sentCount++
      console.log(`✅ Recordatorio de sesión #${sesion.id} enviado a [${email}]`)
    } else {
      failedCount++
    }
  }

  return { found: sesionesRaw.length, sent: sentCount, failed: failedCount }
}

/**
 * Procesa el envío de recordatorios de citas de venta pendientes para hoy.
 */
export async function processSaleAppointmentReminders(targetDate?: Date) {
  const date = targetDate || new Date()
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  )
  const endOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  )

  const citasRaw = await prisma.citaVenta.findMany({
    where: {
      deletedAt: null,
      estado: 'PROGRAMADA',
      emailRecordatorioEnviado: false,
      fechaHoraCita: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      hotel: true,
      vendedor: true,
      sesion: {
        include: {
          hotel: true,
          fotografo: true,
        },
      },
    },
  })

  const template = await getTemplate('RECORDATORIO_VENTA')
  let sentCount = 0
  let failedCount = 0

  for (const raw of citasRaw) {
    const rawSesion = raw.sesion ? decryptSesion(raw.sesion) : null
    const rawVendedor = raw.vendedor ? decryptUser(raw.vendedor) : null
    const email = rawSesion?.clienteEmail?.trim()

    if (!isValidEmail(email)) {
      console.warn(`⚠️ Cita de venta #${raw.id} no tiene email de cliente válido asociado`)
      continue
    }

    const vendedorNombre = rawVendedor
      ? `${rawVendedor.nombre} ${rawVendedor.apellidos}`.trim()
      : 'Asesor de ventas'

    const fotografoNombre = rawSesion?.fotografo
      ? `${rawSesion.fotografo.nombre} ${rawSesion.fotografo.apellidos}`.trim()
      : 'Fotógrafo'

    const context: Record<string, string> = {
      '[nombre_cliente]': rawSesion?.clienteNombre || 'Cliente',
      '[email_cliente]': email || '',
      '[telefono_cliente]': rawSesion?.clienteTelefono || '',
      '[numero_habitacion]': rawSesion?.numeroHabitacion || 'N/A',
      '[num_adultos]': String(rawSesion?.numAdultos ?? 1),
      '[num_ninos]': String(rawSesion?.numNinos ?? 0),
      '[concepto]': rawSesion?.concepto || 'Sesión fotográfica',
      '[fecha_sesion]': rawSesion?.fechaHoraInicio
        ? formatDateDisplay(rawSesion.fechaHoraInicio)
        : '',
      '[hora_sesion]': rawSesion?.fechaHoraInicio
        ? formatTimeDisplay(rawSesion.fechaHoraInicio)
        : '',
      '[fotografo_nombre]': fotografoNombre,
      '[fecha_cita_venta]': formatDateDisplay(raw.fechaHoraCita),
      '[hora_cita_venta]': formatTimeDisplay(raw.fechaHoraCita),
      '[vendedor_nombre]': vendedorNombre,
      '[hotel_nombre]': raw.hotel?.nombre || rawSesion?.hotel?.nombre || 'Hotel',
      '[hotel_direccion]': raw.hotel?.direccion || rawSesion?.hotel?.direccion || '',
      '[hotel_cadena]': raw.hotel?.cadenaHotelera || rawSesion?.hotel?.cadenaHotelera || '',
      '[notas]': raw.notas || rawSesion?.notas || '',
    }

    const subject = resolveVariables(template.asunto, context)
    const html = resolveVariables(template.cuerpoHtml, context)
    const text = resolveVariables(template.cuerpoTexto, context)

    const success = await sendEmail({ to: email!, subject, html, text })

    if (success) {
      await prisma.citaVenta.update({
        where: { id: raw.id },
        data: { emailRecordatorioEnviado: true },
      })
      sentCount++
      console.log(`✅ Recordatorio de cita de venta #${raw.id} enviado a [${email}]`)
    } else {
      failedCount++
    }
  }

  return { found: citasRaw.length, sent: sentCount, failed: failedCount }
}

/**
 * Orquestador principal de recordatorios del día.
 */
export async function processAllReminders(targetDate?: Date) {
  console.log(
    `[CRON] Iniciando proceso de recordatorios de citas del día (${(targetDate || new Date()).toISOString()})...`,
  )

  const sesionesResult = await processSessionReminders(targetDate)
  const citasVentaResult = await processSaleAppointmentReminders(targetDate)

  console.log(
    `[CRON] Recordatorios completados: Sesiones [Encontradas: ${sesionesResult.found}, Enviadas: ${sesionesResult.sent}, Fallidas: ${sesionesResult.failed}] | Citas Venta [Encontradas: ${citasVentaResult.found}, Enviadas: ${citasVentaResult.sent}, Fallidas: ${citasVentaResult.failed}]`,
  )

  return {
    sesiones: sesionesResult,
    citasVenta: citasVentaResult,
    timestamp: new Date().toISOString(),
  }
}
