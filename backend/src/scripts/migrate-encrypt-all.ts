import 'dotenv/config'
import { prisma } from '../shared/db.js'
import { encrypt, decrypt, blindIndex } from '../shared/encryption.js'

async function migrateAll() {
  console.log('🔒 ==========================================')
  console.log('🔒 INICIANDO MIGRACIÓN Y CIFRADO DE DATOS (PROD/DEV)')
  console.log('🔒 ==========================================\n')

  // 1. MIGRAR USUARIOS
  console.log('1️⃣ Migrando tabla usuarios...')
  const users = await prisma.usuario.findMany()
  let usersUpdated = 0

  for (const user of users) {
    const plainNombre = decrypt(user.nombre) || user.nombre
    const plainApellidos = decrypt(user.apellidos) || user.apellidos
    const plainEmail = decrypt(user.email) || user.email
    const plainTelefono = decrypt(user.telefono) || user.telefono || ''

    const encryptedNombre = encrypt(plainNombre) || ''
    const encryptedApellidos = encrypt(plainApellidos) || ''
    const encryptedEmail = encrypt(plainEmail) || ''
    const encryptedTelefono = plainTelefono ? encrypt(plainTelefono) : ''
    const calculatedEmailHash = blindIndex(plainEmail)

    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        nombre: encryptedNombre,
        apellidos: encryptedApellidos,
        email: encryptedEmail,
        telefono: encryptedTelefono || null,
        emailHash: calculatedEmailHash,
      },
    })
    usersUpdated++
  }
  console.log(`  ✅ ${usersUpdated} usuarios cifrados e indexados con emailHash.\n`)

  // 2. MIGRAR SESIONES FOTOGRÁFICAS
  console.log('2️⃣ Migrando tabla sesiones fotográficas...')
  const sessions = await prisma.sesionFotografica.findMany()
  let sessionsUpdated = 0

  for (const s of sessions) {
    const plainNombre = decrypt(s.clienteNombre) || s.clienteNombre
    const plainEmail = decrypt(s.clienteEmail) || s.clienteEmail || ''
    const plainTelefono = decrypt(s.clienteTelefono) || s.clienteTelefono || ''

    const encryptedNombre = encrypt(plainNombre) || ''
    const encryptedEmail = plainEmail ? encrypt(plainEmail) : null
    const encryptedTelefono = plainTelefono ? encrypt(plainTelefono) : null

    await prisma.sesionFotografica.update({
      where: { id: s.id },
      data: {
        clienteNombre: encryptedNombre,
        clienteEmail: encryptedEmail,
        clienteTelefono: encryptedTelefono,
      },
    })
    sessionsUpdated++
  }
  console.log(`  ✅ ${sessionsUpdated} sesiones fotográficas cifradas.\n`)

  console.log('🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO EN TODAS LAS TABLAS!')
}

migrateAll()
  .catch((err) => {
    console.error('❌ Error durante la migración:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
