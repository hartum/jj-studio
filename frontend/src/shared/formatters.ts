/**
 * Formatea un número como moneda USD con puntos para miles (ej. $1.250).
 * Maneja valores nulos, undefined o NaN retornando "$0".
 */
export function formatCurrency(val?: number | null, decimals = 0): string {
  if (val === undefined || val === null || isNaN(val)) {
    return decimals > 0 ? `$0,${'0'.repeat(decimals)}` : '$0'
  }
  const isNegative = val < 0
  const absVal = Math.abs(val)
  const formattedNumber = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absVal)
  return `${isNegative ? '-' : ''}$${formattedNumber}`
}

/**
 * Formatea un número como moneda pesos mexicanos MXN (ej. $21.450,50 MXN).
 */
export function formatMxn(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '$0,00 MXN'
  }
  const isNegative = val < 0
  const absVal = Math.abs(val)
  const formattedNumber = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal)
  return `${isNegative ? '-' : ''}$${formattedNumber} MXN`
}
