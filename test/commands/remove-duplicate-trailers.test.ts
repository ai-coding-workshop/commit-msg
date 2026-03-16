import { describe, it, expect } from 'vitest';
import {
  extractUserInfoFromTrailer,
  extractUsernameFromTrailer,
  filterDuplicateTrailers,
  insertTrailers,
} from '../../src/commands/exec';

describe('remove duplicate trailers functionality', () => {
  describe('extractUsernameFromTrailer', () => {
    it('should extract username from trailer, ignoring email', () => {
      const line = 'Co-developed-by: Cursor <noreply@cursor.com>';
      const result = extractUsernameFromTrailer(line);
      expect(result).toBe('Cursor');
    });

    it('should extract same username from different Cursor emails', () => {
      expect(
        extractUsernameFromTrailer(
          'Co-authored-by: Cursor <noreply@cursor.com>'
        )
      ).toBe('Cursor');
      expect(
        extractUsernameFromTrailer(
          'Co-authored-by: Cursor <cursoragent@cursor.com>'
        )
      ).toBe('Cursor');
    });

    it('should extract username with spaces', () => {
      const line = 'Co-authored-by: John Doe <john@example.com>';
      const result = extractUsernameFromTrailer(line);
      expect(result).toBe('John Doe');
    });

    it('should return null for empty username', () => {
      const line = 'Co-authored-by:  <empty@example.com>';
      const result = extractUsernameFromTrailer(line);
      expect(result).toBeNull();
    });

    it('should return null for invalid trailer format', () => {
      const line = 'Invalid line without colon';
      const result = extractUsernameFromTrailer(line);
      expect(result).toBeNull();
    });

    it('should extract tool name from made-with trailer without email', () => {
      const line = 'Made-with: Cursor';
      const result = extractUsernameFromTrailer(line);
      expect(result).toBe('Cursor');
    });
  });

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

    it('should filter Cursor trailers by username when emails differ (noreply vs cursoragent)', () => {
      const lines = [
        'Co-authored-by: Cursor <noreply@cursor.com>',
        'Co-authored-by: Cursor <cursoragent@cursor.com>',
        'Signed-off-by: Cursor <noreply@cursor.com>',
        'Co-authored-by: John Doe <john@example.com>',
      ];
      const coDevelopedBy = 'Cursor <noreply@cursor.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      // All Cursor trailers should be filtered (same username), John Doe kept
      expect(result).toEqual(['Co-authored-by: John Doe <john@example.com>']);
    });

    it('should filter Cursor trailers when Co-developed-by uses cursoragent email', () => {
      const lines = [
        'Co-authored-by: Cursor <noreply@cursor.com>',
        'Signed-off-by: Cursor <cursoragent@cursor.com>',
      ];
      const coDevelopedBy = 'Cursor <cursoragent@cursor.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      expect(result).toEqual([]);
    });

    it('should filter made-with: Cursor when Co-developed-by username is Cursor', () => {
      const lines = [
        'Made-with: Cursor',
        'Co-authored-by: Cursor <noreply@cursor.com>',
        'Co-authored-by: John Doe <john@example.com>',
      ];
      const coDevelopedBy = 'Cursor <noreply@cursor.com>';
      const result = filterDuplicateTrailers(lines, coDevelopedBy);
      // made-with: Cursor and Cursor co-authored-by should be filtered
      expect(result).toEqual(['Co-authored-by: John Doe <john@example.com>']);
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

    it('should filter Cursor co-authored-by/signed-off-by by username when embedding Co-developed-by', () => {
      const message =
        'feat: add feature\n\nCo-authored-by: Cursor <noreply@cursor.com>\nSigned-off-by: Cursor <cursoragent@cursor.com>\nCo-authored-by: Human <human@example.com>';
      const coDevelopedBy = 'Cursor <noreply@cursor.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Cursor trailers should be removed (replaced by Co-developed-by)
      const cursorCoAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') && line.includes('Cursor <')
      ).length;
      const cursorSignedOffCount = lines.filter(
        (line) => line.startsWith('Signed-off-by:') && line.includes('Cursor <')
      ).length;
      expect(cursorCoAuthoredCount).toBe(0);
      expect(cursorSignedOffCount).toBe(0);

      // Co-developed-by should exist
      const coDevelopedCount = lines.filter(
        (line) =>
          line.startsWith('Co-developed-by:') &&
          line.includes('Cursor <noreply@cursor.com>')
      ).length;
      expect(coDevelopedCount).toBe(1);

      // Human Co-authored-by should be kept
      const humanCoAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') &&
          line.includes('Human <human@example.com>')
      ).length;
      expect(humanCoAuthoredCount).toBe(1);
    });

    it('should filter trailers with filterOnlyIdentity (remove mode) without adding Co-developed-by', () => {
      const message =
        'feat: add feature\n\nMade-with: Cursor\nCo-authored-by: Cursor <noreply@cursor.com>\nCo-authored-by: Human <human@example.com>';
      const result = insertTrailers(
        message,
        {},
        {
          filterOnlyIdentity: 'Cursor <noreply@cursor.com>',
        }
      );
      const lines = result.split('\n');

      expect(lines.some((l) => l.toLowerCase().startsWith('made-with:'))).toBe(
        false
      );
      expect(
        lines.some(
          (l) => l.startsWith('Co-authored-by:') && l.includes('Cursor <')
        )
      ).toBe(false);
      expect(
        lines.some(
          (l) =>
            l.startsWith('Co-authored-by:') &&
            l.includes('Human <human@example.com>')
        )
      ).toBe(true);
      expect(lines.some((l) => l.startsWith('Co-developed-by:'))).toBe(false);
    });

    it('should filter made-with: Cursor when embedding Co-developed-by', () => {
      const message =
        'feat: add feature\n\nMade-with: Cursor\nCo-authored-by: Cursor <noreply@cursor.com>\nCo-authored-by: Human <human@example.com>';
      const coDevelopedBy = 'Cursor <noreply@cursor.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // made-with: Cursor should be removed
      const madeWithCount = lines.filter((line) =>
        line.toLowerCase().startsWith('made-with:')
      ).length;
      expect(madeWithCount).toBe(0);

      // Cursor co-authored-by should be removed
      const cursorCoAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') && line.includes('Cursor <')
      ).length;
      expect(cursorCoAuthoredCount).toBe(0);

      // Co-developed-by should exist
      const coDevelopedCount = lines.filter(
        (line) =>
          line.startsWith('Co-developed-by:') &&
          line.includes('Cursor <noreply@cursor.com>')
      ).length;
      expect(coDevelopedCount).toBe(1);

      // Human Co-authored-by should be kept
      const humanCoAuthoredCount = lines.filter(
        (line) =>
          line.startsWith('Co-authored-by:') &&
          line.includes('Human <human@example.com>')
      ).length;
      expect(humanCoAuthoredCount).toBe(1);
    });
  });
});
