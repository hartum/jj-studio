import { prisma } from '../../../shared/db.js'
import { decryptUser } from '../../../shared/encryption.js'
import type { ComisionConfigDTO, ResumenComisionesDTO } from '../domain/commission.model.js'

const DEFAULT_GLOBAL_CONFIG: ComisionConfigDTO = {
  paisId: null,
  hotelId: null,
  gerentePct: 2.0,
  supervisorPct: 2.0,
  fotografoAsalariadoPct: 14.0,
  fotografoSinSalarioPct: 20.0,
  vendedorAsalariadoPct: 6.0,
  vendedorSinSalarioPct: 8.0,
  activo: true,
}

export async function getEffectiveCommissionConfig(
  paisId?: number | null,
  hotelId?: number | null,
): Promise<ComisionConfigDTO> {
  // 1. Check hotel specific config
  if (hotelId) {
    const hotelConfig = await prisma.comisionConfig.findFirst({
      where: { hotelId, activo: true, deletedAt: null },
    })
    if (hotelConfig) {
      return {
        id: hotelConfig.id,
        paisId: hotelConfig.paisId,
        hotelId: hotelConfig.hotelId,
        gerentePct: hotelConfig.gerentePct,
        supervisorPct: hotelConfig.supervisorPct,
        fotografoAsalariadoPct: hotelConfig.fotografoAsalariadoPct,
        fotografoSinSalarioPct: hotelConfig.fotografoSinSalarioPct,
        vendedorAsalariadoPct: hotelConfig.vendedorAsalariadoPct,
        vendedorSinSalarioPct: hotelConfig.vendedorSinSalarioPct,
        activo: hotelConfig.activo,
      }
    }
  }

  // 2. Check country specific config
  if (paisId) {
    const paisConfig = await prisma.comisionConfig.findFirst({
      where: { paisId, hotelId: null, activo: true, deletedAt: null },
    })
    if (paisConfig) {
      return {
        id: paisConfig.id,
        paisId: paisConfig.paisId,
        hotelId: paisConfig.hotelId,
        gerentePct: paisConfig.gerentePct,
        supervisorPct: paisConfig.supervisorPct,
        fotografoAsalariadoPct: paisConfig.fotografoAsalariadoPct,
        fotografoSinSalarioPct: paisConfig.fotografoSinSalarioPct,
        vendedorAsalariadoPct: paisConfig.vendedorAsalariadoPct,
        vendedorSinSalarioPct: paisConfig.vendedorSinSalarioPct,
        activo: paisConfig.activo,
      }
    }
  }

  // 3. Check global default config in DB
  const globalConfig = await prisma.comisionConfig.findFirst({
    where: { paisId: null, hotelId: null, activo: true, deletedAt: null },
  })
  if (globalConfig) {
    return {
      id: globalConfig.id,
      paisId: null,
      hotelId: null,
      gerentePct: globalConfig.gerentePct,
      supervisorPct: globalConfig.supervisorPct,
      fotografoAsalariadoPct: globalConfig.fotografoAsalariadoPct,
      fotografoSinSalarioPct: globalConfig.fotografoSinSalarioPct,
      vendedorAsalariadoPct: globalConfig.vendedorAsalariadoPct,
      vendedorSinSalarioPct: globalConfig.vendedorSinSalarioPct,
      activo: globalConfig.activo,
    }
  }

  // Fallback to default constants
  return DEFAULT_GLOBAL_CONFIG
}

export async function getAllCommissionConfigs(): Promise<ComisionConfigDTO[]> {
  const configs = await prisma.comisionConfig.findMany({
    where: { deletedAt: null },
    include: {
      pais: true,
      hotel: true,
    },
    orderBy: [{ paisId: 'asc' }, { hotelId: 'asc' }],
  })

  return configs.map((c) => ({
    id: c.id,
    paisId: c.paisId,
    paisNombre: c.pais?.nombre || 'Global / Por defecto',
    hotelId: c.hotelId,
    hotelNombre: c.hotel?.nombre || 'Todos los hoteles del país',
    gerentePct: c.gerentePct,
    supervisorPct: c.supervisorPct,
    fotografoAsalariadoPct: c.fotografoAsalariadoPct,
    fotografoSinSalarioPct: c.fotografoSinSalarioPct,
    vendedorAsalariadoPct: c.vendedorAsalariadoPct,
    vendedorSinSalarioPct: c.vendedorSinSalarioPct,
    activo: c.activo,
  }))
}

