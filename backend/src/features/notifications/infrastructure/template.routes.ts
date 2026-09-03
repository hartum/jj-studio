import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/db.js'
import { decryptUser } from '../../../shared/encryption.js'
import {
  DEFAULT_TEMPLATES,
  AVAILABLE_VARIABLES,
} from './default-templates.js'
import {
  getTemplate,
  resolveVariables,
  processAllReminders,
} from '../application/reminder.service.js'

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
      },
    })

    return decryptUser(user)
  } catch {
    return null
  }
}

const ALLOWED_ROLES = ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR']

const SAMPLE_MOCK_DATA: Record<string, string> = {
  '[nombre_cliente]': 'Alejandro Martínez',
  '[email_cliente]': 'alejandro.martinez@ejemplo.com',
  '[telefono_cliente]': '+52 998 123 4567',
  '[numero_habitacion]': 'Suite 1204',
  '[num_adultos]': '2',
  '[num_ninos]': '1',
  '[concepto]': 'Sesión Familiar al Atardecer',
  '[fecha_sesion]': 'Miércoles, 2 de Septiembre de 2026',
  '[hora_sesion]': '17:30',
  '[fotografo_nombre]': 'Carlos Méndez',
  '[fecha_cita_venta]': 'Jueves, 3 de Septiembre de 2026',
  '[hora_cita_venta]': '11:00',
  '[vendedor_nombre]': 'María Fernanda López',
  '[hotel_nombre]': 'Grand Palladium Costa Mujeres Resort & Spa',
  '[hotel_direccion]': 'Vialidad Paseo Mujeres Mz 1, Lt 10, Sm 3, Cancún',
  '[hotel_cadena]': 'Palladium Hotel Group',
  '[notas]': 'Favor de traer 2 cambios de ropa (blanco y casual).',
}

