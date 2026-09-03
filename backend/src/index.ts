import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { userRoutes } from './features/users/infrastructure/user.routes.js'
import { countryRoutes } from './features/countries/infrastructure/country.routes.js'
import { hotelRoutes } from './features/hotels/infrastructure/hotel.routes.js'
import { sessionRoutes } from './features/photo-sessions/infrastructure/session.routes.js'
import { saleRoutes } from './features/sales/infrastructure/sale.routes.js'
import { goalRoutes } from './features/goals/infrastructure/goal.routes.js'
import { commissionRoutes } from './features/commissions/infrastructure/commission.routes.js'
import { calendarioLaboralRoutes } from './features/users/infrastructure/calendario-laboral.routes.js'
import { googleCalendarRoutes } from './features/integrations/google-calendar/google-calendar.routes.js'
import { templateRoutes } from './features/notifications/infrastructure/template.routes.js'
import { startReminderCron } from './features/notifications/infrastructure/reminder.cron.js'

const fastify = Fastify({
  logger: true,
})

await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'super-secret-key-jj-studio-2026',
})

// Register feature routes
await fastify.register(userRoutes)
await fastify.register(countryRoutes)
await fastify.register(hotelRoutes)
await fastify.register(sessionRoutes)
await fastify.register(saleRoutes)
await fastify.register(goalRoutes)
await fastify.register(commissionRoutes)
await fastify.register(calendarioLaboralRoutes)
await fastify.register(googleCalendarRoutes)
await fastify.register(templateRoutes)

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`JJ Studio Backend running on http://localhost:${port}`)
    startReminderCron()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
