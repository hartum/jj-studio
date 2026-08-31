import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { decrypt, decryptUser } from '../../../shared/encryption.js'
import { calculateAndSaveCommissionsForSale } from '../../commissions/application/commission.service.js'
import {
  syncCitaVentaToGoogle,
  syncSesionToGoogle,
  deleteCitaVentaFromGoogle,
  deleteSesionFromGoogle,
} from '../../integrations/google-calendar/google-calendar.service.js'

const SALES_APPOINTMENT_DURATION_MS = 60 * 60 * 1000 // 1 hour

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

async function getUserRole(userId: string): Promise<string | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  return user?.role.codigo.toUpperCase() || null
}

function parseLocalDateTime(dateStr: string): Date {
  if (!dateStr) return new Date()
  const cleanStr = dateStr.replace(' ', 'T').slice(0, 19)
  const hasTimezone = cleanStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(cleanStr)
  const isoStr = hasTimezone ? cleanStr : `${cleanStr}:00Z`.replace(':00:00Z', ':00Z')
  return new Date(isoStr)
}

function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) {
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  }
  return new Date(dateStr)
}

async function findConflicts(hotelId: number, fechaHoraCita: Date, excludeId?: number) {
  const rangeStart = new Date(fechaHoraCita.getTime() - SALES_APPOINTMENT_DURATION_MS)
  const rangeEnd = new Date(fechaHoraCita.getTime() + SALES_APPOINTMENT_DURATION_MS)

  const where: any = {
    hotelId,
    deletedAt: null,
    estado: { not: 'CANCELADA' },
    fechaHoraCita: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  }
  if (excludeId) {
    where.id = { not: excludeId }
  }

  return prisma.citaVenta.findMany({
    where,
    include: { sesion: true },
  })
}

async function getAllowedHotelIds(userId: string): Promise<number[] | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      role: true,
      hotelesAsignados: true,
      areasAsignadas: true,
    },
  })
  if (!user) return []

  const roleCode = user.role.codigo.toUpperCase()
  if (['SUPERUSUARIO', 'ADMIN', 'CONTABLE'].includes(roleCode)) return null // null means global

  if (roleCode === 'GERENTE') {
    const areaIds = user.areasAsignadas.map((a) => a.areaId)
    const hotelsInAreas = await prisma.hotel.findMany({
      where: { areaId: { in: areaIds }, deletedAt: null },
      select: { id: true },
    })
    return hotelsInAreas.map((h) => h.id)
  }

  return user.hotelesAsignados.map((h) => h.hotelId)
}

