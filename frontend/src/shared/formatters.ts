/**
 * Formatea un número como moneda USD (ej. $1,250).
 * Maneja valores nulos, undefined o NaN retornando "$0".
 */
export function formatCurrency(val?: number | null, decimals = 0): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

/**
 * Formatea un número como moneda pesos mexicanos MXN (ej. $21,450.50 MXN).
 */
export function formatMxn(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '$0.00'
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}
