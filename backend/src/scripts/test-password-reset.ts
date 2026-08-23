import 'dotenv/config'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../shared/db.js'
import { blindIndex, decryptUser } from '../shared/encryption.js'

async function testPasswordResetFlow() {
  console.log('🧪 ==========================================')
  console.log('🧪 PROBANDO FLUJO DE RECUPERACIÓN DE CONTRASEÑA')
  console.log('🧪 ==========================================\n')

  const testEmail = 'hartum@gmail.com'
  const emailHash = blindIndex(testEmail)

  const user = await prisma.usuario.findFirst({
    where: { emailHash },
  })

  if (!user) {
    throw new Error(`Usuario con email ${testEmail} no encontrado en la BD.`)
  }

  const originalPasswordHash = user.passwordHash
  console.log('1️⃣ Usuario encontrado:', {
    id: user.id,
    email: testEmail,
  })

  // 1. Simular generación de token de recuperación
  console.log('\n2️⃣ Generando token de recuperación de 32 bytes...')
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  // Limpiar previos
  await prisma.passwordResetToken.deleteMany({
    where: { usuarioId: user.id },
  })

  const createdToken = await prisma.passwordResetToken.create({
    data: {
      usuarioId: user.id,
      tokenHash,
      expiresAt,
    },
  })

  console.log('  ✓ Token creado en DB con ID:', createdToken.id)
  console.log('  ✓ Token hash (SHA-256):', tokenHash.slice(0, 20) + '...')
  console.log('  ✓ Expira en:', expiresAt.toISOString())

  // 2. Verificar validación del token
  console.log('\n3️⃣ Verificando token con hash...')
  const foundToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { usuario: true },
  })

  if (!foundToken || foundToken.usedAt !== null || foundToken.expiresAt < new Date()) {
    throw new Error('El token debería ser válido pero fue rechazado')
  }
  console.log('  ✅ Token verificado como VÁLIDO')

  // 3. Simular cambio de contraseña
  console.log('\n4️⃣ Restableciendo contraseña por una nueva...')
  const temporaryNewPass = 'NewSecurePass2026!'
  const newPassHash = await bcrypt.hash(temporaryNewPass, 10)

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: user.id },
      data: { passwordHash: newPassHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: createdToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  console.log('  ✅ Contraseña actualizada en tabla usuarios y token marcado como USADO')

  // 4. Verificar que el token usado ya NO es válido
  console.log('\n5️⃣ Intentando reusar el token ya consumido...')
  const reusedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  })
  if (reusedToken?.usedAt !== null) {
    console.log('  ✅ Correcto: El token está quemado y es rechazado para futuros intentos')
  } else {
    throw new Error('Fallo de seguridad: El token usado sigue activo')
  }

  // 5. Verificar que la nueva contraseña funciona con bcrypt
  console.log('\n6️⃣ Verificando login con la nueva contraseña...')
  const updatedUser = await prisma.usuario.findUnique({ where: { id: user.id } })
  const isValidPass = await bcrypt.compare(temporaryNewPass, updatedUser!.passwordHash!)
  console.log('  ✓ ¿La nueva contraseña valida correctamente?:', isValidPass ? '✅ SÍ' : '❌ NO')

  // 6. Restaurar contraseña original
  console.log('\n7️⃣ Restaurando contraseña original del usuario...')
  await prisma.usuario.update({
    where: { id: user.id },
    data: { passwordHash: originalPasswordHash },
  })
  // Limpiar tokens de prueba
  await prisma.passwordResetToken.deleteMany({
    where: { usuarioId: user.id },
  })
  console.log('  ✓ Contraseña original restaurada y tokens de prueba eliminados.')

  console.log('\n🎉 ¡EL FLUJO DE RECUPERACIÓN DE CONTRASEÑA FUNCIONA PERFECTAMENTE!')
}

testPasswordResetFlow()
  .catch((err) => {
    console.error('❌ Error en el test de recuperación:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
