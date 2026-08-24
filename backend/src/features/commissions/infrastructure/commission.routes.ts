import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { decrypt } from '../../../shared/encryption.js'
import {
  getAllCommissionConfigs,
  getEffectiveCommissionConfig,
  saveCommissionConfig,
  getResumenComisiones,
  calculateAndSaveCommissionsForSale,
} from '../application/commission.service.js'

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
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      role: true,
      hotelesAsignados: true,
      areasAsignadas: true,
    },
  })
  if (!user) return null

  const roleCode = user.role.codigo.toUpperCase()
  let allowedHotelIds: number[] | null = null

  if (['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(roleCode)) {
    allowedHotelIds = null // Global
  } else if (roleCode === 'GERENTE') {
    const areaIds = user.areasAsignadas.map((a) => a.areaId)
    const hotelsInAreas = await prisma.hotel.findMany({
      where: { areaId: { in: areaIds }, deletedAt: null },
      select: { id: true },
    })
    allowedHotelIds = hotelsInAreas.map((h) => h.id)
  } else {
    allowedHotelIds = user.hotelesAsignados.map((h) => h.hotelId)
  }

  return {
    user,
    roleCode,
    allowedHotelIds,
  }
}

export async function commissionRoutes(fastify: FastifyInstance) {
  // GET /api/comisiones/config - Obtener configuraciones de comisiones
  fastify.get('/api/comisiones/config', async (request, reply) => {
    try {
      const { paisId, hotelId } = request.query as { paisId?: string; hotelId?: string }

      const allConfigs = await getAllCommissionConfigs()
      const effectiveConfig = await getEffectiveCommissionConfig(
        paisId ? Number(paisId) : undefined,
        hotelId ? Number(hotelId) : undefined,
      )

      return reply.send({
        configs: allConfigs,
        effectiveConfig,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al obtener la configuración de comisiones'
      return reply.status(500).send({ error: message })
    }
  })

  // PUT /api/comisiones/config - Crear o actualizar configuración de comisiones
  fastify.put('/api/comisiones/config', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' })
      }
      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'Solo Superusuarios y Administradores pueden editar comisiones' })
      }

      const body = request.body as {
        paisId?: number | null
        hotelId?: number | null
        gerentePct: number
        supervisorPct: number
        fotografoAsalariadoPct: number
        fotografoSinSalarioPct: number
        vendedorAsalariadoPct: number
        vendedorSinSalarioPct: number
        activo?: boolean
      }

      if (
        body.gerentePct === undefined ||
        body.supervisorPct === undefined ||
        body.fotografoAsalariadoPct === undefined ||
        body.fotografoSinSalarioPct === undefined ||
        body.vendedorAsalariadoPct === undefined ||
        body.vendedorSinSalarioPct === undefined
      ) {
        return reply
          .status(400)
          .send({ error: 'Todos los porcentajes de comisión son requeridos' })
      }

      const saved = await saveCommissionConfig(body)
      return reply.send(saved)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al guardar la configuración de comisiones'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/comisiones/resumen - Resumen de comisiones para dashboards
  fastify.get('/api/comisiones/resumen', async (request, reply) => {
    try {
      const { hotelId, hotelIds, anio, mes } = request.query as {
        hotelId?: string
        hotelIds?: string
        anio?: string
        mes?: string
      }

      const now = new Date()
      const targetAnio = anio ? Number(anio) : now.getFullYear()
      const targetMes = mes ? Number(mes) : now.getMonth() + 1

      const userId = getAuthUserId(request)
      let filterUserId: string | undefined = undefined
      let allowedHotelIds: number[] | undefined = undefined

      if (userId) {
        const ctx = await getUserContext(userId)
        if (ctx) {
          if (['FOTOGRAFO', 'AGENDADOR'].includes(ctx.roleCode)) {
            filterUserId = userId
          } else if (ctx.allowedHotelIds !== null) {
            allowedHotelIds = ctx.allowedHotelIds
          }
        }
      }

      const rawHotelIds = hotelIds || hotelId
      let reqIds: number[] | undefined = undefined
      if (rawHotelIds) {
        if (Array.isArray(rawHotelIds)) {
          reqIds = rawHotelIds.map(Number).filter((n) => !isNaN(n))
        } else if (typeof rawHotelIds === 'string') {
          reqIds = rawHotelIds
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n))
        }
      }

      let effectiveHotelIds = allowedHotelIds
      if (reqIds && reqIds.length > 0) {
        if (allowedHotelIds) {
          effectiveHotelIds = reqIds.filter((id) => allowedHotelIds.includes(id))
        } else {
          effectiveHotelIds = reqIds
        }
      }

      const resumen = await getResumenComisiones({
        hotelIds: effectiveHotelIds,
        usuarioId: filterUserId,
        anio: targetAnio,
        mes: targetMes,
      })

      return reply.send(resumen)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al obtener el resumen de comisiones'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/comisiones - Listado de comisiones detalladas
  fastify.get('/api/comisiones', async (request, reply) => {
    try {
      const { hotelId, hotelIds, usuarioId, anio, mes, rolEnVenta, estado } = request.query as {
        hotelId?: string
        hotelIds?: string
        usuarioId?: string
        anio?: string
        mes?: string
        rolEnVenta?: string
        estado?: string
      }

      const authId = getAuthUserId(request)
      const where: any = { deletedAt: null }

      let allowedHotelIds: number[] | null = null
      if (authId) {
        const ctx = await getUserContext(authId)
        if (ctx) {
          if (['FOTOGRAFO', 'AGENDADOR'].includes(ctx.roleCode)) {
            where.usuarioId = authId
          } else if (ctx.allowedHotelIds !== null) {
            allowedHotelIds = ctx.allowedHotelIds
          }
        }
      }

      const rawHotelIds = hotelIds || hotelId
      let reqIds: number[] | null = null
      if (rawHotelIds) {
        if (Array.isArray(rawHotelIds)) {
          reqIds = rawHotelIds.map(Number).filter((n) => !isNaN(n))
        } else if (typeof rawHotelIds === 'string') {
          reqIds = rawHotelIds
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n))
        }
      }

      if (reqIds && reqIds.length > 0) {
        if (allowedHotelIds !== null) {
          const valid = reqIds.filter((id) => allowedHotelIds.includes(id))
          where.hotelId = { in: valid }
        } else {
          where.hotelId = { in: reqIds }
        }
      } else if (allowedHotelIds !== null) {
        where.hotelId = { in: allowedHotelIds }
      }
      if (usuarioId && !where.usuarioId) where.usuarioId = usuarioId
      if (rolEnVenta) where.rolEnVenta = rolEnVenta
      if (estado) where.estado = estado

      if (anio && mes) {
        const targetAnio = Number(anio)
        const targetMes = Number(mes)
        const startDate = new Date(Date.UTC(targetAnio, targetMes - 1, 1, 0, 0, 0))
        const endDate = new Date(Date.UTC(targetAnio, targetMes, 1, 0, 0, 0))
        where.fechaVenta = { gte: startDate, lt: endDate }
      }

      const comisiones = await prisma.comision.findMany({
        where,
        include: {
          hotel: true,
          usuario: true,
          citaVenta: {
            include: {
              sesion: true,
            },
          },
        },
        orderBy: { fechaVenta: 'desc' },
      })

      const mapped = comisiones.map((c) => ({
        id: c.id,
        citaVentaId: c.citaVentaId,
        hotelId: c.hotelId,
        hotelNombre: c.hotel?.nombre || '',
        usuarioId: c.usuarioId,
        usuarioNombre: decrypt(c.usuario?.nombre) || '',
        usuarioApellidos: decrypt(c.usuario?.apellidos) || '',
        usuarioEmail: decrypt(c.usuario?.email) || '',
        rolEnVenta: c.rolEnVenta,
        tipoContrato: c.tipoContrato || c.usuario?.tipoContrato || 'ASALARIADO',
        porcentajeAplicado: c.porcentajeAplicado,
        baseCalculoUsd: c.baseCalculoUsd,
        importeComisionUsd: c.importeComisionUsd,
        estado: c.estado,
        fechaVenta: c.fechaVenta.toISOString().slice(0, 10),
        clienteNombre: decrypt(c.citaVenta?.sesion?.clienteNombre) || '',
        numFotosVendidas: c.citaVenta?.numFotosVendidas || null,
        createdAt: c.createdAt.toISOString(),
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al listar las comisiones'
      return reply.status(500).send({ error: message })
    }
  })

  // PATCH /api/comisiones/:id/estado - Actualizar estado de comisión (Aprobada / Pagada)
  fastify.patch('/api/comisiones/:id/estado', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      const { estado } = request.body as { estado: string }

      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'No autorizado para cambiar el estado de las comisiones' })
      }

      const updated = await prisma.comision.update({
        where: { id },
        data: { estado },
      })

      return reply.send(updated)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al actualizar el estado de la comisión'
      return reply.status(400).send({ error: message })
    }
  })

  // POST /api/comisiones/recalcular-todas - Recalcular comisiones existentes
  fastify.post('/api/comisiones/recalcular-todas', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN'].includes(ctx.roleCode)) {
        return reply.status(403).send({ error: 'No autorizado para recalcular comisiones' })
      }

      const ventasCompletadas = await prisma.citaVenta.findMany({
        where: { estado: 'COMPLETADA', deletedAt: null, totalVentaUsd: { gt: 0 } },
        select: { id: true },
      })

      for (const v of ventasCompletadas) {
        await calculateAndSaveCommissionsForSale(v.id)
      }

      return reply.send({ success: true, processed: ventasCompletadas.length })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al recalcular comisiones'
      return reply.status(500).send({ error: message })
    }
  })
}
