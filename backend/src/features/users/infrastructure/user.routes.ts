import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/db.js'
import { encrypt, blindIndex, decryptUser, decryptUsers } from '../../../shared/encryption.js'
import { sendPasswordResetEmail } from '../../../shared/email.service.js'
import {
  getRolePermissions,
  canEditUser,
  canDeleteUser,
  type RoleCode,
} from '../../../shared/permissions.js'
import {
  registrarAudit,
  formatAuditDateTime,
} from '../../audit-log/application/audit-log.service.js'

async function getAuthUser(request: any) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const decoded = request.server.jwt.decode(token) as { id: string } | null
    if (!decoded || !decoded.id) return null

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      include: {
        role: true,
        areasAsignadas: true,
        hotelesAsignados: true,
        colorAsignado: true,
      },
    })

    return decryptUser(user)
  } catch {
    return null
  }
}

export async function userRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email?: string; password?: string }

      if (!email || !password) {
        return reply.status(400).send({ error: 'Debes proporcionar correo y contraseña' })
      }

      const normalizedEmail = email.trim()
      const searchHash = blindIndex(normalizedEmail)

      const rawUser = await prisma.usuario.findFirst({
        where: {
          OR: [...(searchHash ? [{ emailHash: searchHash }] : []), { email: normalizedEmail }],
        },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
          colorAsignado: true,
        },
      })

      if (!rawUser || rawUser.deletedAt !== null) {
        return reply.status(401).send({ error: 'Credenciales incorrectas o usuario no encontrado' })
      }

      if (!rawUser.activo) {
        return reply.status(401).send({ error: 'El usuario se encuentra inactivo' })
      }

      let isMatch = false
      if (rawUser.passwordHash) {
        if (rawUser.passwordHash.startsWith('$2a$') || rawUser.passwordHash.startsWith('$2b$')) {
          isMatch = await bcrypt.compare(password, rawUser.passwordHash)
        } else {
          isMatch = rawUser.passwordHash === password
        }
      }

      if (!isMatch) {
        return reply.status(401).send({ error: 'Credenciales incorrectas' })
      }

      const user = decryptUser(rawUser)!

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role.codigo,
      })

      registrarAudit({
        accion: 'LOGIN',
        entidad: 'USUARIO',
        entidadId: user.id,
        usuarioId: user.id,
        usuarioNombre: `${user.nombre} ${user.apellidos}`.trim(),
        usuarioRol: user.role.nombre,
        descripcion: 'inició sesión en el sistema',
        ipAddress: request.ip,
      })

      return reply.send({
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellidos: user.apellidos,
          email: user.email,
          telefono: user.telefono || '',
          profileId: user.roleId,
          roleCode: user.role.codigo,
          roleName: user.role.nombre,
          tipoContrato: user.tipoContrato || 'ASALARIADO',
          imagen: user.imagen || null,
          color: user.colorAsignado?.color || null,
          areaIds: user.areasAsignadas.map((a: any) => a.areaId),
          hotelIds: user.hotelesAsignados.map((h: any) => h.hotelId),
          permisos: getRolePermissions(user.role.codigo as RoleCode),
        },
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error en el inicio de sesión'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/auth/logout (Registrar cierre de sesión)
  fastify.post('/api/auth/logout', async (request, reply) => {
    try {
      const authUser = await getAuthUser(request)
      if (authUser) {
        registrarAudit({
          accion: 'LOGOUT',
          entidad: 'USUARIO',
          entidadId: authUser.id,
          usuarioId: authUser.id,
          usuarioNombre: `${authUser.nombre} ${authUser.apellidos}`.trim(),
          usuarioRol: authUser.role.nombre,
          descripcion: 'cerró sesión en el sistema',
          ipAddress: request.ip,
        })
      }
      return reply.send({ success: true })
    } catch {
      return reply.send({ success: true })
    }
  })

  // POST /api/auth/forgot-password (Solicita restablecimiento de contraseña)
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body as { email?: string }

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return reply.status(400).send({ error: 'Debes proporcionar un correo electrónico válido' })
      }

      const normalizedEmail = email.trim()
      const searchHash = blindIndex(normalizedEmail)

      const rawUser = await prisma.usuario.findFirst({
        where: {
          OR: [...(searchHash ? [{ emailHash: searchHash }] : []), { email: normalizedEmail }],
          deletedAt: null,
        },
      })

      if (rawUser && rawUser.activo) {
        const user = decryptUser(rawUser)!
        const rawToken = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos de validez

        // Eliminar tokens previos del usuario
        await prisma.passwordResetToken.deleteMany({
          where: { usuarioId: user.id },
        })

        // Guardar token hasheado
        await prisma.passwordResetToken.create({
          data: {
            usuarioId: user.id,
            tokenHash,
            expiresAt,
          },
        })

        // Enviar correo electrónico
        await sendPasswordResetEmail({
          toEmail: user.email,
          nombre: user.nombre,
          resetToken: rawToken,
        })
      }

      // Respuesta neutral estándar de seguridad para prevenir enumeración de usuarios
      return reply.send({
        message:
          'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.',
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al procesar la solicitud de recuperación' })
    }
  })

  // GET /api/auth/verify-reset-token (Verifica la validez de un token antes de mostrar formulario)
  fastify.get('/api/auth/verify-reset-token', async (request, reply) => {
    try {
      const { token } = request.query as { token?: string }

      if (!token || typeof token !== 'string') {
        return reply.status(400).send({ valid: false, error: 'Token no proporcionado' })
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { usuario: true },
      })

      if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < new Date()) {
        return reply.status(400).send({
          valid: false,
          error:
            'El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.',
        })
      }

      const user = decryptUser(resetToken.usuario)!
      return reply.send({
        valid: true,
        email: user.email,
        nombre: user.nombre,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ valid: false, error: 'Error al verificar el token' })
    }
  })

  // POST /api/auth/reset-password (Establece la nueva contraseña usando el token)
  fastify.post('/api/auth/reset-password', async (request, reply) => {
    try {
      const { token, password } = request.body as { token?: string; password?: string }

      if (!token || !password) {
        return reply
          .status(400)
          .send({ error: 'Debes proporcionar el token y la nueva contraseña' })
      }

      if (password.length < 6) {
        return reply.status(400).send({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      })

      if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < new Date()) {
        return reply.status(400).send({
          error:
            'El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.',
        })
      }

      const newPasswordHash = await bcrypt.hash(password, 10)

      // Actualizar contraseña del usuario e invalidar token en una transacción
      await prisma.$transaction([
        prisma.usuario.update({
          where: { id: resetToken.usuarioId },
          data: { passwordHash: newPasswordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ])

      return reply.send({
        message:
          '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.',
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'Error al restablecer la contraseña' })
    }
  })

  // GET /api/roles
  fastify.get('/api/roles', async (_request, reply) => {
    try {
      const roles = await prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })

      const severityMap: Record<string, 'primary' | 'danger' | 'warning' | 'info' | 'success'> = {
        SUPERUSUARIO: 'primary',
        ADMIN: 'danger',
        GERENTE: 'danger',
        SUPERVISOR: 'warning',
        FOTOGRAFO: 'success',
        AGENDADOR: 'primary',
        CONTABLE: 'info',
      }

      const mapped = roles.map((r) => ({
        id: r.id,
        code: r.codigo,
        name: r.nombre,
        description: r.descripcion,
        severity: severityMap[r.codigo] ?? 'info',
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
      }))

      return reply.send(mapped)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener roles' })
    }
  })

  // GET /api/usuarios
  fastify.get('/api/usuarios', async (request, reply) => {
    try {
      const executor = await getAuthUser(request)
      const roleCode = executor?.role.codigo.toUpperCase() as RoleCode | undefined
      const perm = getRolePermissions(roleCode)

      const rawUsuarios = await prisma.usuario.findMany({
        where: { deletedAt: null },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
          colorAsignado: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const usuarios = decryptUsers(rawUsuarios)

      let filtered = usuarios

      if (executor) {
        filtered = usuarios.filter((u) => {
          const targetRoleCode = u.role.codigo.toUpperCase() as RoleCode
          if (!perm.visibleTargetRoles.includes(targetRoleCode)) return false
          if (perm.scopeType === 'GLOBAL') return true

          if (perm.scopeType === 'AREAS') {
            const myAreaIds = new Set(executor.areasAsignadas.map((a: any) => a.areaId))
            if (u.id === executor.id) return true
            if (u.areasAsignadas.some((a: any) => myAreaIds.has(a.areaId))) return true
            return true
          }

          if (perm.scopeType === 'HOTELS') {
            const myHotelIds = new Set(executor.hotelesAsignados.map((h: any) => h.hotelId))
            if (u.id === executor.id) return true
            if (u.hotelesAsignados.some((h: any) => myHotelIds.has(h.hotelId))) return true
            return false
          }

          return false
        })
      }

      const mapped = filtered.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        email: u.email,
        telefono: u.telefono || '',
        profileId: u.roleId,
        status: u.activo ? 'Activo' : 'Inactivo',
        tipoContrato: u.tipoContrato || 'ASALARIADO',
        imagen: u.imagen || null,
        color: u.colorAsignado?.color || null,
        areaIds: u.areasAsignadas.map((a: any) => a.areaId),
        hotelIds: u.hotelesAsignados.map((h: any) => h.hotelId),
        createdAt: u.createdAt.toISOString().split('T')[0],
        deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
      }))

      return reply.send(mapped)
    } catch (err: any) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Error al obtener usuarios' })
    }
  })

  // POST /api/usuarios
  fastify.post('/api/usuarios', async (request, reply) => {
    try {
      const body = request.body as {
        nombre: string
        apellidos: string
        email: string
        telefono?: string
        password?: string
        profileId: number | string
        status?: string
        tipoContrato?: string
        imagen?: string | null
        color?: string | null
        areaIds?: number[]
        hotelIds?: number[]
      }

      if (!body.nombre || !body.email || body.profileId === undefined) {
        return reply
          .status(400)
          .send({ error: 'Faltan campos obligatorios (nombre, email, profileId)' })
      }

      const executor = await getAuthUser(request)
      if (executor) {
        const execRoleCode = executor.role.codigo.toUpperCase() as RoleCode
        const perm = getRolePermissions(execRoleCode)
        const targetRole = await prisma.role.findUnique({
          where: { id: Number(body.profileId) },
        })
        const targetRoleCode = targetRole?.codigo.toUpperCase() as RoleCode

        if (!perm.assignableTargetRoles.includes(targetRoleCode)) {
          return reply.status(403).send({
            error: `No tienes permisos para dar de alta usuarios con el perfil ${targetRole?.nombre || targetRoleCode}`,
          })
        }
      }

      const normalizedEmail = body.email.trim()
      const emailHash = blindIndex(normalizedEmail)

      const existingUser = await prisma.usuario.findFirst({
        where: {
          OR: [...(emailHash ? [{ emailHash }] : []), { email: normalizedEmail }],
        },
      })

      if (existingUser) {
        return reply.status(400).send({
          error: 'El correo electrónico ya se encuentra registrado por otro usuario',
        })
      }

      let passwordHash: string | null = null
      if (body.password && body.password.trim() !== '') {
        passwordHash = await bcrypt.hash(body.password, 10)
      }

      const areaIds = Array.isArray(body.areaIds) ? body.areaIds.map(Number) : []
      const hotelIds = Array.isArray(body.hotelIds) ? body.hotelIds.map(Number) : []

      const targetRole = await prisma.role.findUnique({
        where: { id: Number(body.profileId) },
      })

      if (targetRole?.codigo === 'GERENTE' && areaIds.length > 0) {
        const conflict = await prisma.usuarioArea.findFirst({
          where: {
            areaId: { in: areaIds },
            usuario: {
              role: { codigo: 'GERENTE' },
              deletedAt: null,
            },
          },
          include: { area: true, usuario: true },
        })
        if (conflict) {
          const conflictUser = decryptUser(conflict.usuario)
          return reply.status(400).send({
            error: `El área "${conflict.area.nombre}" ya está asignada al gerente ${conflictUser?.nombre} ${conflictUser?.apellidos}`,
          })
        }
      }

      if (targetRole?.codigo === 'SUPERVISOR' && hotelIds.length > 0) {
        const conflict = await prisma.usuarioHotel.findFirst({
          where: {
            hotelId: { in: hotelIds },
            usuario: {
              role: { codigo: 'SUPERVISOR' },
              deletedAt: null,
            },
          },
          include: { hotel: true, usuario: true },
        })
        if (conflict) {
          const conflictUser = decryptUser(conflict.usuario)
          return reply.status(400).send({
            error: `El hotel "${conflict.hotel.nombre}" ya está asignado al supervisor ${conflictUser?.nombre} ${conflictUser?.apellidos}`,
          })
        }
      }

      const nuevo = await prisma.usuario.create({
        data: {
          nombre: encrypt(body.nombre.trim()) || '',
          apellidos: encrypt(body.apellidos ? body.apellidos.trim() : '') || '',
          email: encrypt(normalizedEmail) || '',
          emailHash,
          telefono: body.telefono ? encrypt(body.telefono.trim()) : null,
          passwordHash,
          imagen: body.imagen || null,
          roleId: Number(body.profileId),
          tipoContrato: body.tipoContrato === 'SIN_SALARIO' ? 'SIN_SALARIO' : 'ASALARIADO',
          activo: body.status !== 'Inactivo',
          ...(areaIds.length > 0 && {
            areasAsignadas: {
              create: areaIds.map((areaId) => ({ areaId })),
            },
          }),
          ...(hotelIds.length > 0 && {
            hotelesAsignados: {
              create: hotelIds.map((hotelId) => ({ hotelId })),
            },
          }),
        },
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
        },
      })

      if (body.color) {
        await prisma.usuarioColor.create({
          data: {
            usuarioId: nuevo.id,
            color: body.color,
          },
        })
      }

      const decryptedNuevo = decryptUser(nuevo)!

      const creator = await getAuthUser(request)
      if (creator) {
        registrarAudit({
          accion: 'CREAR',
          entidad: 'USUARIO',
          entidadId: decryptedNuevo.id,
          usuarioId: creator.id,
          usuarioNombre: `${creator.nombre} ${creator.apellidos}`.trim(),
          usuarioRol: creator.role.nombre,
          descripcion: `creó al usuario ${decryptedNuevo.nombre} ${decryptedNuevo.apellidos}`,
          contexto: `Rol asignado: ${targetRole?.nombre || targetRole?.codigo}. Estado: ${decryptedNuevo.activo ? 'Activo' : 'Inactivo'}`,
          ipAddress: request.ip,
          metadatos: {
            email: decryptedNuevo.email,
            tipoContrato: decryptedNuevo.tipoContrato,
          },
        })
      }

      return reply.status(201).send({
        id: decryptedNuevo.id,
        nombre: decryptedNuevo.nombre,
        apellidos: decryptedNuevo.apellidos,
        email: decryptedNuevo.email,
        telefono: decryptedNuevo.telefono || '',
        profileId: decryptedNuevo.roleId,
        status: decryptedNuevo.activo ? 'Activo' : 'Inactivo',
        tipoContrato: decryptedNuevo.tipoContrato,
        imagen: decryptedNuevo.imagen || null,
        color: body.color || null,
        areaIds: decryptedNuevo.areasAsignadas.map((a: any) => a.areaId),
        hotelIds: decryptedNuevo.hotelesAsignados.map((h: any) => h.hotelId),
        createdAt: decryptedNuevo.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      if (
        err.code === 'P2002' ||
        err.message?.includes('usuarios_email_key') ||
        err.message?.includes('email_hash')
      ) {
        return reply.status(400).send({
          error: 'El correo electrónico ya se encuentra registrado por otro usuario',
        })
      }
      return reply.status(400).send({ error: err.message || 'Error al crear el usuario en MySQL' })
    }
  })

  // PUT /api/usuarios/:id
  fastify.put('/api/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as {
        nombre?: string
        apellidos?: string
        email?: string
        telefono?: string
        password?: string
        profileId?: number | string
        status?: string
        tipoContrato?: string
        imagen?: string | null
        color?: string | null
        areaIds?: number[]
        hotelIds?: number[]
      }

      const executor = await getAuthUser(request)
      const currentUserRaw = await prisma.usuario.findUnique({
        where: { id },
        include: { role: true },
      })

      if (!currentUserRaw) {
        return reply.status(404).send({ error: 'Usuario no encontrado' })
      }

      const currentUser = decryptUser(currentUserRaw)!

      if (executor) {
        const isAllowed = canEditUser(
          executor.role.codigo,
          currentUser.role.codigo,
          executor.id,
          currentUser.id,
        )
        if (!isAllowed) {
          return reply.status(403).send({
            error: 'No tienes permisos para modificar a este usuario',
          })
        }
      }

      let emailHash: string | undefined = undefined
      if (body.email) {
        const normalizedEmail = body.email.trim()
        emailHash = blindIndex(normalizedEmail) || undefined

        const existingUser = await prisma.usuario.findFirst({
          where: {
            OR: [...(emailHash ? [{ emailHash }] : []), { email: normalizedEmail }],
          },
        })
        if (existingUser && existingUser.id !== id) {
          return reply.status(400).send({
            error: 'El correo electrónico ya se encuentra registrado por otro usuario',
          })
        }
      }

      let passwordHash: string | undefined = undefined
      if (body.password && body.password.trim() !== '') {
        passwordHash = await bcrypt.hash(body.password, 10)
      }

      const targetRoleId =
        body.profileId !== undefined ? Number(body.profileId) : currentUser?.roleId
      const targetRole = targetRoleId
        ? await prisma.role.findUnique({ where: { id: targetRoleId } })
        : currentUser?.role

      if (body.areaIds !== undefined) {
        const newAreaIds = Array.isArray(body.areaIds) ? body.areaIds.map(Number) : []
        if (targetRole?.codigo === 'GERENTE' && newAreaIds.length > 0) {
          const conflict = await prisma.usuarioArea.findFirst({
            where: {
              areaId: { in: newAreaIds },
              usuarioId: { not: id },
              usuario: {
                role: { codigo: 'GERENTE' },
                deletedAt: null,
              },
            },
            include: { area: true, usuario: true },
          })
          if (conflict) {
            const conflictUser = decryptUser(conflict.usuario)
            return reply.status(400).send({
              error: `El área "${conflict.area.nombre}" ya está asignada al gerente ${conflictUser?.nombre} ${conflictUser?.apellidos}`,
            })
          }
        }

        await prisma.usuarioArea.deleteMany({ where: { usuarioId: id } })
        if (newAreaIds.length > 0) {
          await prisma.usuarioArea.createMany({
            data: newAreaIds.map((areaId) => ({ usuarioId: id, areaId })),
          })
        }
      }

      if (body.hotelIds !== undefined) {
        const newHotelIds = Array.isArray(body.hotelIds) ? body.hotelIds.map(Number) : []
        if (targetRole?.codigo === 'SUPERVISOR' && newHotelIds.length > 0) {
          const conflict = await prisma.usuarioHotel.findFirst({
            where: {
              hotelId: { in: newHotelIds },
              usuarioId: { not: id },
              usuario: {
                role: { codigo: 'SUPERVISOR' },
                deletedAt: null,
              },
            },
            include: { hotel: true, usuario: true },
          })
          if (conflict) {
            const conflictUser = decryptUser(conflict.usuario)
            return reply.status(400).send({
              error: `El hotel "${conflict.hotel.nombre}" ya está asignado al supervisor ${conflictUser?.nombre} ${conflictUser?.apellidos}`,
            })
          }
        }

        await prisma.usuarioHotel.deleteMany({ where: { usuarioId: id } })
        if (newHotelIds.length > 0) {
          await prisma.usuarioHotel.createMany({
            data: newHotelIds.map((hotelId) => ({ usuarioId: id, hotelId })),
          })
        }
      }

      if (body.color !== undefined) {
        if (body.color) {
          await prisma.usuarioColor.upsert({
            where: { usuarioId: id },
            update: { color: body.color },
            create: { usuarioId: id, color: body.color },
          })
        } else {
          await prisma.usuarioColor.deleteMany({
            where: { usuarioId: id },
          })
        }
      }

      const dataToUpdate: any = {
        ...(body.nombre && { nombre: encrypt(body.nombre.trim()) }),
        ...(body.apellidos !== undefined && { apellidos: encrypt(body.apellidos.trim()) }),
        ...(body.email && { email: encrypt(body.email.trim()), emailHash }),
        ...(body.telefono !== undefined && {
          telefono: body.telefono ? encrypt(body.telefono.trim()) : null,
        }),
        ...(passwordHash && { passwordHash }),
        ...(body.imagen !== undefined && { imagen: body.imagen }),
        ...(body.profileId !== undefined && { roleId: Number(body.profileId) }),
        ...(body.tipoContrato !== undefined && { tipoContrato: body.tipoContrato }),
        ...(body.status !== undefined && { activo: body.status === 'Activo' }),
      }

      const actualizadoRaw = await prisma.usuario.update({
        where: { id },
        data: dataToUpdate,
        include: {
          role: true,
          areasAsignadas: true,
          hotelesAsignados: true,
          colorAsignado: true,
        },
      })

      const actualizado = decryptUser(actualizadoRaw)!

      if (executor) {
        const fechaCreacionStr = formatAuditDateTime(currentUserRaw.createdAt)
        const creadorOriginal = `Fue creado el ${fechaCreacionStr}`
        registrarAudit({
          accion: 'MODIFICAR',
          entidad: 'USUARIO',
          entidadId: actualizado.id,
          usuarioId: executor.id,
          usuarioNombre: `${executor.nombre} ${executor.apellidos}`.trim(),
          usuarioRol: executor.role.nombre,
          descripcion: `modificó los datos del usuario ${actualizado.nombre} ${actualizado.apellidos}`,
          contexto: `Rol: ${actualizado.role?.nombre || 'Usuario'}. Estado: ${actualizado.activo ? 'Activo' : 'Inactivo'}`,
          creadorOriginal,
          ipAddress: request.ip,
        })
      }

      return reply.send({
        id: actualizado.id,
        nombre: actualizado.nombre,
        apellidos: actualizado.apellidos,
        email: actualizado.email,
        telefono: actualizado.telefono || '',
        profileId: actualizado.roleId,
        status: actualizado.activo ? 'Activo' : 'Inactivo',
        tipoContrato: actualizado.tipoContrato,
        imagen: actualizado.imagen || null,
        color: actualizado.colorAsignado?.color || null,
        areaIds: actualizado.areasAsignadas.map((a: any) => a.areaId),
        hotelIds: actualizado.hotelesAsignados.map((h: any) => h.hotelId),
        createdAt: actualizado.createdAt.toISOString().split('T')[0],
      })
    } catch (err: any) {
      fastify.log.error(err)
      if (
        err.code === 'P2002' ||
        err.message?.includes('usuarios_email_key') ||
        err.message?.includes('email_hash')
      ) {
        return reply.status(400).send({
          error: 'El correo electrónico ya se encuentra registrado por otro usuario',
        })
      }
      return reply
        .status(400)
        .send({ error: err.message || 'Error al actualizar el usuario en MySQL' })
    }
  })

  // PUT /api/usuarios/:id/color
  fastify.put('/api/usuarios/:id/color', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { color } = request.body as { color?: string | null }

      const executor = await getAuthUser(request)
      if (!executor) {
        return reply.status(401).send({ error: 'No autorizado' })
      }

      const roleCode = executor.role.codigo.toUpperCase()
      const isSelf = executor.id === id
      const isAllowedRole = ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR'].includes(roleCode)

      if (!isSelf && !isAllowedRole) {
        return reply
          .status(403)
          .send({ error: 'No tienes permisos para cambiar el color de este usuario' })
      }

      let updatedColor: string | null = null

      if (color) {
        const res = await prisma.usuarioColor.upsert({
          where: { usuarioId: id },
          update: { color },
          create: { usuarioId: id, color },
        })
        updatedColor = res.color
      } else {
        await prisma.usuarioColor.deleteMany({
          where: { usuarioId: id },
        })
      }

      return reply.send({ success: true, id, color: updatedColor })
    } catch (err: any) {
      fastify.log.error(err)
      return reply
        .status(500)
        .send({ error: err.message || 'Error al actualizar el color del usuario' })
    }
  })

  // DELETE /api/usuarios/:id (Soft delete)
  fastify.delete('/api/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const executor = await getAuthUser(request)

      const targetUser = await prisma.usuario.findUnique({
        where: { id },
        include: { role: true },
      })

      if (executor && targetUser) {
        const isAllowed = canDeleteUser(
          executor.role.codigo,
          targetUser.role.codigo,
          executor.id,
          targetUser.id,
        )
        if (!isAllowed) {
          return reply.status(403).send({
            error: 'No tienes permisos para eliminar a este usuario',
          })
        }
      }

      await prisma.usuario.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      const targetDecrypted = targetUser ? decryptUser(targetUser) : null
      if (executor && targetDecrypted) {
        registrarAudit({
          accion: 'ELIMINAR',
          entidad: 'USUARIO',
          entidadId: id,
          usuarioId: executor.id,
          usuarioNombre: `${executor.nombre} ${executor.apellidos}`.trim(),
          usuarioRol: executor.role.nombre,
          descripcion: `eliminó al usuario ${targetDecrypted.nombre} ${targetDecrypted.apellidos}`,
          contexto: `Rol que tenía: ${targetUser?.role?.nombre || 'Usuario'}`,
          ipAddress: request.ip,
        })
      }

      return reply.send({ success: true, id })
    } catch (err: any) {
      fastify.log.error(err)
      return reply
        .status(400)
        .send({ error: err.message || 'Error al eliminar el usuario en MySQL' })
    }
  })
}
