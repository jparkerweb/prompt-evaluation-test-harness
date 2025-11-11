import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate, formatRelativeDate } from './dateFormat'

describe('Date Format Utilities', () => {
  let originalDate
  let mockDate

  beforeEach(() => {
    // Save the original Date constructor
    originalDate = global.Date

    // Create a mock date for consistent testing
    // Using January 15, 2024, 15:30:00 UTC as our "current" time
    mockDate = new Date('2024-01-15T15:30:00Z')
    
    // Mock Date constructor to always return our mock date for "new Date()"
    global.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return mockDate
        }
        return new originalDate(...args)
      }
      
      static now() {
        return mockDate.getTime()
      }
    }
  })

  afterEach(() => {
    // Restore the original Date constructor
    global.Date = originalDate
  })

  describe('formatDate', () => {
    it('should return empty string for null or undefined input', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('')).toBe('')
    })

    it('should format SQLite CURRENT_TIMESTAMP format (YYYY-MM-DD HH:MM:SS)', () => {
      const sqliteDate = '2024-01-10 14:30:45'
      const result = formatDate(sqliteDate)
      
      // Should convert to ISO format with Z suffix and format for local display
      expect(result).toMatch(/Jan 10, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format ISO format without timezone (YYYY-MM-DDTHH:MM:SS)', () => {
      const isoDate = '2024-01-10T14:30:45'
      const result = formatDate(isoDate)
      
      expect(result).toMatch(/Jan 10, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format ISO format with timezone (YYYY-MM-DDTHH:MM:SSZ)', () => {
      const isoDateZ = '2024-01-10T14:30:45Z'
      const result = formatDate(isoDateZ)
      
      expect(result).toMatch(/Jan 10, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle ISO format with timezone offset', () => {
      const isoDateOffset = '2024-01-10T14:30:45+05:00'
      const result = formatDate(isoDateOffset)
      
      expect(result).toMatch(/Jan 10, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should format different months correctly', () => {
      const dates = [
        '2024-01-15 12:00:00', // January
        '2024-02-15 12:00:00', // February
        '2024-03-15 12:00:00', // March
        '2024-12-15 12:00:00'  // December
      ]
      
      const results = dates.map(formatDate)
      
      expect(results[0]).toMatch(/Jan 15, 2024/)
      expect(results[1]).toMatch(/Feb 15, 2024/)
      expect(results[2]).toMatch(/Mar 15, 2024/)
      expect(results[3]).toMatch(/Dec 15, 2024/)
    })

    it('should handle different years correctly', () => {
      const dates = [
        '2023-06-15 12:00:00',
        '2024-06-15 12:00:00',
        '2025-06-15 12:00:00'
      ]
      
      const results = dates.map(formatDate)
      
      expect(results[0]).toMatch(/2023/)
      expect(results[1]).toMatch(/2024/)
      expect(results[2]).toMatch(/2025/)
    })

    it('should handle edge case dates', () => {
      // Test leap year
      const leapYear = '2024-02-29 12:00:00'
      expect(formatDate(leapYear)).toMatch(/Feb 29, 2024/)
      
      // Test first day of year (use noon to avoid timezone boundary issues)
      const newYear = '2024-01-01 12:00:00'
      expect(formatDate(newYear)).toMatch(/Jan 1, 2024/)
      
      // Test last day of year
      const endYear = '2024-12-31 12:00:00'
      expect(formatDate(endYear)).toMatch(/Dec 31, 2024/)
    })
  })

  describe('formatRelativeDate', () => {
    it('should return empty string for null or undefined input', () => {
      expect(formatRelativeDate(null)).toBe('')
      expect(formatRelativeDate(undefined)).toBe('')
      expect(formatRelativeDate('')).toBe('')
    })

    it('should return "Just now" for very recent dates', () => {
      // 30 seconds ago
      const recentDate = '2024-01-15T15:29:30Z'
      expect(formatRelativeDate(recentDate)).toBe('Just now')
    })

    it('should format minutes ago correctly', () => {
      // 1 minute ago
      const oneMinAgo = '2024-01-15T15:29:00Z'
      expect(formatRelativeDate(oneMinAgo)).toBe('1 minute ago')
      
      // 5 minutes ago
      const fiveMinAgo = '2024-01-15T15:25:00Z'
      expect(formatRelativeDate(fiveMinAgo)).toBe('5 minutes ago')
      
      // 30 minutes ago
      const thirtyMinAgo = '2024-01-15T15:00:00Z'
      expect(formatRelativeDate(thirtyMinAgo)).toBe('30 minutes ago')
    })

    it('should format hours ago correctly', () => {
      // 1 hour ago
      const oneHourAgo = '2024-01-15T14:30:00Z'
      expect(formatRelativeDate(oneHourAgo)).toBe('1 hour ago')
      
      // 3 hours ago
      const threeHoursAgo = '2024-01-15T12:30:00Z'
      expect(formatRelativeDate(threeHoursAgo)).toBe('3 hours ago')
      
      // 12 hours ago
      const twelveHoursAgo = '2024-01-15T03:30:00Z'
      expect(formatRelativeDate(twelveHoursAgo)).toBe('12 hours ago')
    })

    it('should format days ago correctly', () => {
      // 1 day ago
      const oneDayAgo = '2024-01-14T15:30:00Z'
      expect(formatRelativeDate(oneDayAgo)).toBe('1 day ago')
      
      // 3 days ago
      const threeDaysAgo = '2024-01-12T15:30:00Z'
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago')
      
      // 6 days ago
      const sixDaysAgo = '2024-01-09T15:30:00Z'
      expect(formatRelativeDate(sixDaysAgo)).toBe('6 days ago')
    })

    it('should fall back to formatDate for dates older than a week', () => {
      // 8 days ago
      const eightDaysAgo = '2024-01-07T15:30:00Z'
      const result = formatRelativeDate(eightDaysAgo)
      
      // Should use formatDate for dates older than 7 days
      expect(result).toMatch(/Jan 7, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should handle SQLite timestamp format', () => {
      // 30 minutes ago in SQLite format
      const sqliteDate = '2024-01-15 15:00:00'
      expect(formatRelativeDate(sqliteDate)).toBe('30 minutes ago')
    })

    it('should handle ISO format without timezone', () => {
      // 2 hours ago in ISO format without Z
      const isoDate = '2024-01-15T13:30:00'
      expect(formatRelativeDate(isoDate)).toBe('2 hours ago')
    })

    it('should handle edge cases at boundaries', () => {
      // Exactly 60 minutes ago (should show as hours)
      const sixtyMinAgo = new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString()
      expect(formatRelativeDate(sixtyMinAgo)).toBe('1 hour ago')
      
      // Exactly 24 hours ago (should show as days)
      const twentyFourHoursAgo = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeDate(twentyFourHoursAgo)).toBe('1 day ago')
    })

    it('should handle singular vs plural correctly', () => {
      // Singular cases
      const oneMinAgo = '2024-01-15T15:29:00Z'
      expect(formatRelativeDate(oneMinAgo)).toBe('1 minute ago')
      
      const oneHourAgo = '2024-01-15T14:30:00Z'
      expect(formatRelativeDate(oneHourAgo)).toBe('1 hour ago')
      
      const oneDayAgo = '2024-01-14T15:30:00Z'
      expect(formatRelativeDate(oneDayAgo)).toBe('1 day ago')
      
      // Plural cases
      const twoMinAgo = '2024-01-15T15:28:00Z'
      expect(formatRelativeDate(twoMinAgo)).toBe('2 minutes ago')
      
      const twoHoursAgo = '2024-01-15T13:30:00Z'
      expect(formatRelativeDate(twoHoursAgo)).toBe('2 hours ago')
      
      const twoDaysAgo = '2024-01-13T15:30:00Z'
      expect(formatRelativeDate(twoDaysAgo)).toBe('2 days ago')
    })

    it('should handle future dates gracefully', () => {
      // 1 hour in the future
      const futureDate = '2024-01-15T16:30:00Z'
      const result = formatRelativeDate(futureDate)
      
      // Should not crash and should return some reasonable output
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle invalid date strings gracefully', () => {
      const invalidDate = 'not-a-date'
      const result = formatRelativeDate(invalidDate)
      
      // Should not crash
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('Date Format Consistency', () => {
    it('should handle same date in different formats consistently', () => {
      const sqliteFormat = '2024-01-10 14:30:45'
      const isoFormat = '2024-01-10T14:30:45'
      const isoWithZ = '2024-01-10T14:30:45Z'
      
      const results = [
        formatDate(sqliteFormat),
        formatDate(isoFormat),
        formatDate(isoWithZ)
      ]
      
      // All should format to the same date (though times might differ due to timezone handling)
      results.forEach(result => {
        expect(result).toMatch(/Jan 10, 2024/)
      })
    })

    it('should handle relative dates consistently across formats', () => {
      // 2 hours ago in different formats
      const sqliteFormat = '2024-01-15 13:30:00'
      const isoFormat = '2024-01-15T13:30:00'
      const isoWithZ = '2024-01-15T13:30:00Z'
      
      const results = [
        formatRelativeDate(sqliteFormat),
        formatRelativeDate(isoFormat),
        formatRelativeDate(isoWithZ)
      ]
      
      // All should show as "2 hours ago"
      results.forEach(result => {
        expect(result).toBe('2 hours ago')
      })
    })
  })

  describe('Timezone Handling', () => {
    it('should handle UTC timestamps correctly', () => {
      const utcDate = '2024-01-10T14:30:45Z'
      const result = formatDate(utcDate)
      
      expect(result).toMatch(/Jan 10, 2024/)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/)
    })

    it('should add Z suffix to SQLite timestamps', () => {
      // This tests the internal logic by checking that SQLite format works
      const sqliteDate = '2024-01-10 14:30:45'
      const result = formatDate(sqliteDate)
      
      // Should not throw an error and should format correctly
      expect(result).toMatch(/Jan 10, 2024/)
    })

    it('should add Z suffix to ISO format without timezone', () => {
      // This tests the internal logic by checking that ISO format without Z works
      const isoDate = '2024-01-10T14:30:45'
      const result = formatDate(isoDate)
      
      // Should not throw an error and should format correctly
      expect(result).toMatch(/Jan 10, 2024/)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very old dates', () => {
      const oldDate = '1990-01-01T12:00:00Z'
      
      expect(formatDate(oldDate)).toMatch(/Jan 1, 1990/)
      expect(formatRelativeDate(oldDate)).toMatch(/Jan 1, 1990/)
    })

    it('should handle very future dates', () => {
      const futureDate = '2099-12-31T23:59:59Z'
      
      expect(formatDate(futureDate)).toMatch(/Dec 31, 2099/)
    })

    it('should handle leap year edge cases', () => {
      const leapDay = '2024-02-29T12:00:00Z'
      const nonLeapDay = '2023-02-28T12:00:00Z'
      
      expect(formatDate(leapDay)).toMatch(/Feb 29, 2024/)
      expect(formatDate(nonLeapDay)).toMatch(/Feb 28, 2023/)
    })

    it('should handle daylight saving time boundaries', () => {
      // These dates are around DST changes in many timezones (use midday to avoid boundary issues)
      const springForward = '2024-03-10T18:00:00Z'
      const fallBack = '2024-11-03T18:00:00Z'
      
      expect(formatDate(springForward)).toMatch(/Mar 10, 2024/)
      expect(formatDate(fallBack)).toMatch(/Nov 3, 2024/)
    })

    it('should be consistent with repeated calls', () => {
      const testDate = '2024-01-10T14:30:45Z'
      
      const result1 = formatDate(testDate)
      const result2 = formatDate(testDate)
      const result3 = formatDate(testDate)
      
      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    })
  })
})