export async function templateRoutes(fastify: FastifyInstance) {
  // GET /api/plantillas-email (Listar todas las plantillas y variables disponibles)
  fastify.get('/api/plantillas-email', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !ALLOWED_ROLES.includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'No tienes permisos para ver las plantillas de correo' })
      }

      const tipos: ('RECORDATORIO_SESION' | 'RECORDATORIO_VENTA')[] = [
        'RECORDATORIO_SESION',
        'RECORDATORIO_VENTA',
      ]

      const plantillas = await Promise.all(
        tipos.map(async (tipo) => {
          const t = await getTemplate(tipo)
          return {
            ...t,
            variables: AVAILABLE_VARIABLES.filter((v) => {
              if (tipo === 'RECORDATORIO_SESION' && v.category === 'Venta') return false
              return true
            }),
          }
        })
      )

      return reply.send({
        plantillas,
        variablesDisponibles: AVAILABLE_VARIABLES,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener las plantillas'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/plantillas-email/:tipo (Obtener una plantilla por tipo)
  fastify.get('/api/plantillas-email/:tipo', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !ALLOWED_ROLES.includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'No tienes permisos para ver las plantillas' })
      }

      const tipo = (request.params as any).tipo?.toUpperCase() as
        | 'RECORDATORIO_SESION'
        | 'RECORDATORIO_VENTA'

      if (!['RECORDATORIO_SESION', 'RECORDATORIO_VENTA'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de plantilla no válido' })
      }

      const plantilla = await getTemplate(tipo)
      const variables = AVAILABLE_VARIABLES.filter((v) => {
        if (tipo === 'RECORDATORIO_SESION' && v.category === 'Venta') return false
        return true
      })

      return reply.send({
        ...plantilla,
        variables,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al obtener la plantilla'
      return reply.status(500).send({ error: message })
    }
  })

  // PUT /api/plantillas-email/:tipo (Guardar/actualizar plantilla)
  fastify.put('/api/plantillas-email/:tipo', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !ALLOWED_ROLES.includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'No tienes permisos para editar las plantillas' })
      }

      const tipo = (request.params as any).tipo?.toUpperCase() as
        | 'RECORDATORIO_SESION'
        | 'RECORDATORIO_VENTA'

      if (!['RECORDATORIO_SESION', 'RECORDATORIO_VENTA'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de plantilla no válido' })
      }

      const body = request.body as {
        asunto?: string
        cuerpoHtml?: string
        cuerpoTexto?: string
      }

      if (!body.asunto?.trim() || !body.cuerpoHtml?.trim()) {
        return reply.status(400).send({ error: 'El asunto y el cuerpo HTML son obligatorios' })
      }

      const updated = await prisma.plantillaEmail.upsert({
        where: { tipo },
        create: {
          tipo,
          asunto: body.asunto.trim(),
          cuerpoHtml: body.cuerpoHtml.trim(),
          cuerpoTexto: body.cuerpoTexto ? body.cuerpoTexto.trim() : null,
          updatedBy: user.id,
        },
        update: {
          asunto: body.asunto.trim(),
          cuerpoHtml: body.cuerpoHtml.trim(),
          cuerpoTexto: body.cuerpoTexto ? body.cuerpoTexto.trim() : null,
          updatedBy: user.id,
        },
      })

      return reply.send({
        success: true,
        plantilla: {
          id: updated.id,
          tipo: updated.tipo,
          asunto: updated.asunto,
          cuerpoHtml: updated.cuerpoHtml,
          cuerpoTexto: updated.cuerpoTexto || '',
          updatedAt: updated.updatedAt,
        },
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al guardar la plantilla'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/plantillas-email/:tipo/preview (Previsualizar plantilla con datos de prueba)
  fastify.post('/api/plantillas-email/:tipo/preview', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !ALLOWED_ROLES.includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'No autorizado' })
      }

      const tipo = (request.params as any).tipo?.toUpperCase() as
        | 'RECORDATORIO_SESION'
        | 'RECORDATORIO_VENTA'

      if (!['RECORDATORIO_SESION', 'RECORDATORIO_VENTA'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de plantilla no válido' })
      }

      const body = (request.body || {}) as {
        asunto?: string
        cuerpoHtml?: string
        cuerpoTexto?: string
      }

      const currentTemplate = await getTemplate(tipo)
      const asuntoRaw = body.asunto !== undefined ? body.asunto : currentTemplate.asunto
      const htmlRaw = body.cuerpoHtml !== undefined ? body.cuerpoHtml : currentTemplate.cuerpoHtml
      const textRaw = body.cuerpoTexto !== undefined ? body.cuerpoTexto : currentTemplate.cuerpoTexto

      const asunto = resolveVariables(asuntoRaw, SAMPLE_MOCK_DATA)
      const html = resolveVariables(htmlRaw, SAMPLE_MOCK_DATA)
      const text = resolveVariables(textRaw, SAMPLE_MOCK_DATA)

      return reply.send({
        asunto,
        html,
        text,
        mockData: SAMPLE_MOCK_DATA,
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al generar vista previa'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/plantillas-email/:tipo/reset (Restablecer a plantilla por defecto - Solo ADMIN/SUPERUSUARIO)
  fastify.post('/api/plantillas-email/:tipo/reset', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !['SUPERUSUARIO', 'ADMIN'].includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'Solo administradores pueden restablecer las plantillas' })
      }

      const tipo = (request.params as any).tipo?.toUpperCase() as
        | 'RECORDATORIO_SESION'
        | 'RECORDATORIO_VENTA'

      if (!['RECORDATORIO_SESION', 'RECORDATORIO_VENTA'].includes(tipo)) {
        return reply.status(400).send({ error: 'Tipo de plantilla no válido' })
      }

      const defaultT = DEFAULT_TEMPLATES[tipo]

      const resetTemplate = await prisma.plantillaEmail.upsert({
        where: { tipo },
        create: {
          tipo,
          asunto: defaultT.asunto,
          cuerpoHtml: defaultT.cuerpoHtml,
          cuerpoTexto: defaultT.cuerpoTexto,
          updatedBy: user.id,
        },
        update: {
          asunto: defaultT.asunto,
          cuerpoHtml: defaultT.cuerpoHtml,
          cuerpoTexto: defaultT.cuerpoTexto,
          updatedBy: user.id,
        },
      })

      return reply.send({
        success: true,
        message: 'Plantilla restablecida a los valores por defecto',
        plantilla: {
          id: resetTemplate.id,
          tipo: resetTemplate.tipo,
          asunto: resetTemplate.asunto,
          cuerpoHtml: resetTemplate.cuerpoHtml,
          cuerpoTexto: resetTemplate.cuerpoTexto || '',
          updatedAt: resetTemplate.updatedAt,
        },
      })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al restablecer la plantilla'
      return reply.status(500).send({ error: message })
    }
  })

  // POST /api/recordatorios/test-run (Ejecución manual de prueba de recordatorios - Solo ADMIN/SUPERUSUARIO)
  fastify.post('/api/recordatorios/test-run', async (request, reply) => {
    try {
      const user = await getAuthUser(request)
      if (!user || !['SUPERUSUARIO', 'ADMIN'].includes(user.role.codigo.toUpperCase())) {
        return reply.status(403).send({ error: 'Solo administradores pueden ejecutar pruebas de recordatorios' })
      }

      const body = (request.body || {}) as { fecha?: string }
      const targetDate = body.fecha ? new Date(body.fecha) : new Date()

      const result = await processAllReminders(targetDate)
      return reply.send({ success: true, result })
    } catch (err: unknown) {
      fastify.log.error(err)
      const message = err instanceof Error ? err.message : 'Error al ejecutar recordatorios'
      return reply.status(500).send({ error: message })
    }
  })
}
