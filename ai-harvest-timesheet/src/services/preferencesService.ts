import { GlobalPreferences, RepositoryPreferences, RepositoryPreferencesMap, DEFAULT_BRANCH_PARSING_PREFERENCES } from '../types/preferences';
import { StorageError, QuotaExceededError, StorageUnavailableError, InvalidDataError } from '../types/errors';

const STORAGE_KEYS = {
  GLOBAL_PREFERENCES: 'harvest-timesheet:global-preferences',
  REPOSITORY_PREFERENCES: 'harvest-timesheet:repository-preferences',
};

const DEFAULT_GLOBAL_PREFERENCES: GlobalPreferences = {
  enforce8Hours: true,
  autoRedistributeHours: true,
  distributeAcrossRepositories: false,
  distributionStrategy: 'commit-size',
  minimumCommitHours: 0.25,
  maximumCommitHours: 4,
  roundingPrecision: 2,
  branchParsing: DEFAULT_BRANCH_PARSING_PREFERENCES,
};

const DEFAULT_REPOSITORY_PREFERENCES: RepositoryPreferences = {
  enforce8Hours: true,
  autoRedistributeHours: true,
  distributeAcrossRepositories: false,
  distributionStrategy: 'commit-size',
  minimumCommitHours: 0.25,
  maximumCommitHours: 4,
  roundingPrecision: 2,
  useGlobalSettings: true,
};

class PreferencesService {
  private isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isStorageAvailable()) {
      throw new StorageUnavailableError('read', key, new Error('localStorage is not available'));
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      try {
        return JSON.parse(item);
      } catch (parseError) {
        throw new InvalidDataError(key, parseError as Error);
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to read preferences from localStorage',
        'read',
        key,
        error as Error
      );
    }
  }

  private setItem(key: string, value: any): void {
    if (!this.isStorageAvailable()) {
      throw new StorageUnavailableError('write', key, new Error('localStorage is not available'));
    }

    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      // Check if the error is due to quota being exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new QuotaExceededError(key, error);
      }

      throw new StorageError(
        'Failed to write preferences to localStorage',
        'write',
        key,
        error as Error
      );
    }
  }

  getGlobalPreferences(): GlobalPreferences {
    try {
      const preferences = this.getItem<GlobalPreferences>(
        STORAGE_KEYS.GLOBAL_PREFERENCES,
        DEFAULT_GLOBAL_PREFERENCES
      );

      // Ensure branchParsing exists
      if (!preferences.branchParsing) {
        const updatedPreferences = {
          ...preferences,
          branchParsing: DEFAULT_GLOBAL_PREFERENCES.branchParsing
        };
        this.setItem(STORAGE_KEYS.GLOBAL_PREFERENCES, updatedPreferences);
        return updatedPreferences;
      }

      return preferences;
    } catch (error) {
      console.error('Error retrieving global preferences:', error);
      return DEFAULT_GLOBAL_PREFERENCES;
    }
  }

  setGlobalPreferences(preferences: GlobalPreferences): void {
    try {
      this.setItem(STORAGE_KEYS.GLOBAL_PREFERENCES, preferences);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to save global preferences',
        'write',
        STORAGE_KEYS.GLOBAL_PREFERENCES,
        error as Error
      );
    }
  }

  getRepositoryPreferences(repositoryId: string): RepositoryPreferences {
    try {
      const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
        STORAGE_KEYS.REPOSITORY_PREFERENCES,
        {}
      );
      return allRepositoryPreferences[repositoryId] || { ...DEFAULT_REPOSITORY_PREFERENCES };
    } catch (error) {
      console.error('Error retrieving repository preferences:', error);
      return { ...DEFAULT_REPOSITORY_PREFERENCES };
    }
  }

  setRepositoryPreferences(repositoryId: string, preferences: RepositoryPreferences): void {
    try {
      const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
        STORAGE_KEYS.REPOSITORY_PREFERENCES,
        {}
      );
      allRepositoryPreferences[repositoryId] = preferences;
      this.setItem(STORAGE_KEYS.REPOSITORY_PREFERENCES, allRepositoryPreferences);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to save repository preferences',
        'write',
        STORAGE_KEYS.REPOSITORY_PREFERENCES,
        error as Error
      );
    }
  }

  getEffectivePreferences(repositoryId: string): GlobalPreferences {
    try {
      const globalPreferences = this.getGlobalPreferences();
      const repositoryPreferences = this.getRepositoryPreferences(repositoryId);

      if (repositoryPreferences.useGlobalSettings) {
        return globalPreferences;
      }

      // Always keep branchParsing from global preferences
      return {
        ...globalPreferences,
        enforce8Hours: repositoryPreferences.enforce8Hours,
        autoRedistributeHours: repositoryPreferences.autoRedistributeHours,
        distributeAcrossRepositories: repositoryPreferences.distributeAcrossRepositories,
        distributionStrategy: repositoryPreferences.distributionStrategy,
        minimumCommitHours: repositoryPreferences.minimumCommitHours,
        maximumCommitHours: repositoryPreferences.maximumCommitHours,
        roundingPrecision: repositoryPreferences.roundingPrecision,
        // Keep branchParsing from global preferences since it's a global setting
        branchParsing: globalPreferences.branchParsing
      };
    } catch (error) {
      console.error('Error retrieving effective preferences:', error);
      return DEFAULT_GLOBAL_PREFERENCES;
    }
  }

  resetRepositoryToGlobal(repositoryId: string): void {
    try {
      const allRepositoryPreferences = this.getItem<RepositoryPreferencesMap>(
        STORAGE_KEYS.REPOSITORY_PREFERENCES,
        {}
      );
      allRepositoryPreferences[repositoryId] = { ...DEFAULT_REPOSITORY_PREFERENCES };
      this.setItem(STORAGE_KEYS.REPOSITORY_PREFERENCES, allRepositoryPreferences);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to reset repository preferences',
        'write',
        STORAGE_KEYS.REPOSITORY_PREFERENCES,
        error as Error
      );
    }
  }

  resetToDefaults(): void {
    try {
      console.log('Current preferences:', this.getItem(STORAGE_KEYS.GLOBAL_PREFERENCES, null));
      this.setItem(STORAGE_KEYS.GLOBAL_PREFERENCES, DEFAULT_GLOBAL_PREFERENCES);
      this.setItem(STORAGE_KEYS.REPOSITORY_PREFERENCES, {});
      console.log('Reset preferences to defaults');
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  }

  debugPreferences(): void {
    try {
      const globalPrefs = this.getItem<GlobalPreferences | null>(STORAGE_KEYS.GLOBAL_PREFERENCES, null);
      console.log('Global Preferences:', globalPrefs);
      console.log('Has branchParsing:', globalPrefs?.branchParsing ? 'Yes' : 'No');
      if (!globalPrefs?.branchParsing) {
        console.log('Resetting preferences to include branchParsing...');
        this.resetToDefaults();
      }
    } catch (error) {
      console.error('Error debugging preferences:', error);
    }
  }
}

export const preferencesService = new PreferencesService(); 