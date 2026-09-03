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

export async function countryRoutes(fastify: FastifyInstance) {
  // GET /api/paises (con áreas y hoteles anidados)
  fastify.get('/api/paises', async (_request, reply) => {
    try {
      const paises = await prisma.pais.findMany({
        where: { deletedAt: null },
        include: {
          areas: {
            where: { deletedAt: null },
            orderBy: { nombre: 'asc' },
            include: {
              hoteles: {
                where: { deletedAt: null },
                orderBy: { nombre: 'asc' },
              },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      })
      return reply.send(paises)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener países' })
    }
  })

  // POST /api/paises
  fastify.post('/api/paises', async (request, reply) => {
    try {
      const body = request.body as {
        codigo: string
        nombre: string
        codigoTelefono?: string
      }

      if (!body.codigo || !body.nombre) {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (codigo, nombre)' })
      }

      const codeUpper = body.codigo.toUpperCase().trim()

      const existing = await prisma.pais.findUnique({
        where: { codigo: codeUpper },
      })

      if (existing) {
        if (existing.deletedAt === null) {
          return reply.status(400).send({ error: 'El país ya se encuentra añadido en el sistema' })
        } else {
          const reactivado = await prisma.pais.update({
            where: { id: existing.id },
            data: {
              nombre: body.nombre.trim(),
              codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
              deletedAt: null,
            },
          })
          return reply.status(200).send(reactivado)
        }
      }

      const nuevo = await prisma.pais.create({
        data: {
          codigo: codeUpper,
          nombre: body.nombre.trim(),
          codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
        },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId) {
        registrarAudit({
          accion: 'CREAR',
          entidad: 'PAIS',
          entidadId: nuevo.id,
          usuarioId: authUserId,
          descripcion: `creó el país ${nuevo.nombre} (${nuevo.codigo})`,
          ipAddress: request.ip,
        })
      }

      return reply.status(201).send(nuevo)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al crear el país' })
    }
  })

  // PUT /api/paises/:id
  fastify.put('/api/paises/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        codigo?: string
        nombre?: string
        codigoTelefono?: string
      }

      const existing = await prisma.pais.findUnique({ where: { id } })

      const actualizado = await prisma.pais.update({
        where: { id },
        data: {
          ...(body.codigo && { codigo: body.codigo.toUpperCase().trim() }),
          ...(body.nombre && { nombre: body.nombre.trim() }),
          ...(body.codigoTelefono !== undefined && {
            codigoTelefono: body.codigoTelefono ? body.codigoTelefono.trim() : null,
          }),
        },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId && existing) {
        const creadorOriginal = `Fue creado el ${formatAuditDateTime(existing.createdAt)}`
        registrarAudit({
          accion: 'MODIFICAR',
          entidad: 'PAIS',
          entidadId: actualizado.id,
          usuarioId: authUserId,
          descripcion: `modificó los datos del país ${actualizado.nombre}`,
          creadorOriginal,
          ipAddress: request.ip,
        })
      }

      return reply.send(actualizado)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al actualizar el país' })
    }
  })

  // DELETE /api/paises/:id (Soft delete)
  fastify.delete('/api/paises/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      const paisToDelete = await prisma.pais.findUnique({ where: { id } })

      await prisma.pais.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId && paisToDelete) {
        registrarAudit({
          accion: 'ELIMINAR',
          entidad: 'PAIS',
          entidadId: id,
          usuarioId: authUserId,
          descripcion: `eliminó el país ${paisToDelete.nombre}`,
          ipAddress: request.ip,
        })
      }

      return reply.send({ success: true, id })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al eliminar el país' })
    }
  })

  // POST /api/areas
  fastify.post('/api/areas', async (request, reply) => {
    try {
      const body = request.body as {
        paisId: number
        nombre: string
      }

      if (!body.paisId || !body.nombre || body.nombre.trim() === '') {
        return reply.status(400).send({ error: 'Faltan campos obligatorios (paisId, nombre)' })
      }

      const areaNombre = body.nombre.trim()

      const existing = await prisma.area.findFirst({
        where: { paisId: Number(body.paisId), nombre: areaNombre },
      })

      if (existing) {
        if (existing.deletedAt === null) {
          return reply.status(400).send({ error: 'El área ya existe para este país' })
        } else {
          const reactivada = await prisma.area.update({
            where: { id: existing.id },
            data: { deletedAt: null },
          })
          return reply.status(200).send(reactivada)
        }
      }

      const nuevaArea = await prisma.area.create({
        data: {
          paisId: Number(body.paisId),
          nombre: areaNombre,
        },
        include: { pais: true },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId) {
        registrarAudit({
          accion: 'CREAR',
          entidad: 'AREA',
          entidadId: nuevaArea.id,
          usuarioId: authUserId,
          descripcion: `creó la zona/área ${nuevaArea.nombre}`,
          contexto: `En el país ${nuevaArea.pais.nombre}`,
          ipAddress: request.ip,
        })
      }

      return reply.status(201).send(nuevaArea)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al crear el área' })
    }
  })

  // DELETE /api/areas/:id (Soft delete)
  fastify.delete('/api/areas/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)

      const areaToDelete = await prisma.area.findUnique({ where: { id }, include: { pais: true } })

      await prisma.area.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      const authUserId = getAuthUserId(request)
      if (authUserId && areaToDelete) {
        registrarAudit({
          accion: 'ELIMINAR',
          entidad: 'AREA',
          entidadId: id,
          usuarioId: authUserId,
          descripcion: `eliminó la zona/área ${areaToDelete.nombre}`,
          contexto: `Perteneciente a ${areaToDelete.pais.nombre}`,
          ipAddress: request.ip,
        })
      }

      return reply.send({ success: true, id })
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(400).send({ error: err.message || 'Error al eliminar el área' })
    }
  })
}
