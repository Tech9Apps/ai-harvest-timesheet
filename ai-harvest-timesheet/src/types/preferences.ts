export interface TimePreferences {
  enforce8Hours: boolean;
  autoRedistributeHours: boolean;
  distributeAcrossRepositories: boolean;
}

export interface RepositoryPreferences extends TimePreferences {
  useGlobalSettings: boolean;
}

export interface GlobalPreferences extends TimePreferences {
  // Add any future global-only settings here
}

export type RepositoryPreferencesMap = {
  [repositoryId: string]: RepositoryPreferences;
}; 