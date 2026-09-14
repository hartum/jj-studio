import type { Perfil } from './profile.model'

export type UserStatus = 'Activo' | 'Inactivo'
export type TipoContrato = 'ASALARIADO' | 'SIN_SALARIO'

export interface User {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  profileId: number
  status: UserStatus
  tipoContrato?: TipoContrato | string
  fechaContratacion?: string | null
  password?: string
  imagen?: string | null
  color?: string | null
  areaIds?: number[]
  hotelIds?: number[]
  createdAt: string
  deletedAt?: string | null
}

export type UserInput = Omit<User, 'id' | 'createdAt' | 'deletedAt'>

export interface UserWithProfile extends User {
  perfil?: Perfil
}

