import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encrypt, blindIndex } from '../src/shared/encryption.js'

const prisma = new PrismaClient()

async function seedUser(data: {
  nombre: string
  apellidos: string
  email: string
  telefono: string
  passwordHash: string
  roleId: number
  activo: boolean
}) {
  const hash = blindIndex(data.email)!
  const existing = await prisma.usuario.findFirst({
    where: {
      OR: [
        { emailHash: hash },
        { email: data.email },
      ],
    },
  })

  if (existing) {
    return await prisma.usuario.update({
      where: { id: existing.id },
      data: {
        nombre: encrypt(data.nombre)!,
        apellidos: encrypt(data.apellidos)!,
        email: encrypt(data.email)!,
        emailHash: hash,
        telefono: encrypt(data.telefono),
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        activo: data.activo,
      },
    })
  }

  return await prisma.usuario.create({
    data: {
      nombre: encrypt(data.nombre)!,
      apellidos: encrypt(data.apellidos)!,
      email: encrypt(data.email)!,
      emailHash: hash,
      telefono: encrypt(data.telefono),
      passwordHash: data.passwordHash,
      roleId: data.roleId,
      activo: data.activo,
    },
  })
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create default roles/profiles
  const superuserRole = await prisma.role.upsert({
    where: { codigo: 'SUPERUSUARIO' },
    update: {},
    create: {
      codigo: 'SUPERUSUARIO',
      nombre: 'SuperUsuario',
      descripcion: 'Acceso total y control absoluto del sistema',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { codigo: 'ADMIN' },
    update: {},
    create: {
      codigo: 'ADMIN',
      nombre: 'Administrador General / Dueño',
      descripcion: 'Gestión global de países, hoteles, usuarios y reportes',
    },
  })

  const gerenteRole = await prisma.role.upsert({
    where: { codigo: 'GERENTE' },
    update: {},
    create: {
      codigo: 'GERENTE',
      nombre: 'Gerente de Área',
      descripcion: 'Control de la operación asignada en su área/país',
    },
  })

  const supervisorRole = await prisma.role.upsert({
    where: { codigo: 'SUPERVISOR' },
    update: {},
    create: {
      codigo: 'SUPERVISOR',
      nombre: 'Supervisor de Hotel',
      descripcion: 'Gestión operativa del hotel y su equipo',
    },
  })

  const fotografoRole = await prisma.role.upsert({
    where: { codigo: 'FOTOGRAFO' },
    update: {},
    create: {
      codigo: 'FOTOGRAFO',
      nombre: 'Fotógrafo',
      descripcion: 'Agenda de sesiones y registro de ventas',
    },
  })

  const agendadorRole = await prisma.role.upsert({
    where: { codigo: 'AGENDADOR' },
    update: {},
    create: {
      codigo: 'AGENDADOR',
      nombre: 'Agendador / Captador',
      descripcion: 'Captación y reserva de citas para sesiones fotográficas',
    },
  })

  const contableRole = await prisma.role.upsert({
    where: { codigo: 'CONTABLE' },
    update: {},
    create: {
      codigo: 'CONTABLE',
      nombre: 'Contable',
      descripcion: 'Acceso a ventas, comisiones e importes',
    },
  })

  // Encriptar contraseñas simplificadas por rol
  const passSuperuser = await bcrypt.hash('fardaka', 10)
  const passAdmin = await bcrypt.hash('admin', 10)
  const passGerente = await bcrypt.hash('gerente', 10)
  const passSupervisor = await bcrypt.hash('supervisor', 10)
  const passFotografo = await bcrypt.hash('fotografo', 10)
  const passAgendador = await bcrypt.hash('agendador', 10)
  const passContable = await bcrypt.hash('contable', 10)

  // SuperUsuario principal
  await seedUser({
    nombre: 'Ivan',
    apellidos: 'Gascón',
    email: 'hartum@gmail.com',
    telefono: '+34 645 584 470',
    passwordHash: passSuperuser,
    roleId: superuserRole.id,
    activo: true,
  })

  // Admin
  await seedUser({
    nombre: 'Joaquín',
    apellidos: 'Rodriguez',
    email: 'admin@admin.com',
    telefono: '+34 612 345 678',
    passwordHash: passAdmin,
    roleId: adminRole.id,
    activo: true,
  })

  // Gerente
  await seedUser({
    nombre: 'Alberto',
    apellidos: 'Morales',
    email: 'gerente@gerente.com',
    telefono: '+34 644 332 211',
    passwordHash: passGerente,
    roleId: gerenteRole.id,
    activo: true,
  })

  // Supervisor
  await seedUser({
    nombre: 'María',
    apellidos: 'Ruiz',
    email: 'supervisor@supervisor.com',
    telefono: '+34 655 443 322',
    passwordHash: passSupervisor,
    roleId: supervisorRole.id,
    activo: true,
  })

  // Fotógrafo
  const fotografoUser = await seedUser({
    nombre: 'Laura',
    apellidos: 'Fernández',
    email: 'fotografo@fotografo.com',
    telefono: '+34 699 887 766',
    passwordHash: passFotografo,
    roleId: fotografoRole.id,
    activo: true,
  })

  await prisma.usuarioColor.upsert({
    where: { usuarioId: fotografoUser.id },
    update: { color: '#8b5cf6' },
    create: { usuarioId: fotografoUser.id, color: '#8b5cf6' },
  })

  // Agendador
  const agendadorUser = await seedUser({
    nombre: 'David',
    apellidos: 'López',
    email: 'agendador@agendador.com',
    telefono: '+34 688 776 655',
    passwordHash: passAgendador,
    roleId: agendadorRole.id,
    activo: true,
  })

  // Contable
  await seedUser({
    nombre: 'Pedro',
    apellidos: 'Escalona',
    email: 'contable@contable.com',
    telefono: '+34 633 221 100',
    passwordHash: passContable,
    roleId: contableRole.id,
    activo: true,
  })

  // Seeding de Países
  const mexico = await prisma.pais.upsert({
    where: { codigo: 'MX' },
    update: { nombre: 'México', codigoTelefono: '+52' },
    create: {
      codigo: 'MX',
      nombre: 'México',
      codigoTelefono: '+52',
    },
  })

  const jamaica = await prisma.pais.upsert({
    where: { codigo: 'JM' },
    update: { nombre: 'Jamaica', codigoTelefono: '+1876' },
    create: {
      codigo: 'JM',
      nombre: 'Jamaica',
      codigoTelefono: '+1876',
    },
  })

  const repDominicana = await prisma.pais.upsert({
    where: { codigo: 'DO' },
    update: { nombre: 'Rep. Dominicana', codigoTelefono: '+1809' },
    create: {
      codigo: 'DO',
      nombre: 'Rep. Dominicana',
      codigoTelefono: '+1809',
    },
  })

  // Seeding de Áreas
  const areasMexico = ['Cancún', 'Riviera Maya', 'Vallarta', 'Los Cabos']
  for (const nombre of areasMexico) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: mexico.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: mexico.id, nombre },
      })
    }
  }

  const areasJamaica = ['Costa Norte']
  for (const nombre of areasJamaica) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: jamaica.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: jamaica.id, nombre },
      })
    }
  }

  const areasRepDom = ['Punta Cana']
  for (const nombre of areasRepDom) {
    const existingArea = await prisma.area.findFirst({
      where: { paisId: repDominicana.id, nombre },
    })
    if (!existingArea) {
      await prisma.area.create({
        data: { paisId: repDominicana.id, nombre },
      })
    }
  }

  // Seeding de Hoteles por Área
  const hotelesMap: Record<string, string[]> = {
    Cancún: ['Ziva', 'Zilara', 'HRC', 'AVA'],
    'Riviera Maya': ['Único', 'HRRM'],
    Vallarta: ['HRV', 'Único'],
    'Los Cabos': ['HRLC', 'Nobu'],
    'Costa Norte': ['Bahía Principe', 'Único'],
    'Punta Cana': ['HRC', 'PC'],
  }

  for (const [nombreArea, nombresHoteles] of Object.entries(hotelesMap)) {
    const area = await prisma.area.findFirst({ where: { nombre: nombreArea } })
    if (area) {
      for (const nombreHotel of nombresHoteles) {
        const existingHotel = await prisma.hotel.findFirst({
          where: { areaId: area.id, nombre: nombreHotel },
        })
        if (!existingHotel) {
          await prisma.hotel.create({
            data: {
              areaId: area.id,
              nombre: nombreHotel,
            },
          })
        }
      }
    }
  }

  // Asignar a fotógrafo y agendador los hoteles HRLC y Nobu en Los Cabos
  const hrlc = await prisma.hotel.findFirst({ where: { nombre: 'HRLC' } })
  const nobu = await prisma.hotel.findFirst({ where: { nombre: 'Nobu' } })

  const staff = [fotografoUser, agendadorUser]

  for (const u of staff) {
    if (hrlc) {
      const existing = await prisma.usuarioHotel.findFirst({
        where: { usuarioId: u.id, hotelId: hrlc.id },
      })
      if (!existing) {
        await prisma.usuarioHotel.create({
          data: { usuarioId: u.id, hotelId: hrlc.id },
        })
      }
    }

    if (nobu) {
      const existing = await prisma.usuarioHotel.findFirst({
        where: { usuarioId: u.id, hotelId: nobu.id },
      })
      if (!existing) {
        await prisma.usuarioHotel.create({
          data: { usuarioId: u.id, hotelId: nobu.id },
        })
      }
    }
  }

  if (hrlc) {
    const countHrlc = await prisma.sesionFotografica.count({ where: { hotelId: hrlc.id } })
    if (countHrlc === 0) {
      const tomorrow = new Date(Date.now() + 86400000)
      const start = new Date(tomorrow.setHours(10, 0, 0, 0))
      const departure = new Date(tomorrow.getTime() + 86400000 * 3)
      await prisma.sesionFotografica.create({
        data: {
          hotelId: hrlc.id,
          fotografoId: fotografoUser.id,
          creadorId: agendadorUser.id,
          clienteNombre: encrypt('Familia García')!,
          clienteEmail: encrypt('garcia@ejemplo.com'),
          clienteTelefono: encrypt('+34 611 223 344'),
          numeroHabitacion: '304B',
          numAdultos: 2,
          numNinos: 2,
          fechaSalida: departure,
          concepto: 'Foto familiar',
          fechaHoraInicio: start,
          estado: 'PROGRAMADA',
          origen: 'MANUAL',
          notas: 'Sesión al atardecer en la playa de HRLC',
        },
      })
    }
  }

  if (nobu) {
    const countNobu = await prisma.sesionFotografica.count({ where: { hotelId: nobu.id } })
    if (countNobu === 0) {
      const inTwoDays = new Date(Date.now() + 172800000)
      const start = new Date(inTwoDays.setHours(16, 0, 0, 0))
      const departure = new Date(inTwoDays.getTime() + 86400000 * 2)
      await prisma.sesionFotografica.create({
        data: {
          hotelId: nobu.id,
          fotografoId: fotografoUser.id,
          creadorId: agendadorUser.id,
          clienteNombre: encrypt('Pareja Martínez')!,
          clienteEmail: encrypt('martinez@ejemplo.com'),
          clienteTelefono: encrypt('+34 699 887 766'),
          numeroHabitacion: 'Villa 12',
          numAdultos: 2,
          numNinos: 0,
          fechaSalida: departure,
          concepto: 'Pedida de matrimonio',
          fechaHoraInicio: start,
          estado: 'PROGRAMADA',
          origen: 'MANUAL',
          notas: 'Sesión romántica cerca de la piscina en Nobu',
        },
      })
    }
  }

  console.log(
    '✅ Seeding completed! Países, Áreas, Hoteles, Asignaciones y Sesiones creadas correctamente.',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
