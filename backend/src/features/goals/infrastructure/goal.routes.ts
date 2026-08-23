import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { decryptUser } from '../../../shared/encryption.js'
import type {
  AlcanceTipo,
  SemaforoEstado,
  HotelProgresoResumen,
  FotografoProgreso,
  EvolucionMetasResponse,
  PuntoDiaEvolucion,
  PuntoMesEvolucion,
} from '../domain/goal.model.js'

function getAuthUserId(request: any): string | null {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const decoded = request.server.jwt.decode(token) as { id: string } | null
    return decoded?.id || null
  } catch {
    return null
  }
}

async function getUserContext(userId: string) {
  return prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      role: true,
      areasAsignadas: true,
      hotelesAsignados: true,
    },
  })
}

async function getAllowedHotelIds(user: NonNullable<Awaited<ReturnType<typeof getUserContext>>>): Promise<number[] | null> {
  const roleCode = user.role.codigo.toUpperCase()
  if (['SUPERUSUARIO', 'ADMIN'].includes(roleCode)) {
    return null // Global access
  }

  if (roleCode === 'GERENTE') {
    const areaIds = user.areasAsignadas.map((a) => a.areaId)
    const hotels = await prisma.hotel.findMany({
      where: { areaId: { in: areaIds }, deletedAt: null },
      select: { id: true },
    })
    return hotels.map((h) => h.id)
  }

  return user.hotelesAsignados.map((h) => h.hotelId)
}

function calcularSemaforo(
  ventasReales: number,
  metaTotal: number,
  metaEsperada: number,
  diaActual: number,
): SemaforoEstado {
  if (metaTotal <= 0) {
    return 'SIN_META'
  }
  if (ventasReales >= metaTotal) {
    return 'VERDE'
  }
  if (diaActual === 0) {
    return ventasReales > 0 ? 'VERDE' : 'SIN_META'
  }
  if (metaEsperada <= 0) {
    return ventasReales > 0 ? 'VERDE' : 'SIN_META'
  }

  const ratio = ventasReales / metaEsperada
  if (ratio >= 1.0) {
    return 'VERDE'
  }
  if (ratio >= 0.8) {
    return 'AMARILLO'
  }
  return 'ROJO'
}

