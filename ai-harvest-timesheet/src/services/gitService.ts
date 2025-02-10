import simpleGit, { SimpleGit } from 'simple-git';
import { startOfDay, endOfDay, format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { CommitInfo, Repository } from '../types';

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string;
  private extractTicketNumber: boolean;
  
  constructor(repository: Repository) {
    this.repoPath = repository.path;
    this.extractTicketNumber = repository.extractTicketNumber;
  }

  private formatBranchName(branchName: string): { ticketNumber: string; branchTitle: string } {
    if (!this.extractTicketNumber) {
      return { ticketNumber: '', branchTitle: branchName };
    }

    // Extract ticket number and branch title
    const match = branchName.match(/^(\d+)-(.+)$/);
    if (match) {
      const [, ticketNumber, branchTitle] = match;
      // Convert branch title from kebab-case to readable format
      const readableBranchTitle = branchTitle
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { ticketNumber, branchTitle: readableBranchTitle };
    }
    return { ticketNumber: '', branchTitle: branchName };
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

      // Get current branch first
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch === 'unknown') {
        throw new Error('Could not determine current branch');
      }

      // Format dates for git log command using ISO format
      const afterDate = format(since, 'yyyy-MM-dd');
      const beforeDate = format(until, 'yyyy-MM-dd');

      const logResult = await git.log([
        '--after', `${afterDate} 00:00:00`,
        '--before', `${beforeDate} 23:59:59`,
        currentBranch,  // Only get commits from current branch
        '--no-merges',  // Exclude merge commits
      ]);

      const { ticketNumber, branchTitle } = this.formatBranchName(currentBranch);

      return logResult.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        branch: currentBranch,
        formattedMessage: ticketNumber 
          ? `${ticketNumber} | ${branchTitle} | ${commit.message}`
          : `${branchTitle} | ${commit.message}`,
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