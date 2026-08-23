import 'dotenv/config'
import crypto from 'node:crypto'

// Clave maestra para AES-256-GCM (requiere 32 bytes)
function getMasterKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex')
    }
    // Si no es un hex de 64 caracteres, derivar 32 bytes con SHA-256
    return crypto.createHash('sha256').update(envKey).digest()
  }

  // Clave de respaldo para entorno de desarrollo local (32 bytes)
  const defaultDevSecret = 'jj_studio_default_encryption_secret_key_2026_dev_mode'
  return crypto.createHash('sha256').update(defaultDevSecret).digest()
}

const MASTER_KEY = getMasterKey()
const ENCRYPTION_PREFIX = 'enc:v1:'

/**
 * Encripta un texto en plano utilizando AES-256-GCM (reversible).
 * Formato resultante: enc:v1:<iv_hex>:<tag_hex>:<encrypted_hex>
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null
  const str = String(text)
  if (str === '') return ''
  // Si ya está encriptado, no volver a encriptar
  if (str.startsWith(ENCRYPTION_PREFIX)) return str

  try {
    const iv = crypto.randomBytes(12) // 96 bits recomendado para GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv)

    let encrypted = cipher.update(str, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')

    return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`
  } catch (err) {
    console.error('Error al encriptar texto:', err)
    return str
  }
}

/**
 * Desencripta un texto en formato enc:v1:... a texto plano.
 * Si el texto no está encriptado (legacy plaintext), lo devuelve intacto.
 */
export function decrypt(cipherText: string | null | undefined): string | null {
  if (cipherText === null || cipherText === undefined) return null
  const str = String(cipherText)
  if (str === '' || !str.startsWith(ENCRYPTION_PREFIX)) {
    return str
  }

  try {
    const raw = str.slice(ENCRYPTION_PREFIX.length)
    const parts = raw.split(':')
    if (parts.length !== 3) {
      return str
    }

    const [ivHex, tagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(tagHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (err) {
    console.error('Error al desencriptar texto:', err)
    return str
  }
}

/**
 * Genera un índice ciego (Blind Index / HMAC-SHA256) para búsquedas exactas y unicidad.
 * Normaliza a minúsculas y elimina espacios antes de hashear.
 */
export function blindIndex(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null
  const normalized = String(text).trim().toLowerCase()
  if (normalized === '') return ''

  return crypto.createHmac('sha256', MASTER_KEY).update(normalized).digest('hex')
}

/**
 * Desencripta de forma recursiva o directa las propiedades sensibles de un usuario.
 */
export function decryptUser<T extends Record<string, any>>(user: T | null | undefined): T | null {
  if (!user) return null

  const decrypted: any = { ...user }

  if ('nombre' in decrypted && typeof decrypted.nombre === 'string') {
    decrypted.nombre = decrypt(decrypted.nombre)
  }
  if ('apellidos' in decrypted && typeof decrypted.apellidos === 'string') {
    decrypted.apellidos = decrypt(decrypted.apellidos)
  }
  if ('email' in decrypted && typeof decrypted.email === 'string') {
    decrypted.email = decrypt(decrypted.email)
  }
  if ('telefono' in decrypted && typeof decrypted.telefono === 'string') {
    decrypted.telefono = decrypt(decrypted.telefono)
  }

  // Desencriptar relaciones comunes si están presentes
  if (decrypted.usuario && typeof decrypted.usuario === 'object') {
    decrypted.usuario = decryptUser(decrypted.usuario)
  }
  if (decrypted.fotografo && typeof decrypted.fotografo === 'object') {
    decrypted.fotografo = decryptUser(decrypted.fotografo)
  }
  if (decrypted.creador && typeof decrypted.creador === 'object') {
    decrypted.creador = decryptUser(decrypted.creador)
  }
  if (decrypted.vendedor && typeof decrypted.vendedor === 'object') {
    decrypted.vendedor = decryptUser(decrypted.vendedor)
  }

  return decrypted as T
}

/**
 * Desencripta una lista de usuarios o de entidades que contienen relaciones con usuarios.
 */
export function decryptUsers<T extends Record<string, any>>(items: T[]): T[] {
  return items.map((item) => decryptUser(item) as T)
}
