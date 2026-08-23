import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'
import { prisma } from '../../../shared/db.js'
import { decrypt, decryptUser } from '../../../shared/encryption.js'

// Paleta oficial de Google Calendar para eventos (colorId 1..11)
interface GoogleColor {
  id: string
  name: string
  hex: string
}

const GOOGLE_EVENT_COLORS: GoogleColor[] = [
  { id: '1', name: 'Lavender', hex: '#7986cb' },
  { id: '2', name: 'Sage', hex: '#33b679' },
  { id: '3', name: 'Grape', hex: '#8e24aa' },
  { id: '4', name: 'Flamingo', hex: '#e67c73' },
  { id: '5', name: 'Banana', hex: '#f6bf26' },
  { id: '6', name: 'Tangerine', hex: '#f4511e' },
  { id: '7', name: 'Peacock', hex: '#039be5' },
  { id: '8', name: 'Graphite', hex: '#616161' }, // Gris por defecto
  { id: '9', name: 'Blueberry', hex: '#3f51b5' },
  { id: '10', name: 'Basil', hex: '#0b8043' },
  { id: '11', name: 'Tomato', hex: '#d50000' },
]

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/**
 * Mapea un color HEX al colorId de Google Calendar más cercano por distancia euclidiana RGB.
 * Si no se proporciona color (o no hay fotógrafo asignado), devuelve "8" (Gris / Graphite).
 */
export function mapHexToGoogleColorId(hexColor?: string | null): string {
  if (!hexColor) return '8' // Gris (Graphite) por defecto

  try {
    const [r1, g1, b1] = hexToRgb(hexColor)
    let minDistance = Infinity
    let closestColorId = '8'

    for (const gc of GOOGLE_EVENT_COLORS) {
      const [r2, g2, b2] = hexToRgb(gc.hex)
      const dist = Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2))
      if (dist < minDistance) {
        minDistance = dist
        closestColorId = gc.id
      }
    }
    return closestColorId
  } catch {
    return '8'
  }
}

/**
 * Inicializa y obtiene el cliente autenticado de Google Calendar
 */
export function getCalendarClient() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) {
    return null
  }

  // 1. Prioridad: Archivo JSON de cuenta de servicio
  const keyFilePath = process.env.GOOGLE_KEY_FILE_PATH || 'google-service-account.json'
  const resolvedKeyPath = path.isAbsolute(keyFilePath)
    ? keyFilePath
    : path.resolve(process.cwd(), keyFilePath)

  if (fs.existsSync(resolvedKeyPath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: resolvedKeyPath,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      })
      return {
        calendar: google.calendar({ version: 'v3', auth }),
        calendarId,
      }
    } catch (err) {
      console.error('[GoogleCalendar] Error al inicializar desde archivo JSON:', err)
    }
  }

  // 2. Fallback: Variables de entorno directas
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (email && privateKey) {
    try {
      const auth = new google.auth.JWT({
        email,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      })
      return {
        calendar: google.calendar({ version: 'v3', auth }),
        calendarId,
      }
    } catch (err) {
      console.error('[GoogleCalendar] Error al inicializar desde variables de entorno:', err)
    }
  }

  return null
}

function formatDateLongSpanish(date?: Date | null): string {
  if (!date) return 'No especificada'
  try {
    const iso = date instanceof Date ? date.toISOString() : String(date)
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
    const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    return `${dias[target.getUTCDay()]}, ${d} ${meses[m - 1]} ${y}`
  } catch {
    return date instanceof Date ? date.toISOString().slice(0, 10) : String(date)
  }
}

function formatPaxDisplay(adultos: number = 1, ninos: number = 0): string {
  const adultosStr = `${adultos} ${adultos === 1 ? 'Adulto' : 'Adultos'}`
  if (ninos > 0) {
    const ninosStr = `${ninos} ${ninos === 1 ? 'niño' : 'niños'}`
    return `${adultosStr} ${ninosStr}`
  }
  return adultosStr
}

function formatRoomDisplay(room?: string | null): string {
  if (!room || !room.trim()) return 'S/N'
  const clean = room.trim().replace(/^hab(itaci[oó]n|\.)?\s*:?\s*/i, '')
  return clean || 'S/N'
}

