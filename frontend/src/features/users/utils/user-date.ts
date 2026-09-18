/**
 * Utilidades para cálculo y formateo de fechas relacionadas con usuarios.
 */

/**
 * Calcula la antigüedad de un usuario desde su fecha de contratación hasta hoy,
 * retornando una cadena en lenguaje natural según el idioma.
 *
 * @param fecha Fecha de contratación (string ISO / YYYY-MM-DD o Date)
 * @param locale Idioma ('es' o 'en')
 */
export function formatAntiguedad(
  fecha: string | Date | null | undefined,
  locale: string = 'es',
): string {
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

  const isEn = locale === 'en'

  if (start.getTime() > today.getTime()) {
    return isEn ? 'Future contract' : 'Contrato futuro'
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
    if (isEn) {
      chunks.push(`${years} ${years === 1 ? 'year' : 'years'}`)
    } else {
      chunks.push(`${years} ${years === 1 ? 'año' : 'años'}`)
    }
  }
  if (months > 0) {
    if (isEn) {
      chunks.push(`${months} ${months === 1 ? 'month' : 'months'}`)
    } else {
      chunks.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
    }
  }
  if (days > 0 || chunks.length === 0) {
    if (isEn) {
      chunks.push(`${days} ${days === 1 ? 'day' : 'days'}`)
    } else {
      chunks.push(`${days} ${days === 1 ? 'día' : 'días'}`)
    }
  }

  const zeroDefault = isEn ? '0 days' : '0 días'
  const andWord = isEn ? 'and' : 'y'
  const first = chunks[0] ?? zeroDefault
  const second = chunks[1]
  const third = chunks[2]

  if (chunks.length === 1) {
    return first
  }
  if (chunks.length === 2 && second) {
    return `${first} ${andWord} ${second}`
  }
  if (chunks.length === 3 && second && third) {
    return `${first}, ${second} ${andWord} ${third}`
  }

  return first
}
