import { describe, it, expect } from 'vitest';
import {
  extractUserInfoFromTrailer,
  filterDuplicateTrailers,
  insertTrailers,
} from '../../src/commands/exec';

describe('remove duplicate trailers functionality', () => {
  describe('extractUserInfoFromTrailer', () => {
    it('should extract user info from a Co-developed-by trailer', () => {
      const line = 'Co-developed-by: John Doe <john@example.com>';
      const result = extractUserInfoFromTrailer(line);
      expect(result).toBe('John Doe <john@example.com>');
    });

    it('should extract user info from a Co-authored-by trailer', () => {
      const line = 'Co-authored-by: Jane Smith <jane@example.com>';
      const result = extractUserInfoFromTrailer(line);
      expect(result).toBe('Jane Smith <jane@example.com>');
    });

    it('should extract user info from a Signed-off-by trailer', () => {
      const line = 'Signed-off-by: Alice Johnson <alice@example.com>';
      const result = extractUserInfoFromTrailer(line);
      expect(result).toBe('Alice Johnson <alice@example.com>');
    });

    it('should return null for invalid trailer format', () => {
      const line = 'Invalid line without colon';
      const result = extractUserInfoFromTrailer(line);
      expect(result).toBeNull();
    });

    it('should return null for empty line', () => {
      const line = '';
      const result = extractUserInfoFromTrailer(line);
      expect(result).toBeNull();
    });
  });

  describe('filterDuplicateTrailers', () => {
    it('should filter out duplicate Co-authored-by lines that match CoDevelopedBy user', () => {
      const lines = [
        'Co-authored-by: John Doe <john@example.com>',
        'Signed-off-by: Someone Else <someone@example.com>',
        'Co-authored-by: AI Assistant <ai@example.com>',
      ];
      const coDevelopedBy = 'AI Assistant <ai@example.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual([
        'Co-authored-by: John Doe <john@example.com>',
        'Signed-off-by: Someone Else <someone@example.com>',
      ]);
    });

    it('should filter out duplicate Signed-off-by lines that match CoDevelopedBy user', () => {
      const lines = [
        'Signed-off-by: John Doe <john@example.com>',
        'Co-authored-by: Someone Else <someone@example.com>',
        'Signed-off-by: AI Assistant <ai@example.com>',
      ];
      const coDevelopedBy = 'AI Assistant <ai@example.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual([
        'Signed-off-by: John Doe <john@example.com>',
        'Co-authored-by: Someone Else <someone@example.com>',
      ]);
    });

    it('should not filter lines when CoDevelopedBy user info is invalid', () => {
      const lines = [
        'Co-authored-by: John Doe <john@example.com>',
        'Signed-off-by: Someone Else <someone@example.com>',
      ];
      const coDevelopedBy = ''; // Invalid user info
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual(lines);
    });

    it('should not filter lines when no duplicates exist', () => {
      const lines = [
        'Co-authored-by: John Doe <john@example.com>',
        'Signed-off-by: Someone Else <someone@example.com>',
      ];
      const coDevelopedBy = 'AI Assistant <ai@example.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual(lines);
    });

    it('should preserve non-duplicate trailer types', () => {
      const lines = [
        'Reviewed-by: John Doe <john@example.com>',
        'Tested-by: Someone Else <someone@example.com>',
      ];
      const coDevelopedBy = 'John Doe <john@example.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual(lines); // Should not filter non-duplicate trailer types
    });

    it('should return original lines when extractUserInfoFromTrailer returns null for CoDevelopedBy', () => {
      const lines = [
        'Co-authored-by: John Doe <john@example.com>',
        'Signed-off-by: Someone Else <someone@example.com>',
      ];
      // Pass an invalid CoDevelopedBy value that would cause extractUserInfoFromTrailer to return null
      const coDevelopedBy = ''; // Empty string should cause extractUserInfoFromTrailer to return null
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual(lines);
    });

    it('should keep trailer lines when extractUserInfoFromTrailer returns null for individual lines', () => {
      const lines = [
        'Co-authored-by: John Doe <john@example.com>',
        'co-authored-by:', // Invalid format that causes extractUserInfoFromTrailer to return null
        'Signed-off-by: Someone Else <someone@example.com>',
      ];
      const coDevelopedBy = 'AI Assistant <ai@example.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      // The invalid trailer line should be kept (not filtered out)
      expect(result).toEqual(lines);
    });
  });

  describe('insertTrailers with duplicate filtering', () => {
    it('should filter out duplicate Co-authored-by and Signed-off-by lines that match CoDevelopedBy user', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\nCo-authored-by: AI Assistant <ai@example.com>\nSigned-off-by: AI Assistant <ai@example.com>\nCo-authored-by: John Doe <john@example.com>';
      const coDevelopedBy = 'AI Assistant <ai@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Count occurrences of the CoDevelopedBy user
      const coAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') &&
          line.includes('AI Assistant <ai@example.com>')
      ).length;
      const signedOffCount = lines.filter(
        (line) =>
          line.startsWith('Signed-off-by:') &&
          line.includes('AI Assistant <ai@example.com>')
      ).length;
      const coDevelopedCount = lines.filter(
        (line) =>
          line.startsWith('Co-developed-by:') &&
          line.includes('AI Assistant <ai@example.com>')
      ).length;

      // Should have 0 Co-authored-by and Signed-off-by lines for the CoDevelopedBy user
      expect(coAuthoredCount).toBe(0);
      expect(signedOffCount).toBe(0);
      // Should have 1 Co-developed-by line for the CoDevelopedBy user
      expect(coDevelopedCount).toBe(1);

      // Should still have the other Co-authored-by line
      const johnCoAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') &&
          line.includes('John Doe <john@example.com>')
      ).length;
      expect(johnCoAuthoredCount).toBe(1);
    });
  });
});
