import 'dotenv/config'
import { prisma } from '../shared/db.js'
import {
  getTemplate,
  resolveVariables,
  processAllReminders,
} from '../features/notifications/application/reminder.service.js'
import {
  startReminderCron,
  stopReminderCron,
} from '../features/notifications/infrastructure/reminder.cron.js'
import { encrypt } from '../shared/encryption.js'

async function runTest() {
  console.log('🧪 Iniciando pruebas de recordatorios por email y CRON...')

  // 1. Probar carga de plantillas por defecto
  const templateSesion = await getTemplate('RECORDATORIO_SESION')
  console.log(
    '✅ Template Sesión obtenido:',
    templateSesion.tipo,
    '| Asunto:',
    templateSesion.asunto.slice(0, 40) + '...',
  )

  const templateVenta = await getTemplate('RECORDATORIO_VENTA')
  console.log(
    '✅ Template Venta obtenido:',
    templateVenta.tipo,
    '| Asunto:',
    templateVenta.asunto.slice(0, 40) + '...',
  )

  // 2. Probar resolución de variables
  const sampleContext = {
    '[nombre_cliente]': 'Ana García',
    '[hotel_nombre]': 'Hotel Paraíso',
    '[hora_sesion]': '10:00',
    '[fecha_sesion]': '2 de Septiembre de 2026',
  }
  const resolved = resolveVariables(
    'Hola [nombre_cliente], tu cita en [hotel_nombre] es a las [hora_sesion].',
    sampleContext,
  )
  console.log('✅ Variable resolution test:', resolved)
  if (!resolved.includes('Ana García') || !resolved.includes('Hotel Paraíso')) {
    throw new Error('Fallo en la resolución de variables')
  }

  // 3. Probar inicialización del CRON
  const cronTask = startReminderCron()
  if (!cronTask) {
    throw new Error('No se pudo inicializar la tarea CRON')
  }
  console.log('✅ Tarea CRON inicializada correctamente')
  stopReminderCron()

  // 4. Probar actualización en BD de una plantilla
  const updatedAsunto = '📸 Recordatorio Personalizado: Tu sesión en [hotel_nombre]'
  await prisma.plantillaEmail.upsert({
    where: { tipo: 'RECORDATORIO_SESION' },
    create: {
      tipo: 'RECORDATORIO_SESION',
      asunto: updatedAsunto,
      cuerpoHtml: templateSesion.cuerpoHtml,
      cuerpoTexto: templateSesion.cuerpoTexto,
    },
    update: {
      asunto: updatedAsunto,
    },
  })

  const fetchedUpdated = await getTemplate('RECORDATORIO_SESION')
  console.log('✅ Plantilla en BD verificada:', fetchedUpdated.asunto)
  if (fetchedUpdated.asunto !== updatedAsunto) {
    throw new Error('No se guardó correctamente la plantilla en BD')
  }

  // 5. Probar simulación de sesión fotográfica para hoy
  const hotel = await prisma.hotel.findFirst({ where: { deletedAt: null } })
  const creador = await prisma.usuario.findFirst({ where: { deletedAt: null } })

  if (hotel && creador) {
    const today = new Date()
    // Crear sesión de prueba para hoy
    const sesionTest = await prisma.sesionFotografica.create({
      data: {
        hotelId: hotel.id,
        creadorId: creador.id,
        clienteNombre: encrypt('Huésped de Prueba') || '',
        clienteEmail: encrypt('test.huesped@jjstudio.dev') || null,
        fechaHoraInicio: today,
        estado: 'PROGRAMADA',
        emailRecordatorioEnviado: false,
      },
    })
    console.log(`✅ Sesión de prueba creada (ID: ${sesionTest.id})`)

    // Ejecutar procesamiento de recordatorios
    const result = await processAllReminders(today)
    console.log('✅ Resultado de ejecución de recordatorios:', result)

    // Verificar que la sesión quedó marcada como enviada (o procesada)
    const updatedSesion = await prisma.sesionFotografica.findUnique({
      where: { id: sesionTest.id },
    })
    console.log(
      `✅ Estado de emailRecordatorioEnviado en BD: ${updatedSesion?.emailRecordatorioEnviado}`,
    )

    // Limpiar sesión de prueba
    await prisma.sesionFotografica.delete({
      where: { id: sesionTest.id },
    })
    console.log('🧹 Sesión de prueba eliminada')
  }

  console.log('🎉 ¡Todas las pruebas finalizaron con éxito!')
}

runTest()
  .catch((e) => {
    console.error('❌ Error en las pruebas:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
