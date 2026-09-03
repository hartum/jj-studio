export interface AuditLogEntry {
  id: number
  accion: 'LOGIN' | 'LOGOUT' | 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | string
  entidad: 'USUARIO' | 'HOTEL' | 'AREA' | 'SESION' | 'CITA_VENTA' | 'COMISION' | 'META' | 'PAIS' | string
  entidadId?: string | null
  usuarioId: string
  usuarioNombre: string
  usuarioRol: string
  hotelId?: number | null
  hotelNombre?: string | null
  clienteNombre?: string | null
  descripcion: string
  contexto?: string | null
  creadorOriginal?: string | null
  metadatos?: Record<string, unknown> | string | null
  ipAddress?: string | null
  createdAt: string
  fechaFormateada: string
}

export interface AuditLogFilters {
  hotelId?: number | null
  usuarioId?: string | null
  clienteNombre?: string
  fechaRango?: [Date, Date] | [string, string] | null
  accion?: string
  entidad?: string
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}
