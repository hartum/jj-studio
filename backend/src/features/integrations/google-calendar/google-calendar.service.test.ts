import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  formatToLocalIsoString,
  mapHexToGoogleColorId,
} from './google-calendar.service.js'

describe('Google Calendar Integration Tests', () => {
  test('formatToLocalIsoString strips Z and offset correctly', () => {
    // 1. Date object created with Z
    const dateUtc = new Date('2026-10-29T17:00:00.000Z')
    assert.equal(formatToLocalIsoString(dateUtc), '2026-10-29T17:00:00')

    // 2. End time (1 hour later)
    const endUtc = new Date(dateUtc.getTime() + 60 * 60 * 1000)
    assert.equal(formatToLocalIsoString(endUtc), '2026-10-29T18:00:00')

    // 3. String without offset
    assert.equal(formatToLocalIsoString('2026-10-29T17:00'), '2026-10-29T17:00:00')

    // 4. String with spaces
    assert.equal(formatToLocalIsoString('2026-10-29 17:00:00'), '2026-10-29T17:00:00')

    // 5. String with Z
    assert.equal(formatToLocalIsoString('2026-10-29T17:00:00Z'), '2026-10-29T17:00:00')

    // 6. String with offset
    assert.equal(formatToLocalIsoString('2026-10-29T17:00:00-05:00'), '2026-10-29T17:00:00')
  })

  test('mapHexToGoogleColorId maps colors accurately', () => {
    assert.equal(mapHexToGoogleColorId(null), '8')
    assert.equal(mapHexToGoogleColorId(''), '8')
    assert.equal(mapHexToGoogleColorId('#616161'), '8') // Graphite
  })

  test('getCalendarTimeZone uses API timezone and caches it', async () => {
    let apiCallCount = 0
    const mockClient = {
      calendarId: 'test-hotel-calendar@group.calendar.google.com',
      calendar: {
        calendars: {
          get: async () => {
            apiCallCount++
            return { data: { timeZone: 'America/Cancun' } }
          },
        },
      },
    }

    const { getCalendarTimeZone } = await import('./google-calendar.service.js')
    const tz1 = await getCalendarTimeZone(mockClient as any)
    assert.equal(tz1, 'America/Cancun')
    assert.equal(apiCallCount, 1)

    // Second call should come from cache, not invoking API again
    const tz2 = await getCalendarTimeZone(mockClient as any)
    assert.equal(tz2, 'America/Cancun')
    assert.equal(apiCallCount, 1)
  })

  test('getCalendarTimeZone overrides Europe/Madrid with hotel operational timezone', async () => {
    const madridClient = {
      calendarId: 'madrid-cal@group.calendar.google.com',
      calendar: {
        calendars: {
          get: async () => ({ data: { timeZone: 'Europe/Madrid' } }),
        },
      },
    }

    const { getCalendarTimeZone } = await import('./google-calendar.service.js')
    const tz = await getCalendarTimeZone(madridClient as any, {
      areaNombre: 'Los Cabos',
      paisNombre: 'México',
    })
    assert.equal(tz, 'America/Mazatlan')
  })

  test('getHotelTimeZone maps all destinations accurately', async () => {
    const { getHotelTimeZone } = await import('./google-calendar.service.js')
    assert.equal(getHotelTimeZone({ paisNombre: 'Jamaica', areaNombre: 'Costa Norte' }), 'America/Jamaica')
    assert.equal(getHotelTimeZone({ paisNombre: 'Rep. Dominicana', areaNombre: 'Punta Cana' }), 'America/Santo_Domingo')
    assert.equal(getHotelTimeZone({ paisNombre: 'México', areaNombre: 'Cancún' }), 'America/Cancun')
    assert.equal(getHotelTimeZone({ paisNombre: 'México', areaNombre: 'Riviera Maya' }), 'America/Cancun')
    assert.equal(getHotelTimeZone({ paisNombre: 'México', areaNombre: 'Vallarta' }), 'America/Bahia_Banderas')
    assert.equal(getHotelTimeZone({ paisNombre: 'México', areaNombre: 'Los Cabos' }), 'America/Mazatlan')
  })

  test('getCalendarTimeZone falls back gracefully on error or empty timezone', async () => {
    const errorClient = {
      calendarId: 'error-cal@group.calendar.google.com',
      calendar: {
        calendars: {
          get: async () => {
            throw new Error('Network error')
          },
        },
      },
    }

    const { getCalendarTimeZone } = await import('./google-calendar.service.js')
    const fallbackMexico = await getCalendarTimeZone(errorClient as any, {
      areaNombre: 'Cancún',
      paisNombre: 'México',
    })
    assert.equal(fallbackMexico, 'America/Cancun')

    const errorDominicana = {
      calendarId: 'error-rd@group.calendar.google.com',
      calendar: {
        calendars: {
          get: async () => {
            throw new Error('Network error')
          },
        },
      },
    }
    const fallbackRD = await getCalendarTimeZone(errorDominicana as any, {
      areaNombre: 'Punta Cana',
      paisNombre: 'Rep. Dominicana',
    })
    assert.equal(fallbackRD, 'America/Santo_Domingo')
  })
})
