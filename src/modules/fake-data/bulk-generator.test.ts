import { describe, it, expect } from 'vitest'
import { generateBulkDataset, convertToCsv } from './bulk-generator'

describe('bulk-generator', () => {
  it('converts record list to escaped CSV', () => {
    const records = [
      { id: 1, name: 'Alice, In Wonderland', email: 'alice@example.com' },
      { id: 2, name: 'Bob "The Builder"', email: 'bob@example.com' },
    ]
    const csv = convertToCsv(records)
    expect(csv).toContain('id,name,email')
    expect(csv).toContain('"Alice, In Wonderland"')
    expect(csv).toContain('"Bob ""The Builder"""')
  })

  it('generates bulk JSON dataset with requested count', () => {
    const sample = { id: 1, name: 'Test', email: 'test@example.com' }
    const result = generateBulkDataset(sample, { count: 5, format: 'json' })
    expect(result.format).toBe('json')
    expect(result.count).toBe(5)
    expect(result.records.length).toBe(5)
    const parsed = JSON.parse(result.text)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(5)
  })

  it('generates bulk CSV dataset with requested count', () => {
    const sample = { id: 1, name: 'Test', email: 'test@example.com' }
    const result = generateBulkDataset(sample, { count: 10, format: 'csv' })
    expect(result.format).toBe('csv')
    expect(result.count).toBe(10)
    const lines = result.text.split('\n')
    expect(lines.length).toBe(11) // 1 header + 10 rows
  })
})
