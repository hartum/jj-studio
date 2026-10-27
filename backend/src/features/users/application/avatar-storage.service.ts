import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resuelve de forma absoluta la carpeta backend/uploads/avatars
const AVATARS_DIR = path.resolve(__dirname, '../../../../uploads/avatars')

/**
 * Asegura que el directorio uploads/avatars existe en disco.
 */
export async function ensureAvatarsDir(): Promise<string> {
  if (!existsSync(AVATARS_DIR)) {
    await fs.mkdir(AVATARS_DIR, { recursive: true })
  }
  return AVATARS_DIR
}

/**
 * Guarda una imagen en base64 en el disco duro y devuelve la URL relativa.
 * Si se pasa `oldAvatarUrl`, elimina el archivo anterior del disco para no dejar huérfanos.
 */
export async function saveAvatarFromBase64(
  userId: string,
  base64Data: string,
  oldAvatarUrl?: string | null
): Promise<string> {
  // Si ya es una URL relativa o remota, no procesar
  if (base64Data.startsWith('/uploads/') || base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data
  }

  await ensureAvatarsDir()

  // Extraer formato y contenido binario
  let extension = 'webp'
  let rawBase64 = base64Data

  const match = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
  if (match) {
    const rawExt = match[1].toLowerCase()
    if (rawExt === 'jpeg' || rawExt === 'jpg') extension = 'jpg'
    else if (rawExt === 'png') extension = 'png'
    else if (rawExt === 'webp') extension = 'webp'
    else extension = 'jpg'

    rawBase64 = match[2]
  }

  const buffer = Buffer.from(rawBase64, 'base64')
  if (buffer.length === 0) {
    throw new Error('El buffer de imagen está vacío')
  }

  // Eliminar el avatar previo si existía en disco
  if (oldAvatarUrl) {
    await deleteAvatarFile(oldAvatarUrl)
  }

  // Generar nombre seguro: usr_<userId>_<timestamp>.<ext>
  // Limpiar caracteres extraños del userId para seguridad en nombres de archivo
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `usr_${safeUserId}_${Date.now()}.${extension}`
  const targetPath = path.join(AVATARS_DIR, filename)

  await fs.writeFile(targetPath, buffer)

  return `/uploads/avatars/${filename}`
}

/**
 * Elimina de forma segura un archivo de avatar del disco dado su path relativo (/uploads/avatars/...)
 */
export async function deleteAvatarFile(relativeUrl?: string | null): Promise<void> {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/avatars/')) {
    return
  }

  try {
    // Extraer únicamente el nombre de archivo para prevenir Path Traversal
    const filename = path.basename(relativeUrl)
    if (!filename || filename.startsWith('.')) return

    const filePath = path.join(AVATARS_DIR, filename)
    if (existsSync(filePath)) {
      await fs.unlink(filePath)
    }
  } catch (error) {
    // No interrumpir el flujo si falla el borrado físico, solo loguear
    console.error(`[AvatarStorage] Error al eliminar archivo ${relativeUrl}:`, error)
  }
}

export function getAvatarsDir(): string {
  return AVATARS_DIR
}
