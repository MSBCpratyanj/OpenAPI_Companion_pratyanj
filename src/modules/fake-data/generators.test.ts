import { describe, it, expect } from 'vitest'
import {
  GENERATORS,
  GENERATOR_KEYS,
  GENERATOR_CATALOG,
  generate,
  isGeneratorKey,
  type Rng,
} from './generators'

/** A cycling deterministic RNG so tests never flake. */
function seq(...values: number[]): Rng {
  let i = 0
  return () => values[i++ % values.length] as number
}

describe('fake-data generators', () => {
  it('ships 50+ generators and catalog metadata', () => {
    expect(GENERATOR_KEYS.length).toBeGreaterThanOrEqual(50)
    expect(GENERATOR_CATALOG.length).toBeGreaterThanOrEqual(50)
  })

  it('every generator produces a non-empty value across many runs', () => {
    for (const key of GENERATOR_KEYS) {
      for (let i = 0; i < 20; i++) {
        const value = GENERATORS[key](Math.random)
        expect(value === '' || value == null).toBe(false)
      }
    }
  })

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  const DATE = /^\d{4}-\d{2}-\d{2}$/
  const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
  const PHONE = /^\+1-\d{3}-555-\d{4}$/
  const IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
  const MAC = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/
  const HEX_COLOR = /^#[0-9A-F]{6}$/i
  const CREDIT_CARD = /^\d{4}-\d{4}-\d{4}-\d{4}$/

  it('formats email / uuid / date / datetime / phone / ipv4 / mac / creditCard validly', () => {
    for (let i = 0; i < 50; i++) {
      expect(generate('email')).toMatch(EMAIL)
      expect(generate('uuid')).toMatch(UUID)
      expect(generate('date')).toMatch(DATE)
      expect(generate('datetime')).toMatch(DATETIME)
      expect(generate('phone')).toMatch(PHONE)
      expect(generate('ipv4')).toMatch(IPV4)
      expect(generate('macAddress')).toMatch(MAC)
      expect(generate('hexColor')).toMatch(HEX_COLOR)
      expect(generate('creditCard')).toMatch(CREDIT_CARD)
      expect(String(generate('postalCode'))).toMatch(/^\d{5}$/)
      expect(String(generate('cryptoAddress'))).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(typeof generate('latitude')).toBe('number')
      expect(typeof generate('longitude')).toBe('number')
      expect(typeof generate('fileName')).toBe('string')
      expect(typeof generate('mimeType')).toBe('string')
      expect(typeof generate('status')).toBe('string')
      expect(typeof generate('countryCode')).toBe('string')
    }
  })

  it('fuzzing and security vectors generate valid payloads', () => {
    expect(typeof generate('sqliVector')).toBe('string')
    expect(typeof generate('xssVector')).toBe('string')
    expect(typeof generate('unicodeEmojiVector')).toBe('string')
    expect(String(generate('boundaryString')).length).toBeGreaterThanOrEqual(500)
    expect(typeof generate('boundaryNumber')).toBe('number')
  })

  it('typed generators return the right primitive types', () => {
    expect(typeof generate('boolean')).toBe('boolean')
    expect(typeof generate('integer')).toBe('number')
    expect(Number.isInteger(generate('integer'))).toBe(true)
    expect(typeof generate('float')).toBe('number')
    expect(typeof generate('url')).toBe('string')
    expect(generate('url', seq(0.1, 0.2, 0.3))).toMatch(/^https:\/\//)
  })

  it('password contains upper, lower, digit and symbol', () => {
    for (let i = 0; i < 50; i++) {
      const pw = String(generate('password'))
      expect(pw.length).toBeGreaterThanOrEqual(12)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[0-9]/)
      expect(pw).toMatch(/[!@#$%&*?]/)
    }
  })

  it('is deterministic under a fixed rng', () => {
    expect(generate('integer', seq(0.5))).toBe(generate('integer', seq(0.5)))
  })

  it('isGeneratorKey guards unknown keys', () => {
    expect(isGeneratorKey('email')).toBe(true)
    expect(isGeneratorKey('sqliVector')).toBe(true)
    expect(isGeneratorKey('cryptoAddress')).toBe(true)
    expect(isGeneratorKey('nope')).toBe(false)
  })

  it('generates a full field in well under the 20 ms budget', () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) generate('fullName')
    expect((performance.now() - start) / 1000).toBeLessThan(20)
  })
})
