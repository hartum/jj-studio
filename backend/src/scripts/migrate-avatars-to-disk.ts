import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { prisma } from '../shared/db.js'
import { ensureAvatarsDir, getAvatarsDir } from '../features/users/application/avatar-storage.service.js'

async function runAvatarMigration() {
  console.log('=====================================================')
  console.log('🔄 Iniciando Script de Migración de Avatares a Disco')
  console.log('=====================================================\n')

  try {
    const avatarsDir = await ensureAvatarsDir()
    console.log(`📁 Directorio destino de avatares: ${avatarsDir}`)

    // 1. Obtener todos los usuarios con imagen
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        imagen: true,
      },
    })

    console.log(`👥 Total de usuarios analizados: ${usuarios.length}`)

    const usuariosConBase64 = usuarios.filter(
      (u) => u.imagen && u.imagen.startsWith('data:image/')
    )
    const usuariosConUrl = usuarios.filter(
      (u) => u.imagen && (u.imagen.startsWith('/uploads/') || u.imagen.startsWith('http'))
    )
    const usuariosSinImagen = usuarios.filter((u) => !u.imagen)

    console.log(`   - Con avatar en base64 (pendientes): ${usuariosConBase64.length}`)
    console.log(`   - Con avatar ya en disco/URL:        ${usuariosConUrl.length}`)
    console.log(`   - Sin avatar:                        ${usuariosSinImagen.length}\n`)

    if (usuariosConBase64.length === 0) {
      console.log('✨ No hay usuarios con avatares en base64 para migrar. Todo está al día.')
      return
    }

    let migradosCount = 0
    let erroresCount = 0
    let totalBytesGuardados = 0

    for (const usuario of usuariosConBase64) {
      try {
        const rawData = usuario.imagen!
        const match = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)

        let ext = 'webp'
        let base64Content = rawData

        if (match) {
          const rawExt = match[1].toLowerCase()
          if (rawExt === 'jpeg' || rawExt === 'jpg') ext = 'jpg'
          else if (rawExt === 'png') ext = 'png'
          else if (rawExt === 'webp') ext = 'webp'
          else ext = 'jpg'
          base64Content = match[2]
        }

        const buffer = Buffer.from(base64Content, 'base64')
        if (buffer.length === 0) {
          console.warn(`⚠️ Usuario ${usuario.id}: Buffer de imagen vacío. Omitiendo.`)
          erroresCount++
          continue
        }

        const safeId = usuario.id.replace(/[^a-zA-Z0-9_-]/g, '_')
        const filename = `usr_${safeId}_${Date.now()}.${ext}`
        const filePath = path.join(avatarsDir, filename)

        // Escribir archivo físico en disco
        await fs.writeFile(filePath, buffer)

        // Verificar que el archivo existe y pesa más de 0 bytes
        const stat = await fs.stat(filePath)
        if (stat.size === 0) {
          throw new Error(`El archivo ${filename} se creó con tamaño 0`)
        }

        const relativeUrl = `/uploads/avatars/${filename}`

        // Actualizar registro en la base de datos
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { imagen: relativeUrl },
        })

        migradosCount++
        totalBytesGuardados += stat.size
        console.log(`✅ [${migradosCount}/${usuariosConBase64.length}] Usuario ${usuario.id} -> ${relativeUrl} (${(stat.size / 1024).toFixed(1)} KB)`)
      } catch (err: any) {
        erroresCount++
        console.error(`❌ Error migrando usuario ${usuario.id}:`, err?.message || err)
      }
    }

    console.log('\n=====================================================')
    console.log('🎉 Migración completada')
    console.log('=====================================================')
    console.log(`✔️ Avatares migrados a disco:  ${migradosCount}`)
    console.log(`📦 Espacio total extraído:     ${(totalBytesGuardados / 1024).toFixed(1)} KB`)
    console.log(`⚠️ Errores encontrados:        ${erroresCount}`)
    console.log('=====================================================\n')
  } catch (error) {
    console.error('💥 Error crítico durante la migración:', error)
  } finally {
    await prisma.$disconnect()
  }
}

runAvatarMigration()
