import simpleGit, { SimpleGit } from 'simple-git';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { CommitInfo, Repository, DiffStats } from '../types';
import { GlobalPreferences } from '../types/preferences';
import { BranchParsingService } from './branchParsingService';
import { preferencesService } from './preferencesService';

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string;
  private repository: Repository;
  
  constructor(repository: Repository) {
    this.repoPath = repository.path;
    this.repository = repository;
  }

  private formatBranchName(branchName: string): { ticketNumber: string; branchTitle: string } {
    if (!this.repository.extractTicketNumber) {
      return { ticketNumber: '', branchTitle: branchName };
    }

    const preferences = preferencesService.getGlobalPreferences();
    const { pattern } = preferences.branchParsing;
    
    const result = BranchParsingService.testPattern(pattern, branchName);
    
    if (result.isValid && result.ticket && result.title) {
      return {
        ticketNumber: result.ticket,
        branchTitle: result.title
      };
    }

    // Fallback to original branch name if pattern doesn't match
    return { ticketNumber: '', branchTitle: branchName };
  }

  private formatCommitMessage(ticketNumber: string, branchTitle: string, commitMessage: string): string {
    if (!this.repository.extractTicketNumber || !ticketNumber) {
      return `${branchTitle} | ${commitMessage}`;
    }

    const preferences = preferencesService.getGlobalPreferences();
    const { messageTemplate } = preferences.branchParsing;

    return BranchParsingService.formatMessage(messageTemplate, {
      ticket: ticketNumber,
      title: branchTitle,
      message: commitMessage
    });
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
    const configExtensions = ['.json', '.yml', '.yaml', '.toml', '.ini', '.config', '.env', '.properties'];
    if (configExtensions.some(ext => lowerFilename.endsWith(ext)) ||
        lowerFilename.includes('config') ||
        lowerFilename.includes('.env')) {
      return 'config';
    }
    
    // Source code files
    const sourceExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c',
      '.go', '.rb', '.php', '.cs', '.swift', '.kt', '.rs', '.dart', 
      '.sql', '.css', '.html', '.htm'
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

      // Convert dates to UTC timestamps (seconds)
      const startTimestamp = Math.floor(since.getTime() / 1000);
      const endTimestamp = Math.floor(until.getTime() / 1000);

      console.log('Git date range:', {
        start: new Date(startTimestamp * 1000).toISOString(),
        end: new Date(endTimestamp * 1000).toISOString()
      });

      const logResult = await git.log([
        `--since=${startTimestamp}`,
        `--until=${endTimestamp}`,
        '--date=iso-strict',
        currentBranch,
        '--no-merges',
        '--author', currentUser,
      ]);

      console.log('Raw commits found:', logResult.all.length);

      // Additional date filtering to ensure commits are within range
      const filteredCommits = logResult.all.filter(commit => {
        const commitDate = new Date(commit.date);
        const commitTimestamp = Math.floor(commitDate.getTime() / 1000);
        return commitTimestamp >= startTimestamp && commitTimestamp <= endTimestamp;
      });

      console.log('Filtered commits:', {
        before: logResult.all.length,
        after: filteredCommits.length,
        startDate: new Date(startTimestamp * 1000).toISOString(),
        endDate: new Date(endTimestamp * 1000).toISOString()
      });

      const { ticketNumber, branchTitle } = this.formatBranchName(currentBranch);

      // Get diff stats for each commit
      const commitsWithStats = await Promise.all(
        filteredCommits.map(async commit => {
          const diffStats = await this.getDiffStats(commit.hash);
          return {
            hash: commit.hash,
            date: commit.date,
            message: commit.message,
            branch: currentBranch,
            ticket: ticketNumber,
            formattedMessage: this.formatCommitMessage(ticketNumber, branchTitle, commit.message),
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