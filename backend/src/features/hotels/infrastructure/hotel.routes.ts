import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { registrarAudit, formatAuditDateTime } from '../../audit-log/application/audit-log.service.js'

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

export async function hotelRoutes(fastify: FastifyInstance) {
  // GET /api/hoteles (obtiene los hoteles activos con datos de área y país)
  fastify.get('/api/hoteles', async (_request, reply) => {
    try {
      const hoteles = await prisma.hotel.findMany({
        where: { deletedAt: null },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const mapped = hoteles.map((h) => ({
        id: h.id,
        areaId: h.areaId,
        areaNombre: h.area.nombre,
        paisId: h.area.paisId,
        paisNombre: h.area.pais.nombre,
        paisCodigo: h.area.pais.codigo,
        nombre: h.nombre,
        direccion: h.direccion || '',
        estrellas: h.estrellas || 0,
        latitud: h.latitud || null,
        longitud: h.longitud || null,
        cadenaHotelera: h.cadenaHotelera || '',
        personaContacto: h.personaContacto || '',
        email: h.email || '',
        telefono: h.telefono || '',
        metaMensualDefault: h.metaMensualDefault ?? null,
        createdAt: h.createdAt.toISOString().split('T')[0],
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener los hoteles'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/hoteles (Crear nuevo hotel)
  fastify.post('/api/hoteles', async (request, reply) => {
    try {
      const body = request.body as {
        areaId: number
        nombre: string
        direccion?: string
        estrellas?: number
        latitud?: number
        longitud?: number
        cadenaHotelera?: string
        personaContacto?: string
        email?: string
        telefono?: string
        metaMensualDefault?: number | null
      }

      if (!body.areaId || !body.nombre || body.nombre.trim() === '') {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (areaId, nombre)' })
      }

      const nuevo = await prisma.hotel.create({
        data: {
          areaId: Number(body.areaId),
          nombre: body.nombre.trim(),
          direccion: body.direccion ? body.direccion.trim() : null,
          estrellas: body.estrellas ? Number(body.estrellas) : null,
          latitud: body.latitud ? Number(body.latitud) : null,
          longitud: body.longitud ? Number(body.longitud) : null,
          cadenaHotelera: body.cadenaHotelera ? body.cadenaHotelera.trim() : null,
          personaContacto: body.personaContacto ? body.personaContacto.trim() : null,
          email: body.email ? body.email.trim() : null,
          telefono: body.telefono ? body.telefono.trim() : null,
          metaMensualDefault: body.metaMensualDefault != null ? Number(body.metaMensualDefault) : null,
        },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId) {
        registrarAudit({
          accion: 'CREAR',
          entidad: 'HOTEL',
          entidadId: nuevo.id,
          usuarioId: authUserId,
          hotelId: nuevo.id,
          hotelNombre: nuevo.nombre,
          descripcion: `creó el hotel ${nuevo.nombre}`,
          contexto: `Ubicado en el área ${nuevo.area.nombre} (${nuevo.area.pais.nombre})`,
          ipAddress: request.ip,
        })
      }

      return reply.status(201).send({
        id: nuevo.id,
        areaId: nuevo.areaId,
        areaNombre: nuevo.area.nombre,
        paisId: nuevo.area.paisId,
        paisNombre: nuevo.area.pais.nombre,
        paisCodigo: nuevo.area.pais.codigo,
        nombre: nuevo.nombre,
        direccion: nuevo.direccion || '',
        estrellas: nuevo.estrellas || 0,
        latitud: nuevo.latitud || null,
        longitud: nuevo.longitud || null,
        cadenaHotelera: nuevo.cadenaHotelera || '',
        personaContacto: nuevo.personaContacto || '',
        email: nuevo.email || '',
        telefono: nuevo.telefono || '',
        metaMensualDefault: nuevo.metaMensualDefault ?? null,
        createdAt: nuevo.createdAt.toISOString().split('T')[0],
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear el hotel'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/hoteles/:id (Actualizar hotel existente)
  fastify.put('/api/hoteles/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        areaId?: number
        nombre?: string
        direccion?: string
        estrellas?: number
        latitud?: number
        longitud?: number
        cadenaHotelera?: string
        personaContacto?: string
        email?: string
        telefono?: string
        metaMensualDefault?: number | null
      }

      const existing = await prisma.hotel.findUnique({
        where: { id },
        include: { area: { include: { pais: true } } },
      })

      const actualizado = await prisma.hotel.update({
        where: { id },
        data: {
          ...(body.areaId !== undefined && { areaId: Number(body.areaId) }),
          ...(body.nombre && { nombre: body.nombre.trim() }),
          ...(body.direccion !== undefined && { direccion: body.direccion ? body.direccion.trim() : null }),
          ...(body.estrellas !== undefined && { estrellas: body.estrellas ? Number(body.estrellas) : null }),
          ...(body.latitud !== undefined && { latitud: body.latitud ? Number(body.latitud) : null }),
          ...(body.longitud !== undefined && { longitud: body.longitud ? Number(body.longitud) : null }),
          ...(body.cadenaHotelera !== undefined && { cadenaHotelera: body.cadenaHotelera ? body.cadenaHotelera.trim() : null }),
          ...(body.personaContacto !== undefined && { personaContacto: body.personaContacto ? body.personaContacto.trim() : null }),
          ...(body.email !== undefined && { email: body.email ? body.email.trim() : null }),
          ...(body.telefono !== undefined && { telefono: body.telefono ? body.telefono.trim() : null }),
          ...(body.metaMensualDefault !== undefined && {
            metaMensualDefault: body.metaMensualDefault != null ? Number(body.metaMensualDefault) : null,
          }),
        },
        include: {
          area: {
            include: {
              pais: true,
            },
          },
        },
      })

      const updateAuthUserId = getAuthUserId(request)
      if (updateAuthUserId && existing) {
        const creadorOriginal = `Fue creado el ${formatAuditDateTime(existing.createdAt)}`
        registrarAudit({
          accion: 'MODIFICAR',
          entidad: 'HOTEL',
          entidadId: actualizado.id,
          usuarioId: updateAuthUserId,
          hotelId: actualizado.id,
          hotelNombre: actualizado.nombre,
          descripcion: `modificó los datos del hotel ${actualizado.nombre}`,
          contexto: `Área: ${actualizado.area.nombre} (${actualizado.area.pais.nombre})`,
          creadorOriginal,
          ipAddress: request.ip,
        })
      }

      return reply.send({
        id: actualizado.id,
        areaId: actualizado.areaId,
        areaNombre: actualizado.area.nombre,
        paisId: actualizado.area.paisId,
        paisNombre: actualizado.area.pais.nombre,
        paisCodigo: actualizado.area.pais.codigo,
        nombre: actualizado.nombre,
        direccion: actualizado.direccion || '',
        estrellas: actualizado.estrellas || 0,
        latitud: actualizado.latitud || null,
        longitud: actualizado.longitud || null,
        cadenaHotelera: actualizado.cadenaHotelera || '',
        personaContacto: actualizado.personaContacto || '',
        email: actualizado.email || '',
        telefono: actualizado.telefono || '',
        metaMensualDefault: actualizado.metaMensualDefault ?? null,
        createdAt: actualizado.createdAt.toISOString().split('T')[0],
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar el hotel'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/hoteles/:id (Soft delete)
  fastify.delete('/api/hoteles/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      const hotelToDelete = await prisma.hotel.findUnique({ where: { id } })

      await prisma.hotel.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      const delAuthUserId = getAuthUserId(request)
      if (delAuthUserId && hotelToDelete) {
        registrarAudit({
          accion: 'ELIMINAR',
          entidad: 'HOTEL',
          entidadId: id,
          usuarioId: delAuthUserId,
          hotelId: id,
          hotelNombre: hotelToDelete.nombre,
          descripcion: `eliminó el hotel ${hotelToDelete.nombre}`,
          ipAddress: request.ip,
        })
      }

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar el hotel'
      return reply.status(400).send({ error: message })
    }
  })
}
