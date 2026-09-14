/**
 * Utilidades para cálculo y formateo de fechas relacionadas con usuarios.
 */

/**
 * Calcula la antigüedad de un usuario desde su fecha de contratación hasta hoy,
 * retornando una cadena en lenguaje natural y comprensible en español.
 *
 * Ejemplos:
 * - "2 años, 3 meses y 1 día"
 * - "5 meses y 14 días"
 * - "1 año y 2 meses"
 * - "25 días"
 * - "0 días"
 * - "—" (si no tiene fecha asignada)
 *
 * @param fecha Fecha de contratación (string ISO / YYYY-MM-DD o Date)
 */
export function formatAntiguedad(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—'

  let start: Date
  if (typeof fecha === 'string') {
    const raw = fecha.split('T')[0] ?? ''
    const parts = raw.split('-').map((v) => Number(v))
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]

    if (
      year !== undefined &&
      month !== undefined &&
      day !== undefined &&
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day)
    ) {
      start = new Date(year, month - 1, day)
    } else {
      start = new Date(fecha)
    }
  } else {
    start = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  }

  if (isNaN(start.getTime())) return '—'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (start.getTime() > today.getTime()) {
    return 'Contrato futuro'
  }

  let years = today.getFullYear() - start.getFullYear()
  let months = today.getMonth() - start.getMonth()
  let days = today.getDate() - start.getDate()

  if (days < 0) {
    // Días del mes anterior a la fecha actual
    const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate()
    days += prevMonthDays
    months -= 1
  }

  if (months < 0) {
    months += 12
    years -= 1
  }

  const chunks: string[] = []
  if (years > 0) {
    chunks.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  }
  if (months > 0) {
    chunks.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
  }
  if (days > 0 || chunks.length === 0) {
    chunks.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  }

  const first = chunks[0] ?? '0 días'
  const second = chunks[1]
  const third = chunks[2]

  if (chunks.length === 1) {
    return first
  }
  if (chunks.length === 2 && second) {
    return `${first} y ${second}`
  }
  if (chunks.length === 3 && second && third) {
    return `${first}, ${second} y ${third}`
  }

  return first
}