export async function saveCommissionConfig(data: ComisionConfigDTO): Promise<ComisionConfigDTO> {
  const paisId = data.paisId ?? null
  const hotelId = data.hotelId ?? null

  const existing = await prisma.comisionConfig.findFirst({
    where: { paisId, hotelId, deletedAt: null },
  })

  if (existing) {
    const updated = await prisma.comisionConfig.update({
      where: { id: existing.id },
      data: {
        gerentePct: data.gerentePct,
        supervisorPct: data.supervisorPct,
        fotografoAsalariadoPct: data.fotografoAsalariadoPct,
        fotografoSinSalarioPct: data.fotografoSinSalarioPct,
        vendedorAsalariadoPct: data.vendedorAsalariadoPct,
        vendedorSinSalarioPct: data.vendedorSinSalarioPct,
        activo: data.activo ?? true,
      },
      include: { pais: true, hotel: true },
    })

    return {
      id: updated.id,
      paisId: updated.paisId,
      paisNombre: updated.pais?.nombre || 'Global / Por defecto',
      hotelId: updated.hotelId,
      hotelNombre: updated.hotel?.nombre || 'Todos los hoteles',
      gerentePct: updated.gerentePct,
      supervisorPct: updated.supervisorPct,
      fotografoAsalariadoPct: updated.fotografoAsalariadoPct,
      fotografoSinSalarioPct: updated.fotografoSinSalarioPct,
      vendedorAsalariadoPct: updated.vendedorAsalariadoPct,
      vendedorSinSalarioPct: updated.vendedorSinSalarioPct,
      activo: updated.activo,
    }
  }

  const created = await prisma.comisionConfig.create({
    data: {
      paisId,
      hotelId,
      gerentePct: data.gerentePct,
      supervisorPct: data.supervisorPct,
      fotografoAsalariadoPct: data.fotografoAsalariadoPct,
      fotografoSinSalarioPct: data.fotografoSinSalarioPct,
      vendedorAsalariadoPct: data.vendedorAsalariadoPct,
      vendedorSinSalarioPct: data.vendedorSinSalarioPct,
      activo: data.activo ?? true,
    },
    include: { pais: true, hotel: true },
  })

  return {
    id: created.id,
    paisId: created.paisId,
    paisNombre: created.pais?.nombre || 'Global / Por defecto',
    hotelId: created.hotelId,
    hotelNombre: created.hotel?.nombre || 'Todos los hoteles',
    gerentePct: created.gerentePct,
    supervisorPct: created.supervisorPct,
    fotografoAsalariadoPct: created.fotografoAsalariadoPct,
    fotografoSinSalarioPct: created.fotografoSinSalarioPct,
    vendedorAsalariadoPct: created.vendedorAsalariadoPct,
    vendedorSinSalarioPct: created.vendedorSinSalarioPct,
    activo: created.activo,
  }
}

