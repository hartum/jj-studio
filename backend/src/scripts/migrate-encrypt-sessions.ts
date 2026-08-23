import 'dotenv/config'
import { prisma } from '../shared/db.js'
import { encrypt, decrypt } from '../shared/encryption.js'

async function migrateSessions() {
  console.log('🔒 Iniciando migración de encriptación para sesiones fotográficas...')

  const sessions = await prisma.sesionFotografica.findMany()
  console.log(`📋 Encontradas ${sessions.length} sesiones en la base de datos.`)

  let updatedCount = 0

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

    console.log(`  ✓ Sesión migrada: [${plainNombre}] (${s.id})`)
    updatedCount++
  }

  console.log(`✅ Migración completada exitosamente. Total sesiones cifradas: ${updatedCount}`)
}

migrateSessions()
  .catch((err) => {
    console.error('❌ Error durante la migración de sesiones:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
