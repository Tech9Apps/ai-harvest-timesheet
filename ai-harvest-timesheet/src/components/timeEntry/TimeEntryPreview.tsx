import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Button, 
  Snackbar, 
  Alert, 
  CircularProgress, 
  Backdrop, 
  Skeleton,
  Divider,
  Stack,
  ListItemIcon
} from '@mui/material';
import { 
  Folder as FolderIcon,
  AccessTime as AccessTimeIcon,
  Sync as SyncIcon,
  CalendarToday as CalendarTodayIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Repository, TimeEntry, CommitInfo } from '../../types';
import { GlobalPreferences } from '../../types/preferences';
import { useLoading } from '../../context/LoadingContext';
import { usePreferences } from '../../context/PreferencesContext';
import { DateRangeSelector } from './DateRangeSelector';
import { HourEditor } from './HourEditor';
import { RefreshWarningDialog } from './RefreshWarningDialog';
import { DistributionService } from '../../services/distributionService';

interface TimeEntryPreviewProps {
  commits: { [repoPath: string]: CommitInfo[] };
  repositories: Repository[];
  onSync: (timeEntries: TimeEntry[]) => Promise<void>;
  onRefresh: (startDate?: Date, endDate?: Date) => Promise<void>;
}

interface ManualAdjustment {
  repoPath: string;
  commitHash: string;
  originalHours: number;
}

interface CommitsByDate {
  [date: string]: {
    [repoPath: string]: CommitInfo[];
  };
}

const groupCommitsByDate = (commits: { [repoPath: string]: CommitInfo[] }): CommitsByDate => {
  const commitsByDate: CommitsByDate = {};
  
  Object.entries(commits).forEach(([repoPath, repoCommits]) => {
    repoCommits.forEach(commit => {
      const dateKey = format(parseISO(commit.date), 'yyyy-MM-dd');
      
      if (!commitsByDate[dateKey]) {
        commitsByDate[dateKey] = {};
      }
      
      if (!commitsByDate[dateKey][repoPath]) {
        commitsByDate[dateKey][repoPath] = [];
      }
      
      commitsByDate[dateKey][repoPath].push(commit);
    });
  });
  
  return commitsByDate;
};

