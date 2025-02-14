export interface TimePreferences {
  enforce8Hours: boolean;
  customEnforceHours: boolean;
  customHoursValue: number;
  autoRedistributeHours: boolean;
  distributeAcrossRepositories: boolean;
  distributionStrategy: 'equal' | 'commit-size' | 'time-based' | 'impact-analysis';
  minimumCommitHours: number;
  maximumCommitHours: number;
  roundingPrecision: number;
}

export interface RepositoryPreferences extends TimePreferences {
  useGlobalSettings: boolean;
}

export interface PresetPattern {
  name: string;
  pattern: string;
  description: string;
  examples: string[];
}

export interface BranchParsingPreferences {
  pattern: string;
  messageTemplate: string;
  selectedPreset: string | null;
}

export interface ExternalIssuePreferences {
  enabled: boolean;
  issueTracker: {
    type: 'jira' | 'github' | 'none';
    baseUrl: string;
  };
}

export interface GlobalPreferences extends TimePreferences {
  branchParsing: BranchParsingPreferences;
  externalIssue: ExternalIssuePreferences;
}

export type RepositoryPreferencesMap = {
  [repositoryId: string]: RepositoryPreferences;
};

export const DEFAULT_PRESET_PATTERNS: PresetPattern[] = [
  {
    name: "Feature/Bugfix Format",
    pattern: "(feat|feature|bugfix)\\/(?<ticket>[A-Z]+-\\d+|\\d+)-(?<title>[\\w-]+)",
    description: "Matches branches like:\n• feat/ABC-123-branch-title\n• feature/ABC-123-branch-title\n• bugfix/123-fix-issue",
    examples: [
      "feat/ABC-123-branch-title",
      "feature/PROJ-456-implement-login",
      "bugfix/123-fix-issue"
    ]
  },
  {
    name: "Jira Style Format",
    pattern: "(?<ticket>[A-Z]+-\\d+)\\/(?<title>[\\w-]+)",
    description: "Matches branches like:\n• JIRA-123/add-new-feature\n• PROJ-456/fix-login-issue\n• ABC-789/update-docs",
    examples: [
      "JIRA-123/add-new-feature",
      "PROJ-456/fix-login-issue",
      "ABC-789/update-docs"
    ]
  },
  {
    name: "Type/Ticket Format",
    pattern: "(feature|fix|chore|docs)\\/(?<ticket>\\d+)\\/(?<title>[\\w-]+)",
    description: "Matches branches like:\n• feature/123/add-login\n• fix/456/resolve-bug\n• chore/789/update-deps",
    examples: [
      "feature/123/add-login",
      "fix/456/resolve-bug",
      "chore/789/update-deps"
    ]
  },
  {
    name: "Simple Ticket Format",
    pattern: "(?<ticket>\\d+)-(?<title>[\\w-]+)",
    description: "Matches branches like:\n• 123-add-feature\n• 456-fix-bug\n• 789-update-docs",
    examples: [
      "123-add-feature",
      "456-fix-bug",
      "789-update-docs"
    ]
  }
];

export const DEFAULT_BRANCH_PARSING_PREFERENCES: BranchParsingPreferences = {
  pattern: DEFAULT_PRESET_PATTERNS[0].pattern,
  messageTemplate: "${ticket} | ${title} | ${message}",
  selectedPreset: DEFAULT_PRESET_PATTERNS[0].name
}; 