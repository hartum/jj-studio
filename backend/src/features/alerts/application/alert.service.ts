import { prisma } from '../../../shared/db.js'
import { decryptUser, decrypt } from '../../../shared/encryption.js'
import { formatAuditDateTime } from '../../audit-log/application/audit-log.service.js'
import type { TipoCasoAlerta, GravedadAlerta } from '../domain/alert.model.js'

export interface RegistrarAlertaParams {
  tipoCaso: TipoCasoAlerta
  titulo: string
  descripcion: string
  gravedad?: GravedadAlerta
  usuarioOrigenId?: string | null
  usuarioOrigenNombre?: string | null
  usuarioOrigenRol?: string | null
  usuarioAfectadoId?: string | null
  usuarioAfectadoNombre?: string | null
  hotelId?: number | null
  hotelNombre?: string | null
  entidad?: string | null
  entidadId?: string | number | null
  metadatos?: Record<string, any> | string | null
  hashUnico?: string | null
}

/**
 * Registra una alerta de seguridad en la base de datos de manera segura.
 */
export async function registrarAlerta(params: RegistrarAlertaParams) {
  try {
    let finalUsuarioOrigenNombre = params.usuarioOrigenNombre
    let finalUsuarioOrigenRol = params.usuarioOrigenRol

    if ((!finalUsuarioOrigenNombre || !finalUsuarioOrigenRol) && params.usuarioOrigenId) {
      const uRaw = await prisma.usuario.findUnique({
        where: { id: params.usuarioOrigenId },
        include: { role: true },
      })
      if (uRaw) {
        const u = decryptUser(uRaw)
        if (u) {
          finalUsuarioOrigenNombre = `${u.nombre} ${u.apellidos}`.trim()
          finalUsuarioOrigenRol = u.role?.nombre || u.role?.codigo || 'Usuario'
        }
      }
    }

    let finalUsuarioAfectadoNombre = params.usuarioAfectadoNombre
    if (!finalUsuarioAfectadoNombre && params.usuarioAfectadoId) {
      const uRaw = await prisma.usuario.findUnique({
        where: { id: params.usuarioAfectadoId },
        include: { role: true },
      })
      if (uRaw) {
        const u = decryptUser(uRaw)
        if (u) {
          finalUsuarioAfectadoNombre = `${u.nombre} ${u.apellidos}`.trim()
        }
      }
    }

    let finalHotelNombre = params.hotelNombre
    if (!finalHotelNombre && params.hotelId) {
      const h = await prisma.hotel.findUnique({
        where: { id: params.hotelId },
        select: { nombre: true },
      })
      if (h) {
        finalHotelNombre = h.nombre
      }
    }

    const metadatosStr =
      params.metadatos && typeof params.metadatos === 'object'
        ? JSON.stringify(params.metadatos)
        : (params.metadatos as string | undefined)

    if (params.hashUnico) {
      const existing = await prisma.alertaSeguridad.findUnique({
        where: { hashUnico: params.hashUnico },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.alertaSeguridad.create({
      data: {
        tipoCaso: params.tipoCaso,
        titulo: params.titulo,
        descripcion: params.descripcion,
        gravedad: params.gravedad || 'ALTA',
        usuarioOrigenId: params.usuarioOrigenId || null,
        usuarioOrigenNombre: finalUsuarioOrigenNombre || null,
        usuarioOrigenRol: finalUsuarioOrigenRol || null,
        usuarioAfectadoId: params.usuarioAfectadoId || null,
        usuarioAfectadoNombre: finalUsuarioAfectadoNombre || null,
        hotelId: params.hotelId || null,
        hotelNombre: finalHotelNombre || null,
        entidad: params.entidad || null,
        entidadId: params.entidadId !== undefined && params.entidadId !== null ? String(params.entidadId) : null,
        metadatos: metadatosStr || null,
        hashUnico: params.hashUnico || null,
      },
    })
  } catch (error) {
    console.error('Error al registrar alerta de seguridad:', error)
    return null
  }
}

/**
 * CASO 1:
 * Evalúa fotógrafos con 3 o más sesiones realizadas (COMPLETADAS) que NO tengan cita de venta
 * o cuya cita de venta esté en estado 'NO_SHOW' o 'CANCELADA' en un lapso de menos de 1 mes (30 días).
 */
export async function evaluarCaso1SesionesSospechosas(fotografoIdFiltro?: string) {
  try {
    // Acotar búsqueda a los últimos 60 días para optimizar lectura y no recorrer histórico innecesario
    const sesentaDiasAtras = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const where: any = {
      estado: 'COMPLETADA',
      deletedAt: null,
      fotografoId: { not: null },
      fechaHoraInicio: { gte: sesentaDiasAtras },
    }

    if (fotografoIdFiltro) {
      where.fotografoId = fotografoIdFiltro
    }

    // Buscamos sesiones completadas con su cita de venta y fotógrafo
    const sesiones = await prisma.sesionFotografica.findMany({
      where,
      include: {
        citaVenta: true,
        fotografo: { include: { role: true } },
        hotel: true,
      },
      orderBy: { fechaHoraInicio: 'asc' },
    })

    // Filtramos las anómalas: no tienen cita de ventas O su cita es NO_SHOW / CANCELADA
    const sesionesAnomalas = sesiones.filter((s) => {
      if (!s.citaVenta) return true
      return ['NO_SHOW', 'CANCELADA'].includes(s.citaVenta.estado)
    })

    // Agrupamos por fotógrafo
    const porFotografo = new Map<string, typeof sesionesAnomalas>()
    for (const s of sesionesAnomalas) {
      if (!s.fotografoId) continue
      const list = porFotografo.get(s.fotografoId) || []
      list.push(s)
      porFotografo.set(s.fotografoId, list)
    }

    const unMesMs = 30 * 24 * 60 * 60 * 1000

    for (const [fotografoId, list] of porFotografo.entries()) {
      if (list.length < 3) continue

      // Deslizamos una ventana de 30 días para buscar acumulaciones de 3 o más
      for (let i = 0; i < list.length; i++) {
        const ventanaInicio = new Date(list[i].fechaHoraInicio).getTime()
        const grupo = list.filter((s) => {
          const t = new Date(s.fechaHoraInicio).getTime()
          return t >= ventanaInicio && t <= ventanaInicio + unMesMs
        })

        if (grupo.length >= 3) {
          const primerSesion = grupo[0]
          const ultimaSesion = grupo[grupo.length - 1]
          const hashUnico = `caso1_${fotografoId}_${primerSesion.id}_${ultimaSesion.id}_cnt${grupo.length}`

          const fotografoUser = primerSesion.fotografo ? decryptUser(primerSesion.fotografo) : null
          const fotografoNombre = fotografoUser
            ? `${fotografoUser.nombre} ${fotografoUser.apellidos}`.trim()
            : 'Fotógrafo'

          const hotelesSet = new Set(grupo.map((s) => s.hotel.nombre))
          const hotelesNombres = Array.from(hotelesSet).join(', ')
          const primerHotelId = primerSesion.hotelId

          const detalleSesiones = grupo.map((s) => ({
            sesionId: s.id,
            fechaHoraInicio: s.fechaHoraInicio.toISOString(),
            clienteNombre: decrypt(s.clienteNombre) || 'Cliente sin nombre',
            numeroHabitacion: s.numeroHabitacion,
            hotel: s.hotel.nombre,
            citaVentaEstado: s.citaVenta ? s.citaVenta.estado : 'SIN_CITA_DE_VENTAS',
          }))

          const fechaInicioStr = formatAuditDateTime(primerSesion.fechaHoraInicio)
          const fechaFinStr = formatAuditDateTime(ultimaSesion.fechaHoraInicio)

          await registrarAlerta({
            tipoCaso: 1,
            titulo: `Posible venta externa: 3 o más sesiones sin venta registrada`,
            descripcion: `El fotógrafo ${fotografoNombre} acumula ${grupo.length} sesiones realizadas sin ventas registradas (sin cita o con cita No-Show / Cancelada) entre el ${fechaInicioStr} y el ${fechaFinStr} en: ${hotelesNombres}.`,
            gravedad: 'ALTA',
            usuarioOrigenId: fotografoId,
            usuarioOrigenNombre: fotografoNombre,
            usuarioOrigenRol: 'Fotógrafo',
            usuarioAfectadoNombre: `Hotel/Estudio: ${hotelesNombres}`,
            hotelId: primerHotelId,
            hotelNombre: hotelesNombres,
            entidad: 'SESION',
            entidadId: String(primerSesion.id),
            metadatos: {
              fotografoId,
              fotografoNombre,
              totalCasos: grupo.length,
              hoteles: hotelesNombres,
              sesiones: detalleSesiones,
            },
            hashUnico,
          })
          break
        }
      }
    }
  } catch (error) {
    console.error('Error al evaluar Caso 1 de alertas de seguridad:', error)
  }
}