export async function saleRoutes(fastify: FastifyInstance) {
  // GET /api/hoteles/:id/vendedores-disponibilidad (Disponibilidad de vendedores para una fecha y hora)
  fastify.get('/api/hoteles/:id/vendedores-disponibilidad', async (request, reply) => {
    try {
      const hotelId = Number((request.params as any).id)
      const { fecha, excludeCitaId } = request.query as {
        fecha?: string
        excludeCitaId?: string
      }

      if (isNaN(hotelId) || !fecha) {
        return reply.status(400).send({ error: 'Debes proporcionar hotelId y fecha válidos' })
      }

      const dateStr = fecha.replace(' ', 'T').slice(0, 10)
      const targetDateOnly = parseDateOnly(dateStr)
      const targetDateTime = parseLocalDateTime(fecha)
      const excludeId = excludeCitaId ? Number(excludeCitaId) : undefined

      // Vendedores activos asignados al hotel (Agendadores y Fotógrafos)
      const sellers = await prisma.usuario.findMany({
        where: {
          activo: true,
          deletedAt: null,
          role: { codigo: { in: ['AGENDADOR', 'FOTOGRAFO'] } },
          hotelesAsignados: { some: { hotelId } },
        },
        include: {
          role: true,
          calendarioLaboral: {
            where: {
              fechaInicio: { lte: targetDateOnly },
              fechaFin: { gte: targetDateOnly },
            },
          },
        },
      })

      // Ventana de 1 hora para citas de venta simultáneas
      const windowStart = new Date(targetDateTime.getTime() - 59 * 60 * 1000)
      const windowEnd = new Date(targetDateTime.getTime() + 59 * 60 * 1000)

      const whereCitas: any = {
        hotelId,
        estado: 'PROGRAMADA',
        deletedAt: null,
        fechaHoraCita: {
          gte: windowStart,
          lte: windowEnd,
        },
        vendedorId: { not: null },
      }
      if (excludeId) {
        whereCitas.id = { not: excludeId }
      }

      const citasSimultaneas = await prisma.citaVenta.findMany({
        where: whereCitas,
        select: { id: true, vendedorId: true, fechaHoraCita: true },
      })

      // Sesiones fotográficas simultáneas (para fotógrafos que actúan de vendedores)
      const sesionesSimultaneas = await prisma.sesionFotografica.findMany({
        where: {
          hotelId,
          estado: 'PROGRAMADA',
          deletedAt: null,
          fechaHoraInicio: {
            gte: windowStart,
            lte: windowEnd,
          },
          fotografoId: { not: null },
        },
        select: { id: true, fotografoId: true, fechaHoraInicio: true },
      })

      const vendedoresDetalle = sellers.map((rawUser) => {
        const u = decryptUser(rawUser)!
        const isAusente = u.calendarioLaboral.length > 0
        const motivoAusencia = u.calendarioLaboral[0]?.motivo || null
        const tieneCitaAsignada = citasSimultaneas.some((c) => c.vendedorId === u.id)
        const tieneSesionAsignada = sesionesSimultaneas.some((s) => s.fotografoId === u.id)
        const isOcupado = tieneCitaAsignada || tieneSesionAsignada
        const motivoOcupado = tieneCitaAsignada
          ? 'Cita de venta en este horario'
          : tieneSesionAsignada
            ? 'Sesión de fotos en este horario'
            : null

        return {
          id: u.id,
          nombre: `${u.nombre} ${u.apellidos}`.trim(),
          roleCode: u.role.codigo,
          disponible: !isAusente && !isOcupado,
          isAusente,
          motivoAusencia,
          ocupado: isOcupado,
          motivoOcupado,
        }
      })

      const disponiblesCount = vendedoresDetalle.filter((v) => v.disponible).length
      const ausentesCount = vendedoresDetalle.filter((v) => v.isAusente).length
      const ocupadosCount = vendedoresDetalle.filter((v) => v.ocupado && !v.isAusente).length

      return reply.send({
        hotelId,
        fechaHora: targetDateTime.toISOString(),
        totalVendedores: sellers.length,
        disponibles: disponiblesCount,
        ausentes: ausentesCount,
        ocupados: ocupadosCount,
        vendedores: vendedoresDetalle,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message =
        err instanceof Error ? err.message : 'Error al consultar disponibilidad de vendedores'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/citas-venta - List sales appointments
  fastify.get('/api/citas-venta', async (request, reply) => {
    try {
      const { hotelId } = request.query as { hotelId?: string }
      const where: any = { deletedAt: null }

      const userId = getAuthUserId(request)
      if (userId) {
        const allowedHotelIds = await getAllowedHotelIds(userId)
        if (allowedHotelIds !== null) {
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

      const citas = await prisma.citaVenta.findMany({
        where,
        include: {
          sesion: true,
          hotel: true,
          vendedor: true,
        },
        orderBy: { fechaHoraCita: 'asc' },
      })

      const mapped = citas.map((c) => {
        const v = decryptUser(c.vendedor)
        return {
          id: c.id,
          sesionId: c.sesionId,
          hotelId: c.sesion?.hotelId || c.hotelId,
          hotelNombre: c.hotel?.nombre || '',
          vendedorId: c.vendedorId || null,
          vendedorNombre: v ? `${v.nombre} ${v.apellidos}`.trim() : null,
          fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
          estado: c.estado,
          numFotosVendidas: c.numFotosVendidas,
          totalVentaUsd: c.totalVentaUsd,
          notas: c.notas || '',
          clienteNombre: decrypt(c.sesion.clienteNombre) || '',
          clienteEmail: decrypt(c.sesion.clienteEmail) || '',
          clienteTelefono: decrypt(c.sesion.clienteTelefono) || '',
          numeroHabitacion: c.sesion.numeroHabitacion || '',
          fotografoId: c.sesion.fotografoId || null,
          sesionFechaHoraInicio: c.sesion.fechaHoraInicio.toISOString().slice(0, 16),
          googleCalendarEventId: c.googleCalendarEventId || null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }
      })

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las citas de venta'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/citas-venta/conflictos - Check appointment conflicts for a datetime & hotel
  fastify.get('/api/citas-venta/conflictos', async (request, reply) => {
    try {
      const { hotelId, fechaHoraCita, excludeId } = request.query as {
        hotelId?: string
        fechaHoraCita?: string
        excludeId?: string
      }

      if (!hotelId || !fechaHoraCita) {
        return reply.status(400).send({ error: 'hotelId y fechaHoraCita son obligatorios' })
      }

      const targetDate = parseLocalDateTime(fechaHoraCita)
      const exclude = excludeId ? Number(excludeId) : undefined
      const conflicts = await findConflicts(Number(hotelId), targetDate, exclude)

      const mapped = conflicts.map((c) => ({
        id: c.id,
        fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
        clienteNombre: decrypt(c.sesion.clienteNombre) || '',
        numeroHabitacion: c.sesion.numeroHabitacion || '',
      }))

      return reply.send(mapped)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al verificar conflictos'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/citas-venta/:id - Get single sales appointment
  fastify.get('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)

      const cita = await prisma.citaVenta.findUnique({
        where: { id },
        include: { sesion: true, hotel: true, vendedor: true },
      })

      if (!cita || cita.deletedAt) {
        return reply.status(404).send({ error: 'Cita de venta no encontrada' })
      }

      const v = decryptUser(cita.vendedor)
      return reply.send({
        id: cita.id,
        sesionId: cita.sesionId,
        hotelId: cita.hotelId,
        vendedorId: cita.vendedorId || null,
        vendedorNombre: v ? `${v.nombre} ${v.apellidos}`.trim() : null,
        fechaHoraCita: cita.fechaHoraCita.toISOString().slice(0, 16),
        estado: cita.estado,
        numFotosVendidas: cita.numFotosVendidas,
        totalVentaUsd: cita.totalVentaUsd,
        notas: cita.notas || '',
        clienteNombre: decrypt(cita.sesion.clienteNombre) || '',
        clienteEmail: decrypt(cita.sesion.clienteEmail) || '',
        clienteTelefono: decrypt(cita.sesion.clienteTelefono) || '',
        numeroHabitacion: cita.sesion.numeroHabitacion || '',
        fotografoId: cita.sesion.fotografoId || null,
        numAdultos: cita.sesion.numAdultos ?? 1,
        numNinos: cita.sesion.numNinos ?? 0,
        concepto: cita.sesion.concepto || '',
        sesionFechaHoraInicio: cita.sesion.fechaHoraInicio.toISOString().slice(0, 16),
        hotelNombre: cita.hotel.nombre,
        googleCalendarEventId: cita.googleCalendarEventId || null,
        createdAt: cita.createdAt.toISOString(),
        updatedAt: cita.updatedAt.toISOString(),
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener la cita de venta'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/citas-venta - Create sales appointment
  fastify.post('/api/citas-venta', async (request, reply) => {
    try {
      const body = request.body as {
        sesionId: number
        hotelId: number
        vendedorId?: string | null
        fechaHoraCita: string
        estado?: string
        numFotosVendidas?: number | null
        totalVentaUsd?: number | null
        notas?: string
      }

      if (!body.sesionId || !body.hotelId || !body.fechaHoraCita) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (sesionId, hotelId, fechaHoraCita)' })
      }

      // Validate session exists and is eligible for a sales appointment
      const sesion = await prisma.sesionFotografica.findUnique({
        where: { id: body.sesionId },
        include: { citaVenta: true },
      })

      if (!sesion || sesion.deletedAt) {
        return reply.status(404).send({ error: 'Sesión fotográfica no encontrada' })
      }

      const ESTADOS_NO_PERMITIDOS = ['CANCELADA', 'NO_SHOW']
      if (ESTADOS_NO_PERMITIDOS.includes(sesion.estado)) {
        return reply
          .status(400)
          .send({ error: 'No se puede agendar una cita de venta para una sesión cancelada o donde el cliente no se presentó' })
      }

      if (sesion.citaVenta && !sesion.citaVenta.deletedAt) {
        return reply
          .status(400)
          .send({ error: 'Esta sesión ya tiene una cita de venta asociada' })
      }

      const fechaCita = parseLocalDateTime(body.fechaHoraCita)

      const todayBeginning = new Date()
      todayBeginning.setHours(0, 0, 0, 0)
      if (fechaCita < todayBeginning) {
        return reply.status(400).send({
          error: 'No se pueden crear citas de venta en fechas anteriores al día actual',
        })
      }

      // Validate sales fields when creating as COMPLETADA
      const targetEstado = (body.estado as any) || 'PROGRAMADA'
      if (targetEstado === 'COMPLETADA') {
        if (!body.sesionId) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes seleccionar una sesión fotográfica' })
        }
        if (!body.vendedorId) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes seleccionar un vendedor' })
        }
        if (body.numFotosVendidas == null || body.totalVentaUsd == null) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes indicar el nº de fotos vendidas y el total en USD' })
        }
      }

      // Check conflicts using session's hotelId
      const conflicts = await findConflicts(sesion.hotelId, fechaCita)

      let nueva
      if (sesion.citaVenta) {
        nueva = await prisma.citaVenta.update({
          where: { id: sesion.citaVenta.id },
          data: {
            hotelId: sesion.hotelId,
            vendedorId: body.vendedorId || null,
            fechaHoraCita: fechaCita,
            estado: targetEstado,
            numFotosVendidas: body.numFotosVendidas ?? null,
            totalVentaUsd: body.totalVentaUsd ?? null,
            notas: body.notas ? body.notas.trim() : null,
            deletedAt: null,
          },
          include: { sesion: true, vendedor: true },
        })
      } else {
        nueva = await prisma.citaVenta.create({
          data: {
            sesionId: body.sesionId,
            hotelId: sesion.hotelId,
            vendedorId: body.vendedorId || null,
            fechaHoraCita: fechaCita,
            estado: targetEstado,
            numFotosVendidas: body.numFotosVendidas ?? null,
            totalVentaUsd: body.totalVentaUsd ?? null,
            notas: body.notas ? body.notas.trim() : null,
          },
          include: { sesion: true, vendedor: true },
        })
      }

      // Recalcular comisiones y sincronizar estado de sesión si se crea directamente como COMPLETADA
      if (nueva.estado === 'COMPLETADA') {
        if (nueva.sesionId) {
          try {
            await prisma.sesionFotografica.update({
              where: { id: nueva.sesionId },
              data: { estado: 'COMPLETADA' },
            })
            await syncSesionToGoogle(nueva.sesionId).catch((gErr) => {
              fastify.log.error(gErr, 'Error al sincronizar sesión completada con Google Calendar')
            })
          } catch (sessErr) {
            fastify.log.error(sessErr, 'Error al marcar sesión como COMPLETADA tras completar la cita de venta')
          }
        }
        try {
          await calculateAndSaveCommissionsForSale(nueva.id)
        } catch (commErr) {
          fastify.log.error(commErr, 'Error al calcular comisiones para la venta creada')
        }
      }

      // Sincronizar con Google Calendar
      let googleEventId: string | null = null
      try {
        googleEventId = await syncCitaVentaToGoogle(nueva.id)
      } catch (gErr) {
        fastify.log.error(gErr, 'Error al sincronizar cita de venta con Google Calendar')
      }

      const v = decryptUser(nueva.vendedor)
      const response: any = {
        id: nueva.id,
        sesionId: nueva.sesionId,
        hotelId: nueva.hotelId,
        vendedorId: nueva.vendedorId || null,
        vendedorNombre: v ? `${v.nombre} ${v.apellidos}`.trim() : null,
        fechaHoraCita: nueva.fechaHoraCita.toISOString().slice(0, 16),
        estado: nueva.estado,
        numFotosVendidas: nueva.numFotosVendidas,
        totalVentaUsd: nueva.totalVentaUsd,
        notas: nueva.notas || '',
        clienteNombre: decrypt(nueva.sesion.clienteNombre) || '',
        googleCalendarEventId: googleEventId || null,
        createdAt: nueva.createdAt.toISOString(),
        updatedAt: nueva.updatedAt.toISOString(),
      }

      if (conflicts.length > 0) {
        response.conflictos = conflicts.map((c) => ({
          id: c.id,
          fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
          clienteNombre: decrypt(c.sesion.clienteNombre) || '',
        }))
      }

      return reply.status(201).send(response)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al crear la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })

  // PUT /api/citas-venta/:id - Update sales appointment
  fastify.put('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      const body = request.body as {
        vendedorId?: string | null
        fechaHoraCita?: string
        estado?: string
        numFotosVendidas?: number | null
        totalVentaUsd?: number | null
        notas?: string
      }

      const existing = await prisma.citaVenta.findUnique({ where: { id } })
      if (!existing || existing.deletedAt) {
        return reply.status(404).send({ error: 'Cita de venta no encontrada' })
      }

      // Role check: if cita was NOT PROGRAMADA (COMPLETADA, CANCELADA, NO_SHOW), only SUPERVISOR/GERENTE/ADMIN/SUPERUSUARIO can edit
      if (existing.estado !== 'PROGRAMADA') {
        const userId = getAuthUserId(request)
        if (!userId) {
          return reply.status(403).send({ error: 'No autorizado para editar citas cerradas' })
        }
        const role = await getUserRole(userId)
        const canEdit = ['SUPERVISOR', 'GERENTE', 'ADMIN', 'SUPERUSUARIO'].includes(role || '')
        if (!canEdit) {
          return reply
            .status(403)
            .send({ error: 'Solo supervisores, gerentes, administradores y superusuarios pueden editar citas cerradas' })
        }
      }

      // Validate sales fields when transitioning to COMPLETADA
      if (body.estado === 'COMPLETADA') {
        const sesionId = existing.sesionId
        const vendedorId = body.vendedorId !== undefined ? body.vendedorId : existing.vendedorId
        if (!sesionId) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes seleccionar una sesión fotográfica' })
        }
        if (!vendedorId) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes seleccionar un vendedor' })
        }
        const fotosVendidas = body.numFotosVendidas ?? existing.numFotosVendidas
        const totalVenta = body.totalVentaUsd ?? existing.totalVentaUsd
        if (fotosVendidas == null || totalVenta == null) {
          return reply
            .status(400)
            .send({ error: 'Para completar la cita, debes indicar el nº de fotos vendidas y el total en USD' })
        }
      }

      const data: any = {}
      if (body.vendedorId !== undefined) data.vendedorId = body.vendedorId || null
      if (body.fechaHoraCita !== undefined) {
        data.fechaHoraCita = parseLocalDateTime(body.fechaHoraCita)
      }
      if (body.estado !== undefined) data.estado = body.estado
      if (body.numFotosVendidas !== undefined) data.numFotosVendidas = body.numFotosVendidas
      if (body.totalVentaUsd !== undefined) data.totalVentaUsd = body.totalVentaUsd
      if (body.notas !== undefined) data.notas = body.notas ? body.notas.trim() : null

      const actualizada = await prisma.citaVenta.update({
        where: { id },
        data,
        include: { sesion: true, vendedor: true },
      })

      // Recalcular comisiones y sincronizar estado de sesión automáticamente
      if (actualizada.estado === 'COMPLETADA' && actualizada.sesionId) {
        try {
          await prisma.sesionFotografica.update({
            where: { id: actualizada.sesionId },
            data: { estado: 'COMPLETADA' },
          })
          await syncSesionToGoogle(actualizada.sesionId).catch((gErr) => {
            fastify.log.error(gErr, 'Error al sincronizar sesión completada con Google Calendar')
          })
        } catch (sessErr) {
          fastify.log.error(sessErr, 'Error al marcar sesión como COMPLETADA tras completar la cita de venta')
        }
      }

      try {
        await calculateAndSaveCommissionsForSale(actualizada.id)
      } catch (commErr) {
        fastify.log.error(commErr, 'Error al calcular comisiones para la venta')
      }

      // Sincronizar actualización con Google Calendar
      let googleEventId: string | null = actualizada.googleCalendarEventId
      try {
        googleEventId = await syncCitaVentaToGoogle(actualizada.id)
      } catch (gErr) {
        fastify.log.error(gErr, 'Error al sincronizar actualización de cita de venta con Google Calendar')
      }

      const v = decryptUser(actualizada.vendedor)
      const response: any = {
        id: actualizada.id,
        sesionId: actualizada.sesionId,
        hotelId: actualizada.hotelId,
        vendedorId: actualizada.vendedorId || null,
        vendedorNombre: v ? `${v.nombre} ${v.apellidos}`.trim() : null,
        fechaHoraCita: actualizada.fechaHoraCita.toISOString().slice(0, 16),
        estado: actualizada.estado,
        numFotosVendidas: actualizada.numFotosVendidas,
        totalVentaUsd: actualizada.totalVentaUsd,
        notas: actualizada.notas || '',
        clienteNombre: decrypt(actualizada.sesion.clienteNombre) || '',
        googleCalendarEventId: googleEventId || null,
        createdAt: actualizada.createdAt.toISOString(),
        updatedAt: actualizada.updatedAt.toISOString(),
      }

      // Check conflicts if date changed
      if (body.fechaHoraCita !== undefined) {
        const conflicts = await findConflicts(actualizada.hotelId, actualizada.fechaHoraCita, id)
        if (conflicts.length > 0) {
          response.conflictos = conflicts.map((c) => ({
            id: c.id,
            fechaHoraCita: c.fechaHoraCita.toISOString().slice(0, 16),
            clienteNombre: decrypt(c.sesion.clienteNombre) || '',
          }))
        }
      }

      return reply.send(response)
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al actualizar la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })

  // DELETE /api/citas-venta/:id - Soft delete
  fastify.delete('/api/citas-venta/:id', async (request, reply) => {
    try {
      const id = Number((request.params as any).id)
      if (!id || isNaN(id)) {
        return reply.status(400).send({ error: 'ID de cita de venta inválido' })
      }

      const query = (request.query || {}) as { deleteSesion?: string; deleteAssociated?: string }
      const deleteSesion = query.deleteSesion === 'true' || query.deleteAssociated === 'true'

      const cita = await prisma.citaVenta.findUnique({
        where: { id },
        include: { sesion: true },
      })

      if (!cita) {
        return reply.status(404).send({ error: 'Cita de venta no encontrada' })
      }

      await prisma.citaVenta.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      // Limpiar comisiones asociadas a la venta eliminada
      await prisma.comision.deleteMany({
        where: { citaVentaId: id },
      })

      // Eliminar evento de Google Calendar
      if (cita.googleCalendarEventId) {
        deleteCitaVentaFromGoogle(cita.googleCalendarEventId).catch((gErr) => {
          fastify.log.error(gErr, 'Error al eliminar cita de venta de Google Calendar')
        })
      }

      // Si el usuario marcó borrar también la sesión de fotos asociada
      if (deleteSesion && cita.sesion && !cita.sesion.deletedAt) {
        await prisma.sesionFotografica.update({
          where: { id: cita.sesion.id },
          data: { deletedAt: new Date() },
        })
        if (cita.sesion.googleCalendarEventId) {
          deleteSesionFromGoogle(cita.sesion.googleCalendarEventId).catch((gErr) => {
            fastify.log.error(gErr, 'Error al eliminar evento de sesión de Google Calendar')
          })
        }
      }

      return reply.send({ success: true, id })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al eliminar la cita de venta'
      return reply.status(400).send({ error: message })
    }
  })
}
