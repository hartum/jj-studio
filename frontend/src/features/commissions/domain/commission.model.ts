export interface ComisionConfig {
  id?: number
  paisId?: number | null
  paisNombre?: string
  hotelId?: number | null
  hotelNombre?: string
  impuestoPct?: number
  gerentePct: number
  supervisorPct: number
  fotografoAsalariadoPct: number
  fotografoSinSalarioPct: number
  vendedorAsalariadoPct: number
  vendedorSinSalarioPct: number
  activo?: boolean
}

export interface ComisionUsuarioConfig {
  id?: number
  usuarioId: string
  usuarioNombre?: string
  usuarioApellidos?: string
  usuarioEmail?: string
  rolCodigo?: string
  rolNombre?: string
  porcentajeComision: number
  impuestoPct: number
  activo?: boolean
}

export interface Comision {
  id: number
  citaVentaId: number
  hotelId: number
  hotelNombre?: string
  usuarioId: string
  usuarioNombre?: string
  usuarioApellidos?: string
  usuarioEmail?: string
  rolEnVenta: 'FOTOGRAFO' | 'VENDEDOR' | 'SUPERVISOR' | 'GERENTE' | string
  tipoContrato: 'ASALARIADO' | 'SIN_SALARIO' | string | null
  porcentajeAplicado: number
  baseCalculoUsd: number
  importeComisionUsd: number
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'RECHAZADA' | string
  fechaVenta: string
  clienteNombre?: string
  totalVentaUsd?: number
  impuestoMontoUsd?: number
  numeroMiscelaneo?: string | null
  createdAt?: string
}

export interface ResumenComisiones {
  mes?: number
  anio?: number
  fechaDesde?: string
  fechaHasta?: string
  totalComisionesUsd: number
  totalVentasUsd: number
  porRol: {
    rol: string
    totalUsd: number
    count: number
  }[]
  porUsuario: {
    usuarioId: string
    nombreCompleto: string
    rol: string
    tipoContrato: string
    totalUsd: number
    ventasCount: number
  }[]
  porHotel: {
    hotelId: number
    hotelNombre: string
    totalComisionesUsd: number
    totalVentasUsd: number
  }[]
}
