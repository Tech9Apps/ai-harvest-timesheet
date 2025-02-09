import simpleGit, { SimpleGit } from 'simple-git';
import { startOfDay, endOfDay, format } from 'date-fns';
import { CommitInfo } from '../types';
import fs from 'fs';
import path from 'path';

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  private async initGit(): Promise<SimpleGit> {
    if (this.git) return this.git;

    try {
      // Resolve the path to handle both relative and absolute paths
      const resolvedPath = path.resolve(this.repoPath);

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Directory does not exist: ${resolvedPath}`);
      }

      // Check if it's a directory
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${resolvedPath}`);
      }

      this.git = simpleGit(resolvedPath);
      return this.git;
    } catch (error) {
      console.error('Error initializing git:', error);
      throw error;
    }
  }

  async getTodayCommits(): Promise<CommitInfo[]> {
    const today = new Date();
    return this.getCommits(startOfDay(today), endOfDay(today));
  }

  async getCommits(since: Date, until: Date): Promise<CommitInfo[]> {
    try {
      const git = await this.initGit();

      // Format dates for git log command using ISO format
      const afterDate = format(since, 'yyyy-MM-dd');
      const beforeDate = format(until, 'yyyy-MM-dd');

      const logResult = await git.log([
        '--after', `${afterDate} 00:00:00`,
        '--before', `${beforeDate} 23:59:59`,
        '--all',  // Include all branches
        '--no-merges',  // Exclude merge commits
      ]);

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
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const git = await this.initGit();
      const branchResult = await git.branch();
      return branchResult.current || 'unknown';
    } catch (error) {
      console.error('Error getting current branch:', error);
      return 'unknown';
    }
  }

  async validateRepository(): Promise<boolean> {
    try {
      const git = await this.initGit();
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        console.error('Not a valid git repository:', this.repoPath);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validating repository:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return false;
    }
  }

  getRepoPath(): string {
    return this.repoPath;
  }
} 