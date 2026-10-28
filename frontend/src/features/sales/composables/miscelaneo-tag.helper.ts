import { isRef, type Ref } from 'vue'

/**
 * Triggers accepted to split / create tags:
 * - Enter (handled natively by el-input-tag)
 * - Comma (,)
 * - Space ( )
 * - Dot (.)
 * - Minus (-)
 * - Semicolon (;)
 */
export const MISCELANEO_DELIMITERS = /[ ,.;-]+/

/**
 * Keydown handler for miscelaneo el-input-tag.
 * Enforces that only numeric digits can be entered.
 * Allows delimiter triggers (space, comma, dot, minus, semicolon) only when the input currently contains digits.
 */
export function handleMiscelaneoKeydown(event: KeyboardEvent) {
  // Allow control, modifier and navigation keys
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'Escape',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Shift',
      'Control',
      'Alt',
      'Meta',
      'CapsLock',
    ].includes(event.key)
  ) {
    return
  }

  // Trigger keys: space, comma, dot, minus, semicolon
  const isTrigger = [' ', ',', '.', '-', ';'].includes(event.key)
  if (isTrigger) {
    const input = event.target as HTMLInputElement | null
    const currentVal = input?.value?.trim() || ''
    // If the input is empty or has no digits, prevent entering the delimiter
    if (!currentVal || !/\d/.test(currentVal)) {
      event.preventDefault()
    }
    return
  }

  // Block any non-digit character
  if (event.key !== 'Unidentified' && !/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

/**
 * Input event handler to sanitize input from virtual keyboards or auto-suggestions.
 */
export function handleMiscelaneoInput(event: Event) {
  const input = event.target as HTMLInputElement | null
  if (!input) return

  // If there are no digits at all, clear any orphan symbols
  if (!/\d/.test(input.value)) {
    if (input.value.length > 0) {
      input.value = ''
      input.dispatchEvent(new Event('input'))
    }
    return
  }

  // Remove non-digit, non-delimiter characters
  const cleaned = input.value.replace(/[^\d ,.;-]/g, '')
  if (cleaned !== input.value) {
    input.value = cleaned
    input.dispatchEvent(new Event('input'))
  }
}

/**
 * Paste event handler to extract and create numeric tags from pasted text.
 */
export function handleMiscelaneoPaste(
  event: ClipboardEvent,
  tags: string[] | Ref<string[]>,
) {
  const text = event.clipboardData?.getData('text')
  if (!text) return

  const numbers = text
    .split(MISCELANEO_DELIMITERS)
    .map((token) => token.replace(/\D/g, '').trim())
    .filter(Boolean)

  if (numbers.length > 0) {
    event.preventDefault()
    const target = isRef(tags) ? tags.value : tags
    const set = new Set(target)
    for (const num of numbers) {
      if (!set.has(num)) {
        target.push(num)
        set.add(num)
      }
    }
  } else {
    event.preventDefault()
  }
}

/**
 * Deduplicate and keep only numeric characters in tag list.
 */
export function cleanNumericTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((t) => String(t || '').replace(/\D/g, '').trim())
        .filter(Boolean),
    ),
  )
}

/**
 * Parse an incoming string, array, or number into numeric tags.
 */
export function parseNumericTags(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return cleanNumericTags(value.map(String))
  }
  if (typeof value === 'string') {
    return cleanNumericTags(value.split(MISCELANEO_DELIMITERS))
  }
  if (typeof value === 'number') {
    return [String(value)]
  }
  return []
}
