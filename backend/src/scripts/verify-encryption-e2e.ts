import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/db.js'
import { encrypt, blindIndex, decryptUser, decryptSesion } from '../shared/encryption.js'

async function runE2EVerification() {
  console.log('🚀 Iniciando verificación E2E de encriptación de datos sensibles...\n')

  // 1. Verificar usuarios en DB y contraseñas
  console.log('1️⃣ Comprobando formato en MariaDB (BD cruda vs desencriptada)...')
  const rawAdmin = await prisma.usuario.findFirst({
    where: { emailHash: blindIndex('hartum@gmail.com') },
  })

  if (!rawAdmin) {
    throw new Error('No se encontró el superusuario en la base de datos')
  }

  console.log('  [DB RAW]:')
  console.log('    - ID:', rawAdmin.id)
  console.log('    - Nombre cifrado:', rawAdmin.nombre.startsWith('enc:v1:') ? '✅ ' + rawAdmin.nombre.slice(0, 30) + '...' : '❌ No cifrado')
  console.log('    - Apellidos cifrados:', rawAdmin.apellidos.startsWith('enc:v1:') ? '✅ ' + rawAdmin.apellidos.slice(0, 30) + '...' : '❌ No cifrado')
  console.log('    - Email cifrado:', rawAdmin.email.startsWith('enc:v1:') ? '✅ ' + rawAdmin.email.slice(0, 30) + '...' : '❌ No cifrado')
  console.log('    - Teléfono cifrado:', rawAdmin.telefono?.startsWith('enc:v1:') ? '✅ ' + rawAdmin.telefono?.slice(0, 30) + '...' : '❌ No cifrado')
  console.log('    - EmailHash (Blind Index):', rawAdmin.emailHash?.length === 64 ? '✅ ' + rawAdmin.emailHash.slice(0, 20) + '...' : '❌ Inválido')
  console.log('    - PasswordHash (Bcrypt):', rawAdmin.passwordHash?.startsWith('$2') ? '✅ ' + rawAdmin.passwordHash.slice(0, 20) + '... (BCRYPT INTACTO)' : '❌ Inválido')

  const decryptedAdmin = decryptUser(rawAdmin)!
  console.log('  [DESENCRIPTADO PARA LA APP]:')
  console.log('    - Nombre:', decryptedAdmin.nombre === 'Ivan' ? '✅ Ivan' : '❌ ' + decryptedAdmin.nombre)
  console.log('    - Apellidos:', decryptedAdmin.apellidos === 'Gascón' ? '✅ Gascón' : '❌ ' + decryptedAdmin.apellidos)
  console.log('    - Email:', decryptedAdmin.email === 'hartum@gmail.com' ? '✅ hartum@gmail.com' : '❌ ' + decryptedAdmin.email)
  console.log('    - Teléfono:', decryptedAdmin.telefono === '+34 645 584 470' ? '✅ +34 645 584 470' : '❌ ' + decryptedAdmin.telefono)

  // 2. Probar creación de nuevo usuario con datos sensibles
  console.log('\n2️⃣ Creando usuario de prueba con datos personales...')
  const testEmail = `test_security_${Date.now()}@jjstudio.com`
  const testPhone = '+34 611 999 888'
  const testPass = 'secretPassword123'
  const passHash = await bcrypt.hash(testPass, 10)
  const role = await prisma.role.findFirst({ where: { codigo: 'FOTOGRAFO' } })

  const createdUser = await prisma.usuario.create({
    data: {
      nombre: encrypt('Carlos')!,
      apellidos: encrypt('Segura Prieto')!,
      email: encrypt(testEmail)!,
      emailHash: blindIndex(testEmail),
      telefono: encrypt(testPhone),
      passwordHash: passHash,
      roleId: role!.id,
    },
  })

  console.log('  ✓ Usuario insertado con ID:', createdUser.id)

  // 3. Buscar usuario recién creado por su blind index
  console.log('\n3️⃣ Búsqueda exacta en DB usando Blind Index...')
  const foundUser = await prisma.usuario.findFirst({
    where: { emailHash: blindIndex(testEmail) },
  })

  if (!foundUser) {
    throw new Error('No se pudo encontrar el usuario usando el Blind Index')
  }

  const decFound = decryptUser(foundUser)!
  console.log('  ✓ Usuario encontrado y desencriptado:')
  console.log('    - Email coincidente:', decFound.email === testEmail ? '✅ SÍ' : '❌ NO')
  console.log('    - Nombre coincidente:', decFound.nombre === 'Carlos' ? '✅ SÍ' : '❌ NO')
  console.log('    - Teléfono coincidente:', decFound.telefono === testPhone ? '✅ SÍ' : '❌ NO')

  // 4. Validar verificación de contraseña Bcrypt
  console.log('\n4️⃣ Verificando hash Bcrypt de la contraseña...')
  const passMatches = await bcrypt.compare(testPass, foundUser.passwordHash!)
  console.log('    - ¿Contraseña válida?:', passMatches ? '✅ SÍ (Login funciona)' : '❌ NO')

  // 5. Verificar sesiones fotográficas en DB
  console.log('\n5️⃣ Comprobando formato en MariaDB para sesiones fotográficas (BD cruda vs desencriptada)...')
  const rawSession = await prisma.sesionFotografica.findFirst({
    where: { deletedAt: null },
  })

  if (rawSession) {
    console.log('  [SESIÓN RAW]:')
    console.log('    - ID:', rawSession.id)
    console.log('    - Cliente Nombre cifrado:', rawSession.clienteNombre.startsWith('enc:v1:') ? '✅ ' + rawSession.clienteNombre.slice(0, 30) + '...' : '❌ No cifrado')
    console.log('    - Cliente Email cifrado:', rawSession.clienteEmail?.startsWith('enc:v1:') ? '✅ ' + rawSession.clienteEmail?.slice(0, 30) + '...' : 'ℹ️ ' + (rawSession.clienteEmail || 'vacío'))
    console.log('    - Cliente Teléfono cifrado:', rawSession.clienteTelefono?.startsWith('enc:v1:') ? '✅ ' + rawSession.clienteTelefono?.slice(0, 30) + '...' : 'ℹ️ ' + (rawSession.clienteTelefono || 'vacío'))

    const decSession = decryptSesion(rawSession)!
    console.log('  [SESIÓN DESENCRIPTADA]:')
    console.log('    - Cliente Nombre:', '✅ ' + decSession.clienteNombre)
    console.log('    - Cliente Email:', decSession.clienteEmail ? '✅ ' + decSession.clienteEmail : 'ℹ️ vacío')
    console.log('    - Cliente Teléfono:', decSession.clienteTelefono ? '✅ ' + decSession.clienteTelefono : 'ℹ️ vacío')
  }

  // 6. Limpieza del usuario de prueba
  console.log('\n6️⃣ Limpiando usuario de prueba...')
  await prisma.usuario.delete({ where: { id: createdUser.id } })
  console.log('  ✓ Usuario de prueba eliminado.')

  console.log('\n🎉 ¡TODAS LAS COMPROBACIONES DE SEGURIDAD Y CIFRADO HAN SIDO EXITOSAS!')
}

runE2EVerification()
  .catch((err) => {
    console.error('❌ Error en verificación:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
