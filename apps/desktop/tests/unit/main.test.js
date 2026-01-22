import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeRemaining, formatTime, formatWindowLabel } from '../../src/renderer/utils/formatters.js'

describe('formatTimeRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return --:--:-- for null input', () => {
    expect(formatTimeRemaining(null)).toBe('--:--:--')
  })

  it('should return --:--:-- for undefined input', () => {
    expect(formatTimeRemaining(undefined)).toBe('--:--:--')
  })

  it('should return 00:00:00 for past time', () => {
    expect(formatTimeRemaining('2024-01-15T11:00:00Z')).toBe('00:00:00')
  })

  it('should format hours, minutes, and seconds correctly', () => {
    expect(formatTimeRemaining('2024-01-15T14:30:45Z')).toBe('02:30:45')
  })

  it('should pad single digits with zeros', () => {
    expect(formatTimeRemaining('2024-01-15T13:05:09Z')).toBe('01:05:09')
  })
})

describe('formatTime', () => {
  it('should return --:--:-- for null input', () => {
    expect(formatTime(null)).toBe('--:--:--')
  })

  it('should return --:--:-- for undefined input', () => {
    expect(formatTime(undefined)).toBe('--:--:--')
  })

  it('should format time in 24-hour format', () => {
    const result = formatTime('2024-01-15T14:30:45Z')
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatWindowLabel', () => {
  it('should return -- for null input', () => {
    expect(formatWindowLabel(null)).toBe('--')
  })

  it('should return -- for undefined input', () => {
    expect(formatWindowLabel(undefined)).toBe('--')
  })

  it('should format days correctly', () => {
    expect(formatWindowLabel(86400)).toBe('1d rolling')
    expect(formatWindowLabel(604800)).toBe('7d rolling')
  })

  it('should format hours correctly', () => {
    expect(formatWindowLabel(3600)).toBe('1h rolling')
    expect(formatWindowLabel(18000)).toBe('5h rolling')
  })

  it('should format minutes correctly', () => {
    expect(formatWindowLabel(1800)).toBe('30m rolling')
    expect(formatWindowLabel(900)).toBe('15m rolling')
  })
})