export async function calculateAndSaveCommissionsForSale(citaVentaId: number): Promise<void> {
  const cita = await prisma.citaVenta.findUnique({
    where: { id: citaVentaId },
    include: {
      sesion: true,
      hotel: {
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
      },
    },
  })

  if (!cita || cita.deletedAt) return

  // If sale is cancelled or no total, clean up previous commissions
  if (cita.estado !== 'COMPLETADA' || !cita.totalVentaUsd || cita.totalVentaUsd <= 0) {
    await prisma.comision.deleteMany({
      where: { citaVentaId: cita.id },
    })
    return
  }

  const totalVentaUsd = cita.totalVentaUsd
  const paisId = cita.hotel.area.paisId
  const hotelId = cita.hotelId
  const fechaVenta = cita.fechaHoraCita

  const config = await getEffectiveCommissionConfig(paisId, hotelId)

  // 1. Fotógrafo Commission
  if (cita.sesion.fotografoId) {
    const fotografo = await prisma.usuario.findUnique({
      where: { id: cita.sesion.fotografoId },
    })
    if (fotografo) {
      const tipoContrato = fotografo.tipoContrato || 'ASALARIADO'
      const pct =
        tipoContrato === 'SIN_SALARIO'
          ? config.fotografoSinSalarioPct
          : config.fotografoAsalariadoPct
      const importe = (totalVentaUsd * pct) / 100

      await prisma.comision.upsert({
        where: {
          citaVentaId_usuarioId_rolEnVenta: {
            citaVentaId: cita.id,
            usuarioId: fotografo.id,
            rolEnVenta: 'FOTOGRAFO',
          },
        },
        create: {
          citaVentaId: cita.id,
          hotelId,
          usuarioId: fotografo.id,
          rolEnVenta: 'FOTOGRAFO',
          tipoContrato,
          porcentajeAplicado: pct,
          baseCalculoUsd: totalVentaUsd,
          importeComisionUsd: Number(importe.toFixed(2)),
          estado: 'PENDIENTE',
          fechaVenta,
        },
        update: {
          hotelId,
          tipoContrato,
          porcentajeAplicado: pct,
          baseCalculoUsd: totalVentaUsd,
          importeComisionUsd: Number(importe.toFixed(2)),
          fechaVenta,
        },
      })
    }
  }

  // 2. Vendedor / Agendador Commission (asignado a la cita o creador de la sesión)
  const vendedorUsuarioId = cita.vendedorId || cita.sesion.creadorId
  if (vendedorUsuarioId) {
    const vendedor = await prisma.usuario.findUnique({
      where: { id: vendedorUsuarioId },
      include: { role: true },
    })
    // Apply seller commission if vendor exists
    if (vendedor) {
      const tipoContrato = vendedor.tipoContrato || 'ASALARIADO'
      const pct =
        tipoContrato === 'SIN_SALARIO'
          ? config.vendedorSinSalarioPct
          : config.vendedorAsalariadoPct
      const importe = (totalVentaUsd * pct) / 100

      // Clean any other user previously marked as VENDEDOR for this sale
      await prisma.comision.deleteMany({
        where: {
          citaVentaId: cita.id,
          rolEnVenta: 'VENDEDOR',
          usuarioId: { not: vendedor.id },
        },
      })

      await prisma.comision.upsert({
        where: {
          citaVentaId_usuarioId_rolEnVenta: {
            citaVentaId: cita.id,
            usuarioId: vendedor.id,
            rolEnVenta: 'VENDEDOR',
          },
        },
        create: {
          citaVentaId: cita.id,
          hotelId,
          usuarioId: vendedor.id,
          rolEnVenta: 'VENDEDOR',
          tipoContrato,
          porcentajeAplicado: pct,
          baseCalculoUsd: totalVentaUsd,
          importeComisionUsd: Number(importe.toFixed(2)),
          estado: 'PENDIENTE',
          fechaVenta,
        },
        update: {
          hotelId,
          tipoContrato,
          porcentajeAplicado: pct,
          baseCalculoUsd: totalVentaUsd,
          importeComisionUsd: Number(importe.toFixed(2)),
          fechaVenta,
        },
      })
    }
  } else {
    await prisma.comision.deleteMany({
      where: {
        citaVentaId: cita.id,
        rolEnVenta: 'VENDEDOR',
      },
    })
  }

  // 3. Supervisor Commission (Supervisores asignados al hotel)
  const hotelSupervisores = await prisma.usuarioHotel.findMany({
    where: {
      hotelId,
      usuario: {
        activo: true,
        role: { codigo: 'SUPERVISOR' },
      },
    },
    include: { usuario: true },
  })

  for (const item of hotelSupervisores) {
    const supervisor = item.usuario
    const pct = config.supervisorPct
    const importe = (totalVentaUsd * pct) / 100

    await prisma.comision.upsert({
      where: {
        citaVentaId_usuarioId_rolEnVenta: {
          citaVentaId: cita.id,
          usuarioId: supervisor.id,
          rolEnVenta: 'SUPERVISOR',
        },
      },
      create: {
        citaVentaId: cita.id,
        hotelId,
        usuarioId: supervisor.id,
        rolEnVenta: 'SUPERVISOR',
        tipoContrato: supervisor.tipoContrato,
        porcentajeAplicado: pct,
        baseCalculoUsd: totalVentaUsd,
        importeComisionUsd: Number(importe.toFixed(2)),
        estado: 'PENDIENTE',
        fechaVenta,
      },
      update: {
        hotelId,
        tipoContrato: supervisor.tipoContrato,
        porcentajeAplicado: pct,
        baseCalculoUsd: totalVentaUsd,
        importeComisionUsd: Number(importe.toFixed(2)),
        fechaVenta,
      },
    })
  }

  // 4. Gerente Commission (Gerentes del área)
  const areaGerentes = await prisma.usuarioArea.findMany({
    where: {
      areaId: cita.hotel.areaId,
      usuario: {
        activo: true,
        role: { codigo: 'GERENTE' },
      },
    },
    include: { usuario: true },
  })

  for (const item of areaGerentes) {
    const gerente = item.usuario
    const pct = config.gerentePct
    const importe = (totalVentaUsd * pct) / 100

    await prisma.comision.upsert({
      where: {
        citaVentaId_usuarioId_rolEnVenta: {
          citaVentaId: cita.id,
          usuarioId: gerente.id,
          rolEnVenta: 'GERENTE',
        },
      },
      create: {
        citaVentaId: cita.id,
        hotelId,
        usuarioId: gerente.id,
        rolEnVenta: 'GERENTE',
        tipoContrato: gerente.tipoContrato,
        porcentajeAplicado: pct,
        baseCalculoUsd: totalVentaUsd,
        importeComisionUsd: Number(importe.toFixed(2)),
        estado: 'PENDIENTE',
        fechaVenta,
      },
      update: {
        hotelId,
        tipoContrato: gerente.tipoContrato,
        porcentajeAplicado: pct,
        baseCalculoUsd: totalVentaUsd,
        importeComisionUsd: Number(importe.toFixed(2)),
        fechaVenta,
      },
    })
  }
}

