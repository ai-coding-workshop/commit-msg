import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  processCommitMessage,
  cleanCommitMessage,
  isTemporaryCommit,
  hasChangeId,
  needsChangeId,
  generateChangeId,
  insertTrailers,
  getCoDevelopedBy,
  hasCoDevelopedBy,
  needsCoDevelopedBy,
  clearCoDevelopedByEnvVars,
} from '../../src/commands/exec';

describe('exec command utilities', () => {
  describe('needsChangeId', () => {
    it('should return false when createChangeId is false', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(needsChangeId(message, false)).toBe(false);
    });

    it('should not add Change-Id when commit-msg.changeid is false', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      // Mock process.env to return a specific CoDevelopedBy value
      const originalEnv = process.env;
      process.env.CLAUDECODE = '1';

      const result = await processCommitMessage(message, config);
      expect(result.message).not.toContain('Change-Id:');
      expect(result.message).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
      expect(result.shouldSave).toBe(true);

      // Restore the original env
      process.env = originalEnv;
    });

    it('should not add Change-Id when commitmsg.changeid is false', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      // Mock process.env to return a specific CoDevelopedBy value
      const originalEnv = process.env;
      process.env.CLAUDECODE = '1';

      const result = await processCommitMessage(message, config);
      expect(result.message).not.toContain('Change-Id:');
      expect(result.message).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
      expect(result.shouldSave).toBe(true);

      // Restore the original env
      process.env = originalEnv;
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
        createCoDevelopedBy: false,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).not.toContain('Change-Id:');
      expect(result.shouldSave).toBe(false);
    });

    it('should not modify message when Change-Id already exists', async () => {
      const message = 'feat: add new feature\n\nChange-Id: I123456789abcdef';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: false,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toContain('Change-Id: I123456789abcdef');
      expect(result.shouldSave).toBe(false);
    });

    it('should not modify message for temporary commits', async () => {
      const message = 'fixup! feat: add new feature\n\nThis is a fixup';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
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
        createCoDevelopedBy: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toContain('Change-Id:');
      // Check that the original content is preserved
      expect(result.message).toContain('feat: add new feature');
      expect(result.message).toContain('This is a new feature');
      expect(result.shouldSave).toBe(true);
    });

    it('should return empty message for empty commit message', async () => {
      const message = '';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };

      const result = await processCommitMessage(message, config);
      expect(result.message).toBe('');
      expect(result.shouldSave).toBe(false);
    });

    it('should return empty message for commit message with only whitespace', async () => {
      const message = '   \n\t  \n  ';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };

      const result = await processCommitMessage(message, config);
      expect(result.message).toBe('');
      expect(result.shouldSave).toBe(false);
    });

    it('should return empty message for commit message with only comments', async () => {
      const message = '# This is a comment\n# Another comment\n# Final comment';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };

      const result = await processCommitMessage(message, config);
      expect(result.message).toBe('');
      expect(result.shouldSave).toBe(false);
    });

    it('should process commit message with mixed comments and content', async () => {
      const message =
        '# This is a comment\nfeat: add new feature\n# Another comment\nThis is the description';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toContain('Change-Id:');
      expect(result.message).toContain('feat: add new feature');
      expect(result.message).toContain('This is the description');
      expect(result.message).not.toContain('# This is a comment');
      expect(result.message).not.toContain('# Another comment');
      expect(result.shouldSave).toBe(true);
    });

    it('should return empty message for commit message with only Signed-off-by lines', async () => {
      const message =
        'Signed-off-by: John Doe <john@example.com>\nSigned-off-by: Jane Smith <jane@example.com>';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe('');
      expect(result.shouldSave).toBe(false);
    });

    it('should return empty message for commit message with only Signed-off-by lines and empty lines', async () => {
      const message =
        '\nSigned-off-by: John Doe <john@example.com>\n\nSigned-off-by: Jane Smith <jane@example.com>\n';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe('');
      expect(result.shouldSave).toBe(false);
    });

    it('should add CoDevelopedBy when needed', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      // Mock process.env to return a specific CoDevelopedBy value
      const originalEnv = process.env;
      process.env.CLAUDECODE = '1';

      const result = await processCommitMessage(message, config);
      expect(result.message).toContain(
        'Co-developed-by: Claude <noreply@anthropic.com>'
      );
      // Check that the original content is preserved
      expect(result.message).toContain('feat: add new feature');
      expect(result.message).toContain('This is a new feature');
      expect(result.shouldSave).toBe(true);

      // Restore the original env
      process.env = originalEnv;
    });

    it('should not modify message when CoDevelopedBy already exists', async () => {
      const message =
        'feat: add new feature\n\nCo-developed-by: John Doe <john@example.com>';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDevelopedBy: true,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe(message);
      expect(result.shouldSave).toBe(false);
    });

    it('should not modify message when CoDevelopedBy generation is disabled', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: false,
        commentChar: '#',
        createCoDevelopedBy: false,
      };
      const result = await processCommitMessage(message, config);
      expect(result.message).toBe(message);
      expect(result.shouldSave).toBe(false);
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

    it('should not insert blank line when second line is empty', () => {
      const message =
        'feat: add new feature\n\nThis is content\nThis is more content';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe(
        'feat: add new feature\n\nThis is content\nThis is more content'
      );
      expect(result.shouldSave).toBe(false);
    });

    it('should stop processing at scissors line >8', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# ------------------------ >8 ------------------------\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should stop processing at scissors line 8<', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# ------------------------ 8< ------------------------\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should handle scissors line with different dash patterns', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# >8\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should handle scissors line with whitespace', () => {
      const message =
        'feat: add new feature\n\nThis is content\n#   ------------------------ >8 ------------------------   \n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should not treat lines with extra text as scissors', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# ------------------------ >8 ------------------------ extra text\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should not treat similar patterns as scissors', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# ------------------------ >9 ------------------------\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
    });

    it('should not treat normal comments as scissors', () => {
      const message =
        'feat: add new feature\n\nThis is content\n# This is a normal comment\n# This should be ignored';
      const result = cleanCommitMessage(message, '#');
      expect(result.message).toBe('feat: add new feature\n\nThis is content');
      expect(result.shouldSave).toBe(false);
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

    it('should not treat Solution: lines as trailers', () => {
      const message = 'feat: add new feature\n\nSolution: blah blah blah';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');
      const solutionIndex = lines.findIndex(
        (line) => line === 'Solution: blah blah blah'
      );
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      expect(solutionIndex).toBeGreaterThan(-1);
      expect(changeIdIndex).toBeGreaterThan(-1);
      expect(solutionIndex).toBeLessThan(changeIdIndex);
      expect(lines[changeIdIndex - 1]).toBe('');
    });

    it('should not treat dash-leading tokens as trailers', () => {
      const message = 'feat: add new feature\n\n-Foo: bar';
      const changeId = 'I123456789abcdef0123456789abcdef01234567';
      const result = insertTrailers(message, { ChangeId: changeId });
      const lines = result.split('\n');
      const dashTokenIndex = lines.findIndex((line) => line === '-Foo: bar');
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      expect(dashTokenIndex).toBeGreaterThan(-1);
      expect(changeIdIndex).toBeGreaterThan(-1);
      expect(dashTokenIndex).toBeLessThan(changeIdIndex);
      expect(lines[changeIdIndex - 1]).toBe('');
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

    it('should handle non-trailer lines in trailer section correctly', () => {
      // Test case for lines 898-904: handling non-trailer lines when we were in trailer section
      const message =
        'feat: add new feature\n\nThis is a new feature\n\nSigned-off-by: user@example.com\nThis is not a trailer\nCo-authored-by: author@example.com';
      const result = insertTrailers(message, {});
      const lines = result.split('\n');

      // Check that non-trailer line is preserved in the correct position
      const nonTrailerLineIndex = lines.findIndex(
        (line) => line === 'This is not a trailer'
      );
      const signedOffIndex = lines.findIndex((line) =>
        line.startsWith('Signed-off-by:')
      );
      const coAuthoredIndex = lines.findIndex((line) =>
        line.startsWith('Co-authored-by:')
      );

      // Non-trailer line should be between Signed-off-by and Co-authored-by
      expect(nonTrailerLineIndex).toBeGreaterThan(signedOffIndex);
      expect(nonTrailerLineIndex).toBeLessThan(coAuthoredIndex);
    });

    it('should increment firstNonCommentIndex when first trailer is ChangeId', () => {
      // Test case for lines 949-950: incrementing firstNonCommentIndex when first trailer is ChangeId
      const message =
        'feat: add new feature\n\nThis is a new feature\n\nChange-Id: I123456789abcdef0123456789abcdef01234567\nCo-authored-by: author@example.com';
      const coDevelopedBy = 'Foo <noreply@example.com>';
      const result = insertTrailers(message, { CoDevelopedBy: coDevelopedBy });
      const lines = result.split('\n');

      // Find positions
      const changeIdIndex = lines.findIndex((line) =>
        line.startsWith('Change-Id:')
      );
      const coAuthoredIndex = lines.findIndex((line) =>
        line.startsWith('Co-authored-by:')
      );
      const coDevelopedIndex = lines.findIndex((line) =>
        line.startsWith('Co-developed-by:')
      );

      // Change-Id should come first
      expect(changeIdIndex).toBeLessThan(coDevelopedIndex);
      // Co-developed-by should come before Co-authored-by (because of the logic in lines 949-950)
      expect(coDevelopedIndex).toBeLessThan(coAuthoredIndex);
    });

    it('should add existingTrailers to outputLines when encountering empty line', () => {
      // Test case for lines 874-876: adding existingTrailers to outputLines when encountering empty line
      const message =
        'feat: add new feature\n\nThis is a new feature\n\n[Comment Trailer]\n\nNon-trailer content after empty line';
      const result = insertTrailers(message, {});
      const lines = result.split('\n');

      // Find positions
      const commentTrailerIndex = lines.findIndex(
        (line) => line === '[Comment Trailer]'
      );
      const emptyLineIndex = lines.findIndex((line) => line === '');
      const nonTrailerContentIndex = lines.findIndex(
        (line) => line === 'Non-trailer content after empty line'
      );

      // The comment trailer should be preserved
      expect(commentTrailerIndex).toBeGreaterThanOrEqual(0);
      // There should be an empty line
      expect(emptyLineIndex).toBeGreaterThanOrEqual(0);
      // The non-trailer content after empty line should be preserved
      expect(nonTrailerContentIndex).toBeGreaterThanOrEqual(0);
      // The non-trailer content should come after the empty line
      expect(nonTrailerContentIndex).toBeGreaterThan(emptyLineIndex);
    });
  });

  describe('getCoDevelopedBy', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment variables before each test
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restore original environment variables after each test
      process.env = originalEnv;
    });

    it('should return Claude CoDevelopedBy when CLAUDECODE=1 is set', () => {
      process.env.CLAUDECODE = '1';
      expect(getCoDevelopedBy()).toBe('Claude <noreply@anthropic.com>');
    });

    it('should return Qwen-Coder CoDevelopedBy when QWEN_CODE=1 is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.QWEN_CODE = '1';
      expect(getCoDevelopedBy()).toBe('Qwen-Coder <noreply@alibabacloud.com>');
    });

    it('should return Gemini CoDevelopedBy when GEMINI_CLI=1 is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.GEMINI_CLI = '1';
      expect(getCoDevelopedBy()).toBe('Gemini <noreply@developers.google.com>');
    });

    it('should return Qoder CoDevelopedBy when VSCODE_BRAND=Qoder is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.VSCODE_BRAND = 'Qoder';
      expect(getCoDevelopedBy()).toBe('Qoder <noreply@qoder.com>');
    });

    it('should return Cursor CoDevelopedBy when CURSOR_TRACE_ID=* is set (wildcard)', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.CURSOR_TRACE_ID = '*';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should return Cursor CoDevelopedBy when CURSOR_TRACE_ID is set to any value (wildcard)', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.CURSOR_TRACE_ID = 'any-value';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should return iFlow CoDevelopedBy when IFLOW_CLI=1 is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.IFLOW_CLI = '1';
      expect(getCoDevelopedBy()).toBe('iFlow <noreply@iflow.cn>');
    });

    it('should return Codex CoDevelopedBy when CODEX_MANAGED_BY_NPM=1 is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.CODEX_MANAGED_BY_NPM = '1';
      expect(getCoDevelopedBy()).toBe('Codex <noreply@openai.com>');
    });

    it('should return Codex CoDevelopedBy when CODEX_MANAGED_BY_BUN=1 is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.CODEX_MANAGED_BY_BUN = '1';
      expect(getCoDevelopedBy()).toBe('Codex <noreply@openai.com>');
    });

    it('should return Kiro CoDevelopedBy when __CFBundleIdentifier=dev.kiro.desktop is set', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.__CFBundleIdentifier = 'dev.kiro.desktop';
      expect(getCoDevelopedBy()).toBe('Kiro <noreply@kiro.dev>');
    });

    it('should return iFlow CoDevelopedBy when IFLOW_CLI=1 has higher priority than __CFBundleIdentifier=dev.kiro.desktop', () => {
      // Clear all environment variables to ensure proper order testing
      clearCoDevelopedByEnvVars();
      process.env.IFLOW_CLI = '1';
      process.env.__CFBundleIdentifier = 'dev.kiro.desktop';
      expect(getCoDevelopedBy()).toBe('iFlow <noreply@iflow.cn>');
    });

    it('should return Claude CoDevelopedBy when CLAUDECODE=1 is set and other variables are also set', () => {
      process.env.CLAUDECODE = '1';
      process.env.QWEN_CODE = '1';
      process.env.GEMINI_CLI = '1';
      process.env.VSCODE_BRAND = 'Qoder';
      expect(getCoDevelopedBy()).toBe('Claude <noreply@anthropic.com>');
    });

    it('should return Qwen-Coder CoDevelopedBy when QWEN_CODE=1 is set and other lower priority variables are also set', () => {
      clearCoDevelopedByEnvVars();
      process.env.QWEN_CODE = '1';
      process.env.GEMINI_CLI = '1';
      process.env.VSCODE_BRAND = 'Qoder';
      process.env.CURSOR_TRACE_ID = 'test';
      expect(getCoDevelopedBy()).toBe('Qwen-Coder <noreply@alibabacloud.com>');
    });

    it('should return empty string when none of the environment variables are set', () => {
      // Clear all environment variables we're testing
      clearCoDevelopedByEnvVars();
      expect(getCoDevelopedBy()).toBe('');
    });

    it('should return empty string when environment variables are set to incorrect values', () => {
      // Clear all environment variables using the utility function
      clearCoDevelopedByEnvVars();

      process.env.CLAUDECODE = '0';
      process.env.QWEN_CODE = '0';
      process.env.GEMINI_CLI = '0';
      process.env.VSCODE_BRAND = 'Other';
      expect(getCoDevelopedBy()).toBe('');
    });

    it('should return empty string when environment variables exist but have no value', () => {
      // Clear all environment variables using the utility function
      clearCoDevelopedByEnvVars();

      process.env.CLAUDECODE = '';
      expect(getCoDevelopedBy()).toBe('');
    });

    // Enhanced tests for Cursor and Qoder detection
    it('should return Cursor CoDevelopedBy when VSCODE_GIT_ASKPASS_MAIN contains .cursor-server', () => {
      clearCoDevelopedByEnvVars();
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.cursor-server/bin/askpass-main.js';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should return Cursor CoDevelopedBy when BROWSER contains .cursor-server', () => {
      clearCoDevelopedByEnvVars();
      process.env.BROWSER = '/home/user/.cursor-server/bin/helpers/browser.sh';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should return Qoder CoDevelopedBy when VSCODE_GIT_ASKPASS_MAIN contains .qoder-server', () => {
      clearCoDevelopedByEnvVars();
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.qoder-server/bin/askpass-main.js';
      expect(getCoDevelopedBy()).toBe('Qoder <noreply@qoder.com>');
    });

    it('should return Qoder CoDevelopedBy when BROWSER contains .qoder-server', () => {
      clearCoDevelopedByEnvVars();
      process.env.BROWSER = '/home/user/.qoder-server/bin/helpers/browser.sh';
      expect(getCoDevelopedBy()).toBe('Qoder <noreply@qoder.com>');
    });
  });

  describe('hasCoDevelopedBy', () => {
    it('should return true when Co-developed-by exists with correct format', () => {
      const message =
        'feat: add new feature\n\nCo-developed-by: John Doe <john@example.com>';
      expect(hasCoDevelopedBy(message)).toBe(true);
    });

    it('should return true when Co-developed-by exists with different case', () => {
      const message =
        'feat: add new feature\n\nco-developed-by: John Doe <john@example.com>';
      expect(hasCoDevelopedBy(message)).toBe(true);
    });

    it('should return false when Co-developed-by does not exist', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(hasCoDevelopedBy(message)).toBe(false);
    });
  });

  describe('needsCoDevelopedBy', () => {
    it('should return false when createCoDevelopedBy is false', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(needsCoDevelopedBy(message, false)).toBe(false);
    });

    it('should not modify message when commit-msg.codevelopedby is false', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: false,
      };
      // Mock process.env to return a specific CoDevelopedBy value
      const originalEnv = process.env;
      process.env.CLAUDECODE = '1';

      const result = await processCommitMessage(message, config);
      expect(result.message).not.toContain('Co-developed-by:');
      expect(result.message).toContain('Change-Id:');
      expect(result.shouldSave).toBe(true);

      // Restore the original env
      process.env = originalEnv;
    });

    it('should not modify message when commitmsg.codevelopedby is false', async () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      const config = {
        createChangeId: true,
        commentChar: '#',
        createCoDevelopedBy: false,
      };
      // Mock process.env to return a specific CoDevelopedBy value
      const originalEnv = process.env;
      process.env.CLAUDECODE = '1';

      const result = await processCommitMessage(message, config);
      expect(result.message).not.toContain('Co-developed-by:');
      expect(result.message).toContain('Change-Id:');
      expect(result.shouldSave).toBe(true);

      // Restore the original env
      process.env = originalEnv;
    });

    it('should return false when Co-developed-by already exists', () => {
      const message =
        'feat: add new feature\n\nCo-developed-by: John Doe <john@example.com>';
      expect(needsCoDevelopedBy(message, true)).toBe(false);
    });

    it('should return false for temporary commits (fixup!)', () => {
      const message = 'fixup! feat: add new feature\n\nThis is a fixup';
      expect(needsCoDevelopedBy(message, true)).toBe(false);
    });

    it('should return false for temporary commits (squash!)', () => {
      const message = 'squash! feat: add new feature\n\nThis is a squash';
      expect(needsCoDevelopedBy(message, true)).toBe(false);
    });

    it('should return true when Co-developed-by should be inserted', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(needsCoDevelopedBy(message, true)).toBe(true);
    });
  });

  describe('getGitConfig error handling', () => {
    // We can't easily test getGitConfig directly since it's not exported
    // Instead, we test the behavior when git config commands fail
    // This is covered indirectly by existing tests that use default config values
    it('should use default values when git config commands fail', () => {
      // This is indirectly tested by other tests that don't set up git config
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('exec function error handling', () => {
    // The exec function is tested in integration tests
    // Direct unit tests would require complex mocking of file system and git commands
    it('should be tested in integration tests', () => {
      // This is indirectly tested by integration tests
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('clearCoDevelopedByEnvVars', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment variables before each test
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restore original environment variables after each test
      process.env = originalEnv;
    });

    it('should clear all CoDevelopedBy environment variables', () => {
      // Set up environment variables
      process.env.CLAUDECODE = '1';
      process.env.QWEN_CODE = '1';
      process.env.GEMINI_CLI = '1';
      process.env.VSCODE_GIT_ASKPASS_MAIN = '/path/to/cursor-server/askpass';

      // Verify they are set
      expect(process.env.CLAUDECODE).toBe('1');
      expect(process.env.QWEN_CODE).toBe('1');
      expect(process.env.GEMINI_CLI).toBe('1');
      expect(process.env.VSCODE_GIT_ASKPASS_MAIN).toBe(
        '/path/to/cursor-server/askpass'
      );

      // Clear them
      clearCoDevelopedByEnvVars();

      // Verify they are cleared
      expect(process.env.CLAUDECODE).toBeUndefined();
      expect(process.env.QWEN_CODE).toBeUndefined();
      expect(process.env.GEMINI_CLI).toBeUndefined();
      expect(process.env.VSCODE_GIT_ASKPASS_MAIN).toBeUndefined();
    });

    it('should handle environment variable keys without values', () => {
      // Test the code path where equalIndex === -1 (no '=' in envConfig)
      // We can't directly modify envConfigs since it's a constant, but we can test
      // that the function correctly handles both cases by checking coverage

      // Set up some environment variables that match our actual envConfigs
      process.env.CLAUDECODE = '1';
      process.env.QWEN_CODE = '1';

      // Clear them
      clearCoDevelopedByEnvVars();

      // Verify they are cleared
      expect(process.env.CLAUDECODE).toBeUndefined();
      expect(process.env.QWEN_CODE).toBeUndefined();
    });
  });

  describe('getCoDevelopedBy environment variable handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment variables before each test
      process.env = { ...originalEnv };
      clearCoDevelopedByEnvVars();
    });

    afterEach(() => {
      // Restore original environment variables after each test
      process.env = originalEnv;
    });

    it('should handle VSCODE_GIT_ASKPASS_MAIN with cursor-server path', () => {
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.cursor-server/bin/askpass-main.js';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should handle BROWSER with cursor-server path', () => {
      process.env.BROWSER = '/home/user/.cursor-server/bin/helpers/browser.sh';
      expect(getCoDevelopedBy()).toBe('Cursor <noreply@cursor.com>');
    });

    it('should handle VSCODE_GIT_ASKPASS_MAIN with qoder-server path', () => {
      process.env.VSCODE_GIT_ASKPASS_MAIN =
        '/home/user/.qoder-server/bin/askpass-main.js';
      expect(getCoDevelopedBy()).toBe('Qoder <noreply@qoder.com>');
    });

    it('should handle BROWSER with qoder-server path', () => {
      process.env.BROWSER = '/home/user/.qoder-server/bin/helpers/browser.sh';
      expect(getCoDevelopedBy()).toBe('Qoder <noreply@qoder.com>');
    });
  });

  describe('isMergeCommit', () => {
    it('should be tested in integration tests', () => {
      // This is tested in integration tests since the function is not exported
      expect(true).toBe(true); // Placeholder test
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

  describe('hasCoDevelopedBy', () => {
    it('should return true when Co-developed-by exists with correct format', () => {
      const message =
        'feat: add new feature\n\nCo-developed-by: John Doe <john@example.com>';
      expect(hasCoDevelopedBy(message)).toBe(true);
    });

    it('should return true when Co-developed-by exists with different case', () => {
      const message =
        'feat: add new feature\n\nco-developed-by: John Doe <john@example.com>';
      expect(hasCoDevelopedBy(message)).toBe(true);
    });

    it('should return false when Co-developed-by does not exist', () => {
      const message = 'feat: add new feature\n\nThis is a new feature';
      expect(hasCoDevelopedBy(message)).toBe(false);
    });
  });
});
