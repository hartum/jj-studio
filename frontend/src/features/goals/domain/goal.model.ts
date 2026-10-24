export type AlcanceTipo = 'HOTEL' | 'USUARIO'

export type SemaforoEstado = 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_META'

export interface Meta {
  id: number
  alcanceTipo: AlcanceTipo
  hotelId: number
  hotelNombre?: string
  usuarioId?: string | null
  usuarioNombre?: string | null
  anio: number
  mes: number
  importeObjetivo: number
  importeBonus?: number | null
  valorBonus?: number | null
  sesionesObjetivo?: number | null
  ventasObjetivo?: number | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveMetaPayload {
  alcanceTipo?: AlcanceTipo
  hotelId: number
  usuarioId?: string | null
  anio: number
  mes: number
  importeObjetivo: number
  importeBonus?: number | null
  valorBonus?: number | null
  sesionesObjetivo?: number | null
  ventasObjetivo?: number | null
  activo?: boolean
}

export interface FotografoProgreso {
  usuarioId: string
  nombreCompleto: string
  email: string
  rolCodigo?: string
  metaImporte: number
  metaBonus?: number | null
  valorBonus?: number | null
  faltanteBonus?: number | null
  alcanzoBonus?: boolean
  esMetaPersonalizada: boolean
  ventasRealesUsd: number
  numVentas: number
  numSesiones: number
  porcentajeCumplimiento: number
  metaEsperadaHoy: number
  desviacionMonetaria: number
  semaforo: SemaforoEstado
}

export interface HotelProgresoResumen {
  hotelId: number
  hotelNombre: string
  areaId: number
  areaNombre: string
  paisNombre: string
  anio: number
  mes: number
  diasEnMes: number
  diaActual: number
  metaImporte: number
  esMetaConfigurada: boolean
  ventasRealesUsd: number
  numVentas: number
  numSesiones: number
  porcentajeCumplimiento: number
  metaEsperadaHoy: number
  desviacionMonetaria: number
  semaforo: SemaforoEstado
  faltanteBonoGrupal?: number
  alcanzoBonoGrupal?: boolean
  valorBonoGrupal?: number | null
  fotografos: FotografoProgreso[]
}

export interface PuntoDiaEvolucion {
  dia: number
  realDia: number
  realAcumulado: number
  objetivoAcumulado: number
}

export interface PuntoMesEvolucion {
  mes: number
  mesNombre: string
  realMes: number
  objetivoMes: number
  realAcumulado: number
  objetivoAcumulado: number
}

export interface EvolucionMetasResponse {
  hotelId?: number
  hotelNombre?: string
  anio: number
  mes: number
  evolucionMes: PuntoDiaEvolucion[]
  evolucionAnio: PuntoMesEvolucion[]
  totalesMes: {
    metaTotal: number
    realTotal: number
    porcentaje: number
    semaforo: SemaforoEstado
  }
  totalesAnio: {
    metaTotal: number
    realTotal: number
    porcentaje: number
    semaforo: SemaforoEstado
  }
}