export async function getResumenComisiones(params: {
  hotelId?: number
  hotelIds?: number[]
  usuarioId?: string
  anio: number
  mes: number
}): Promise<ResumenComisionesDTO> {
  const { hotelId, hotelIds, usuarioId, anio, mes } = params

  const startDate = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0))
  const endDate = new Date(Date.UTC(anio, mes, 1, 0, 0, 0))

  const where: any = {
    deletedAt: null,
    fechaVenta: {
      gte: startDate,
      lt: endDate,
    },
  }

  if (usuarioId) {
    where.usuarioId = usuarioId
  }

  if (hotelId) {
    where.hotelId = hotelId
  } else if (hotelIds && hotelIds.length > 0) {
    where.hotelId = { in: hotelIds }
  }

  const comisiones = await prisma.comision.findMany({
    where,
    include: {
      usuario: true,
      hotel: true,
      citaVenta: true,
    },
    orderBy: { fechaVenta: 'desc' },
  })

  let totalComisionesUsd = 0
  const uniqueSales = new Set<number>()
  let totalVentasUsd = 0

  const porRolMap: Record<string, { totalUsd: number; count: number }> = {}
  const porUsuarioMap: Record<
    string,
    {
      usuarioId: string
      nombreCompleto: string
      rol: string
      tipoContrato: string
      totalUsd: number
      ventasCount: number
    }
  > = {}
  const porHotelMap: Record<
    number,
    { hotelId: number; hotelNombre: string; totalComisionesUsd: number; totalVentasUsd: number }
  > = {}

  for (const c of comisiones) {
    totalComisionesUsd += c.importeComisionUsd

    if (!uniqueSales.has(c.citaVentaId)) {
      uniqueSales.add(c.citaVentaId)
      totalVentasUsd += c.baseCalculoUsd
    }

    // Por rol
    const rolKey = c.rolEnVenta
    if (!porRolMap[rolKey]) {
      porRolMap[rolKey] = { totalUsd: 0, count: 0 }
    }
    porRolMap[rolKey].totalUsd += c.importeComisionUsd
    porRolMap[rolKey].count += 1

    // Por usuario
    const uKey = c.usuarioId
    if (!porUsuarioMap[uKey]) {
      const u = decryptUser(c.usuario)
      porUsuarioMap[uKey] = {
        usuarioId: c.usuarioId,
        nombreCompleto: u ? `${u.nombre} ${u.apellidos}`.trim() : 'Usuario',
        rol: c.rolEnVenta,
        tipoContrato: c.tipoContrato || c.usuario.tipoContrato || 'ASALARIADO',
        totalUsd: 0,
        ventasCount: 0,
      }
    }
    porUsuarioMap[uKey].totalUsd += c.importeComisionUsd
    porUsuarioMap[uKey].ventasCount += 1

    // Por hotel
    const hKey = c.hotelId
    if (!porHotelMap[hKey]) {
      porHotelMap[hKey] = {
        hotelId: c.hotelId,
        hotelNombre: c.hotel.nombre,
        totalComisionesUsd: 0,
        totalVentasUsd: 0,
      }
    }
    porHotelMap[hKey].totalComisionesUsd += c.importeComisionUsd
  }

  return {
    mes,
    anio,
    totalComisionesUsd: Number(totalComisionesUsd.toFixed(2)),
    totalVentasUsd: Number(totalVentasUsd.toFixed(2)),
    porRol: Object.entries(porRolMap).map(([rol, data]) => ({
      rol,
      totalUsd: Number(data.totalUsd.toFixed(2)),
      count: data.count,
    })),
    porUsuario: Object.values(porUsuarioMap).map((u) => ({
      ...u,
      totalUsd: Number(u.totalUsd.toFixed(2)),
    })),
    porHotel: Object.values(porHotelMap).map((h) => ({
      ...h,
      totalComisionesUsd: Number(h.totalComisionesUsd.toFixed(2)),
    })),
  }
}
