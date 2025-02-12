import { GlobalPreferences, RepositoryPreferences, RepositoryPreferencesMap } from '../types/preferences';

const STORAGE_KEYS = {
  GLOBAL_PREFERENCES: 'harvest-timesheet:global-preferences',
  REPOSITORY_PREFERENCES: 'harvest-timesheet:repository-preferences',
};

const DEFAULT_GLOBAL_PREFERENCES: GlobalPreferences = {
  enforce8Hours: true,
  autoRedistributeHours: true,
};

const DEFAULT_REPOSITORY_PREFERENCES: RepositoryPreferences = {
  enforce8Hours: true,
  autoRedistributeHours: true,
  useGlobalSettings: true,
};

class PreferencesService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading preferences from localStorage:', error);
      return defaultValue;
    }
  }

  private setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing preferences to localStorage:', error);
    }
  }

  getGlobalPreferences(): GlobalPreferences {
    return this.getItem<GlobalPreferences>(
      STORAGE_KEYS.GLOBAL_PREFERENCES,
      DEFAULT_GLOBAL_PREFERENCES
    );
  }

  setGlobalPreferences(preferences: GlobalPreferences): void {
    this.setItem(STORAGE_KEYS.GLOBAL_PREFERENCES, preferences);
  }

  getRepositoryPreferences(repositoryId: string): RepositoryPreferences {
    const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
      STORAGE_KEYS.REPOSITORY_PREFERENCES,
      {}
    );
    return allRepositoryPreferences[repositoryId] || { ...DEFAULT_REPOSITORY_PREFERENCES };
  }

  setRepositoryPreferences(repositoryId: string, preferences: RepositoryPreferences): void {
    const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
      STORAGE_KEYS.REPOSITORY_PREFERENCES,
      {}
    );
    allRepositoryPreferences[repositoryId] = preferences;
    this.setItem(STORAGE_KEYS.REPOSITORY_PREFERENCES, allRepositoryPreferences);
  }

  getEffectivePreferences(repositoryId: string): GlobalPreferences {
    const globalPreferences = this.getGlobalPreferences();
    const repositoryPreferences = this.getRepositoryPreferences(repositoryId);

    if (repositoryPreferences.useGlobalSettings) {
      return globalPreferences;
    }

    return {
      enforce8Hours: repositoryPreferences.enforce8Hours,
      autoRedistributeHours: repositoryPreferences.autoRedistributeHours,
    };
  }

  resetRepositoryToGlobal(repositoryId: string): void {
    const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
      STORAGE_KEYS.REPOSITORY_PREFERENCES,
      {}
    );
    allRepositoryPreferences[repositoryId] = { ...DEFAULT_REPOSITORY_PREFERENCES };
    this.setItem(STORAGE_KEYS.REPOSITORY_PREFERENCES, allRepositoryPreferences);
  }
}

export const preferencesService = new PreferencesService(); 