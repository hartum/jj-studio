import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { formatAuditDateTime } from '../application/audit-log.service.js'

function getAuthTokenInfo(request: any): { id: string; role: string } | null {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const decoded = request.server.jwt.decode(token) as { id: string; role: string } | null
    if (!decoded || !decoded.id) return null
    return decoded
  } catch {
    return null
  }
}

export async function auditLogRoutes(fastify: FastifyInstance) {
  // GET /api/audit-log
  fastify.get('/api/audit-log', async (request, reply) => {
    try {
      const auth = getAuthTokenInfo(request)
      if (!auth) {
        return reply.status(401).send({ error: 'No autenticado' })
      }

      const roleCode = auth.role?.toUpperCase()
      if (roleCode !== 'SUPERUSUARIO' && roleCode !== 'ADMIN') {
        return reply.status(403).send({ error: 'Acceso restringido a administradores' })
      }

      const query = request.query as {
        hotelId?: string
        usuarioId?: string
        clienteNombre?: string
        fechaDesde?: string
        fechaHasta?: string
        accion?: string
        entidad?: string
        page?: string
        limit?: string
      }

      const page = Math.max(1, parseInt(query.page || '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)))
      const skip = (page - 1) * limit

      const where: any = {}

      if (query.hotelId) {
        const hId = parseInt(query.hotelId, 10)
        if (!isNaN(hId)) {
          where.hotelId = hId
        }
      }

      if (query.usuarioId && query.usuarioId.trim() !== '') {
        where.usuarioId = query.usuarioId.trim()
      }

      if (query.clienteNombre && query.clienteNombre.trim() !== '') {
        where.clienteNombre = {
          contains: query.clienteNombre.trim(),
        }
      }

      if (query.accion && query.accion.trim() !== '') {
        where.accion = query.accion.trim().toUpperCase()
      }

      if (query.entidad && query.entidad.trim() !== '') {
        where.entidad = query.entidad.trim().toUpperCase()
      }

      if (query.fechaDesde || query.fechaHasta) {
        where.createdAt = {}
        if (query.fechaDesde) {
          const fromDate = new Date(query.fechaDesde)
          fromDate.setHours(0, 0, 0, 0)
          where.createdAt.gte = fromDate
        }
        if (query.fechaHasta) {
          const toDate = new Date(query.fechaHasta)
          toDate.setHours(23, 59, 59, 999)
          where.createdAt.lte = toDate
        }
      }

      const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ])

      const mapped = items.map((item) => {
        let metadatosParsed: any = null
        if (item.metadatos) {
          try {
            metadatosParsed = JSON.parse(item.metadatos)
          } catch {
            metadatosParsed = item.metadatos
          }
        }

        return {
          id: item.id,
          accion: item.accion,
          entidad: item.entidad,
          entidadId: item.entidadId,
          usuarioId: item.usuarioId,
          usuarioNombre: item.usuarioNombre,
          usuarioRol: item.usuarioRol,
          hotelId: item.hotelId,
          hotelNombre: item.hotelNombre,
          clienteNombre: item.clienteNombre,
          descripcion: item.descripcion,
          contexto: item.contexto,
          creadorOriginal: item.creadorOriginal,
          metadatos: metadatosParsed,
          ipAddress: item.ipAddress,
          createdAt: item.createdAt.toISOString(),
          fechaFormateada: formatAuditDateTime(item.createdAt),
        }
      })

      return reply.send({
        data: mapped,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al consultar el registro de auditoría'
      return reply.status(500).send({ error: message })
    }
  })
}
