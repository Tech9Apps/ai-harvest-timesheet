import simpleGit, { SimpleGit } from 'simple-git';
import { startOfDay, endOfDay } from 'date-fns';
import { CommitInfo } from '../types';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async getTodayCommits(): Promise<CommitInfo[]> {
    const today = new Date();
    return this.getCommits(startOfDay(today), endOfDay(today));
  }

  async getCommits(since: Date, until: Date): Promise<CommitInfo[]> {
    try {
      const logResult = await this.git.log({
        from: since.toISOString(),
        to: until.toISOString(),
      });

      const currentBranch = await this.getCurrentBranch();

      return logResult.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
        branch: currentBranch,
      }));
    } catch (error) {
      console.error('Error fetching commits:', error);
      throw error;
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const branchResult = await this.git.branch();
      return branchResult.current || 'unknown';
    } catch (error) {
      console.error('Error getting current branch:', error);
      return 'unknown';
    }
  }

  async validateRepository(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo();
      return isRepo;
    } catch (error) {
      console.error('Error validating repository:', error);
      return false;
    }
  }

  getRepoPath(): string {
    return this.repoPath;
  }
} 