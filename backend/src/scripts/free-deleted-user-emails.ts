import 'dotenv/config'
import { prisma } from '../shared/db.js'
import { encrypt, decrypt } from '../shared/encryption.js'

async function main() {
  const deletedUsers = await prisma.usuario.findMany({
    where: {
      deletedAt: { not: null },
      emailHash: { not: null },
    },
  })

  console.log(`Encontrados ${deletedUsers.length} usuario(s) eliminado(s) con emailHash activo.`)

  for (const u of deletedUsers) {
    const decEmail = decrypt(u.email) || ''
    const freedEmail = decEmail
      ? `deleted_${Date.now()}_${decEmail}`
      : `deleted_${Date.now()}_${u.id}`
    await prisma.usuario.update({
      where: { id: u.id },
      data: {
        activo: false,
        emailHash: null,
        email: encrypt(freedEmail) || freedEmail,
      },
    })
    console.log(`✓ Usuario ${u.id} liberado. Email original: ${decEmail}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