const MESES_NOMBRES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export async function goalRoutes(fastify: FastifyInstance) {
  // GET /api/metas - List raw goals
  fastify.get('/api/metas', async (request, reply) => {
    try {
      const { hotelId, anio, mes, usuarioId } = request.query as {
        hotelId?: string
        anio?: string
        mes?: string
        usuarioId?: string
      }

      const where: any = { deletedAt: null }
      if (hotelId) where.hotelId = Number(hotelId)
      if (anio) where.anio = Number(anio)
      if (mes) where.mes = Number(mes)
      if (usuarioId) where.usuarioId = usuarioId

      const userId = getAuthUserId(request)
      if (userId) {
        const user = await getUserContext(userId)
        if (user) {
          const allowedHotelIds = await getAllowedHotelIds(user)
          if (allowedHotelIds !== null) {
            if (where.hotelId) {
              if (!allowedHotelIds.includes(where.hotelId)) {
                return reply.send([])
              }
            } else {
              where.hotelId = { in: allowedHotelIds }
            }
          }
        }
      }

      const metas = await prisma.meta.findMany({
        where,
        include: {
          hotel: true,
          usuario: true,
        },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { hotelId: 'asc' }],
      })

      const mapped = metas.map((m) => {
        const u = decryptUser(m.usuario)
        return {
          id: m.id,
          alcanceTipo: m.alcanceTipo as AlcanceTipo,
          hotelId: m.hotelId,
          hotelNombre: m.hotel.nombre,
          usuarioId: m.usuarioId,
          usuarioNombre: u ? `${u.nombre} ${u.apellidos}`.trim() : null,
          anio: m.anio,
          mes: m.mes,
          importeObjetivo: m.importeObjetivo,
          sesionesObjetivo: m.sesionesObjetivo,
          ventasObjetivo: m.ventasObjetivo,
          activo: m.activo,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }
      })

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las metas'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/metas - Upsert goal (Create or Update)
  fastify.post('/api/metas', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' })
      }

      const user = await getUserContext(userId)
      if (!user) {
        return reply.status(404).send({ error: 'Usuario no encontrado' })
      }

      const roleCode = user.role.codigo.toUpperCase()
      const allowedRoles = ['SUPERUSUARIO', 'ADMIN', 'GERENTE']
      if (!allowedRoles.includes(roleCode)) {
        return reply.status(403).send({ error: 'No tienes permisos para definir metas' })
      }

      const body = request.body as {
        alcanceTipo?: AlcanceTipo
        hotelId: number
        usuarioId?: string | null
        anio: number
        mes: number
        importeObjetivo: number
        sesionesObjetivo?: number | null
        ventasObjetivo?: number | null
        activo?: boolean
      }

      if (!body.hotelId || !body.anio || !body.mes || body.importeObjetivo === undefined) {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (hotelId, anio, mes, importeObjetivo)' })
      }

      const hotelId = Number(body.hotelId)
      const anio = Number(body.anio)
      const mes = Number(body.mes)
      const alcanceTipo = body.alcanceTipo || (body.usuarioId ? 'USUARIO' : 'HOTEL')
      const targetUserId = body.usuarioId ? String(body.usuarioId) : null
      const importeObjetivo = Math.max(0, Number(body.importeObjetivo))

      // Check permission for this hotel
      const allowedHotelIds = await getAllowedHotelIds(user)
      if (allowedHotelIds !== null && !allowedHotelIds.includes(hotelId)) {
        return reply.status(403).send({ error: 'No tienes permisos sobre este hotel' })
      }

      // Upsert using findFirst or unique
      const existing = await prisma.meta.findFirst({
        where: {
          hotelId,
          usuarioId: targetUserId,
          anio,
          mes,
          alcanceTipo,
        },
      })

      let result
      if (existing) {
        result = await prisma.meta.update({
          where: { id: existing.id },
          data: {
            importeObjetivo,
            sesionesObjetivo: body.sesionesObjetivo !== undefined ? (body.sesionesObjetivo != null ? Number(body.sesionesObjetivo) : null) : existing.sesionesObjetivo,
            ventasObjetivo: body.ventasObjetivo !== undefined ? (body.ventasObjetivo != null ? Number(body.ventasObjetivo) : null) : existing.ventasObjetivo,
            activo: body.activo !== undefined ? Boolean(body.activo) : true,
            deletedAt: null,
          },
          include: { hotel: true, usuario: true },
        })
      } else {
        result = await prisma.meta.create({
          data: {
            alcanceTipo,
            hotelId,
            usuarioId: targetUserId,
            anio,
            mes,
            importeObjetivo,
            sesionesObjetivo: body.sesionesObjetivo != null ? Number(body.sesionesObjetivo) : null,
            ventasObjetivo: body.ventasObjetivo != null ? Number(body.ventasObjetivo) : null,
            activo: body.activo !== undefined ? Boolean(body.activo) : true,
          },
          include: { hotel: true, usuario: true },
        })
      }

      const u = decryptUser(result.usuario)
      return reply.status(201).send({
        id: result.id,
        alcanceTipo: result.alcanceTipo as AlcanceTipo,
        hotelId: result.hotelId,
        hotelNombre: result.hotel.nombre,
        usuarioId: result.usuarioId,
        usuarioNombre: u ? `${u.nombre} ${u.apellidos}`.trim() : null,
        anio: result.anio,
        mes: result.mes,
        importeObjetivo: result.importeObjetivo,
        sesionesObjetivo: result.sesionesObjetivo,
        ventasObjetivo: result.ventasObjetivo,
        activo: result.activo,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al guardar la meta'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/metas/:id - Update existing meta
  fastify.put('/api/metas/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const user = await getUserContext(userId)
      if (!user) return reply.status(404).send({ error: 'Usuario no encontrado' })

      const roleCode = user.role.codigo.toUpperCase()
      if (!['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(roleCode)) {
        return reply.status(403).send({ error: 'No tienes permisos para modificar metas' })
      }

      const existing = await prisma.meta.findUnique({ where: { id } })
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Meta no encontrada' })
      }

      const allowedHotelIds = await getAllowedHotelIds(user)
      if (allowedHotelIds !== null && !allowedHotelIds.includes(existing.hotelId)) {
        return reply.status(403).send({ error: 'No tienes permisos sobre este hotel' })
      }

      const body = request.body as {
        importeObjetivo?: number
        sesionesObjetivo?: number | null
        ventasObjetivo?: number | null
        activo?: boolean
      }

      const data: any = {}
      if (body.importeObjetivo !== undefined) data.importeObjetivo = Math.max(0, Number(body.importeObjetivo))
      if (body.sesionesObjetivo !== undefined) data.sesionesObjetivo = body.sesionesObjetivo != null ? Number(body.sesionesObjetivo) : null
      if (body.ventasObjetivo !== undefined) data.ventasObjetivo = body.ventasObjetivo != null ? Number(body.ventasObjetivo) : null
      if (body.activo !== undefined) data.activo = Boolean(body.activo)

      const updated = await prisma.meta.update({
        where: { id },
        data,
        include: { hotel: true, usuario: true },
      })

      const u = decryptUser(updated.usuario)
      return reply.send({
        id: updated.id,
        alcanceTipo: updated.alcanceTipo as AlcanceTipo,
        hotelId: updated.hotelId,
        hotelNombre: updated.hotel.nombre,
        usuarioId: updated.usuarioId,
        usuarioNombre: u ? `${u.nombre} ${u.apellidos}`.trim() : null,
        anio: updated.anio,
        mes: updated.mes,
        importeObjetivo: updated.importeObjetivo,
        sesionesObjetivo: updated.sesionesObjetivo,
        ventasObjetivo: updated.ventasObjetivo,
        activo: updated.activo,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar la meta'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/metas/:id - Soft delete meta
  fastify.delete('/api/metas/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const user = await getUserContext(userId)
      if (!user) return reply.status(404).send({ error: 'Usuario no encontrado' })

      const roleCode = user.role.codigo.toUpperCase()
      if (!['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(roleCode)) {
        return reply.status(403).send({ error: 'No tienes permisos para eliminar metas' })
      }

      const existing = await prisma.meta.findUnique({ where: { id } })
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Meta no encontrada' })
      }

      await prisma.meta.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar la meta'
      return reply.status(400).send({ error: message })
    }
  })

  // GET /api/metas/progreso - Real-time progress, pacing, semaphors and photographer breakdown
  fastify.get('/api/metas/progreso', async (request, reply) => {
    try {
      const { hotelId, anio, mes } = request.query as {
        hotelId?: string
        anio?: string
        mes?: string
      }

      const now = new Date()
      const targetAnio = anio ? Number(anio) : now.getFullYear()
      const targetMes = mes ? Number(mes) : now.getMonth() + 1

      const diasEnMes = new Date(targetAnio, targetMes, 0).getDate()
      let diaActual = 0
      if (targetAnio === now.getFullYear() && targetMes === now.getMonth() + 1) {
        diaActual = Math.min(now.getDate(), diasEnMes)
      } else if (
        targetAnio < now.getFullYear() ||
        (targetAnio === now.getFullYear() && targetMes < now.getMonth() + 1)
      ) {
        diaActual = diasEnMes
      } else {
        diaActual = 0
      }

      // Date range for querying sales appointments
      const startDate = new Date(Date.UTC(targetAnio, targetMes - 1, 1, 0, 0, 0))
      const endDate = new Date(Date.UTC(targetAnio, targetMes, 0, 23, 59, 59, 999))

      const userId = getAuthUserId(request)
      let allowedHotelIds: number[] | null = null
      let userRole: string | null = null

      if (userId) {
        const user = await getUserContext(userId)
        if (user) {
          userRole = user.role.codigo.toUpperCase()
          allowedHotelIds = await getAllowedHotelIds(user)
        }
      }

      const hotelWhere: any = { deletedAt: null }
      if (hotelId) {
        hotelWhere.id = Number(hotelId)
      }
      if (allowedHotelIds !== null) {
        if (hotelWhere.id) {
          if (!allowedHotelIds.includes(hotelWhere.id)) {
            return reply.send([])
          }
        } else {
          hotelWhere.id = { in: allowedHotelIds }
        }
      }

      const hoteles = await prisma.hotel.findMany({
        where: hotelWhere,
        include: {
          area: {
            include: { pais: true },
          },
          usuariosAsignados: {
            where: {
              usuario: {
                role: { codigo: 'FOTOGRAFO' },
                activo: true,
                deletedAt: null,
              },
            },
            include: { usuario: true },
          },
        },
        orderBy: { nombre: 'asc' },
      })

      const hotelIds = hoteles.map((h) => h.id)

      // Fetch configured metas for this month & year
      const metasConfiguradas = await prisma.meta.findMany({
        where: {
          hotelId: { in: hotelIds },
          anio: targetAnio,
          mes: targetMes,
          deletedAt: null,
          activo: true,
        },
      })

      // Fetch all completed sales for this month & hotels
      const citasVentaCompletadas = await prisma.citaVenta.findMany({
        where: {
          hotelId: { in: hotelIds },
          fechaHoraCita: { gte: startDate, lte: endDate },
          estado: 'COMPLETADA',
          deletedAt: null,
        },
        include: { sesion: true },
      })

      const resultados: HotelProgresoResumen[] = []

      for (const hotel of hoteles) {
        // Hotel monthly target
        const metaHotelObj = metasConfiguradas.find(
          (m) => m.hotelId === hotel.id && m.alcanceTipo === 'HOTEL' && !m.usuarioId,
        )
        const metaImporteHotel = metaHotelObj
          ? metaHotelObj.importeObjetivo
          : hotel.metaMensualDefault ?? 0
        const esMetaConfigurada = Boolean(metaHotelObj)

        // Completed sales in this hotel
        const ventasHotel = citasVentaCompletadas.filter((c) => c.hotelId === hotel.id)
        const ventasRealesUsd = ventasHotel.reduce((sum, c) => sum + (c.totalVentaUsd || 0), 0)
        const numVentas = ventasHotel.length
        const numSesiones = new Set(ventasHotel.map((c) => c.sesionId)).size

        const metaEsperadaHoy =
          metaImporteHotel > 0 && diasEnMes > 0 ? (metaImporteHotel / diasEnMes) * diaActual : 0
        const porcentajeCumplimiento =
          metaImporteHotel > 0 ? Math.round((ventasRealesUsd / metaImporteHotel) * 1000) / 10 : 0
        const desviacionMonetaria = ventasRealesUsd - metaEsperadaHoy
        const semaforo = calcularSemaforo(ventasRealesUsd, metaImporteHotel, metaEsperadaHoy, diaActual)

        // Photographers breakdown
        const fotografosAsignados = hotel.usuariosAsignados.map((ua) => ua.usuario)
        const numFotografos = fotografosAsignados.length
        const cuotaEquitativaSugerida = numFotografos > 0 ? metaImporteHotel / numFotografos : 0

        const fotografosProgreso: FotografoProgreso[] = []

        for (const rawFotografo of fotografosAsignados) {
          const fotografo = decryptUser(rawFotografo)!
          const metaPersonal = metasConfiguradas.find(
            (m) =>
              m.hotelId === hotel.id &&
              m.usuarioId === fotografo.id &&
              m.alcanceTipo === 'USUARIO',
          )

          const metaImporteFoto = metaPersonal ? metaPersonal.importeObjetivo : cuotaEquitativaSugerida
          const esMetaPersonalizada = Boolean(metaPersonal)

          const ventasFoto = ventasHotel.filter((c) => c.sesion?.fotografoId === fotografo.id)
          const ventasRealesFoto = ventasFoto.reduce((sum, c) => sum + (c.totalVentaUsd || 0), 0)
          const numVentasFoto = ventasFoto.length
          const numSesionesFoto = new Set(ventasFoto.map((c) => c.sesionId)).size

          const metaEsperadaFoto =
            metaImporteFoto > 0 && diasEnMes > 0 ? (metaImporteFoto / diasEnMes) * diaActual : 0
          const porcentajeFoto =
            metaImporteFoto > 0 ? Math.round((ventasRealesFoto / metaImporteFoto) * 1000) / 10 : 0
          const desviacionFoto = ventasRealesFoto - metaEsperadaFoto
          const semaforoFoto = calcularSemaforo(
            ventasRealesFoto,
            metaImporteFoto,
            metaEsperadaFoto,
            diaActual,
          )

          fotografosProgreso.push({
            usuarioId: fotografo.id,
            nombreCompleto: `${fotografo.nombre} ${fotografo.apellidos}`,
            email: fotografo.email,
            metaImporte: Math.round(metaImporteFoto * 100) / 100,
            esMetaPersonalizada,
            ventasRealesUsd: Math.round(ventasRealesFoto * 100) / 100,
            numVentas: numVentasFoto,
            numSesiones: numSesionesFoto,
            porcentajeCumplimiento: porcentajeFoto,
            metaEsperadaHoy: Math.round(metaEsperadaFoto * 100) / 100,
            desviacionMonetaria: Math.round(desviacionFoto * 100) / 100,
            semaforo: semaforoFoto,
          })
        }

        resultados.push({
          hotelId: hotel.id,
          hotelNombre: hotel.nombre,
          areaId: hotel.areaId,
          areaNombre: hotel.area.nombre,
          paisNombre: hotel.area.pais.nombre,
          anio: targetAnio,
          mes: targetMes,
          diasEnMes,
          diaActual,
          metaImporte: Math.round(metaImporteHotel * 100) / 100,
          esMetaConfigurada,
          ventasRealesUsd: Math.round(ventasRealesUsd * 100) / 100,
          numVentas,
          numSesiones,
          porcentajeCumplimiento,
          metaEsperadaHoy: Math.round(metaEsperadaHoy * 100) / 100,
          desviacionMonetaria: Math.round(desviacionMonetaria * 100) / 100,
          semaforo,
          fotografos: fotografosProgreso,
        })
      }

      return reply.send(resultados)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener el progreso de metas'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/metas/evolucion - Time series data for Line Charts (Day-by-Day for current month & Month-by-Month for current year)
  fastify.get('/api/metas/evolucion', async (request, reply) => {
    try {
      const { hotelId, anio, mes } = request.query as {
        hotelId?: string
        anio?: string
        mes?: string
      }

      const now = new Date()
      const targetAnio = anio ? Number(anio) : now.getFullYear()
      const targetMes = mes ? Number(mes) : now.getMonth() + 1

      const userId = getAuthUserId(request)
      let allowedHotelIds: number[] | null = null

      if (userId) {
        const user = await getUserContext(userId)
        if (user) {
          allowedHotelIds = await getAllowedHotelIds(user)
        }
      }

      const selectedHotelId = hotelId ? Number(hotelId) : undefined
      if (allowedHotelIds !== null && selectedHotelId && !allowedHotelIds.includes(selectedHotelId)) {
        return reply.status(403).send({ error: 'No tienes permisos sobre este hotel' })
      }

      // Filter hotels
      const hotelWhere: any = { deletedAt: null }
      if (selectedHotelId) {
        hotelWhere.id = selectedHotelId
      } else if (allowedHotelIds !== null) {
        hotelWhere.id = { in: allowedHotelIds }
      }

      const targetHotels = await prisma.hotel.findMany({
        where: hotelWhere,
        select: { id: true, nombre: true, metaMensualDefault: true },
      })

      const targetHotelIds = targetHotels.map((h) => h.id)
      const singleHotel = targetHotels.length === 1 ? targetHotels[0] : null

      // --- 1. PROGRESIÓN DEL MES (DÍA A DÍA) ---
      const diasEnMes = new Date(targetAnio, targetMes, 0).getDate()
      const startDateMes = new Date(Date.UTC(targetAnio, targetMes - 1, 1, 0, 0, 0))
      const endDateMes = new Date(Date.UTC(targetAnio, targetMes, 0, 23, 59, 59, 999))

      // Metas del mes
      const metasMes = await prisma.meta.findMany({
        where: {
          hotelId: { in: targetHotelIds },
          anio: targetAnio,
          mes: targetMes,
          alcanceTipo: 'HOTEL',
          deletedAt: null,
          activo: true,
        },
      })

      const metaTotalMes = targetHotels.reduce((sum, h) => {
        const m = metasMes.find((meta) => meta.hotelId === h.id)
        return sum + (m ? m.importeObjetivo : h.metaMensualDefault ?? 0)
      }, 0)

      const ventasMes = await prisma.citaVenta.findMany({
        where: {
          hotelId: { in: targetHotelIds },
          fechaHoraCita: { gte: startDateMes, lte: endDateMes },
          estado: 'COMPLETADA',
          deletedAt: null,
        },
        select: { fechaHoraCita: true, totalVentaUsd: true },
      })

      // Agrupar ventas por día
      const ventasPorDia: Record<number, number> = {}
      for (const v of ventasMes) {
        const dia = new Date(v.fechaHoraCita).getUTCDate()
        ventasPorDia[dia] = (ventasPorDia[dia] || 0) + (v.totalVentaUsd || 0)
      }

      const evolucionMes: PuntoDiaEvolucion[] = []
      let acumuladoRealMes = 0
      const isCurrentMonth =
        targetAnio === now.getFullYear() && targetMes === now.getMonth() + 1
      const currentDay = now.getDate()

      for (let d = 1; d <= diasEnMes; d++) {
        const objetivoAcumulado =
          metaTotalMes > 0 && diasEnMes > 0
            ? Math.round(((metaTotalMes / diasEnMes) * d) * 100) / 100
            : 0
        const realDia = Math.round((ventasPorDia[d] || 0) * 100) / 100
        acumuladoRealMes += realDia

        // If current month and day is in the future, keep acumulado flat or recorded
        evolucionMes.push({
          dia: d,
          realDia,
          realAcumulado: Math.round(acumuladoRealMes * 100) / 100,
          objetivoAcumulado,
        })
      }

      // --- 2. PROGRESIÓN DEL AÑO (MES A MES) ---
      const startDateAnio = new Date(Date.UTC(targetAnio, 0, 1, 0, 0, 0))
      const endDateAnio = new Date(Date.UTC(targetAnio, 11, 31, 23, 59, 59, 999))

      const metasAnio = await prisma.meta.findMany({
        where: {
          hotelId: { in: targetHotelIds },
          anio: targetAnio,
          alcanceTipo: 'HOTEL',
          deletedAt: null,
          activo: true,
        },
      })

      const ventasAnio = await prisma.citaVenta.findMany({
        where: {
          hotelId: { in: targetHotelIds },
          fechaHoraCita: { gte: startDateAnio, lte: endDateAnio },
          estado: 'COMPLETADA',
          deletedAt: null,
        },
        select: { fechaHoraCita: true, totalVentaUsd: true },
      })

      const ventasPorMes: Record<number, number> = {}
      for (const v of ventasAnio) {
        const m = new Date(v.fechaHoraCita).getUTCMonth() + 1
        ventasPorMes[m] = (ventasPorMes[m] || 0) + (v.totalVentaUsd || 0)
      }

      const evolucionAnio: PuntoMesEvolucion[] = []
      let acumuladoRealAnio = 0
      let acumuladoObjetivoAnio = 0

      for (let m = 1; m <= 12; m++) {
        const metaMesTotal = targetHotels.reduce((sum, h) => {
          const found = metasAnio.find((meta) => meta.hotelId === h.id && meta.mes === m)
          return sum + (found ? found.importeObjetivo : h.metaMensualDefault ?? 0)
        }, 0)

        const realMes = Math.round((ventasPorMes[m] || 0) * 100) / 100
        acumuladoRealAnio += realMes
        acumuladoObjetivoAnio += metaMesTotal

        evolucionAnio.push({
          mes: m,
          mesNombre: MESES_NOMBRES[m - 1] || `M${m}`,
          realMes,
          objetivoMes: Math.round(metaMesTotal * 100) / 100,
          realAcumulado: Math.round(acumuladoRealAnio * 100) / 100,
          objetivoAcumulado: Math.round(acumuladoObjetivoAnio * 100) / 100,
        })
      }

      const diaActualMes = isCurrentMonth ? Math.min(currentDay, diasEnMes) : (targetMes < now.getMonth() + 1 ? diasEnMes : 0)
      const metaEsperadaMesHoy = metaTotalMes > 0 && diasEnMes > 0 ? (metaTotalMes / diasEnMes) * diaActualMes : 0
      const semaforoMes = calcularSemaforo(acumuladoRealMes, metaTotalMes, metaEsperadaMesHoy, diaActualMes)
      const porcentajeMes = metaTotalMes > 0 ? Math.round((acumuladoRealMes / metaTotalMes) * 1000) / 10 : 0

      const semaforoAnio = calcularSemaforo(acumuladoRealAnio, acumuladoObjetivoAnio, acumuladoObjetivoAnio, 12)
      const porcentajeAnio = acumuladoObjetivoAnio > 0 ? Math.round((acumuladoRealAnio / acumuladoObjetivoAnio) * 1000) / 10 : 0

      const responsePayload: EvolucionMetasResponse = {
        hotelId: singleHotel?.id,
        hotelNombre: singleHotel?.nombre,
        anio: targetAnio,
        mes: targetMes,
        evolucionMes,
        evolucionAnio,
        totalesMes: {
          metaTotal: Math.round(metaTotalMes * 100) / 100,
          realTotal: Math.round(acumuladoRealMes * 100) / 100,
          porcentaje: porcentajeMes,
          semaforo: semaforoMes,
        },
        totalesAnio: {
          metaTotal: Math.round(acumuladoObjetivoAnio * 100) / 100,
          realTotal: Math.round(acumuladoRealAnio * 100) / 100,
          porcentaje: porcentajeAnio,
          semaforo: semaforoAnio,
        },
      }

      return reply.send(responsePayload)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener la evolución de metas'
      return reply.status(500).send({ error: message })
    }
  })
}
