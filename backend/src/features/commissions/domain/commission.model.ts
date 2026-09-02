export interface ComisionConfigDTO {
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

export interface ComisionDTO {
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
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA' | string
  fechaVenta: string
  clienteNombre?: string
  numFotosVendidas?: number | null
  createdAt?: string
}

export interface ResumenComisionesDTO {
  mes: number
  anio: number
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
