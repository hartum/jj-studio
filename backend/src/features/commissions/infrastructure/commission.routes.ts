import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { decrypt, decryptUser } from '../../../shared/encryption.js'
import { registrarAudit } from '../../audit-log/application/audit-log.service.js'
import { registrarAlerta } from '../../alerts/application/alert.service.js'
import {
  getAllCommissionConfigs,
  getEffectiveCommissionConfig,
  saveCommissionConfig,
  getResumenComisiones,
  getAllUserCommissionConfigs,
  getUserCommissionConfig,
  saveUserCommissionConfig,
  deleteUserCommissionConfig,
} from '../application/commission.service.js'
import { syncMonthlyBonuses } from '../application/bonus-sync.service.js'

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

  if (['SUPERUSUARIO', 'ADMIN'].includes(roleCode)) {
    allowedHotelIds = null // Global
  } else if (roleCode === 'GERENTE' || roleCode === 'CONTABLE') {
    const areaIds = user.areasAsignadas.map((a) => a.areaId)
    const hotelsInAreas = await prisma.hotel.findMany({
      where: { areaId: { in: areaIds }, deletedAt: null },
      select: { id: true },
    })
    const areaHotelIds = hotelsInAreas.map((h) => h.id)
    const directHotelIds = user.hotelesAsignados.map((h) => h.hotelId)
    allowedHotelIds = Array.from(new Set([...areaHotelIds, ...directHotelIds]))
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
      const { paisId, hotelId, usuarioId } = request.query as {
        paisId?: string
        hotelId?: string
        usuarioId?: string
      }

      const allConfigs = await getAllCommissionConfigs()
      const effectiveConfig = await getEffectiveCommissionConfig(
        paisId ? Number(paisId) : undefined,
        hotelId ? Number(hotelId) : undefined,
      )

      const authUserId = getAuthUserId(request)
      const targetUserId = usuarioId || authUserId
      let userConfig = null
      if (targetUserId) {
        userConfig = await getUserCommissionConfig(targetUserId)
      }

      return reply.send({
        configs: allConfigs,
        effectiveConfig,
        userConfig,
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
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'Solo Superusuarios, Administradores y Gerentes pueden editar comisiones' })
      }

      const body = request.body as {
        paisId?: number | null
        hotelId?: number | null
        impuestoPct?: number
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

  // DELETE /api/comisiones/config/:id - Eliminar configuración de comisiones
  fastify.delete('/api/comisiones/config/:id', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' })
      }
      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'Solo Superusuarios, Administradores y Gerentes pueden eliminar comisiones' })
      }

      const id = Number((request.params as any).id)
      if (!id || isNaN(id)) {
        return reply.status(400).send({ error: 'ID de configuración inválido' })
      }

      const existing = await prisma.comisionConfig.findUnique({
        where: { id },
      })
      if (!existing) {
        return reply.status(404).send({ error: 'Configuración no encontrada o ya eliminada' })
      }

      await prisma.comisionConfig.delete({
        where: { id },
      })

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al eliminar la configuración de comisiones'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/comisiones/usuarios-config - Listar configuraciones especiales de usuarios
  fastify.get('/api/comisiones/usuarios-config', async (request, reply) => {
    try {
      const configs = await getAllUserCommissionConfigs()
      return reply.send(configs)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error
          ? err.message
          : 'Error al obtener las configuraciones especiales de comisiones de usuarios'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/comisiones/usuarios-config/:usuarioId - Obtener configuración especial de un usuario concreto
  fastify.get('/api/comisiones/usuarios-config/:usuarioId', async (request, reply) => {
    try {
      const { usuarioId } = request.params as { usuarioId: string }
      if (!usuarioId) {
        return reply.status(400).send({ error: 'ID de usuario requerido' })
      }
      const config = await getUserCommissionConfig(usuarioId)
      return reply.send(config)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al obtener la comisión del usuario'
      return reply.status(500).send({ error: message })
    }
  })

  // PUT /api/comisiones/usuarios-config - Guardar configuración especial para un usuario
  fastify.put('/api/comisiones/usuarios-config', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' })
      }
      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(ctx.roleCode)) {
        return reply.status(403).send({
          error: 'Solo Superusuarios, Administradores y Gerentes pueden editar comisiones de usuarios',
        })
      }

      const body = request.body as {
        usuarioId: string
        porcentajeComision: number
        impuestoPct: number
        activo?: boolean
      }

      if (!body.usuarioId) {
        return reply.status(400).send({ error: 'Debes especificar un usuario' })
      }
      if (body.porcentajeComision === undefined || isNaN(Number(body.porcentajeComision))) {
        return reply.status(400).send({ error: 'El porcentaje de comisión es requerido' })
      }

      const saved = await saveUserCommissionConfig({
        usuarioId: body.usuarioId,
        porcentajeComision: Number(body.porcentajeComision),
        impuestoPct:
          body.impuestoPct !== undefined && !isNaN(Number(body.impuestoPct))
            ? Number(body.impuestoPct)
            : 16.0,
        activo: body.activo ?? true,
      })

      return reply.send(saved)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al guardar la comisión del usuario'
      return reply.status(500).send({ error: message })
    }
  })

  // DELETE /api/comisiones/usuarios-config/:id - Eliminar comisión especial de usuario
  fastify.delete('/api/comisiones/usuarios-config/:id', async (request, reply) => {
    try {
      const userId = getAuthUserId(request)
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' })
      }
      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE'].includes(ctx.roleCode)) {
        return reply.status(403).send({
          error: 'Solo Superusuarios, Administradores y Gerentes pueden eliminar comisiones de usuarios',
        })
      }

      const id = Number((request.params as any).id)
      if (!id || isNaN(id)) {
        return reply.status(400).send({ error: 'ID de configuración inválido' })
      }

      await deleteUserCommissionConfig(id)
      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al eliminar la comisión del usuario'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/comisiones/resumen - Resumen de comisiones para dashboards
  fastify.get('/api/comisiones/resumen', async (request, reply) => {
    try {
      const { hotelId, hotelIds, anio, mes, fechaDesde, fechaHasta } = request.query as {
        hotelId?: string
        hotelIds?: string
        anio?: string
        mes?: string
        fechaDesde?: string
        fechaHasta?: string
      }

      const now = new Date()
      const targetAnio = anio ? Number(anio) : (!fechaDesde && !fechaHasta ? now.getFullYear() : undefined)
      const targetMes = mes ? Number(mes) : (!fechaDesde && !fechaHasta ? now.getMonth() + 1 : undefined)

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

      if (targetAnio && targetMes) {
        await syncMonthlyBonuses(targetAnio, targetMes, effectiveHotelIds)
      } else if (fechaDesde) {
        const parts = fechaDesde.split('-').map(Number)
        if (parts[0] && parts[1]) {
          await syncMonthlyBonuses(parts[0], parts[1], effectiveHotelIds)
        }
      }

      const resumen = await getResumenComisiones({
        hotelIds: effectiveHotelIds,
        usuarioId: filterUserId,
        anio: targetAnio,
        mes: targetMes,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
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
      const { hotelId, hotelIds, usuarioId, anio, mes, rolEnVenta, estado, fechaDesde, fechaHasta } = request.query as {
        hotelId?: string
        hotelIds?: string
        usuarioId?: string
        anio?: string
        mes?: string
        rolEnVenta?: string
        estado?: string
        fechaDesde?: string
        fechaHasta?: string
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

      if (fechaDesde || fechaHasta) {
        where.fechaVenta = {}
        if (fechaDesde) {
          where.fechaVenta.gte = new Date(`${fechaDesde}T00:00:00.000Z`)
        }
        if (fechaHasta) {
          where.fechaVenta.lte = new Date(`${fechaHasta}T23:59:59.999Z`)
        }
      } else if (anio && mes) {
        const targetAnio = Number(anio)
        const targetMes = Number(mes)
        const startDate = new Date(Date.UTC(targetAnio, targetMes - 1, 1, 0, 0, 0))
        const endDate = new Date(Date.UTC(targetAnio, targetMes, 1, 0, 0, 0))
        where.fechaVenta = { gte: startDate, lt: endDate }
      }

      if (anio && mes) {
        await syncMonthlyBonuses(Number(anio), Number(mes), reqIds || allowedHotelIds)
      } else if (fechaDesde) {
        const parts = fechaDesde.split('-').map(Number)
        if (parts[0] && parts[1]) {
          await syncMonthlyBonuses(parts[0], parts[1], reqIds || allowedHotelIds)
        }
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
        tipoBonus: c.tipoBonus || null,
        descripcion: c.descripcion || null,
        tipoContrato: c.tipoContrato || c.usuario?.tipoContrato || 'ASALARIADO',
        porcentajeAplicado: c.porcentajeAplicado,
        baseCalculoUsd: c.baseCalculoUsd,
        importeComisionUsd: c.importeComisionUsd,
        tipoCambio: c.tipoCambio,
        importeComisionMxn: c.importeComisionMxn,
        estado: c.estado,
        fechaVenta: c.fechaVenta.toISOString().slice(0, 10),
        clienteNombre:
          c.descripcion ||
          (c.citaVenta?.sesion?.clienteNombre ? decrypt(c.citaVenta.sesion.clienteNombre) : '') ||
          (c.citaVenta?.tipo === 'VENTA_DIRECTA' ? 'Venta directa' : ''),
        numFotosVendidas: c.citaVenta?.numFotosVendidas || null,
        totalVentaUsd: c.citaVenta?.totalVentaUsd ?? c.baseCalculoUsd,
        impuestoMontoUsd: Number(
          Math.max(0, (c.citaVenta?.totalVentaUsd ?? c.baseCalculoUsd) - c.baseCalculoUsd).toFixed(2),
        ),
        numeroMiscelaneo:
          c.citaVenta?.numeroMiscelaneo ||
          (c.tipoBonus === 'INDIVIDUAL'
            ? 'Bono Individual'
            : c.tipoBonus === 'GRUPAL'
              ? 'Bono Grupal'
              : null),
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
      const { estado, tipoCambio } = request.body as { estado: string; tipoCambio?: number }

      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'CONTABLE'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'No autorizado para cambiar el estado de las comisiones' })
      }

      if (!['PENDIENTE', 'APROBADA', 'PAGADA', 'RECHAZADA'].includes(estado)) {
        return reply.status(400).send({ error: 'Estado de comisión no válido' })
      }

      const existing = await prisma.comision.findUnique({
        where: { id },
        include: {
          hotel: true,
          usuario: true,
          citaVenta: {
            include: {
              sesion: true,
            },
          },
        },
      })

      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Comisión no encontrada' })
      }

      if (ctx.allowedHotelIds !== null && !ctx.allowedHotelIds.includes(existing.hotelId)) {
        return reply.status(403).send({ error: 'No tienes acceso a comisiones de este hotel' })
      }

      const estadoAnterior = existing.estado
      let updateData: any = { estado }
      if (['PAGADA', 'RECHAZADA'].includes(estado)) {
        const tc =
          typeof tipoCambio === 'number' && tipoCambio > 0
            ? tipoCambio
            : existing.tipoCambio || 18.0
        const importeMxn = Math.round(existing.importeComisionUsd * tc * 100) / 100
        updateData = {
          estado,
          tipoCambio: tc,
          importeComisionMxn: importeMxn,
        }
      } else {
        updateData = {
          estado,
          tipoCambio: null,
          importeComisionMxn: null,
        }
      }

      const updated = await prisma.comision.update({
        where: { id },
        data: updateData,
      })

      if (estadoAnterior !== estado) {
        const beneficiario = decryptUser(existing.usuario)
        const beneficiarioNombre = beneficiario
          ? `${beneficiario.nombre} ${beneficiario.apellidos}`.trim()
          : 'un usuario'
        const clienteNombre =
          existing.descripcion ||
          (existing.citaVenta?.sesion?.clienteNombre ? decrypt(existing.citaVenta.sesion.clienteNombre) : '') ||
          (existing.citaVenta?.tipo === 'VENTA_DIRECTA' ? 'Venta directa' : '')
        const voucherFolio =
          existing.citaVenta?.numeroMiscelaneo ||
          (existing.tipoBonus === 'INDIVIDUAL'
            ? 'Bono Individual'
            : existing.tipoBonus === 'GRUPAL'
              ? 'Bono Grupal'
              : null)

        let descAccion = 'cambió el estado de una comisión'
        if (estado === 'APROBADA') descAccion = 'aprobó una comisión'
        else if (estado === 'PAGADA') descAccion = 'marcó como pagada una comisión'
        else if (estado === 'RECHAZADA') descAccion = 'rechazó una comisión'
        else if (estado === 'PENDIENTE') descAccion = 'restableció a pendiente una comisión'

        registrarAudit({
          accion: 'MODIFICAR',
          entidad: 'COMISION',
          entidadId: updated.id,
          usuarioId: userId,
          hotelId: existing.hotelId,
          clienteNombre: clienteNombre || undefined,
          descripcion: `${descAccion} de ${beneficiarioNombre} ($${existing.importeComisionUsd.toFixed(2)} USD)`,
          contexto: `Comisión #${existing.id} de rol ${existing.rolEnVenta} para ${beneficiarioNombre}${voucherFolio ? ` (Folio: ${voucherFolio})` : ''}`,
          ipAddress: request.ip,
          metadatos: {
            estadoAnterior,
            estadoNuevo: estado,
            beneficiario: beneficiarioNombre,
            rolEnVenta: existing.rolEnVenta,
            importeComisionUsd: existing.importeComisionUsd,
            porcentajeAplicado: `${existing.porcentajeAplicado}%`,
            baseCalculoUsd: existing.baseCalculoUsd,
            citaVentaId: existing.citaVentaId,
            numeroMiscelaneo: voucherFolio,
          },
        })

        // CASO 3: Modificación de apuntes contables cerrados (PAGADA o RECHAZADA)
        if (['PAGADA', 'RECHAZADA'].includes(estadoAnterior)) {
          registrarAlerta({
            tipoCaso: 3,
            titulo: 'Alerta Crítica: Modificación de apunte contable cerrado',
            descripcion: `Se modificó el estado de un apunte contable cerrado (${estadoAnterior} ➔ ${estado}) perteneciente a ${beneficiarioNombre} ($${existing.importeComisionUsd.toFixed(2)} USD) en ${existing.hotel?.nombre || 'Hotel'}.`,
            gravedad: 'CRITICA',
            usuarioOrigenId: userId,
            usuarioAfectadoId: existing.usuarioId,
            usuarioAfectadoNombre: beneficiarioNombre,
            hotelId: existing.hotelId,
            hotelNombre: existing.hotel?.nombre,
            entidad: 'COMISION',
            entidadId: updated.id,
            metadatos: {
              comisionId: existing.id,
              estadoAnterior,
              estadoNuevo: estado,
              importeUsd: existing.importeComisionUsd,
              beneficiario: beneficiarioNombre,
              hotel: existing.hotel?.nombre,
              numeroMiscelaneo: voucherFolio,
            },
          })
        }
      }

      return reply.send(updated)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al actualizar el estado de la comisión'
      return reply.status(400).send({ error: message })
    }
  })

  // PATCH /api/comisiones/estado-masivo - Actualización masiva de estado de comisiones
  fastify.patch('/api/comisiones/estado-masivo', async (request, reply) => {
    try {
      const { ids, estado, tipoCambio } = request.body as {
        ids?: number[]
        estado: string
        tipoCambio?: number
      }

      const userId = getAuthUserId(request)
      if (!userId) return reply.status(401).send({ error: 'No autenticado' })

      const ctx = await getUserContext(userId)
      if (!ctx || !['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'CONTABLE'].includes(ctx.roleCode)) {
        return reply
          .status(403)
          .send({ error: 'No autorizado para cambiar el estado de las comisiones' })
      }

      if (!['PENDIENTE', 'APROBADA', 'PAGADA', 'RECHAZADA'].includes(estado)) {
        return reply.status(400).send({ error: 'Estado de comisión no válido' })
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: 'Debes proporcionar una lista de comisiones' })
      }

      const numericIds = ids.map(Number).filter((n) => !isNaN(n))
      if (numericIds.length === 0) {
        return reply.status(400).send({ error: 'Identificadores de comisiones no válidos' })
      }

      const where: any = {
        id: { in: numericIds },
        deletedAt: null,
      }

      if (ctx.allowedHotelIds !== null) {
        where.hotelId = { in: ctx.allowedHotelIds }
      }

      const comisionesAfectadas = await prisma.comision.findMany({
        where,
        include: {
          hotel: true,
          usuario: true,
        },
      })

      const comisionesToUpdate = comisionesAfectadas.filter((c) => c.estado !== estado)

      if (comisionesToUpdate.length === 0) {
        return reply.send({ success: true, count: 0 })
      }

      const idsToUpdate = comisionesToUpdate.map((c) => c.id)

      if (['PAGADA', 'RECHAZADA'].includes(estado)) {
        const tc = typeof tipoCambio === 'number' && tipoCambio > 0 ? tipoCambio : 18.0
        await Promise.all(
          comisionesToUpdate.map((c) =>
            prisma.comision.update({
              where: { id: c.id },
              data: {
                estado,
                tipoCambio: tc,
                importeComisionMxn: Math.round(c.importeComisionUsd * tc * 100) / 100,
              },
            }),
          ),
        )
      } else {
        await prisma.comision.updateMany({
          where: {
            id: { in: idsToUpdate },
          },
          data: {
            estado,
            tipoCambio: null,
            importeComisionMxn: null,
          },
        })
      }

      const count = idsToUpdate.length

      const totalUsd = comisionesToUpdate.reduce((sum, c) => sum + c.importeComisionUsd, 0)
      const hotelNames = Array.from(new Set(comisionesToUpdate.map((c) => c.hotel?.nombre).filter(Boolean)))
      const hotelIds = Array.from(new Set(comisionesToUpdate.map((c) => c.hotelId)))

      let descAccion = 'actualizó masivamente el estado de comisiones'
      if (estado === 'APROBADA') descAccion = 'aprobó un lote de comisiones'
      else if (estado === 'PAGADA') descAccion = 'marcó como pagadas un lote de comisiones'
      else if (estado === 'RECHAZADA') descAccion = 'rechazó un lote de comisiones'
      else if (estado === 'PENDIENTE') descAccion = 'restableció a pendiente un lote de comisiones'

      registrarAudit({
        accion: 'MODIFICAR',
        entidad: 'COMISION',
        usuarioId: userId,
        hotelId: hotelIds.length === 1 ? hotelIds[0] : undefined,
        descripcion: `${descAccion} (${count} registros, $${totalUsd.toFixed(2)} USD)`,
        contexto: `Actualización en lote a estado ${estado} de ${count} comisiones en: ${hotelNames.join(', ') || 'Varios hoteles'}`,
        ipAddress: request.ip,
        metadatos: {
          estadoNuevo: estado,
          totalComisionesActualizadas: count,
          totalImporteUsd: Math.round(totalUsd * 100) / 100,
          hoteles: hotelNames.join(', '),
          comisionesIds: idsToUpdate.slice(0, 50),
        },
      })

      // CASO 3: Si se modificaron comisiones que ya estaban PAGADA o RECHAZADA en lote
      const cerradasEnLote = comisionesToUpdate.filter((c) => ['PAGADA', 'RECHAZADA'].includes(c.estado))
      for (const cerrada of cerradasEnLote) {
        const ben = decryptUser(cerrada.usuario)
        const benNombre = ben ? `${ben.nombre} ${ben.apellidos}`.trim() : 'Usuario'
        registrarAlerta({
          tipoCaso: 3,
          titulo: 'Alerta Crítica: Modificación de apunte contable cerrado (Lote)',
          descripcion: `En una acción por lote, se modificó el estado de una comisión cerrada (${cerrada.estado} ➔ ${estado}) de ${benNombre} ($${cerrada.importeComisionUsd.toFixed(2)} USD) en ${cerrada.hotel?.nombre || 'Hotel'}.`,
          gravedad: 'CRITICA',
          usuarioOrigenId: userId,
          usuarioAfectadoId: cerrada.usuarioId,
          usuarioAfectadoNombre: benNombre,
          hotelId: cerrada.hotelId,
          hotelNombre: cerrada.hotel?.nombre,
          entidad: 'COMISION',
          entidadId: cerrada.id,
          metadatos: {
            comisionId: cerrada.id,
            estadoAnterior: cerrada.estado,
            estadoNuevo: estado,
            importeUsd: cerrada.importeComisionUsd,
            beneficiario: benNombre,
            hotel: cerrada.hotel?.nombre,
          },
        })
      }

      return reply.send({ success: true, count })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al actualizar masivamente el estado de comisiones'
      return reply.status(400).send({ error: message })
    }
  })
}
