import 'dotenv/config'
import { prisma } from '../shared/db.js'
import { encrypt, decrypt, blindIndex } from '../shared/encryption.js'

async function migrateUsers() {
  console.log('🔒 Iniciando migración de encriptación para usuarios...')

  const users = await prisma.usuario.findMany()
  console.log(`📋 Encontrados ${users.length} usuarios en la base de datos.`)

  let updatedCount = 0

  for (const user of users) {
    // Si el dato ya está encriptado, decrypt nos devuelve el valor plano; si no, nos devuelve el valor existente
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

    console.log(`  ✓ Usuario migrado: [${plainEmail}] (${user.id})`)
    updatedCount++
  }

  console.log(`✅ Migración completada exitosamente. Total usuarios cifrados: ${updatedCount}`)
}

migrateUsers()
  .catch((err) => {
    console.error('❌ Error durante la migración de usuarios:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