export const TimeEntryPreview: React.FC<TimeEntryPreviewProps> = ({
  commits,
  repositories,
  onSync,
  onRefresh,
}) => {
  const { setLoading, isLoading } = useLoading();
  const { getEffectivePreferences } = usePreferences();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processedCommits, setProcessedCommits] = useState<{ [repoPath: string]: CommitInfo[] }>({});
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustment[]>([]);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [rangeType, setRangeType] = useState<'today' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [pendingRefresh, setPendingRefresh] = useState<{ startDate?: Date; endDate?: Date } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const HOURS_COMPARISON_TOLERANCE = 0.001; // 3.6 seconds tolerance

  useEffect(() => {
    // Process commits when they change
    const commitsByDate = groupCommitsByDate(commits);
    const newProcessedCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    // Process each day independently
    Object.entries(commitsByDate).forEach(([date, dateCommits]) => {
      // Process each repository's commits for this day
      Object.entries(dateCommits).forEach(([repoPath, repoCommits]) => {
        const repository = repositories.find(repo => repo.path === repoPath);
        if (!repository) return;
        
        const preferences = getEffectivePreferences(repository.path);
        const hasCustomHours = repoCommits.some(commit => commit.hours !== undefined);
        
        if (hasCustomHours) {
          if (!newProcessedCommits[repoPath]) {
            newProcessedCommits[repoPath] = [];
          }
          newProcessedCommits[repoPath].push(...repoCommits);
        } else if (preferences.customEnforceHours) {
          if (preferences.distributeAcrossRepositories) {
            // Get all commits for this day across repositories
            const allDayCommits = Object.values(dateCommits).flat();
            const distribution = DistributionService.distributeHours(
              allDayCommits,
              preferences.customHoursValue,
              preferences
            );

            // Apply distributed hours to this repository's commits
            const processedCommits = repoCommits.map(commit => ({
              ...commit,
              hours: distribution.get(commit.hash) ?? 0,
            }));
            
            if (!newProcessedCommits[repoPath]) {
              newProcessedCommits[repoPath] = [];
            }
            newProcessedCommits[repoPath].push(...processedCommits);
          } else {
            // Distribute custom daily hours within this repository only
            const distribution = DistributionService.distributeHours(
              repoCommits,
              preferences.customHoursValue,
              preferences
            );

            const processedCommits = repoCommits.map(commit => ({
              ...commit,
              hours: distribution.get(commit.hash) ?? 0,
            }));
            
            if (!newProcessedCommits[repoPath]) {
              newProcessedCommits[repoPath] = [];
            }
            newProcessedCommits[repoPath].push(...processedCommits);
          }
        } else {
          // If daily hours enforcement is disabled, set hours to 0 for manual adjustment
          const processedCommits = repoCommits.map(commit => ({
            ...commit,
            hours: 0,
          }));
          
          if (!newProcessedCommits[repoPath]) {
            newProcessedCommits[repoPath] = [];
          }
          newProcessedCommits[repoPath].push(...processedCommits);
        }
      });
    });
    
    setProcessedCommits(newProcessedCommits);
  }, [commits, repositories, getEffectivePreferences]);

  // Update tray menu with today's hours
  useEffect(() => {
    const todaysCommits = Object.values(processedCommits)
      .flat()
      .filter(commit => {
        const commitDate = new Date(commit.date);
        const today = new Date();
        return (
          commitDate.getDate() === today.getDate() &&
          commitDate.getMonth() === today.getMonth() &&
          commitDate.getFullYear() === today.getFullYear()
        );
      });

    const totalHours = todaysCommits.reduce((sum, commit) => sum + (commit.hours || 0), 0);
    ipcRenderer.send('update-hours', totalHours);
  }, [processedCommits]);

  const validateHours = (repoPath: string, newHours: number, currentCommit: CommitInfo) => {
    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) return { 
      isValid: false, 
      message: 'Unable to validate hours: Repository configuration not found.' 
    };

    const preferences = getEffectivePreferences(repository.path);
    if (!preferences.customEnforceHours) return { isValid: true };

    // Get the date of the commit being validated
    const commitDate = format(parseISO(currentCommit.date), 'yyyy-MM-dd');
    const commitsByDate = groupCommitsByDate(processedCommits);
    const dateCommits = commitsByDate[commitDate] || {};

    if (preferences.distributeAcrossRepositories) {
      // When cross-repository distribution is enabled, only validate total hours across all repositories
      const totalHours = Object.entries(dateCommits).reduce((sum, [path, commits]) => {
        const repoSum = commits.reduce((repoSum, commit) => 
          repoSum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
          0
        );
        return sum + repoSum;
      }, 0);

      return {
        isValid: (totalHours - preferences.customHoursValue) <= HOURS_COMPARISON_TOLERANCE,
        message: (totalHours - preferences.customHoursValue) > HOURS_COMPARISON_TOLERANCE
          ? `Total hours for ${format(parseISO(commitDate), 'MMM dd, yyyy')} (${totalHours.toFixed(2)}) exceed the ${preferences.customHoursValue}-hour daily limit by ${(totalHours - preferences.customHoursValue).toFixed(2)} hours`
          : undefined
      };
    } else {
      // Only validate individual repository hours when cross-repository distribution is disabled
      const repoCommits = processedCommits[repoPath] || [];
      const totalHours = repoCommits.reduce((sum, commit) => 
        sum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
        0
      );

      return {
        isValid: (totalHours - preferences.customHoursValue) <= HOURS_COMPARISON_TOLERANCE,
        message: (totalHours - preferences.customHoursValue) > HOURS_COMPARISON_TOLERANCE
          ? `Total hours for repository (${totalHours.toFixed(2)}) exceed the ${preferences.customHoursValue}-hour limit by ${(totalHours - preferences.customHoursValue).toFixed(2)} hours`
          : undefined
      };
    }
  };

  const redistributeHours = (repoPath: string, adjustedCommit: CommitInfo, newHours: number) => {
    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) return;

    const preferences = getEffectivePreferences(repository.path);
    if (!preferences.autoRedistributeHours) return;

    const date = adjustedCommit.date;
    const remainingHours = preferences.customHoursValue - newHours;

    if (preferences.distributeAcrossRepositories) {
      // Get all commits for this day across repositories
      const allCommits = Object.entries(commits)
        .flatMap(([path, repoCommits]) => 
          repoCommits
            .filter(commit => 
              commit.date === date && 
              commit.hash !== adjustedCommit.hash &&
              repositories.find(r => r.path === path)?.enabled
            )
        );

      const distribution = DistributionService.distributeHours(
        allCommits,
        remainingHours,
        preferences
      );

      // Update all repositories
      setProcessedCommits(prev => {
        const newProcessedCommits = { ...prev };
        Object.keys(newProcessedCommits).forEach(path => {
          newProcessedCommits[path] = prev[path].map(commit => {
            if (commit.hash === adjustedCommit.hash) return { ...commit, hours: newHours };
            const distributedHours = distribution.get(commit.hash);
            return distributedHours !== undefined ? { ...commit, hours: distributedHours } : commit;
          });
        });
        return newProcessedCommits;
      });
    } else {
      // Get commits only from this repository
      const repoCommits = commits[repoPath]?.filter(
        commit => commit.date === date && commit.hash !== adjustedCommit.hash
      ) || [];

      const distribution = DistributionService.distributeHours(
        repoCommits,
        remainingHours,
        preferences
      );

      // Update commits in this repository
      setProcessedCommits(prev => ({
        ...prev,
        [repoPath]: prev[repoPath].map(commit => {
          if (commit.hash === adjustedCommit.hash) return { ...commit, hours: newHours };
          const distributedHours = distribution.get(commit.hash);
          return distributedHours !== undefined ? { ...commit, hours: distributedHours } : commit;
        })
      }));
    }
  };

  const handleHourChange = (repoPath: string, commit: CommitInfo, newHours: number): void => {
    // Validate input
    if (newHours < 0) {
      setError('Hours cannot be negative.');
      return;
    }

    if (newHours === 0) {
      setError('Hours cannot be zero. Please enter a positive value or remove the commit.');
      return;
    }

    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) {
      setError('Repository not found. Please refresh the page and try again.');
      return;
    }

    const preferences = getEffectivePreferences(repository.path);
    const validation = validateHours(repoPath, newHours, commit);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid hours');
      return;
    }

    const originalHours = commit.hours ?? 0;
    
    // Record manual adjustment
    if (!manualAdjustments.some(adj => adj.repoPath === repoPath && adj.commitHash === commit.hash)) {
      setManualAdjustments(prev => [...prev, {
        repoPath,
        commitHash: commit.hash,
        originalHours
      }]);
    }

    // Update hours
    const updatedCommits = processedCommits[repoPath].map(c => 
      c.hash === commit.hash ? { ...c, hours: newHours } : c
    );

    setProcessedCommits(prev => ({
      ...prev,
      [repoPath]: updatedCommits
    }));

    // Clear any existing messages
    setError(null);
    setSuccess(null);

    // Show appropriate success message
    if (preferences.customEnforceHours) {
      if (preferences.distributeAcrossRepositories) {
        const commitDate = format(parseISO(commit.date), 'yyyy-MM-dd');
        const commitsByDate = groupCommitsByDate(processedCommits);
        const dateCommits = commitsByDate[commitDate] || {};
        const totalHours = Object.values(dateCommits).reduce((sum, commits) => 
          sum + commits.reduce((repoSum, commit) => repoSum + (commit.hours ?? 0), 0),
          0
        );
        setSuccess(`Updated to ${newHours.toFixed(2)} hours (${(preferences.customHoursValue - totalHours).toFixed(2)} hours remaining for the day across all repositories)`);
      } else {
        const repoCommits = processedCommits[repoPath] || [];
        const totalHours = repoCommits.reduce((sum, c) => sum + (c.hours ?? 0), 0);
        setSuccess(`Updated to ${newHours.toFixed(2)} hours (${(preferences.customHoursValue - totalHours).toFixed(2)} hours remaining for the repository)`);
      }
    } else {
      setSuccess(`Updated to ${newHours.toFixed(2)} hours`);
    }

    // Redistribute hours if needed
    if (preferences.autoRedistributeHours) {
      redistributeHours(repoPath, commit, newHours);
    }
  };

  const handleResetHours = (repoPath: string, commit: CommitInfo) => {
    // Remove manual adjustment record
    setManualAdjustments(prev => 
      prev.filter(adj => !(adj.repoPath === repoPath && adj.commitHash === commit.hash))
    );

    // Reset to original hours
    const adjustment = manualAdjustments.find(
      adj => adj.repoPath === repoPath && adj.commitHash === commit.hash
    );

    if (adjustment) {
      handleHourChange(repoPath, commit, adjustment.originalHours);
    }
  };

  const handleRefreshClick = async (startDate?: Date, endDate?: Date) => {
    if (manualAdjustments.length > 0) {
      setShowRefreshWarning(true);
      setPendingRefresh({ startDate, endDate });
    } else {
      try {
        setIsRefreshing(true);
        setError(null);
        await onRefresh(startDate, endDate);
      } catch (error) {
        console.error('Error refreshing commits:', error);
        setError('Failed to refresh commits. Please try again.');
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleRefreshConfirm = async () => {
    setShowRefreshWarning(false);
    setManualAdjustments([]);
    if (pendingRefresh) {
      try {
        setIsRefreshing(true);
        setError(null);
        await onRefresh(pendingRefresh.startDate, pendingRefresh.endDate);
      } catch (error) {
        console.error('Error refreshing commits:', error);
        setError('Failed to refresh commits. Please try again.');
      } finally {
        setIsRefreshing(false);
        setPendingRefresh(null);
      }
    }
  };

  const createTimeEntryWithExternalReference = (
    commit: CommitInfo,
    repository: Repository,
    preferences: GlobalPreferences
  ): TimeEntry => {
    const baseEntry = {
      projectId: repository.harvestProjectId,
      taskId: repository.harvestTaskId,
      spentDate: format(new Date(commit.date), 'yyyy-MM-dd'),
      hours: commit.hours ?? 0,
      notes: commit.formattedMessage,
    };

    // Only add external reference if the feature is enabled and we have a ticket number
    if (preferences.externalIssue.enabled && 
        preferences.externalIssue.issueTracker.type !== 'none' && 
        commit.ticket) {
      
      const { type, baseUrl } = preferences.externalIssue.issueTracker;
      
      // Format the external reference based on the issue tracker type
      const external_reference = {
        id: commit.ticket,
        group_id: type.toUpperCase(),
        permalink: type === 'jira' 
          ? `${baseUrl}/browse/${commit.ticket}`
          : `${baseUrl}/issues/${commit.ticket.replace('#', '')}`
      };

      return { ...baseEntry, external_reference };
    }

    return baseEntry;
  };

  const handleSync = async () => {
    if (Object.keys(processedCommits).length === 0) {
      setError('No time entries to sync. Please fetch commits first.');
      return;
    }

    // Group all commits by date for validation
    const commitsByDate = groupCommitsByDate(processedCommits);

    // Validate all entries before syncing
    for (const [date, dateCommits] of Object.entries(commitsByDate)) {
      // Check for zero or negative hours first
      for (const [repoPath, repoCommits] of Object.entries(dateCommits)) {
        const invalidCommit = repoCommits.find(commit => !commit.hours || commit.hours <= 0);
        if (invalidCommit) {
          const repository = repositories.find(repo => repo.path === repoPath);
          setError(
            `Unable to sync: Invalid hours (${invalidCommit.hours}) found for commit in ${repository?.path.split('/').pop() ?? repoPath}`
          );
          return;
        }
      }

      // Validate each repository's hours
      for (const [repoPath, repoCommits] of Object.entries(dateCommits)) {
        const repository = repositories.find(repo => repo.path === repoPath);
        if (!repository) {
          setError(`Unable to sync: Repository configuration not found for ${repoPath}`);
          return;
        }

        const preferences = getEffectivePreferences(repository.path);
        if (preferences.customEnforceHours) {
          const totalRepoHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
          if ((totalRepoHours - preferences.customHoursValue) > HOURS_COMPARISON_TOLERANCE) {
            setError(
              `Unable to sync: Total hours for ${repository.path.split('/').pop()} ` +
              `(${totalRepoHours.toFixed(2)}) exceed the ${preferences.customHoursValue}-hour limit`
            );
            return;
          }
        }
      }
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const timeEntries: TimeEntry[] = [];
      
      for (const [repoPath, repoCommits] of Object.entries(processedCommits)) {
        const repository = repositories.find(repo => repo.path === repoPath);
        if (!repository) continue;
        
        const preferences = getEffectivePreferences(repository.path);
        const repoTimeEntries = repoCommits.map(commit => 
          createTimeEntryWithExternalReference(commit, repository, preferences)
        );

        timeEntries.push(...repoTimeEntries);
      }

      await onSync(timeEntries);
      const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
      setSuccess(
        `Successfully synced ${timeEntries.length} time ${timeEntries.length === 1 ? 'entry' : 'entries'} ` +
        `(${totalHours.toFixed(2)} hours) to Harvest!`
      );
    } catch (error) {
      console.error('Error syncing time entries:', error);
      setError(
        'Failed to sync time entries to Harvest. ' +
        'Please check your internet connection and Harvest credentials, then try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    handleRefreshClick(newStartDate, newEndDate);
  };

  const handleRangeTypeChange = (newRangeType: 'today' | 'custom') => {
    setRangeType(newRangeType);
  };

  return (
    <Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success.main" sx={{ mb: 2 }}>
          {success}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Time Entries Preview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => handleRefreshClick(startDate, endDate)}
            disabled={isRefreshing}
            startIcon={isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={Object.keys(processedCommits).length === 0 || isLoading}
            startIcon={<SyncIcon />}
          >
            Sync to Harvest
          </Button>
        </Box>
      </Box>

      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
        onRangeTypeChange={handleRangeTypeChange}
        rangeType={rangeType}
        disabled={isRefreshing}
      />

      <Paper elevation={2}>
        {isRefreshing ? (
          <List>
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <ListItem>
                  <ListItemText
                    primary={<Skeleton width="60%" />}
                    secondary={<Skeleton width="40%" />}
                  />
                </ListItem>
                <ListItem sx={{ pl: 4 }}>
                  <ListItemText
                    primary={<Skeleton width="100%" />}
                    secondary={<Skeleton width="80%" />}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <List sx={{ p: 0 }}>
            {Object.entries(groupCommitsByDate(processedCommits))
              .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
              .map(([date, dateCommits]) => {
                const totalDayCommits = Object.values(dateCommits)
                  .reduce((sum, commits) => sum + commits.length, 0);
                const totalDayHours = Object.values(dateCommits).reduce((sum, commits) => 
                  sum + commits.reduce((repoSum, commit) => repoSum + (commit.hours ?? 0), 0),
                  0
                );

                // Get preferences from any enabled repository for this day
                const anyEnabledRepo = Object.keys(dateCommits)
                  .find(repoPath => repositories.find(repo => repo.path === repoPath)?.enabled);
                const dayPreferences = anyEnabledRepo ? 
                  getEffectivePreferences(anyEnabledRepo) : 
                  null;

                return (
                  <Box key={date} sx={{ mb: 2 }}>
                    <Box 
                      sx={{ 
                        bgcolor: 'background.default',
                        p: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 500, color: 'text.primary' }}>
                        {format(parseISO(date), 'EEEE, MMMM dd, yyyy')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {totalDayCommits} commit{totalDayCommits === 1 ? '' : 's'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          •
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          Total: {totalDayHours.toFixed(2)} hours
                        </Typography>
                        {dayPreferences?.customEnforceHours && 
                          (totalDayHours - dayPreferences.customHoursValue) > HOURS_COMPARISON_TOLERANCE && (
                          <>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              •
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'error.light' }}>
                              Exceeds {dayPreferences.customHoursValue}-hour limit
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>

                    {Object.entries(dateCommits).map(([repoPath, repoCommits]) => {
                      const repository = repositories.find(repo => repo.path === repoPath);
                      const preferences = repository ? getEffectivePreferences(repository.path) : null;
                      const totalRepoHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
                      
                      return (
                        <Box key={`${date}-${repoPath}`}>
                          <Box sx={{ 
                            p: 1.25, 
                            pl: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.paper'
                          }}>
                            <FolderIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                              {repoPath.split('/').pop()}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              •
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              {repoCommits.length} commit{repoCommits.length === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              •
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              {totalRepoHours.toFixed(2)} hours
                            </Typography>
                            {!preferences?.distributeAcrossRepositories && 
                              preferences?.customEnforceHours && 
                              (totalRepoHours - preferences.customHoursValue) > HOURS_COMPARISON_TOLERANCE && (
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'error.light' }}>
                                (Exceeds {preferences.customHoursValue}-hour limit)
                              </Typography>
                            )}
                          </Box>

                          {repoCommits.map((commit) => {
                            const isManuallySet = manualAdjustments.some(
                              adj => adj.repoPath === repoPath && adj.commitHash === commit.hash
                            );
                            const adjustment = manualAdjustments.find(
                              adj => adj.repoPath === repoPath && adj.commitHash === commit.hash
                            );

                            return (
                              <Box 
                                key={commit.hash} 
                                sx={{ 
                                  display: 'grid',
                                  gridTemplateColumns: '1fr auto',
                                  gap: 2,
                                  p: 1.5,
                                  pl: 3,
                                  borderBottom: 1,
                                  borderColor: 'divider',
                                  '&:hover': {
                                    bgcolor: 'action.hover'
                                  }
                                }}
                              >
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                    <AccessTimeIcon 
                                      sx={{ fontSize: '1rem', color: 'primary.light' }}
                                    />
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                      {format(parseISO(commit.date), 'h:mm a')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                      •
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                      {formatDistanceToNow(parseISO(commit.date), { addSuffix: true })}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                    <CodeIcon 
                                      sx={{ fontSize: '1rem', color: 'info.light' }}
                                    />
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                      {commit.branch}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
                                    {commit.formattedMessage}
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  justifyContent: 'flex-end'
                                }}>
                                  <HourEditor
                                    hours={commit.hours ?? 0}
                                    originalHours={adjustment?.originalHours}
                                    isManuallySet={isManuallySet}
                                    onHourChange={(hours) => handleHourChange(repoPath, commit, hours)}
                                    onReset={() => handleResetHours(repoPath, commit)}
                                    validate={(hours) => validateHours(repoPath, hours, commit)}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
          </List>
        )}
      </Paper>

      <RefreshWarningDialog
        open={showRefreshWarning}
        onClose={() => setShowRefreshWarning(false)}
        onConfirm={handleRefreshConfirm}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 