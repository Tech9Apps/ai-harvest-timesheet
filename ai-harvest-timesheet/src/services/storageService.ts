import { Repository } from '../types';
import { StorageError, QuotaExceededError, StorageUnavailableError, InvalidDataError } from '../types/errors';

const STORAGE_KEYS = {
  REPOSITORIES: 'harvest-timesheet:repositories',
};

class StorageService {
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
        'Failed to read from localStorage',
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
        'Failed to write to localStorage',
        'write',
        key,
        error as Error
      );
    }
  }

  getRepositories(): Repository[] {
    try {
      return this.getItem<Repository[]>(STORAGE_KEYS.REPOSITORIES, []);
    } catch (error) {
      // Log the error for debugging
      console.error('Error retrieving repositories:', error);
      
      // Return empty array as fallback
      return [];
    }
  }

  saveRepositories(repositories: Repository[]): void {
    try {
      this.setItem(STORAGE_KEYS.REPOSITORIES, repositories);
    } catch (error) {
      // Rethrow storage errors to be handled by the UI
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to save repositories',
        'write',
        STORAGE_KEYS.REPOSITORIES,
        error as Error
      );
    }
  }

  addRepository(repository: Repository): Repository[] {
    try {
      const repositories = this.getRepositories();
      repositories.push(repository);
      this.saveRepositories(repositories);
      return repositories;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to add repository',
        'write',
        STORAGE_KEYS.REPOSITORIES,
        error as Error
      );
    }
  }

  updateRepository(updatedRepo: Repository): Repository[] {
    try {
      const repositories = this.getRepositories();
      const index = repositories.findIndex(repo => repo.id === updatedRepo.id);
      if (index !== -1) {
        repositories[index] = updatedRepo;
        this.saveRepositories(repositories);
      }
      return repositories;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to update repository',
        'write',
        STORAGE_KEYS.REPOSITORIES,
        error as Error
      );
    }
  }

  deleteRepository(repositoryId: string): Repository[] {
    try {
      const repositories = this.getRepositories();
      const filteredRepos = repositories.filter(repo => repo.id !== repositoryId);
      this.saveRepositories(filteredRepos);
      return filteredRepos;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to delete repository',
        'write',
        STORAGE_KEYS.REPOSITORIES,
        error as Error
      );
    }
  }

  clearRepositories(): void {
    try {
      this.saveRepositories([]);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to clear repositories',
        'write',
        STORAGE_KEYS.REPOSITORIES,
        error as Error
      );
    }
  }

  clearAll(): void {
    try {
      localStorage.clear();
      console.log('[StorageService] All storage cleared successfully');
    } catch (error) {
      console.error('[StorageService] Error clearing storage:', error);
      throw new Error('Failed to clear storage');
    }
  }
}

export const storageService = new StorageService(); 