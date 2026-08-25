/**
 * Convierte cualquier código de país ISO 3166-1 de 2 letras (ej. MX, ES, US, JM, DO, FR, JP, AR, CL, CO, BR, etc.)
 * en el emoji de la bandera correspondiente utilizando los Símbolos Indicadores Regionales de Unicode.
 * Soporta todos los países del mundo de manera dinámica.
 */
export function getFlagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.trim().length !== 2) {
    return '🌐'
  }

  const code = countryCode.toUpperCase().trim()

  // Validar que sean exactamente dos letras del alfabeto A-Z
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🌐'
  }

  // 127397 + ASCII es el punto de código Unicode para los Símbolos Indicadores Regionales (0x1F1E6..)
  const codePoints = [...code].map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