function formatPhoneHtml(phone?: string | null): string {
  if (!phone || !phone.trim()) return 'Sin teléfono'
  const clean = phone.trim()
  const digits = clean.replace(/[^0-9+]/g, '')
  return `<a href="tel:${digits}">${clean}</a>`
}

function formatEmailHtml(email?: string | null): string {
  if (!email || !email.trim()) return 'Sin email'
  const clean = email.trim()
  return `<a href="mailto:${clean}">${clean}</a>`
}

/**
 * Sincroniza una Sesión Fotográfica hacia Google Calendar (Crear o Actualizar)
 */
export async function syncSesionToGoogle(sesionId: number): Promise<string | null> {
  const client = getCalendarClient()
  if (!client) {
    console.warn(
      '[GoogleCalendar] Cliente de Google Calendar no configurado. Se omite sincronización.',
    )
    return null
  }

  const sesion = await prisma.sesionFotografica.findUnique({
    where: { id: sesionId },
    include: {
      hotel: true,
      fotografo: {
        include: { colorAsignado: true },
      },
      creador: true,
    },
  })

  if (!sesion || sesion.deletedAt) {
    return null
  }

  const hotelName = sesion.hotel?.nombre || 'Hotel'
  const clienteNombre = decrypt(sesion.clienteNombre) || 'Cliente'
  const fotoUser = decryptUser(sesion.fotografo)
  const creadorUser = decryptUser(sesion.creador)
  const fotografoNombre = fotoUser
    ? `${fotoUser.nombre} ${fotoUser.apellidos}`.trim()
    : 'Sin asignar'
  const creadorNombre = creadorUser
    ? `${creadorUser.nombre} ${creadorUser.apellidos}`.trim()
    : 'Sistema'

  // Título: [Hotel] [Cliente] | [Fotógrafo]
  const summary = `${hotelName} ${clienteNombre} | ${fotografoNombre}`

  // Color: Si no hay fotógrafo -> "8" (Gris), si hay fotógrafo -> color asignado
  const fotografoColorHex = sesion.fotografo?.colorAsignado?.color || null
  const colorId = sesion.fotografo ? mapHexToGoogleColorId(fotografoColorHex) : '8'

  // Fechas y horas
  const startDateTime = sesion.fechaHoraInicio
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // 1 hora de duración

  const checkoutFormatted = formatDateLongSpanish(sesion.fechaSalida)
  const roomValue = formatRoomDisplay(sesion.numeroHabitacion)
  const paxValue = formatPaxDisplay(sesion.numAdultos ?? 1, sesion.numNinos ?? 0)
  const phoneHtml = formatPhoneHtml(decrypt(sesion.clienteTelefono))
  const emailHtml = formatEmailHtml(decrypt(sesion.clienteEmail))

  let description = `<b>HABITACIÓN:</b> ${roomValue}
<b>CLIENTE:</b> ${clienteNombre}
<b>CHECK OUT:</b> ${checkoutFormatted}
<b>PAX:</b> ${paxValue}
<b>TELÉFONO:</b> ${phoneHtml}
<b>EMAIL:</b> ${emailHtml}

<b>AGENDADO POR:</b> ${creadorNombre}
<b>FOTÓGRAFO:</b> ${fotografoNombre}`

  if (sesion.concepto) {
    description += `\n<b>Concepto:</b> ${sesion.concepto}`
  }
  if (sesion.notas) {
    description += `\n\n<b>Notas:</b>\n${sesion.notas}`
  }

  const eventPayload = {
    summary,
    description,
    colorId,
    start: {
      dateTime: startDateTime.toISOString(),
    },
    end: {
      dateTime: endDateTime.toISOString(),
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 1440 }, // 1 día antes
      ],
    },
  }

  try {
    let googleEventId = sesion.googleCalendarEventId

    if (googleEventId) {
      // Intentar actualizar evento existente
      try {
        const res = await client.calendar.events.update({
          calendarId: client.calendarId,
          eventId: googleEventId,
          requestBody: eventPayload,
        })
        googleEventId = res.data.id || googleEventId
        console.log(
          `[GoogleCalendar] Sesión #${sesionId} actualizada en Google Calendar (Event ID: ${googleEventId})`,
        )
      } catch (updateErr: any) {
        // Si el evento fue borrado en Google (404 / 410), lo recreamos
        if (
          updateErr?.status === 404 ||
          updateErr?.status === 410 ||
          updateErr?.code === 404 ||
          updateErr?.code === 410
        ) {
          console.warn(
            `[GoogleCalendar] Evento ${googleEventId} no encontrado en Google Calendar. Recreando...`,
          )
          const createRes = await client.calendar.events.insert({
            calendarId: client.calendarId,
            requestBody: eventPayload,
          })
          googleEventId = createRes.data.id || null
        } else {
          throw updateErr
        }
      }
    } else {
      // Crear nuevo evento
      const createRes = await client.calendar.events.insert({
        calendarId: client.calendarId,
        requestBody: eventPayload,
      })
      googleEventId = createRes.data.id || null
      console.log(
        `[GoogleCalendar] Sesión #${sesionId} creada en Google Calendar (Event ID: ${googleEventId})`,
      )
    }

    if (googleEventId && googleEventId !== sesion.googleCalendarEventId) {
      await prisma.sesionFotografica.update({
        where: { id: sesionId },
        data: { googleCalendarEventId: googleEventId },
      })
    }

    return googleEventId
  } catch (err: any) {
    console.error(`[GoogleCalendar] Error al sincronizar sesión #${sesionId}:`, err?.message || err)
    return null
  }
}

