import { prisma } from '../../../shared/db.js'
import { decryptUser, decrypt } from '../../../shared/encryption.js'

export interface AuditParams {
  accion: 'LOGIN' | 'LOGOUT' | 'CREAR' | 'MODIFICAR' | 'ELIMINAR'
  entidad: 'USUARIO' | 'HOTEL' | 'AREA' | 'SESION' | 'CITA_VENTA' | 'COMISION' | 'META' | 'PAIS' | 'SISTEMA'
  entidadId?: string | number
  usuarioId: string
  usuarioNombre?: string
  usuarioRol?: string
  hotelId?: number
  hotelNombre?: string
  clienteNombre?: string
  descripcion: string
  contexto?: string
  creadorOriginal?: string
  metadatos?: Record<string, unknown> | string
  ipAddress?: string
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/**
 * Formatea una fecha y hora al estilo exacto: "27 Agosto 2026, Lunes a las 12:00"
 */
export function formatAuditDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const diaSemana = DIAS_SEMANA[d.getDay()]
  const diaMes = String(d.getDate()).padStart(2, '0')
  const mes = MESES[d.getMonth()]
  const anio = d.getFullYear()
  const horas = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')

  return `${diaMes} ${mes} ${anio}, ${diaSemana} a las ${horas}:${minutos}`
}

/**
 * Genera la cadena de creación original: "Fue creada por Juan el 27 Agosto 2026, Lunes a las 12:00"
 */
export function formatCreadorOriginal(creadorNombre: string, fechaCreacion: Date | string): string {
  const fechaStr = formatAuditDateTime(fechaCreacion)
  return `Fue creada por ${creadorNombre} el ${fechaStr}`
}

/**
 * Registra una entrada en el Audit Log de forma fire-and-forget.
 * No arroja excepciones para nunca bloquear las operaciones principales del sistema.
 */
export async function registrarAudit(params: AuditParams): Promise<void> {
  try {
    let finalUsuarioNombre = params.usuarioNombre
    let finalUsuarioRol = params.usuarioRol

    // Resolver datos del usuario si no fueron provistos directamente
    if ((!finalUsuarioNombre || !finalUsuarioRol) && params.usuarioId) {
      const rawUser = await prisma.usuario.findUnique({
        where: { id: params.usuarioId },
        include: { role: true },
      })
      if (rawUser) {
        const u = decryptUser(rawUser)
        if (u) {
          finalUsuarioNombre = `${u.nombre} ${u.apellidos}`.trim()
          finalUsuarioRol = u.role?.nombre || u.role?.codigo || 'Usuario'
        }
      }
    }

    if (!finalUsuarioNombre) {
      finalUsuarioNombre = 'Usuario del sistema'
    }
    if (!finalUsuarioRol) {
      finalUsuarioRol = 'Usuario'
    }

    // Resolver nombre del hotel si hay hotelId y no hotelNombre
    let finalHotelNombre = params.hotelNombre
    if (!finalHotelNombre && params.hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: params.hotelId },
        select: { nombre: true },
      })
      if (hotel) {
        finalHotelNombre = hotel.nombre
      }
    }

    // Desencriptar nombre de cliente si viniese encriptado
    let finalClienteNombre = params.clienteNombre
    if (finalClienteNombre) {
      finalClienteNombre = decrypt(finalClienteNombre) || finalClienteNombre
    }

    const metadatosStr =
      params.metadatos && typeof params.metadatos === 'object'
        ? JSON.stringify(params.metadatos)
        : (params.metadatos as string | undefined)

    await prisma.auditLog.create({
      data: {
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId !== undefined ? String(params.entidadId) : null,
        usuarioId: params.usuarioId,
        usuarioNombre: finalUsuarioNombre,
        usuarioRol: finalUsuarioRol,
        hotelId: params.hotelId || null,
        hotelNombre: finalHotelNombre || null,
        clienteNombre: finalClienteNombre || null,
        descripcion: params.descripcion,
        contexto: params.contexto || null,
        creadorOriginal: params.creadorOriginal || null,
        metadatos: metadatosStr || null,
        ipAddress: params.ipAddress || null,
      },
    })
  } catch (error) {
    console.error('Error al registrar entrada en AuditLog:', error)
  }
}
