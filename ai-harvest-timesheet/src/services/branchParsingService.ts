import { PresetPattern } from '../types/preferences';

export interface ParseResult {
  isValid: boolean;
  ticket?: string;
  title?: string;
  error?: string;
  preview?: string;
}

export class BranchParsingService {
  /**
   * Tests if a pattern is valid and contains required capture groups
   */
  static validatePattern(pattern: string): boolean {
    try {
      // Test if pattern is valid regex
      new RegExp(pattern);

      // Test if pattern contains required named capture groups
      return pattern.includes('(?<ticket>') && pattern.includes('(?<title>');
    } catch {
      return false;
    }
  }

  /**
   * Tests a pattern against a branch name and returns the parsed result
   */
  static testPattern(pattern: string, branchName: string): ParseResult {
    try {
      if (!this.validatePattern(pattern)) {
        return {
          isValid: false,
          error: 'Pattern must include named capture groups for "ticket" and "title"'
        };
      }

      const regex = new RegExp(pattern);
      const match = branchName.match(regex);

      if (!match?.groups) {
        return {
          isValid: false,
          error: 'Branch name does not match the pattern'
        };
      }

      const { ticket, title } = match.groups;

      return {
        isValid: true,
        ticket,
        title
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid pattern'
      };
    }
  }

  /**
   * Formats a message using the template and parsed values
   */
  static formatMessage(template: string, values: { ticket?: string; title?: string; message: string }): string {
    return template.replace(/\${(\w+)}/g, (_, key) => {
      const value = values[key as keyof typeof values];
      return value !== undefined ? value : `\${${key}}`;
    });
  }

  /**
   * Generates preview results for a pattern using sample branch names
   */
  static generatePreviews(pattern: string, messageTemplate: string, samples: string[]): ParseResult[] {
    return samples.map(sample => {
      const result = this.testPattern(pattern, sample);
      if (result.isValid && result.ticket && result.title) {
        result.preview = this.formatMessage(messageTemplate, {
          ticket: result.ticket,
          title: result.title,
          message: 'Sample commit message'
        });
      }
      return result;
    });
  }

  /**
   * Finds a preset pattern by name
   */
  static findPresetPattern(presets: PresetPattern[], name: string): PresetPattern | undefined {
    return presets.find(preset => preset.name === name);
  }
} 