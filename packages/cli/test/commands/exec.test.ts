import { describe, it, expect } from 'vitest';
import {
  processCommitMessage,
  cleanCommitMessage,
  isTemporaryCommit,
  hasChangeId,
  needsChangeId,
  generateChangeId,
  insertTrailers,
} from '../../src/commands/exec';

describe('exec command utilities', () => {
  describe('needsChangeId', () => {
    it('should return false when createChangeId is false', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(needsChangeId(message, false)).toBe(false);
    });

    it('should return false when Change-Id already exists', () => {
      const message = 'feat: add new feature\n\nChange-Id: I123456789abcdef';
      expect(needsChangeId(message, true)).toBe(false);
    });

    it('should return false for temporary commits (fixup!)', () => {
      const message = 'fixup! feat: add new feature\n\nThis is a fixup';
      expect(needsChangeId(message, true)).toBe(false);
    });

    it('should return false for temporary commits (squash!)', () => {
      const message = 'squash! feat: add new feature\n\nThis is a squash';
      expect(needsChangeId(message, true)).toBe(false);
    });

    it('should return true when Change-Id should be inserted', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(needsChangeId(message, true)).toBe(true);
    });
  });

  describe('processCommitMessage', () => {
    it('should not modify message when Change-Id generation is disabled', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDeveloper: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe(message);
      expect(result.shouldSave).toBe(false);
    });

    it('should not modify message when Change-Id already exists', async () => {
      const message = 'feat: add new feature\n\nChange-Id: I123456789abcdef';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDeveloper: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe(message);
      expect(result.shouldSave).toBe(false);
    });

    it('should not modify message for temporary commits', async () => {
      const message = 'fixup! feat: add new feature\n\nThis is a fixup';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDeveloper: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe(message);
      expect(result.shouldSave).toBe(false);
    });

    it('should add Change-Id when needed', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDeveloper: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toContain('Change-Id:');
      // Check that the original content is preserved
      expect(result.message).toContain('feat: add new feature');
      expect(result.message).toContain('This is a new feature');
      expect(result.shouldSave).toBe(true);
    });
  });

  describe('cleanCommitMessage', () => {
    it('should remove diff lines starting with diff --git', () => {
      const message =
        'feat: add new feature\ndiff --git a/file b/file\nindex 1234567..89abcde 100644\n--- a/file\n+++ b/file\n@@ -1,1 +1,1 @@\n- old\n+ new';
      const result = cleanCommitMessage(message);
      expect(result.message).toBe('feat: add new feature');
    });

    it('should remove comments', () => {
      const message =
        'feat: add new feature\n\n# This is a comment\nThis is content';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
    });

    it('should trim trailing whitespace from lines', () => {
      const message = 'feat: add new feature   \n\nThis is content  \n';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
    });

    it('should collapse multiple consecutive empty lines to one', () => {
      const message = 'feat: add new feature\n\n\n\nThis is content\n\n\n\nEnd';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe(
        'feat: add new feature\n\nThis is content\n\nEnd'
      );
    });

    it('should remove trailing empty lines', () => {
      const message = 'feat: add new feature\n\nThis is content\n\n\n';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
    });

    it('should insert blank line between first and second lines when second line is not empty', () => {
      const message =
        'feat: add new feature\nThis is content\nThis is more content';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe(
        'feat: add new feature\n\nThis is content\nThis is more content'
      );
      expect(result.shouldSave).toBe(true);
    });
  });

  describe('isTemporaryCommit', () => {
    it('should return true for fixup! commits', () => {
      const message = 'fixup! feat: add new feature\n\nThis is a fixup';
      expect(isTemporaryCommit(message)).toBe(true);
    });

    it('should return true for squash! commits', () => {
      const message = 'squash! feat: add new feature\n\nThis is a squash';
      expect(isTemporaryCommit(message)).toBe(true);
    });

    it('should return false for regular commits', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(isTemporaryCommit(message)).toBe(false);
    });
  });

  describe('hasChangeId', () => {
    it('should return true when Change-Id exists with correct format', () => {
      const message =
        'feat: add new feature\n\nChange-Id: I123456789abcdef0123456789abcdef01234567';
      expect(hasChangeId(message)).toBe(true);
    });

    it('should return false when Change-Id does not exist', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(hasChangeId(message)).toBe(false);
    });

    it('should return false for invalid Change-Id format', () => {
      const message = 'feat: add new feature\n\nChange-Id: invalid';
      expect(hasChangeId(message)).toBe(false);
    });
  });

  describe('generateChangeId', () => {
    it('should generate a Change-Id with correct format', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const changeId = generateChangeId(message);
      // Should start with 'I' followed by hex characters
      expect(changeId).toMatch(/^I[0-9a-f]{32,}$/);
    });
  });

  describe('insertTrailers', () => {
    it('should insert Change-Id at the end when no trailers exist', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');
      expect(lines[lines.length - 2]).toBe('');
      expect(lines[lines.length - 1]).toBe(`Change-Id: ${changeId}`);
    });

    it('should insert Change-Id before non-comment trailers', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\nSigned-off-by: user@example.com';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');

      // Find positions
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      const signedOffIndex = lines.findIndex((line) =>
        line.startsWith('Signed-off-by:')
      );

      // Change-Id should come before Signed-off-by
      expect(changeIdIndex).toBeLessThan(signedOffIndex);
      // There should be an empty line before Change-Id
      expect(lines[changeIdIndex - 1]).toBe('');
    });

    it('should insert Change-Id after comment trailers but before non-comment trailers', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\n[Issue: 123]\nSigned-off-by: user@example.com';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');

      // Find positions
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      const issueIndex = lines.findIndex((line) => line === '[Issue: 123]');
      const signedOffIndex = lines.findIndex((line) =>
        line.startsWith('Signed-off-by:')
      );

      // [Issue: 123] comment should come before Change-Id
      expect(issueIndex).toBeLessThan(changeIdIndex);
      // Change-Id should come before Signed-off-by
      expect(changeIdIndex).toBeLessThan(signedOffIndex);
    });

    it('should insert Change-Id at the end when all trailers are comments', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\n[Issue: 123]\n(Additional info)';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');

      // Find positions
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      const issueIndex = lines.findIndex((line) => line === '[Issue: 123]');
      const additionalInfoIndex = lines.findIndex(
        (line) => line === '(Additional info)'
      );

      // Both comment trailers should come before Change-Id
      expect(issueIndex).toBeLessThan(changeIdIndex);
      expect(additionalInfoIndex).toBeLessThan(changeIdIndex);
      // Change-Id should be at the end
      expect(changeIdIndex).toBe(lines.length - 1);
    });

    it('should insert Co-developed-by when CoDevelopedBy is provided', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');
      expect(lines[lines.length - 2]).toBe('');
      expect(lines[lines.length - 1]).toBe(`Co-developed-by: ${coDevelopedBy}`);
    });

    it('should not insert Co-developed-by when CoDevelopedBy is empty string', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const result = insertTrailers(message, { CoDevelopedBy: '' });
      const lines = result.split('\n');
      // Should not have Co-developed-by trailer
      expect(lines.some((line) => line.startsWith('Co-developed-by:'))).toBe(
        false
      );
    });

    it('should not insert Co-developed-by when CoDevelopedBy is not provided', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const result = insertTrailers(message, {});
      const lines = result.split('\n');
      // Should not have Co-developed-by trailer
      expect(lines.some((line) => line.startsWith('Co-developed-by:'))).toBe(
        false
      );
    });

    it('should insert Co-developed-by before non-comment trailers', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\nSigned-off-by: user@example.com';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Find positions
      const coDevelopedIndex = lines.findIndex((line) =>
        line.startsWith('Co-developed-by:')
      );
      const signedOffIndex = lines.findIndex((line) =>
        line.startsWith('Signed-off-by:')
      );

      // Co-developed-by should come before Signed-off-by
      expect(coDevelopedIndex).toBeLessThan(signedOffIndex);
      // There should be an empty line before Co-developed-by
      expect(lines[coDevelopedIndex - 1]).toBe('');
    });

    it('should insert Co-developed-by after comment trailers but before non-comment trailers', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\n[Issue: 123]\nSigned-off-by: user@example.com';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Find positions
      const coDevelopedIndex = lines.findIndex((line) =>
        line.startsWith('Co-developed-by:')
      );
      const issueIndex = lines.findIndex((line) => line === '[Issue: 123]');
      const signedOffIndex = lines.findIndex((line) =>
        line.startsWith('Signed-off-by:')
      );

      // [Issue: 123] comment should come before Co-developed-by
      expect(issueIndex).toBeLessThan(coDevelopedIndex);
      // Co-developed-by should come before Signed-off-by
      expect(coDevelopedIndex).toBeLessThan(signedOffIndex);
    });

    it('should insert both Change-Id and Co-developed-by with correct order', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, {
        ChangeId: changeId,
        CoDevelopedBy: coDevelopedBy,
      });
      const lines = result.split('\n');

      // Find positions
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      const coDevelopedIndex = lines.findIndex((line) =>
        line.startsWith('Co-developed-by:')
      );

      // Change-Id should come before Co-developed-by
      expect(changeIdIndex).toBeLessThan(coDevelopedIndex);
      expect(lines[changeIdIndex]).toBe(`Change-Id: ${changeId}`);
      expect(lines[coDevelopedIndex]).toBe(`Co-developed-by: ${coDevelopedBy}`);
    });

    it('should insert Co-developed-by at the end when all trailers are comments', () => {
      const message =
        'feat: add new feature\n\nThis is a new feature\n\n[Issue: 123]\n(Additional info)';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Find positions
      const coDevelopedIndex = lines.findIndex((line) =>
        line.startsWith('Co-developed-by:')
      );
      const issueIndex = lines.findIndex((line) => line === '[Issue: 123]');
      const additionalInfoIndex = lines.findIndex(
        (line) => line === '(Additional info)'
      );

      // Both comment trailers should come before Co-developed-by
      expect(issueIndex).toBeLessThan(coDevelopedIndex);
      expect(additionalInfoIndex).toBeLessThan(coDevelopedIndex);
      // Co-developed-by should be at the end
      expect(coDevelopedIndex).toBe(lines.length - 1);
    });
  });
});
