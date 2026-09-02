export type RoleCode =
  | 'SUPERUSUARIO'
  | 'ADMIN'
  | 'GERENTE'
  | 'SUPERVISOR'
  | 'FOTOGRAFO'
  | 'AGENDADOR'
  | 'CONTABLE'

export interface RoleConfig {
  allowedNavRoutes: string[]
  visibleTargetRoles: RoleCode[]
  assignableTargetRoles: RoleCode[]
  canCreateUsers: boolean
  scopeType: 'GLOBAL' | 'AREAS' | 'HOTELS' | 'NONE'
}

export const PERMISSION_MATRIX: Record<RoleCode, RoleConfig> = {
  SUPERUSUARIO: {
    allowedNavRoutes: ['/inicio', '/configuracion', '/usuarios'],
    visibleTargetRoles: ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR', 'CONTABLE'],
    assignableTargetRoles: ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR', 'CONTABLE'],
    canCreateUsers: true,
    scopeType: 'GLOBAL',
  },
  ADMIN: {
    allowedNavRoutes: ['/inicio', '/configuracion', '/usuarios'],
    visibleTargetRoles: ['ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR', 'CONTABLE'],
    assignableTargetRoles: ['ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR', 'CONTABLE'],
    canCreateUsers: true,
    scopeType: 'GLOBAL',
  },
  GERENTE: {
    allowedNavRoutes: ['/inicio', '/agenda', '/ventas', '/usuarios', '/configuracion'],
    visibleTargetRoles: ['GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR'],
    assignableTargetRoles: ['SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR'],
    canCreateUsers: true,
    scopeType: 'AREAS',
  },
  SUPERVISOR: {
    allowedNavRoutes: ['/inicio', '/usuarios'],
    visibleTargetRoles: ['SUPERVISOR', 'FOTOGRAFO', 'AGENDADOR'],
    assignableTargetRoles: ['FOTOGRAFO', 'AGENDADOR'],
    canCreateUsers: true,
    scopeType: 'HOTELS',
  },
  FOTOGRAFO: {
    allowedNavRoutes: ['/inicio'],
    visibleTargetRoles: [],
    assignableTargetRoles: [],
    canCreateUsers: false,
    scopeType: 'HOTELS',
  },
  AGENDADOR: {
    allowedNavRoutes: ['/inicio'],
    visibleTargetRoles: [],
    assignableTargetRoles: [],
    canCreateUsers: false,
    scopeType: 'HOTELS',
  },
  CONTABLE: {
    allowedNavRoutes: ['/inicio', '/configuracion'],
    visibleTargetRoles: [],
    assignableTargetRoles: [],
    canCreateUsers: false,
    scopeType: 'GLOBAL',
  },
}

export function getRolePermissions(roleCode?: string): RoleConfig {
  const code = (roleCode?.toUpperCase() as RoleCode) || 'FOTOGRAFO'
  return PERMISSION_MATRIX[code] || PERMISSION_MATRIX.FOTOGRAFO
}

export function canEditUser(
  executorRoleCode: string | undefined,
  targetUserRoleCode: string | undefined,
  executorId: string | undefined,
  targetUserId: string | undefined,
): boolean {
  const execCode = executorRoleCode?.toUpperCase() as RoleCode
  const targetCode = targetUserRoleCode?.toUpperCase() as RoleCode
  const isSelf = executorId === targetUserId

  if (execCode === 'SUPERUSUARIO') return true
  if (execCode === 'ADMIN') return targetCode !== 'SUPERUSUARIO'
  if (execCode === 'GERENTE') {
    if (isSelf && targetCode === 'GERENTE') return true
    return targetCode === 'SUPERVISOR' || targetCode === 'FOTOGRAFO' || targetCode === 'AGENDADOR'
  }
  if (execCode === 'SUPERVISOR') {
    if (isSelf && targetCode === 'SUPERVISOR') return true
    return targetCode === 'FOTOGRAFO' || targetCode === 'AGENDADOR'
  }
  return false
}

export function canDeleteUser(
  executorRoleCode: string | undefined,
  targetUserRoleCode: string | undefined,
  executorId: string | undefined,
  targetUserId: string | undefined,
): boolean {
  if (executorId === targetUserId) return false // Cannot delete self
  return canEditUser(executorRoleCode, targetUserRoleCode, executorId, targetUserId)
}
