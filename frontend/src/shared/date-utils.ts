/**
 * Utilidades para manejo y formateo de fechas locales sin alteraciones de zona horaria (UTC shifts).
 * En JJ Studio, las fechas y horas registradas por el usuario se tratan tal como fueron introducidas,
 * sin conversiones de huso horario que puedan desplazar el día o la hora al formatear o visualizar.
 */

/**
 * Parsea un string de fecha (YYYY-MM-DD o YYYY-MM-DDTHH:mm o YYYY-MM-DD HH:mm)
 * garantizando que NUNCA sufra transformaciones de zona horaria o desfases UTC.
 * Interpreta año, mes, día (y hora/minuto si existen) exactamente como fecha local.
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const cleanStr = dateStr.trim().replace(' ', 'T')
  const [datePart, timePart] = cleanStr.split('T')
  if (!datePart) return null
  const dateParts = datePart.split('-').map(Number)
  if (dateParts.length < 3) return null
  const year = dateParts[0]
  const month = dateParts[1]
  const day = dateParts[2]
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return null

  let hours = 12 // Usamos 12:00 por defecto para fechas sin hora para evitar problemas con DST a medianoche
  let minutes = 0
  let seconds = 0

  if (timePart) {
    const timeParts = timePart.split(':').map(Number)
    const h = timeParts[0]
    const m = timeParts[1]
    const s = timeParts[2]
    if (h !== undefined && m !== undefined && !isNaN(h) && !isNaN(m)) {
      hours = h
      minutes = m
      seconds = s !== undefined && !isNaN(s) ? s : 0
    }
  }

  const d = new Date(year, month - 1, day, hours, minutes, seconds)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formatea una fecha en formato largo legible según el locale ("es" o "en").
 * Ej: "viernes, 4 de septiembre de 2026" / "Friday, September 4, 2026"
 * Respeta 100% los valores literales del string sin desfase de zona horaria.
 */
export function formatLocalDate(dateStr?: string | null, locale: string = 'es'): string {
  if (!dateStr) return '-'
  const d = parseLocalDate(dateStr)
  if (!d) return dateStr
  const loc = locale === 'en' ? 'en-US' : 'es-ES'
  return d.toLocaleDateString(loc, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Extrae la hora en formato HH:mm de un string de fecha/hora.
 * Ej: "2026-09-04T16:30" -> "16:30"
 */
export function formatLocalTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const cleanStr = dateStr.trim().replace(' ', 'T')
  const parts = cleanStr.split('T')
  if (parts[1]) {
    return parts[1].slice(0, 5)
  }
  return ''
}

/**
 * Formatea una fecha en DD/MM/YYYY sin alterar el día ni la zona horaria.
 * Ej: "2026-09-04" -> "04/09/2026"
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const cleanStr = dateStr.trim().replace(' ', 'T').split('T')[0]
  if (!cleanStr) return '-'
  const parts = cleanStr.split('-')
  if (parts.length === 3) {
    const day = parts[2]?.padStart(2, '0')
    const month = parts[1]?.padStart(2, '0')
    const year = parts[0]
    return `${day}/${month}/${year}`
  }
  return dateStr
}

/**
 * Formatea una fecha y hora en DD/MM/YYYY HH:mm.
 * Ej: "2026-09-04T16:30" -> "04/09/2026 16:30"
 */
export function formatDateTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const cleanStr = dateStr.trim().replace(' ', 'T')
  const [datePart, timePart] = cleanStr.split('T')
  const dateFormatted = formatDateDisplay(datePart)
  if (timePart) {
    return `${dateFormatted} ${timePart.slice(0, 5)}`
  }
  return dateFormatted
}

/**
 * Formato para el encabezado del tooltip/modal de evento en calendario:
 * Ej: "Viernes, 4 septiembre - 16:30"
 */
export function formatEventHeaderDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = parseLocalDate(dateStr)
  if (!d) return dateStr

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]

  const diaSemana = dias[d.getDay()]
  const diaMes = d.getDate()
  const mes = meses[d.getMonth()]
  const horas = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')

  return `${diaSemana}, ${diaMes} ${mes} - ${horas}:${minutos}`
}
