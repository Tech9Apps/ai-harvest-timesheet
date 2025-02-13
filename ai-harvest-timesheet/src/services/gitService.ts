import simpleGit, { SimpleGit } from 'simple-git';
import { startOfDay, endOfDay, format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { CommitInfo, Repository, DiffStats } from '../types';

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

  private async getCurrentUser(): Promise<string> {
    try {
      const git = await this.initGit();
      const config = await git.listConfig();
      const email = config.all['user.email'];
      const name = config.all['user.name'];
      // Handle both string and array cases
      const userEmail = Array.isArray(email) ? email[0] : email;
      const userName = Array.isArray(name) ? name[0] : name;
      return userEmail ? userEmail : (userName || '');
    } catch (error) {
      console.error('Error getting current user:', error);
      return '';
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

  private determineFileType(filename: string): 'source' | 'test' | 'config' | 'other' {
    const lowerFilename = filename.toLowerCase();
    
    // Test files
    if (lowerFilename.includes('test') || lowerFilename.includes('spec')) {
      return 'test';
    }
    
    // Configuration files
    const configExtensions = ['.json', '.yml', '.yaml', '.toml', '.ini', '.config'];
    if (configExtensions.some(ext => lowerFilename.endsWith(ext)) ||
        lowerFilename.includes('config') ||
        lowerFilename.includes('.env')) {
      return 'config';
    }
    
    // Source code files
    const sourceExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
      '.go', '.rb', '.php', '.cs', '.swift', '.kt', '.rs'
    ];
    if (sourceExtensions.some(ext => lowerFilename.endsWith(ext))) {
      return 'source';
    }
    
    return 'other';
  }

  private async getDiffStats(commitHash: string): Promise<DiffStats> {
    try {
      const git = await this.initGit();
      
      // Get the commit diff
      const diff = await git.show([
        commitHash,
        '--numstat',  // Get numeric statistics
        '--format=',  // Don't show commit message
      ]);

      // Parse the numstat output
      const files = diff.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [insertions, deletions, filename] = line.split('\t');
          return {
            filename,
            insertions: parseInt(insertions) || 0,
            deletions: parseInt(deletions) || 0,
            changes: (parseInt(insertions) || 0) + (parseInt(deletions) || 0),
            type: this.determineFileType(filename)
          };
        });

      return {
        filesChanged: files.length,
        insertions: files.reduce((sum, file) => sum + file.insertions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
        files
      };
    } catch (error) {
      console.error('Error getting diff stats:', error);
      return {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        files: []
      };
    }
  }

  async getCommits(since: Date, until: Date): Promise<CommitInfo[]> {
    try {
      const git = await this.initGit();

      // Get current branch first
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch === 'unknown') {
        throw new Error('Could not determine current branch');
      }

      // Get current user's email or name
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Could not determine current user');
      }

      // Format dates for git log command using ISO format
      const afterDate = format(since, 'yyyy-MM-dd');
      const beforeDate = format(until, 'yyyy-MM-dd');

      const logResult = await git.log([
        '--after', `${afterDate} 00:00:00`,
        '--before', `${beforeDate} 23:59:59`,
        currentBranch,  // Only get commits from current branch
        '--no-merges',  // Exclude merge commits
        '--author', currentUser,  // Only get commits from current user
      ]);

      const { ticketNumber, branchTitle } = this.formatBranchName(currentBranch);

      // Get diff stats for each commit
      const commitsWithStats = await Promise.all(
        logResult.all.map(async commit => {
          const diffStats = await this.getDiffStats(commit.hash);
          return {
            hash: commit.hash,
            date: commit.date,
            message: commit.message,
            branch: currentBranch,
            formattedMessage: ticketNumber 
              ? `${ticketNumber} | ${branchTitle} | ${commit.message}`
              : `${branchTitle} | ${commit.message}`,
            diffStats
          };
        })
      );

      return commitsWithStats;
    } catch (error) {
      console.error('Error fetching commits:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
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