/**
 * Elimina un evento de Sesión de Google Calendar
 */
export async function deleteSesionFromGoogle(googleEventId?: string | null): Promise<boolean> {
  if (!googleEventId) return false
  const client = getCalendarClient()
  if (!client) return false

  try {
    await client.calendar.events.delete({
      calendarId: client.calendarId,
      eventId: googleEventId,
    })
    console.log(`[GoogleCalendar] Evento ${googleEventId} eliminado de Google Calendar`)
    return true
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 410 || err?.code === 404 || err?.code === 410) {
      return true // Ya no existía
    }
    console.error(
      `[GoogleCalendar] Error al eliminar evento ${googleEventId}:`,
      err?.message || err,
    )
    return false
  }
}

/**
 * Sincroniza una Cita de Venta hacia Google Calendar (Crear o Actualizar)
 */
export async function syncCitaVentaToGoogle(citaVentaId: number): Promise<string | null> {
  const client = getCalendarClient()
  if (!client) {
    console.warn(
      '[GoogleCalendar] Cliente de Google Calendar no configurado. Se omite sincronización.',
    )
    return null
  }

  const cita = await prisma.citaVenta.findUnique({
    where: { id: citaVentaId },
    include: {
      hotel: true,
      vendedor: {
        include: { colorAsignado: true },
      },
      sesion: {
        include: {
          fotografo: {
            include: { colorAsignado: true },
          },
          creador: true,
        },
      },
    },
  })

  if (!cita || cita.deletedAt) {
    return null
  }

  const hotelName = cita.hotel?.nombre || 'Hotel'
  const clienteNombre = decrypt(cita.sesion?.clienteNombre) || 'Cliente'
  const vendUser = decryptUser(cita.vendedor)
  const fotoUser = decryptUser(cita.sesion?.fotografo)
  const creadorUser = decryptUser(cita.sesion?.creador)
  const vendedorNombre = vendUser
    ? `${vendUser.nombre} ${vendUser.apellidos}`.trim()
    : 'Sin asignar'
  const fotografoNombre = fotoUser
    ? `${fotoUser.nombre} ${fotoUser.apellidos}`.trim()
    : 'Sin asignar'
  const creadorNombre = creadorUser
    ? `${creadorUser.nombre} ${creadorUser.apellidos}`.trim()
    : 'Sistema'

  // Título: [Hotel] CITA VENTA [Cliente] | [Vendedor]
  const summary = `${hotelName} CITA VENTA ${clienteNombre} | ${vendedorNombre}`

  // Color: Color del vendedor si tiene, o fotógrafo, o Gris ("8")
  const colorHex =
    cita.vendedor?.colorAsignado?.color || cita.sesion?.fotografo?.colorAsignado?.color || null
  const colorId = colorHex ? mapHexToGoogleColorId(colorHex) : '8'

  const startDateTime = cita.fechaHoraCita
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

  const checkoutFormatted = formatDateLongSpanish(cita.sesion?.fechaSalida)
  const roomValue = formatRoomDisplay(cita.sesion?.numeroHabitacion)
  const paxValue = formatPaxDisplay(cita.sesion?.numAdultos ?? 1, cita.sesion?.numNinos ?? 0)
  const phoneHtml = formatPhoneHtml(decrypt(cita.sesion?.clienteTelefono))
  const emailHtml = formatEmailHtml(decrypt(cita.sesion?.clienteEmail))

  let description = `<b>[CITA DE VENTA]</b>
<b>HABITACIÓN:</b> ${roomValue}
<b>CLIENTE:</b> ${clienteNombre}
<b>CHECK OUT:</b> ${checkoutFormatted}
<b>PAX:</b> ${paxValue}
<b>TELÉFONO:</b> ${phoneHtml}
<b>EMAIL:</b> ${emailHtml}

<b>AGENDADO POR:</b> ${creadorNombre}
<b>VENDEDOR:</b> ${vendedorNombre}
<b>FOTÓGRAFO:</b> ${fotografoNombre}`

  if (cita.notas) {
    description += `\n\n<b>Notas:</b>\n${cita.notas}`
  }

  const eventPayload = {
    summary,
    description,
    colorId,
    start: {
      dateTime: startDateTime.toISOString(),
    },
    end: {
      dateTime: endDateTime.toISOString(),
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 1440 },
      ],
    },
  }

  try {
    let googleEventId = cita.googleCalendarEventId

    if (googleEventId) {
      try {
        const res = await client.calendar.events.update({
          calendarId: client.calendarId,
          eventId: googleEventId,
          requestBody: eventPayload,
        })
        googleEventId = res.data.id || googleEventId
        console.log(
          `[GoogleCalendar] Cita de Venta #${citaVentaId} actualizada en Google Calendar (Event ID: ${googleEventId})`,
        )
      } catch (updateErr: any) {
        if (
          updateErr?.status === 404 ||
          updateErr?.status === 410 ||
          updateErr?.code === 404 ||
          updateErr?.code === 410
        ) {
          const createRes = await client.calendar.events.insert({
            calendarId: client.calendarId,
            requestBody: eventPayload,
          })
          googleEventId = createRes.data.id || null
        } else {
          throw updateErr
        }
      }
    } else {
      const createRes = await client.calendar.events.insert({
        calendarId: client.calendarId,
        requestBody: eventPayload,
      })
      googleEventId = createRes.data.id || null
      console.log(
        `[GoogleCalendar] Cita de Venta #${citaVentaId} creada en Google Calendar (Event ID: ${googleEventId})`,
      )
    }

    if (googleEventId && googleEventId !== cita.googleCalendarEventId) {
      await prisma.citaVenta.update({
        where: { id: citaVentaId },
        data: { googleCalendarEventId: googleEventId },
      })
    }

    return googleEventId
  } catch (err: any) {
    console.error(
      `[GoogleCalendar] Error al sincronizar cita de venta #${citaVentaId}:`,
      err?.message || err,
    )
    return null
  }
}

/**
 * Elimina un evento de Cita de Venta de Google Calendar
 */
export async function deleteCitaVentaFromGoogle(googleEventId?: string | null): Promise<boolean> {
  return deleteSesionFromGoogle(googleEventId)
}

/**
 * Verifica la conectividad y permisos con Google Calendar
 */
export async function testGoogleCalendarConnection(): Promise<{
  success: boolean
  calendarId?: string
  calendarTitle?: string
  timeZone?: string
  error?: string
}> {
  const client = getCalendarClient()
  if (!client) {
    return {
      success: false,
      error:
        'Variables de configuración de Google Calendar no encontradas en .env o archivo no existe.',
    }
  }

  try {
    const res = await client.calendar.calendars.get({
      calendarId: client.calendarId,
    })

    return {
      success: true,
      calendarId: client.calendarId,
      calendarTitle: res.data.summary || 'Sin título',
      timeZone: res.data.timeZone || 'No definida',
    }
  } catch (err: any) {
    return {
      success: false,
      calendarId: client.calendarId,
      error: err?.message || 'Error al conectar con la API de Google Calendar',
    }
  }
}
