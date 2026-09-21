import { prisma } from '../../../shared/db.js'

/**
 * Migración idempotente para entornos existentes (VPS Producción).
 * Busca citas de venta creadas antes del refactor de pagos múltiples que tengan
 * modoCobro o totalVentaUsd pero ningún registro en la tabla `pagos_cita_venta`,
 * e inserta su línea de pago correspondiente de forma transparente y segura.
 */
export async function migrateLegacyPayments() {
  try {
    const citasSinPagos = await prisma.citaVenta.findMany({
      where: {
        pagos: { none: {} },
        OR: [
          { modoCobro: { not: null } },
          { totalVentaUsd: { not: null } },
        ],
      },
      select: {
        id: true,
        modoCobro: true,
        totalVentaUsd: true,
      },
    })

    if (citasSinPagos.length === 0) {
      return
    }

    console.log(`[Migration] Migrando ${citasSinPagos.length} citas de venta legacy a pagos_cita_venta...`)

    for (const cita of citasSinPagos) {
      const metodo = cita.modoCobro || 'tarjeta'
      const importe = cita.totalVentaUsd ?? 0

      await prisma.pagoCitaVenta.create({
        data: {
          citaVentaId: cita.id,
          metodoPago: metodo,
          importeUsd: importe,
        },
      })
    }

    console.log(`[Migration] ✅ Migración de ${citasSinPagos.length} citas completada con éxito.`)
  } catch (error) {
    console.error('[Migration] ⚠️ Error al ejecutar migración de pagos legacy:', error)
  }
}

if (process.argv[1] && process.argv[1].includes('sale.migration')) {
  migrateLegacyPayments().then(() => process.exit(0))
}
