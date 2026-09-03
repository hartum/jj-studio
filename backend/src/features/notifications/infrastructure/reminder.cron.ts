import 'dotenv/config'
import cron, { type ScheduledTask } from 'node-cron'
import { processAllReminders } from '../application/reminder.service.js'

let cronTask: ScheduledTask | null = null

export function startReminderCron() {
  const cronHour = process.env.REMINDER_CRON_HOUR ? parseInt(process.env.REMINDER_CRON_HOUR, 10) : 7
  const validHour = isNaN(cronHour) || cronHour < 0 || cronHour > 23 ? 7 : cronHour

  // Expresión: a las XX:00 UTC todos los días
  const cronExpression = `0 ${validHour} * * *`

  console.log(`⏰ [CRON] Inicializando tarea programada de recordatorios diarios: "${cronExpression}" (${validHour}:00 UTC)`)

  cronTask = cron.schedule(
    cronExpression,
    async () => {
      console.log(`⏰ [CRON] Disparador activado a las ${new Date().toISOString()}`)
      try {
        await processAllReminders()
      } catch (err) {
        console.error('❌ [CRON] Error al ejecutar proceso de recordatorios diarios:', err)
      }
    },
    {
      timezone: 'UTC',
    }
  )

  return cronTask
}

export function stopReminderCron() {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    console.log('⏰ [CRON] Tarea de recordatorios detenida')
  }
}
