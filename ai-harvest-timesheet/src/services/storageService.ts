import { Repository } from '../types';

const STORAGE_KEYS = {
  REPOSITORIES: 'harvest-timesheet:repositories',
};

class StorageService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  private setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  getRepositories(): Repository[] {
    return this.getItem<Repository[]>(STORAGE_KEYS.REPOSITORIES, []);
  }

  saveRepositories(repositories: Repository[]): void {
    this.setItem(STORAGE_KEYS.REPOSITORIES, repositories);
  }

  addRepository(repository: Repository): Repository[] {
    const repositories = this.getRepositories();
    repositories.push(repository);
    this.saveRepositories(repositories);
    return repositories;
  }

  updateRepository(updatedRepo: Repository): Repository[] {
    const repositories = this.getRepositories();
    const index = repositories.findIndex(repo => repo.id === updatedRepo.id);
    if (index !== -1) {
      repositories[index] = updatedRepo;
      this.saveRepositories(repositories);
    }
    return repositories;
  }

  deleteRepository(repositoryId: string): Repository[] {
    const repositories = this.getRepositories();
    const filteredRepos = repositories.filter(repo => repo.id !== repositoryId);
    this.saveRepositories(filteredRepos);
    return filteredRepos;
  }

  clearRepositories(): void {
    this.saveRepositories([]);
  }
}

export const storageService = new StorageService(); 