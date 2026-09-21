export type EstadoSesion = 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW'
export type OrigenSesion = 'MANUAL' | 'BOT'

export interface SesionFotografica {
  id: number
  hotelId: number
  fotografoId?: string | null
  creadorId: string
  clienteNombre: string
  clienteEmail?: string | null
  clienteTelefono?: string | null
  numeroHabitacion?: string | null
  numAdultos?: number
  numNinos?: number
  fechaSalida?: string | null
  concepto?: string | null
  fechaHoraInicio: string // ISO string
  estado: EstadoSesion
  origen: OrigenSesion
  notas?: string | null
  googleCalendarEventId?: string | null
  citaVenta?: {
    id: number
    vendedorId?: string | null
    fechaHoraCita: string
    estado: string
    numFotosVendidas?: number | null
    totalVentaUsd?: number | null
  } | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateSesionPayload {
  hotelId: number
  fotografoId?: string | null
  creadorId?: string
  clienteNombre: string
  clienteEmail?: string | null
  clienteTelefono?: string | null
  numeroHabitacion?: string | null
  numAdultos?: number
  numNinos?: number
  fechaSalida?: string | null
  concepto?: string | null
  fechaHoraInicio: string
  estado?: EstadoSesion
  notas?: string | null
}
