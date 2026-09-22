import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import {
  testGoogleCalendarConnection,
  syncSesionToGoogle,
  syncCitaVentaToGoogle,
} from './google-calendar.service.js'

export async function googleCalendarRoutes(fastify: FastifyInstance) {
  // GET /api/integraciones/google-calendar/test?hotelId=X
  fastify.get('/api/integraciones/google-calendar/test', async (request, reply) => {
    try {
      const query = request.query as { hotelId?: string }
      const hotelId = Number(query.hotelId)
      if (!hotelId) {
        return reply.status(400).send({
          success: false,
          error: 'Parámetro hotelId requerido para verificar Google Calendar.',
        })
      }
      const result = await testGoogleCalendarConnection(hotelId)
      if (!result.success) {
        return reply.status(400).send(result)
      }
      return reply.send(result)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({
        success: false,
        error: err?.message || 'Error al verificar conexión con Google Calendar',
      })
    }
  })

  // POST /api/integraciones/google-calendar/sync-all (Sincroniza todas las sesiones activas)
  fastify.post('/api/integraciones/google-calendar/sync-all', async (request, reply) => {
    try {
      const body = (request.body || {}) as { hotelId?: number }
      const hotelFilter = body.hotelId ? { hotelId: Number(body.hotelId) } : {}

      const sesiones = await prisma.sesionFotografica.findMany({
        where: {
          deletedAt: null,
          estado: { not: 'CANCELADA' },
          ...hotelFilter,
        },
        select: { id: true },
      })

      const citas = await prisma.citaVenta.findMany({
        where: {
          deletedAt: null,
          estado: { not: 'CANCELADA' },
          ...hotelFilter,
        },
        select: { id: true },
      })

      let syncedSessions = 0
      let syncedSales = 0

      for (const s of sesiones) {
        const res = await syncSesionToGoogle(s.id)
        if (res) syncedSessions++
      }

      for (const c of citas) {
        const res = await syncCitaVentaToGoogle(c.id)
        if (res) syncedSales++
      }

      return reply.send({
        success: true,
        message: 'Sincronización completa finalizada',
        totalSessions: sesiones.length,
        syncedSessions,
        totalSales: citas.length,
        syncedSales,
      })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({
        success: false,
        error: err?.message || 'Error durante la sincronización total',
      })
    }
  })

  // POST /api/integraciones/google-calendar/sync-session/:id
  fastify.post('/api/integraciones/google-calendar/sync-session/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const googleEventId = await syncSesionToGoogle(Number(id))
      return reply.send({ success: !!googleEventId, googleEventId })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err?.message })
    }
  })

  // POST /api/integraciones/google-calendar/sync-sale/:id
  fastify.post('/api/integraciones/google-calendar/sync-sale/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const googleEventId = await syncCitaVentaToGoogle(Number(id))
      return reply.send({ success: !!googleEventId, googleEventId })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err?.message })
    }
  })
}
