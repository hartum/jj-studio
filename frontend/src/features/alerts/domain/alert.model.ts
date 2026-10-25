export type TipoCasoAlerta = 1 | 2 | 3 | 4

export type GravedadAlerta = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

export interface AlertaItem {
  id: number
  tipoCaso: TipoCasoAlerta
  titulo: string
  descripcion: string
  gravedad: GravedadAlerta
  usuarioOrigenId?: string | null
  usuarioOrigenNombre?: string | null
  usuarioOrigenRol?: string | null
  usuarioAfectadoId?: string | null
  usuarioAfectadoNombre?: string | null
  hotelId?: number | null
  hotelNombre?: string | null
  entidad?: string | null
  entidadId?: string | null
  metadatos?: Record<string, any> | null
  leida: boolean
  leidaAt?: string | null
  leidaPorId?: string | null
  createdAt: string
  fechaFormateada?: string
}

export interface AlertaListResponse {
  items: AlertaItem[]
  total: number
  unreadCount: number
  criticalCount?: number
  readCount?: number
  page: number
  limit: number
  totalPages: number
}

export interface AlertaFilters {
  page?: number
  limit?: number
  leida?: 'true' | 'false' | 'all'
  tipoCaso?: number | null
  hotelId?: number | null
  search?: string
}
