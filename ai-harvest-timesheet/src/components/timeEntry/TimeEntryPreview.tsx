import React, { useState, useEffect } from 'react';
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
        } else if (preferences.enforce8Hours) {
          if (preferences.distributeAcrossRepositories) {
            // Get all commits for this day across repositories
            const allDayCommits = Object.values(dateCommits).flat();
            const distribution = DistributionService.distributeHours(
              allDayCommits,
              8,
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
            // Distribute 8 hours within this repository only
            const distribution = DistributionService.distributeHours(
              repoCommits,
              8,
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
          // If 8-hour enforcement is disabled, set hours to 0 for manual adjustment
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

  const validateHours = (repoPath: string, newHours: number, currentCommit: CommitInfo) => {
    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) return { 
      isValid: false, 
      message: 'Unable to validate hours: Repository configuration not found.' 
    };

    const preferences = getEffectivePreferences(repository.path);
    if (!preferences.enforce8Hours) return { isValid: true };

    // Get the date of the commit being validated
    const commitDate = format(parseISO(currentCommit.date), 'yyyy-MM-dd');
    const commitsByDate = groupCommitsByDate(processedCommits);
    const dateCommits = commitsByDate[commitDate] || {};

    if (preferences.distributeAcrossRepositories) {
      // Calculate total hours for this day across all repositories
      const totalHours = Object.entries(dateCommits).reduce((sum, [path, commits]) => {
        const repoSum = commits.reduce((repoSum, commit) => 
          repoSum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
          0
        );
        return sum + repoSum;
      }, 0);

      return {
        isValid: totalHours <= 8,
        message: totalHours > 8 
          ? `Total hours for ${format(parseISO(commitDate), 'MMM dd, yyyy')} (${totalHours.toFixed(2)}) exceed the 8-hour daily limit by ${(totalHours - 8).toFixed(2)} hours`
          : undefined
      };
    } else {
      // Validate hours only for current repository (regardless of date)
      const repoCommits = processedCommits[repoPath] || [];
      const totalHours = repoCommits.reduce((sum, commit) => 
        sum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
        0
      );

      return {
        isValid: totalHours <= 8,
        message: totalHours > 8 
          ? `Total hours for repository (${totalHours.toFixed(2)}) exceed the 8-hour limit by ${(totalHours - 8).toFixed(2)} hours`
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
    const remainingHours = 8 - newHours;

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
    if (preferences.enforce8Hours) {
      if (preferences.distributeAcrossRepositories) {
        const commitDate = format(parseISO(commit.date), 'yyyy-MM-dd');
        const commitsByDate = groupCommitsByDate(processedCommits);
        const dateCommits = commitsByDate[commitDate] || {};
        const totalHours = Object.values(dateCommits).reduce((sum, commits) => 
          sum + commits.reduce((repoSum, commit) => repoSum + (commit.hours ?? 0), 0),
          0
        );
        setSuccess(`Updated to ${newHours.toFixed(2)} hours (${(8 - totalHours).toFixed(2)} hours remaining for the day across all repositories)`);
      } else {
        const repoCommits = processedCommits[repoPath] || [];
        const totalHours = repoCommits.reduce((sum, c) => sum + (c.hours ?? 0), 0);
        setSuccess(`Updated to ${newHours.toFixed(2)} hours (${(8 - totalHours).toFixed(2)} hours remaining for the repository)`);
      }
    } else {
      setSuccess(`Updated to ${newHours.toFixed(2)} hours`);
    }

    // Redistribute hours if needed
    if (preferences.enforce8Hours && preferences.autoRedistributeHours) {
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

  const handleSync = async () => {
    if (Object.keys(processedCommits).length === 0) {
      setError('No time entries to sync. Please fetch commits first.');
      return;
    }

    // Group all commits by date for validation
    const commitsByDate = groupCommitsByDate(processedCommits);

    // Validate all entries before syncing
    for (const [date, dateCommits] of Object.entries(commitsByDate)) {
      // Check if any repository for this day has cross-repository distribution enabled
      const hasCrossRepoDistribution = Object.keys(dateCommits).some(repoPath => {
        const repository = repositories.find(repo => repo.path === repoPath);
        return repository && getEffectivePreferences(repository.path).distributeAcrossRepositories;
      });

      if (hasCrossRepoDistribution) {
        // Validate total hours across all repositories for this day
        const totalDayHours = Object.values(dateCommits).reduce((sum, commits) => 
          sum + commits.reduce((repoSum, commit) => repoSum + (commit.hours ?? 0), 0),
          0
        );
        
        if (totalDayHours > 8) {
          setError(
            `Unable to sync: Total hours for ${format(parseISO(date), 'MMM dd, yyyy')} ` +
            `(${totalDayHours.toFixed(2)}) exceed the 8-hour daily limit`
          );
          return;
        }
      }

      // Validate each repository separately
      for (const [repoPath, repoCommits] of Object.entries(dateCommits)) {
        const repository = repositories.find(repo => repo.path === repoPath);
        if (!repository) {
          setError(`Unable to sync: Repository configuration not found for ${repoPath}`);
          return;
        }

        const preferences = getEffectivePreferences(repository.path);
        if (preferences.enforce8Hours) {
          const totalRepoHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
          if (totalRepoHours > 8) {
            setError(
              `Unable to sync: Total hours for ${repository.path.split('/').pop()} ` +
              `(${totalRepoHours.toFixed(2)}) exceed the 8-hour limit`
            );
            return;
          }
        }
      }

      // Check for zero or negative hours
      for (const [repoPath, repoCommits] of Object.entries(dateCommits)) {
        const invalidCommit = repoCommits.find(commit => !commit.hours || commit.hours <= 0);
        if (invalidCommit) {
          setError(
            `Unable to sync: Invalid hours (${invalidCommit.hours}) found for commit in ${repoPath.split('/').pop()}`
          );
          return;
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
        
        const repoTimeEntries = repoCommits.map(commit => ({
          projectId: repository.harvestProjectId,
          taskId: repository.harvestTaskId,
          spentDate: format(new Date(commit.date), 'yyyy-MM-dd'),
          hours: commit.hours ?? 0,
          notes: commit.formattedMessage,
        }));

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
            startIcon={isRefreshing ? <CircularProgress size={20} /> : undefined}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={Object.keys(processedCommits).length === 0 || isLoading}
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
                const totalDayHours = Object.values(dateCommits)
                  .reduce((sum, commits) => 
                    sum + commits.reduce((repoSum, commit) => repoSum + (commit.hours ?? 0), 0), 
                    0
                  );

                return (
                  <Box key={date} sx={{ mb: 2 }}>
                    <Box 
                      sx={{ 
                        bgcolor: 'background.default',
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 0.5 }}>
                        {format(parseISO(date), 'EEEE, MMMM dd, yyyy')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {totalDayCommits} commit{totalDayCommits === 1 ? '' : 's'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total: {totalDayHours.toFixed(2)} hours
                        </Typography>
                        {Object.keys(dateCommits).some(repoPath => {
                          const repository = repositories.find(repo => repo.path === repoPath);
                          const preferences = repository ? getEffectivePreferences(repository.path) : null;
                          return preferences?.enforce8Hours && preferences?.distributeAcrossRepositories;
                        }) && totalDayHours > 8 && (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="body2" color="error">
                              Exceeds 8-hour limit
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
                            p: 1.5, 
                            pl: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.paper'
                          }}>
                            <FolderIcon color="action" />
                            <Typography variant="subtitle1">
                              {repoPath.split('/').pop()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {repoCommits.length} commit{repoCommits.length === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {totalRepoHours.toFixed(2)} hours
                            </Typography>
                            {!preferences?.distributeAcrossRepositories && preferences?.enforce8Hours && totalRepoHours > 8 && (
                              <Typography variant="body2" color="error">
                                (Exceeds 8-hour limit)
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
                                  p: 2,
                                  pl: 3,
                                  borderBottom: 1,
                                  borderColor: 'divider',
                                  '&:hover': {
                                    bgcolor: 'action.hover'
                                  }
                                }}
                              >
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <AccessTimeIcon 
                                      fontSize="small"
                                      sx={{ color: 'primary.light' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {format(parseISO(commit.date), 'h:mm a')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      •
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {formatDistanceToNow(parseISO(commit.date), { addSuffix: true })}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <CodeIcon 
                                      fontSize="small"
                                      sx={{ color: 'info.main' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {commit.branch}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body1">
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