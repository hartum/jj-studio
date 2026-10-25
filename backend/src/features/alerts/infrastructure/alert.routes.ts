import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { formatAuditDateTime } from '../../audit-log/application/audit-log.service.js'
import { evaluarCaso1SesionesSospechosas } from '../application/alert.service.js'

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

async function verifySuperOrAdmin(request: any, reply: any): Promise<string | null> {
  const userId = getAuthUserId(request)
  if (!userId) {
    reply.status(401).send({ error: 'No autenticado' })
    return null
  }

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { role: true },
  })

  if (!user) {
    reply.status(404).send({ error: 'Usuario no encontrado' })
    return null
  }

  const roleCode = user.role.codigo.toUpperCase()
  if (roleCode !== 'ADMIN' && roleCode !== 'SUPERUSUARIO') {
    reply.status(403).send({ error: 'Solo administradores y superusuarios pueden acceder a las alertas' })
    return null
  }

  return userId
}

export async function alertRoutes(fastify: FastifyInstance) {
  // GET /api/alertas - Lista paginada (100 en 100) con filtros
  fastify.get('/api/alertas', async (request, reply) => {
    const userId = await verifySuperOrAdmin(request, reply)
    if (!userId) return

    try {
      // Evaluar si existen nuevas alertas del Caso 1 antes de listar
      await evaluarCaso1SesionesSospechosas()

      const query = request.query as {
        page?: string
        limit?: string
        leida?: string
        tipoCaso?: string
        hotelId?: string
        search?: string
      }

      const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
      const limit = Math.max(1, Math.min(200, parseInt(query.limit || '100', 10) || 100))
      const skip = (page - 1) * limit

      const where: any = {}

      if (query.leida === 'true') {
        where.leida = true
      } else if (query.leida === 'false') {
        where.leida = false
      }

      if (query.tipoCaso) {
        const casoNum = parseInt(query.tipoCaso, 10)
        if (!isNaN(casoNum)) {
          where.tipoCaso = casoNum
        }
      }

      if (query.hotelId) {
        const hid = parseInt(query.hotelId, 10)
        if (!isNaN(hid)) {
          where.hotelId = hid
        }
      }

      if (query.search && query.search.trim()) {
        const s = query.search.trim()
        where.OR = [
          { titulo: { contains: s } },
          { descripcion: { contains: s } },
          { usuarioOrigenNombre: { contains: s } },
          { usuarioAfectadoNombre: { contains: s } },
          { hotelNombre: { contains: s } },
        ]
      }

      const [total, unreadCount, criticalCount, readCount, items] = await Promise.all([
        prisma.alertaSeguridad.count({ where }),
        prisma.alertaSeguridad.count({ where: { leida: false } }),
        prisma.alertaSeguridad.count({ where: { gravedad: 'CRITICA' } }),
        prisma.alertaSeguridad.count({ where: { leida: true } }),
        prisma.alertaSeguridad.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ])

      const mapped = items.map((item) => {
        let metadatosParsed = null
        if (item.metadatos) {
          try {
            metadatosParsed = JSON.parse(item.metadatos)
          } catch {
            metadatosParsed = item.metadatos
          }
        }

        return {
          id: item.id,
          tipoCaso: item.tipoCaso,
          titulo: item.titulo,
          descripcion: item.descripcion,
          gravedad: item.gravedad,
          usuarioOrigenId: item.usuarioOrigenId,
          usuarioOrigenNombre: item.usuarioOrigenNombre,
          usuarioOrigenRol: item.usuarioOrigenRol,
          usuarioAfectadoId: item.usuarioAfectadoId,
          usuarioAfectadoNombre: item.usuarioAfectadoNombre,
          hotelId: item.hotelId,
          hotelNombre: item.hotelNombre,
          entidad: item.entidad,
          entidadId: item.entidadId,
          metadatos: metadatosParsed,
          leida: item.leida,
          leidaAt: item.leidaAt ? item.leidaAt.toISOString() : null,
          leidaPorId: item.leidaPorId,
          createdAt: item.createdAt.toISOString(),
          fechaFormateada: formatAuditDateTime(item.createdAt),
        }
      })

      return reply.send({
        items: mapped,
        total,
        unreadCount,
        criticalCount,
        readCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al consultar alertas de seguridad' })
    }
  })

  // GET /api/alertas/conteo-no-leidas - Para badge en tab
  fastify.get('/api/alertas/conteo-no-leidas', async (request, reply) => {
    const userId = await verifySuperOrAdmin(request, reply)
    if (!userId) return

    try {
      const count = await prisma.alertaSeguridad.count({
        where: { leida: false },
      })
      return reply.send({ unreadCount: count })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al contar alertas no leídas' })
    }
  })

  // PATCH /api/alertas/:id/leida - Cambiar estado leído
  fastify.patch('/api/alertas/:id/leida', async (request, reply) => {
    const userId = await verifySuperOrAdmin(request, reply)
    if (!userId) return

    try {
      const id = parseInt((request.params as any).id, 10)
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'ID de alerta no válido' })
      }

      const { leida } = (request.body as { leida?: boolean }) || {}
      const isLeida = leida !== undefined ? Boolean(leida) : true

      const updated = await prisma.alertaSeguridad.update({
        where: { id },
        data: {
          leida: isLeida,
          leidaAt: isLeida ? new Date() : null,
          leidaPorId: isLeida ? userId : null,
        },
      })

      return reply.send({
        id: updated.id,
        leida: updated.leida,
        leidaAt: updated.leidaAt?.toISOString() || null,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al actualizar estado de la alerta' })
    }
  })

  // PATCH /api/alertas/marcar-todas-leidas - Marcar todas como leídas
  fastify.patch('/api/alertas/marcar-todas-leidas', async (request, reply) => {
    const userId = await verifySuperOrAdmin(request, reply)
    if (!userId) return

    try {
      const updated = await prisma.alertaSeguridad.updateMany({
        where: { leida: false },
        data: {
          leida: true,
          leidaAt: new Date(),
          leidaPorId: userId,
        },
      })

      return reply.send({
        success: true,
        count: updated.count,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al marcar alertas como leídas' })
    }
  })

  // POST /api/alertas/evaluar - Evaluación manual de Caso 1
  fastify.post('/api/alertas/evaluar', async (request, reply) => {
    const userId = await verifySuperOrAdmin(request, reply)
    if (!userId) return

    try {
      await evaluarCaso1SesionesSospechosas()
      const unreadCount = await prisma.alertaSeguridad.count({ where: { leida: false } })
      return reply.send({ success: true, unreadCount })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al evaluar alertas' })
    }
  })
}
