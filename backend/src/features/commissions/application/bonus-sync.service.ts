import { prisma } from '../../../shared/db.js'

// Cache de sincronizaciones en vuelo para evitar ejecuciones concurrentes duplicadas
const inFlightSyncs = new Map<string, Promise<number>>()

export function syncMonthlyBonuses(
  anio: number,
  mes: number,
  targetHotelIds?: number[] | null,
): Promise<number> {
  const hotelKey = targetHotelIds && targetHotelIds.length > 0
    ? [...targetHotelIds].sort((a, b) => a - b).join(',')
    : 'all'
  const lockKey = `${anio}-${mes}-${hotelKey}`

  const existing = inFlightSyncs.get(lockKey)
  if (existing) {
    return existing
  }

  const promise = doSyncMonthlyBonuses(anio, mes, targetHotelIds).finally(() => {
    inFlightSyncs.delete(lockKey)
  })

  inFlightSyncs.set(lockKey, promise)
  return promise
}

async function doSyncMonthlyBonuses(
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

  // 2. Obtener todas las comisiones no rechazadas del periodo para calcular ventas de colaboradores y hoteles
  const comisionesPeriodo = await prisma.comision.findMany({
    where: {
      fechaVenta: { gte: startDate, lt: endDate },
      estado: { not: 'RECHAZADA' },
      rolEnVenta: { not: 'BONO' },
      deletedAt: null,
    },
    select: {
      citaVentaId: true,
      usuarioId: true,
      hotelId: true,
      baseCalculoUsd: true,
      citaVenta: {
        select: {
          totalVentaUsd: true,
        },
      },
    },
  })

  // 3. OPTIMIZACIÓN LOTE: Precargar todos los bonos ya existentes en el periodo en 1 sola consulta
  const bonosExistentes = await prisma.comision.findMany({
    where: {
      rolEnVenta: 'BONO',
      fechaVenta: { gte: startDate, lt: endDate },
      deletedAt: null,
    },
    select: {
      hotelId: true,
      usuarioId: true,
      tipoBonus: true,
    },
  })

  // Set en memoria O(1) para verificar si ya existe un bono
  const existingBonusKeys = new Set(
    bonosExistentes.map((b) => `${b.hotelId}:${b.usuarioId}:${b.tipoBonus}`),
  )

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

  const bonusesToCreate: Array<{
    hotelId: number
    usuarioId: string
    rolEnVenta: string
    tipoBonus: string
    metaId: number
    tipoContrato: string
    porcentajeAplicado: number
    baseCalculoUsd: number
    importeComisionUsd: number
    estado: string
    fechaVenta: Date
    descripcion: string
  }> = []

  // 4. Procesar Metas Individuales (alcanceTipo: 'USUARIO')
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
      const bonusKey = `${meta.hotelId}:${userId}:INDIVIDUAL`
      if (!existingBonusKeys.has(bonusKey)) {
        existingBonusKeys.add(bonusKey)
        bonusesToCreate.push({
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
        })
      }
    }
  }

  // 5. Procesar Metas Grupales (alcanceTipo: 'HOTEL' sin usuarioId)
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
        const bonusKey = `${meta.hotelId}:${member.id}:GRUPAL`
        if (!existingBonusKeys.has(bonusKey)) {
          existingBonusKeys.add(bonusKey)
          bonusesToCreate.push({
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
          })
        }
      }
    }
  }

  // 6. Inserción en lote si hay nuevos bonos
  if (bonusesToCreate.length > 0) {
    await prisma.comision.createMany({
      data: bonusesToCreate,
    })
  }

  return bonusesToCreate.length
}
