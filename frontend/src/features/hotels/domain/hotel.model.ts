export interface Hotel {
  id: number
  areaId: number
  areaNombre?: string
  paisId?: number
  paisNombre?: string
  paisCodigo?: string
  nombre: string
  direccion?: string
  estrellas?: number
  latitud?: number | null
  longitud?: number | null
  cadenaHotelera?: string
  personaContacto?: string
  email?: string
  telefono?: string
  metaMensualDefault?: number | null
  gcalConfigured?: boolean
  gcalCalendarId?: string
  gcalServiceAccountEmail?: string
  createdAt?: string
}

export interface CreateHotelPayload {
  areaId: number
  nombre: string
  direccion?: string
  estrellas?: number
  latitud?: number
  longitud?: number
  cadenaHotelera?: string
  personaContacto?: string
  email?: string
  telefono?: string
  metaMensualDefault?: number | null
  gcalCalendarId?: string
  gcalServiceAccountEmail?: string
  serviceAccountJson?: string
}

export type UpdateHotelPayload = Partial<CreateHotelPayload>

export interface GoogleCalendarConfigPayload {
  calendarId: string
  serviceAccountJson?: string
  clientEmail?: string
  privateKey?: string
}

export interface GoogleCalendarTestResult {
  success: boolean
  calendarId?: string
  calendarTitle?: string
  timeZone?: string
  error?: string
}
