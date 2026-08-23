import 'dotenv/config'
import { prisma } from '../shared/db.js'
import { encrypt, decrypt, blindIndex, decryptUser } from '../shared/encryption.js'

async function testCrypto() {
  console.log('🧪 Probando funciones de encriptación y desencriptación...')

  const originalText = 'Juan Pérez Fotógrafo +34 600 112 233 juan@ejemplo.com'
  const encrypted = encrypt(originalText)
  const decrypted = decrypt(encrypted)

  console.log('Original: ', originalText)
  console.log('Encriptado: ', encrypted)
  console.log('Desencriptado: ', decrypted)
  console.log('¿Coinciden?: ', originalText === decrypted ? '✅ SÍ' : '❌ NO')

  console.log('\n🔍 Probando consulta a MariaDB con emailHash...')
  const searchEmail = 'hartum@gmail.com'
  const hash = blindIndex(searchEmail)

  const userFromDb = await prisma.usuario.findFirst({
    where: { emailHash: hash },
  })

  console.log('Usuario encontrado en DB (raw):', {
    id: userFromDb?.id,
    nombre: userFromDb?.nombre,
    apellidos: userFromDb?.apellidos,
    email: userFromDb?.email,
    telefono: userFromDb?.telefono,
    emailHash: userFromDb?.emailHash,
  })

  const decryptedUser = decryptUser(userFromDb)
  console.log('\n🔓 Usuario desencriptado para la app:', {
    id: decryptedUser?.id,
    nombre: decryptedUser?.nombre,
    apellidos: decryptedUser?.apellidos,
    email: decryptedUser?.email,
    telefono: decryptedUser?.telefono,
  })
}

testCrypto()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
