import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { encrypt, decryptUser, decryptSesion } from '../../../shared/encryption.js'
import {
  syncSesionToGoogle,
  deleteSesionFromGoogle,
  deleteCitaVentaFromGoogle,
} from '../../integrations/google-calendar/google-calendar.service.js'

function parseLocalDateTime(dateStr: string): Date {
  if (!dateStr) return new Date()
  let cleanStr = dateStr.replace(' ', 'T').trim()
  if (cleanStr.length === 10) {
    cleanStr = `${cleanStr}T00:00:00`
  } else if (cleanStr.length === 16) {
    cleanStr = `${cleanStr}:00`
  }
  const hasTimezone = cleanStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(cleanStr)
  const isoStr = hasTimezone ? cleanStr : `${cleanStr}Z`
  const d = new Date(isoStr)
  return isNaN(d.getTime()) ? new Date(dateStr) : d
}

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

function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) {
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  }
  return new Date(dateStr)
}

async function getHotelAvailability(
  hotelId: number,
  fechaHoraInicio: Date,
  excludeSessionId?: number,
) {
  const dateStr = fechaHoraInicio.toISOString().slice(0, 10)
  const targetDateOnly = parseDateOnly(dateStr)

  // Fotógrafos activos asignados al hotel
  const fotografoUsers = await prisma.usuario.findMany({
    where: {
      activo: true,
      deletedAt: null,
      role: { codigo: 'FOTOGRAFO' },
      hotelesAsignados: { some: { hotelId } },
    },
    include: {
      calendarioLaboral: {
        where: {
          fechaInicio: { lte: targetDateOnly },
          fechaFin: { gte: targetDateOnly },
        },
      },
    },
  })

  const fotografosDetalle = fotografoUsers.map((rawUser) => {
    const u = decryptUser(rawUser)!
    return {
      id: u.id,
      nombre: `${u.nombre} ${u.apellidos}`.trim(),
      disponible: u.calendarioLaboral.length === 0,
      motivoAusencia: u.calendarioLaboral[0]?.motivo || null,
    }
  })

  const disponiblesCount = fotografosDetalle.filter((f) => f.disponible).length

  // Ventana de 1 hora para sesiones simultáneas
  // Una sesión que empieza en T colisiona con cualquier sesión en (T - 60min, T + 60min)
  const windowStart = new Date(fechaHoraInicio.getTime() - 59 * 60 * 1000)
  const windowEnd = new Date(fechaHoraInicio.getTime() + 59 * 60 * 1000)

  const whereSimultaneas: any = {
    hotelId,
    estado: 'PROGRAMADA',
    deletedAt: null,
    fechaHoraInicio: {
      gte: windowStart,
      lte: windowEnd,
    },
  }

  if (excludeSessionId) {
    whereSimultaneas.id = { not: excludeSessionId }
  }

  const sesionesSimultaneas = await prisma.sesionFotografica.findMany({
    where: whereSimultaneas,
    select: {
      id: true,
      clienteNombre: true,
      fechaHoraInicio: true,
      fotografoId: true,
    },
  })

  const simultaneasCount = sesionesSimultaneas.length
  const cupoLibre = Math.max(0, disponiblesCount - simultaneasCount)
  const topeAlcanzado = simultaneasCount >= disponiblesCount

  return {
    hotelId,
    fechaHora: fechaHoraInicio.toISOString(),
    totalFotografos: fotografoUsers.length,
    ausentes: fotografoUsers.length - disponiblesCount,
    disponibles: disponiblesCount,
    sesionesSimultaneas: simultaneasCount,
    cupoLibre,
    topeAlcanzado,
    fotografos: fotografosDetalle,
  }
}

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/hoteles/:id/disponibilidad (Obtener disponibilidad y cupo para una fecha/hora)
  fastify.get('/api/hoteles/:id/disponibilidad', async (request, reply) => {
    try {
      const hotelId = Number((request.params as any).id)
      const { fecha, excludeSessionId } = request.query as {
        fecha?: string
        excludeSessionId?: string
      }

      if (isNaN(hotelId) || !fecha) {
        return reply.status(400).send({ error: 'Debes proporcionar hotelId y fecha válidos' })
      }

      const date = parseLocalDateTime(fecha)
      const excludeId = excludeSessionId ? Number(excludeSessionId) : undefined

      const avail = await getHotelAvailability(hotelId, date, excludeId)
      return reply.send(avail)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al consultar disponibilidad'
      return reply.status(500).send({ error: message })
    }
  })
  // GET /api/sesiones (Obtiene las sesiones fotográficas activas)
  fastify.get('/api/sesiones', async (request, reply) => {
    try {
      const { hotelId } = request.query as { hotelId?: string }

      const where: any = { deletedAt: null }
      const userId = getAuthUserId(request)

      if (userId) {
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          include: {
            role: true,
            hotelesAsignados: true,
            areasAsignadas: true,
          },
        })

        if (user) {
          const roleCode = user.role.codigo.toUpperCase()
          const isGlobalAccess = ['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(roleCode)

          if (!isGlobalAccess) {
            let allowedHotelIds: number[] = []

            if (roleCode === 'GERENTE') {
              const areaIds = user.areasAsignadas.map((a) => a.areaId)
              const hotelsInAreas = await prisma.hotel.findMany({
                where: { areaId: { in: areaIds }, deletedAt: null },
                select: { id: true },
              })
              allowedHotelIds = hotelsInAreas.map((h) => h.id)
            } else {
              allowedHotelIds = user.hotelesAsignados.map((h) => h.hotelId)
            }

            if (hotelId) {
              const reqHotelId = Number(hotelId)
              if (!allowedHotelIds.includes(reqHotelId)) {
                return reply.send([])
              }
              where.hotelId = reqHotelId
            } else {
              where.hotelId = { in: allowedHotelIds }
            }
          } else if (hotelId) {
            where.hotelId = Number(hotelId)
          }
        } else if (hotelId) {
          where.hotelId = Number(hotelId)
        }
      } else if (hotelId) {
        where.hotelId = Number(hotelId)
      }

      const sesiones = await prisma.sesionFotografica.findMany({
        where,
        include: {
          hotel: true,
          fotografo: true,
          creador: true,
          citaVenta: true,
        },
        orderBy: { fechaHoraInicio: 'asc' },
      })

      const mapped = sesiones.map((raw) => {
        const s = decryptSesion(raw)!
        return {
          id: s.id,
          hotelId: s.hotelId,
          fotografoId: s.fotografoId || null,
          creadorId: s.creadorId,
          clienteNombre: s.clienteNombre,
          clienteEmail: s.clienteEmail || '',
          clienteTelefono: s.clienteTelefono || '',
          numeroHabitacion: s.numeroHabitacion || '',
          numAdultos: s.numAdultos ?? 1,
          numNinos: s.numNinos ?? 0,
          fechaSalida: s.fechaSalida ? s.fechaSalida.toISOString().slice(0, 10) : '',
          concepto: s.concepto || '',
          fechaHoraInicio: s.fechaHoraInicio.toISOString().slice(0, 16),
          estado: s.estado,
          origen: s.origen,
          notas: s.notas || '',
          googleCalendarEventId: s.googleCalendarEventId || null,
          citaVenta:
            s.citaVenta && !s.citaVenta.deletedAt
              ? {
                  id: s.citaVenta.id,
                  fechaHoraCita: s.citaVenta.fechaHoraCita.toISOString().slice(0, 16),
                  estado: s.citaVenta.estado,
                  numFotosVendidas: s.citaVenta.numFotosVendidas,
                  totalVentaUsd: s.citaVenta.totalVentaUsd,
                }
              : null,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        }
      })

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las sesiones'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/sesiones/:id (Obtiene una sesión fotográfica por ID)
  fastify.get('/api/sesiones/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'ID de sesión inválido' })
      }

      const rawSession = await prisma.sesionFotografica.findUnique({
        where: { id },
        include: {
          hotel: true,
          fotografo: true,
          creador: true,
          citaVenta: true,
        },
      })

      if (!rawSession || rawSession.deletedAt) {
        return reply.status(404).send({ error: 'Sesión fotográfica no encontrada' })
      }

      const s = decryptSesion(rawSession)!

      return reply.send({
        id: s.id,
        hotelId: s.hotelId,
        fotografoId: s.fotografoId || null,
        creadorId: s.creadorId,
        clienteNombre: s.clienteNombre,
        clienteEmail: s.clienteEmail || '',
        clienteTelefono: s.clienteTelefono || '',
        numeroHabitacion: s.numeroHabitacion || '',
        numAdultos: s.numAdultos ?? 1,
        numNinos: s.numNinos ?? 0,
        fechaSalida: s.fechaSalida ? s.fechaSalida.toISOString().slice(0, 10) : '',
        concepto: s.concepto || '',
        fechaHoraInicio: s.fechaHoraInicio.toISOString().slice(0, 16),
        estado: s.estado,
        origen: s.origen,
        notas: s.notas || '',
        googleCalendarEventId: s.googleCalendarEventId || null,
        citaVenta:
          s.citaVenta && !s.citaVenta.deletedAt
            ? {
                id: s.citaVenta.id,
                fechaHoraCita: s.citaVenta.fechaHoraCita.toISOString().slice(0, 16),
                estado: s.citaVenta.estado,
                numFotosVendidas: s.citaVenta.numFotosVendidas,
                totalVentaUsd: s.citaVenta.totalVentaUsd,
              }
            : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener la sesión'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/sesiones (Crear nueva sesión fotográfica)
  fastify.post('/api/sesiones', async (request, reply) => {
    try {
      const body = request.body as {
        hotelId: number
        fotografoId?: string | null
        creadorId?: string | null
        clienteNombre: string
        clienteEmail?: string
        clienteTelefono?: string
        numeroHabitacion?: string
        numAdultos?: number
        numNinos?: number
        fechaSalida?: string
        concepto?: string
        fechaHoraInicio: string
        estado?: string
        notas?: string
      }

      if (!body.hotelId || !body.clienteNombre || !body.fechaHoraInicio) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (hotelId, clienteNombre, fechaHoraInicio)' })
      }

      const fotografoId = body.fotografoId ? body.fotografoId : null
      const creadorId = body.creadorId || getAuthUserId(request) || fotografoId

      if (!creadorId) {
        return reply
          .status(400)
          .send({ error: 'Debes proporcionar un creadorId válido o token de usuario autenticado' })
      }

      const estado = body.estado || 'PROGRAMADA'
      const fechaHoraInicioDate = parseLocalDateTime(body.fechaHoraInicio)

      const todayBeginning = new Date()
      todayBeginning.setHours(0, 0, 0, 0)
      if (fechaHoraInicioDate < todayBeginning) {
        return reply.status(400).send({
          error: 'No se pueden crear sesiones fotográficas en fechas anteriores al día actual',
        })
      }

      // Validar tope de sesiones si se intenta programar la sesión
      if (estado === 'PROGRAMADA') {
        const avail = await getHotelAvailability(Number(body.hotelId), fechaHoraInicioDate)
        if (avail.disponibles === 0) {
          return reply.status(409).send({
            error:
              'No hay fotógrafos disponibles en este hotel para la fecha/hora seleccionada (todos ausentes o sin fotógrafos asignados).',
            details: avail,
          })
        }
        if (avail.topeAlcanzado) {
          return reply.status(409).send({
            error: `Tope de sesiones simultáneas alcanzado: ya hay ${avail.sesionesSimultaneas} sesión/es programada/s para esa hora y solo hay ${avail.disponibles} fotógrafo/s disponible/s.`,
            details: avail,
          })
        }

        // Validar disponibilidad individual del fotógrafo asignado
        if (fotografoId) {
          const targetDateOnly = parseDateOnly(fechaHoraInicioDate.toISOString().slice(0, 10))
          const ausencia = await prisma.calendarioLaboralFotografo.findFirst({
            where: {
              usuarioId: fotografoId,
              fechaInicio: { lte: targetDateOnly },
              fechaFin: { gte: targetDateOnly },
            },
            include: {
              usuario: {
                select: { nombre: true, apellidos: true },
              },
            },
          })

          if (ausencia) {
            const nombreFotografo = ausencia.usuario
              ? `${ausencia.usuario.nombre} ${ausencia.usuario.apellidos}`.trim()
              : 'El fotógrafo seleccionado'
            const motivoTxt = ausencia.motivo || 'Ausencia'
            return reply.status(409).send({
              error: `${nombreFotografo} no está disponible en la fecha seleccionada (${motivoTxt}).`,
              ausencia,
            })
          }
        }
      }

      const nueva = await prisma.sesionFotografica.create({
        data: {
          hotelId: Number(body.hotelId),
          fotografoId: fotografoId,
          creadorId: creadorId,
          clienteNombre: encrypt(body.clienteNombre.trim()) || '',
          clienteEmail: body.clienteEmail ? encrypt(body.clienteEmail.trim()) : null,
          clienteTelefono: body.clienteTelefono ? encrypt(body.clienteTelefono.trim()) : null,
          numeroHabitacion: body.numeroHabitacion ? body.numeroHabitacion.trim() : null,
          numAdultos: body.numAdultos !== undefined ? Number(body.numAdultos) : 1,
          numNinos: body.numNinos !== undefined ? Number(body.numNinos) : 0,
          fechaSalida: body.fechaSalida ? new Date(body.fechaSalida) : null,
          concepto: body.concepto ? body.concepto.trim() : null,
          fechaHoraInicio: fechaHoraInicioDate,
          estado: estado,
          origen: 'MANUAL',
          notas: body.notas ? body.notas.trim() : null,
        },
      })

      // Sincronizar automáticamente con Google Calendar
      let googleEventId: string | null = null
      try {
        googleEventId = await syncSesionToGoogle(nueva.id)
      } catch (gErr) {
        fastify.log.error(gErr, 'Error al sincronizar sesión con Google Calendar')
      }

      const decNueva = decryptSesion(nueva)!

      return reply.status(201).send({
        id: decNueva.id,
        hotelId: decNueva.hotelId,
        fotografoId: decNueva.fotografoId || null,
        creadorId: decNueva.creadorId,
        clienteNombre: decNueva.clienteNombre,
        clienteEmail: decNueva.clienteEmail || '',
        clienteTelefono: decNueva.clienteTelefono || '',
        numeroHabitacion: decNueva.numeroHabitacion || '',
        numAdultos: decNueva.numAdultos ?? 1,
        numNinos: decNueva.numNinos ?? 0,
        fechaSalida: decNueva.fechaSalida ? decNueva.fechaSalida.toISOString().slice(0, 10) : '',
        concepto: decNueva.concepto || '',
        fechaHoraInicio: decNueva.fechaHoraInicio.toISOString().slice(0, 16),
        estado: decNueva.estado,
        origen: decNueva.origen,
        notas: decNueva.notas || '',
        googleCalendarEventId: googleEventId || decNueva.googleCalendarEventId || null,
        createdAt: decNueva.createdAt.toISOString(),
        updatedAt: decNueva.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear la sesión'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/sesiones/:id (Actualizar sesión existente)
  fastify.put('/api/sesiones/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      const body = request.body as {
        hotelId?: number
        fotografoId?: string | null
        clienteNombre?: string
        clienteEmail?: string
        clienteTelefono?: string
        numeroHabitacion?: string
        numAdultos?: number
        numNinos?: number
        fechaSalida?: string
        concepto?: string
        fechaHoraInicio?: string
        estado?: string
        notas?: string
      }

      const existing = await prisma.sesionFotografica.findUnique({ where: { id } })
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Sesión fotográfica no encontrada' })
      }

      // Role check: if session in DB was NOT PROGRAMADA (COMPLETADA, CANCELADA, NO_SHOW), only SUPERVISOR/GERENTE/ADMIN/SUPERUSUARIO can edit
      if (existing.estado !== 'PROGRAMADA') {
        const userId = getAuthUserId(request)
        if (!userId) {
          return reply.status(403).send({ error: 'No autorizado para editar sesiones cerradas' })
        }
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          include: { role: true },
        })
        const role = user?.role?.codigo?.toUpperCase()
        const canEdit = ['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role || '')
        if (!canEdit) {
          return reply.status(403).send({
            error:
              'Solo supervisores, gerentes, administradores y superusuarios pueden editar sesiones cerradas',
          })
        }
      }

      const targetHotelId = body.hotelId !== undefined ? Number(body.hotelId) : existing.hotelId
      const targetFechaInicio = body.fechaHoraInicio
        ? parseLocalDateTime(body.fechaHoraInicio)
        : existing.fechaHoraInicio
      const targetEstado = body.estado || existing.estado

      // Si la sesión queda como PROGRAMADA, verificar que no supere el tope
      if (targetEstado === 'PROGRAMADA') {
        const avail = await getHotelAvailability(targetHotelId, targetFechaInicio, id)
        if (avail.disponibles === 0) {
          return reply.status(409).send({
            error:
              'No hay fotógrafos disponibles en este hotel para la fecha/hora seleccionada (todos ausentes o sin fotógrafos asignados).',
            details: avail,
          })
        }
        if (avail.topeAlcanzado) {
          return reply.status(409).send({
            error: `Tope de sesiones simultáneas alcanzado: ya hay ${avail.sesionesSimultaneas} sesión/es programada/s para esa hora y solo hay ${avail.disponibles} fotógrafo/s disponible/s.`,
            details: avail,
          })
        }

        // Validar disponibilidad individual del fotógrafo asignado
        const targetFotografoId =
          body.fotografoId !== undefined ? body.fotografoId : existing.fotografoId
        if (targetFotografoId) {
          const targetDateOnly = parseDateOnly(targetFechaInicio.toISOString().slice(0, 10))
          const ausencia = await prisma.calendarioLaboralFotografo.findFirst({
            where: {
              usuarioId: targetFotografoId,
              fechaInicio: { lte: targetDateOnly },
              fechaFin: { gte: targetDateOnly },
            },
            include: {
              usuario: {
                select: { nombre: true, apellidos: true },
              },
            },
          })

          if (ausencia) {
            const nombreFotografo = ausencia.usuario
              ? `${ausencia.usuario.nombre} ${ausencia.usuario.apellidos}`.trim()
              : 'El fotógrafo seleccionado'
            const motivoTxt = ausencia.motivo || 'Ausencia'
            return reply.status(409).send({
              error: `${nombreFotografo} no está disponible en la fecha seleccionada (${motivoTxt}).`,
              ausencia,
            })
          }
        }
      }

      const actualizada = await prisma.sesionFotografica.update({
        where: { id },
        data: {
          ...(body.hotelId !== undefined && { hotelId: Number(body.hotelId) }),
          ...(body.fotografoId !== undefined && {
            fotografoId: body.fotografoId ? body.fotografoId : null,
          }),
          ...(body.clienteNombre && { clienteNombre: encrypt(body.clienteNombre.trim()) || '' }),
          ...(body.clienteEmail !== undefined && {
            clienteEmail: body.clienteEmail ? encrypt(body.clienteEmail.trim()) : null,
          }),
          ...(body.clienteTelefono !== undefined && {
            clienteTelefono: body.clienteTelefono ? encrypt(body.clienteTelefono.trim()) : null,
          }),
          ...(body.numeroHabitacion !== undefined && {
            numeroHabitacion: body.numeroHabitacion ? body.numeroHabitacion.trim() : null,
          }),
          ...(body.numAdultos !== undefined && { numAdultos: Number(body.numAdultos) }),
          ...(body.numNinos !== undefined && { numNinos: Number(body.numNinos) }),
          ...(body.fechaSalida !== undefined && {
            fechaSalida: body.fechaSalida ? new Date(body.fechaSalida) : null,
          }),
          ...(body.concepto !== undefined && {
            concepto: body.concepto ? body.concepto.trim() : null,
          }),
          ...(body.fechaHoraInicio && {
            fechaHoraInicio: parseLocalDateTime(body.fechaHoraInicio),
          }),
          ...(body.estado && { estado: body.estado }),
          ...(body.notas !== undefined && { notas: body.notas ? body.notas.trim() : null }),
        },
      })

      // Sincronizar actualización con Google Calendar
      let googleEventId: string | null = actualizada.googleCalendarEventId
      try {
        googleEventId = await syncSesionToGoogle(actualizada.id)
      } catch (gErr) {
        fastify.log.error(gErr, 'Error al actualizar sesión en Google Calendar')
      }

      const decActualizada = decryptSesion(actualizada)!

      return reply.send({
        id: decActualizada.id,
        hotelId: decActualizada.hotelId,
        fotografoId: decActualizada.fotografoId || null,
        creadorId: decActualizada.creadorId || null,
        clienteNombre: decActualizada.clienteNombre,
        clienteEmail: decActualizada.clienteEmail || '',
        clienteTelefono: decActualizada.clienteTelefono || '',
        numeroHabitacion: decActualizada.numeroHabitacion || '',
        numAdultos: decActualizada.numAdultos ?? 1,
        numNinos: decActualizada.numNinos ?? 0,
        fechaSalida: decActualizada.fechaSalida
          ? decActualizada.fechaSalida.toISOString().slice(0, 10)
          : '',
        concepto: decActualizada.concepto || '',
        fechaHoraInicio: decActualizada.fechaHoraInicio.toISOString().slice(0, 16),
        estado: decActualizada.estado,
        origen: decActualizada.origen,
        notas: decActualizada.notas || '',
        googleCalendarEventId: googleEventId || null,
        createdAt: decActualizada.createdAt.toISOString(),
        updatedAt: decActualizada.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar la sesión'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/sesiones/:id (Soft delete)
  fastify.delete('/api/sesiones/:id', async (request, reply) => {
    try {
      const id = Number(request.params && (request.params as any).id)
      if (!id || isNaN(id)) {
        return reply.status(400).send({ error: 'ID de sesión inválido' })
      }

      const query = (request.query || {}) as { deleteCitaVenta?: string; deleteAssociated?: string }
      const deleteCitaVenta = query.deleteCitaVenta === 'true' || query.deleteAssociated === 'true'

      const sesion = await prisma.sesionFotografica.findUnique({
        where: { id },
        include: { citaVenta: true },
      })

      if (!sesion) {
        return reply.status(404).send({ error: 'Sesión no encontrada' })
      }

      await prisma.sesionFotografica.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      // Eliminar evento de Google Calendar
      if (sesion.googleCalendarEventId) {
        deleteSesionFromGoogle(sesion.googleCalendarEventId).catch((gErr) => {
          fastify.log.error(gErr, 'Error al eliminar evento de Google Calendar')
        })
      }

      // Si el usuario marcó borrar también la cita de venta asociada
      if (deleteCitaVenta && sesion.citaVenta && !sesion.citaVenta.deletedAt) {
        await prisma.citaVenta.update({
          where: { id: sesion.citaVenta.id },
          data: { deletedAt: new Date() },
        })
        await prisma.comision.deleteMany({
          where: { citaVentaId: sesion.citaVenta.id },
        })
        if (sesion.citaVenta.googleCalendarEventId) {
          deleteCitaVentaFromGoogle(sesion.citaVenta.googleCalendarEventId).catch((gErr) => {
            fastify.log.error(gErr, 'Error al eliminar cita de venta de Google Calendar')
          })
        }
      }

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar la sesión'
      return reply.status(400).send({ error: message })
    }
  })
}
