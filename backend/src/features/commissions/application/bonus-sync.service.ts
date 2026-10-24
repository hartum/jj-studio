import { prisma } from '../../../shared/db.js'

export async function syncMonthlyBonuses(
  anio: number,
  mes: number,
  targetHotelIds?: number[] | null,
): Promise<number> {
  const startDate = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0))
  const endDate = new Date(Date.UTC(anio, mes, 1, 0, 0, 0))
  const fechaBono = new Date(Date.UTC(anio, mes - 1, 1, 12, 0, 0))

  // 1. Metas configuradas para este año y mes
  const whereMetas: any = {
    anio,
    mes,
    activo: true,
    deletedAt: null,
  }
  if (targetHotelIds && targetHotelIds.length > 0) {
    whereMetas.hotelId = { in: targetHotelIds }
  }

  const metas = await prisma.meta.findMany({
    where: whereMetas,
    include: {
      hotel: {
        include: {
          usuariosAsignados: {
            include: {
              usuario: {
                include: { role: true },
              },
            },
          },
        },
      },
      usuario: {
        include: { role: true },
      },
    },
  })

  if (metas.length === 0) return 0

  const hotelIds = Array.from(new Set(metas.map((m) => m.hotelId)))

  let createdCount = 0

  // 2. Obtener todas las comisiones no rechazadas del periodo para calcular ventas de colaboradores y hoteles
  const comisionesPeriodo = await prisma.comision.findMany({
    where: {
      fechaVenta: { gte: startDate, lt: endDate },
      estado: { not: 'RECHAZADA' },
      rolEnVenta: { not: 'BONO' },
      deletedAt: null,
    },
    include: {
      citaVenta: true,
    },
  })

  // Ventas deduplicadas por colaborador en el periodo
  const ventasPorUsuario = new Map<string, number>()
  const ventasPorUsuarioHotel = new Map<string, number>()
  const seenUserCita = new Set<string>()

  for (const c of comisionesPeriodo) {
    if (c.citaVentaId) {
      const keyUserCita = `${c.usuarioId}-${c.citaVentaId}`
      if (!seenUserCita.has(keyUserCita)) {
        seenUserCita.add(keyUserCita)
        const monto = c.citaVenta?.totalVentaUsd ?? c.baseCalculoUsd
        ventasPorUsuario.set(c.usuarioId, (ventasPorUsuario.get(c.usuarioId) || 0) + monto)
        const keyUserHotel = `${c.usuarioId}-${c.hotelId}`
        ventasPorUsuarioHotel.set(keyUserHotel, (ventasPorUsuarioHotel.get(keyUserHotel) || 0) + monto)
      }
    }
  }

  // 3. Procesar Metas Individuales (alcanceTipo: 'USUARIO')
  const userMetas = metas.filter(
    (m) =>
      m.alcanceTipo === 'USUARIO' &&
      m.usuarioId &&
      m.importeBonus &&
      m.importeBonus > 0 &&
      m.valorBonus &&
      m.valorBonus > 0,
  )

  for (const meta of userMetas) {
    const userId = meta.usuarioId!
    const umbral = meta.importeBonus!
    const premio = meta.valorBonus!

    const ventasHotel = ventasPorUsuarioHotel.get(`${userId}-${meta.hotelId}`) || 0
    const ventasGlobal = ventasPorUsuario.get(userId) || 0
    const totalVentasUser = Math.max(ventasHotel, ventasGlobal)

    if (totalVentasUser >= umbral) {
      // Verificar si ya existe el bono individual para este usuario, hotel, año y mes
      const existing = await prisma.comision.findFirst({
        where: {
          hotelId: meta.hotelId,
          usuarioId: userId,
          rolEnVenta: 'BONO',
          tipoBonus: 'INDIVIDUAL',
          fechaVenta: { gte: startDate, lt: endDate },
          deletedAt: null,
        },
      })

      if (!existing) {
        await prisma.comision.create({
          data: {
            hotelId: meta.hotelId,
            usuarioId: userId,
            rolEnVenta: 'BONO',
            tipoBonus: 'INDIVIDUAL',
            metaId: meta.id,
            tipoContrato: meta.usuario?.tipoContrato || 'ASALARIADO',
            porcentajeAplicado: 0,
            baseCalculoUsd: 0,
            importeComisionUsd: premio,
            estado: 'PENDIENTE',
            fechaVenta: fechaBono,
            descripcion: `Bono Individual (${meta.hotel.nombre}): Ventas de $${totalVentasUser.toFixed(2)} USD superan meta de $${umbral.toFixed(2)} USD`,
          },
        })
        createdCount++
      }
    }
  }

  // 4. Procesar Metas Grupales (alcanceTipo: 'HOTEL' sin usuarioId)
  const hotelMetas = metas.filter(
    (m) =>
      m.alcanceTipo === 'HOTEL' &&
      !m.usuarioId &&
      m.valorBonus &&
      m.valorBonus > 0 &&
      m.importeObjetivo > 0,
  )

  const ventasPorHotel = new Map<number, number>()
  const seenHotelCita = new Set<string>()
  for (const c of comisionesPeriodo) {
    if (c.citaVentaId) {
      const keyHotelCita = `${c.hotelId}-${c.citaVentaId}`
      if (!seenHotelCita.has(keyHotelCita)) {
        seenHotelCita.add(keyHotelCita)
        const monto = c.citaVenta?.totalVentaUsd ?? c.baseCalculoUsd
        ventasPorHotel.set(c.hotelId, (ventasPorHotel.get(c.hotelId) || 0) + monto)
      }
    }
  }

  let totalVentasGlobal = 0
  for (const v of ventasPorHotel.values()) {
    totalVentasGlobal += v
  }

  const ROLES_ELEGIBLES = ['FOTOGRAFO', 'AGENDADOR', 'VENDEDOR', 'SUPERVISOR']
  const ROLES_EXCLUIDOS = ['GERENTE', 'ADMIN', 'ADMINISTRADOR', 'SUPERUSUARIO', 'CONTABLE']

  for (const meta of hotelMetas) {
    const ventasHotel = ventasPorHotel.get(meta.hotelId) || 0
    const alcanzoBono = ventasHotel >= meta.importeObjetivo || totalVentasGlobal >= meta.importeObjetivo

    if (alcanzoBono) {
      // Determinar colaboradores elegibles asignados al hotel
      const asignados = meta.hotel.usuariosAsignados
        .map((ua) => ua.usuario)
        .filter((u) => u && !u.deletedAt)

      const elegibles = asignados.filter((u) => {
        const rolCode = (u.role?.codigo || '').toUpperCase()
        return ROLES_ELEGIBLES.includes(rolCode) && !ROLES_EXCLUIDOS.includes(rolCode)
      })

      const teamCount = Math.max(1, elegibles.length)
      const share = Math.round((meta.valorBonus! / teamCount) * 100) / 100

      for (const member of elegibles) {
        const existing = await prisma.comision.findFirst({
          where: {
            hotelId: meta.hotelId,
            usuarioId: member.id,
            rolEnVenta: 'BONO',
            tipoBonus: 'GRUPAL',
            fechaVenta: { gte: startDate, lt: endDate },
            deletedAt: null,
          },
        })

        if (!existing) {
          await prisma.comision.create({
            data: {
              hotelId: meta.hotelId,
              usuarioId: member.id,
              rolEnVenta: 'BONO',
              tipoBonus: 'GRUPAL',
              metaId: meta.id,
              tipoContrato: member.tipoContrato || 'ASALARIADO',
              porcentajeAplicado: 0,
              baseCalculoUsd: 0,
              importeComisionUsd: share,
              estado: 'PENDIENTE',
              fechaVenta: fechaBono,
              descripcion: `Bono Grupal (${meta.hotel.nombre}): Meta de $${meta.importeObjetivo.toFixed(2)} USD alcanzada ($${meta.valorBonus!.toFixed(2)} USD ÷ ${teamCount} colaboradores)`,
            },
          })
          createdCount++
        }
      }
    }
  }

  return createdCount
}
