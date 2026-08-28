export type EstadoCitaVenta = 'PROGRAMADA' | 'COMPLETADA' | 'NO_SHOW' | 'CANCELADA'

export interface CitaVenta {
  id: number
  sesionId: number
  hotelId: number
  vendedorId?: string | null
  vendedorNombre?: string | null
  fechaHoraCita: string
  estado: EstadoCitaVenta
  numFotosVendidas?: number | null
  totalVentaUsd?: number | null
  notas?: string | null
  // Inherited from session join
  clienteNombre?: string
  clienteEmail?: string | null
  clienteTelefono?: string | null
  numeroHabitacion?: string | null
  fotografoId?: string | null
  numAdultos?: number
  numNinos?: number
  concepto?: string | null
  sesionFechaHoraInicio?: string
  hotelNombre?: string
  googleCalendarEventId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateCitaVentaPayload {
  sesionId: number
  hotelId: number
  vendedorId?: string | null
  fechaHoraCita: string
  estado?: EstadoCitaVenta
  numFotosVendidas?: number | null
  totalVentaUsd?: number | null
  notas?: string | null
}

export interface UpdateCitaVentaPayload {
  vendedorId?: string | null
  fechaHoraCita?: string
  estado?: EstadoCitaVenta
  numFotosVendidas?: number | null
  totalVentaUsd?: number | null
  notas?: string | null
}

export interface ConflictoCitaVenta {
  id: number
  fechaHoraCita: string
  clienteNombre: string
  numeroHabitacion?: string
}
