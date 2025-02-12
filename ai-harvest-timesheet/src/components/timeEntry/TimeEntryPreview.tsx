import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button, Snackbar, Alert, CircularProgress, Backdrop, Skeleton } from '@mui/material';
import { format } from 'date-fns';
import { Repository, TimeEntry, CommitInfo } from '../../types';
import { useLoading } from '../../context/LoadingContext';
import { usePreferences } from '../../context/PreferencesContext';
import { DateRangeSelector } from './DateRangeSelector';
import { HourEditor } from './HourEditor';
import { RefreshWarningDialog } from './RefreshWarningDialog';

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

export const TimeEntryPreview: React.FC<TimeEntryPreviewProps> = ({
  commits,
  repositories,
  onSync,
  onRefresh,
}) => {
  const { setLoading } = useLoading();
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
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Process commits when they change
    const newProcessedCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    for (const [repoPath, repoCommits] of Object.entries(commits)) {
      const repository = repositories.find(repo => repo.path === repoPath);
      if (!repository) continue;

      const preferences = getEffectivePreferences(repository.path);
      const hasCustomHours = repoCommits.some(commit => commit.hours !== undefined);
      
      if (hasCustomHours) {
        newProcessedCommits[repoPath] = repoCommits;
      } else {
        const hoursPerCommit = preferences.enforce8Hours ? 8 / repoCommits.length : 0;
        newProcessedCommits[repoPath] = repoCommits.map(commit => ({
          ...commit,
          hours: hoursPerCommit,
        }));
      }
    }
    
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

    const repoCommits = processedCommits[repoPath] || [];
    const totalHours = repoCommits.reduce((sum, commit) => 
      sum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
      0
    );

    const remainingHours = 8 - totalHours;
    return {
      isValid: totalHours <= 8,
      message: totalHours > 8 
        ? `Total hours (${totalHours.toFixed(2)}) exceed the 8-hour daily limit by ${(totalHours - 8).toFixed(2)} hours`
        : undefined
    };
  };

  const redistributeHours = (repoPath: string, adjustedCommit: CommitInfo, newHours: number) => {
    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) {
      setError('Unable to redistribute hours: Repository configuration not found.');
      return;
    }

    const preferences = repository ? getEffectivePreferences(repository.path) : null;
    if (!preferences?.enforce8Hours || !preferences?.autoRedistributeHours) {
      // Don't show error if redistribution is disabled by preferences
      return;
    }

    const repoCommits = [...(processedCommits[repoPath] || [])];
    const otherCommits = repoCommits.filter(commit => commit.hash !== adjustedCommit.hash);
    const remainingHours = 8 - newHours;
    
    if (remainingHours <= 0 || otherCommits.length === 0) {
      if (remainingHours < 0) {
        setError(`Cannot redistribute hours: Entry of ${newHours.toFixed(2)} hours already exceeds the 8-hour limit.`);
      } else if (otherCommits.length === 0) {
        setError('Cannot redistribute hours: No other commits available for redistribution.');
      }
      return;
    }

    const totalOtherHours = otherCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
    const ratio = remainingHours / totalOtherHours;

    const updatedCommits = repoCommits.map(commit => {
      if (commit.hash === adjustedCommit.hash) {
        return { ...commit, hours: newHours };
      }
      const redistributedHours = ((commit.hours ?? 0) * ratio);
      return {
        ...commit,
        hours: redistributedHours
      };
    });

    setProcessedCommits(prev => ({
      ...prev,
      [repoPath]: updatedCommits
    }));

    setSuccess(
      `Hours updated and redistributed:\n` +
      `• Set to ${newHours.toFixed(2)} hours for current commit\n` +
      `• Remaining ${remainingHours.toFixed(2)} hours split among ${otherCommits.length} other commit${otherCommits.length === 1 ? '' : 's'}`
    );
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

    const repository = repositories.find(repo => repo.path === repoPath);
    const preferences = repository ? getEffectivePreferences(repository.path) : null;

    // Show appropriate success message
    if (preferences?.enforce8Hours) {
      setSuccess(`Updated to ${newHours.toFixed(2)} hours (${(8 - newHours).toFixed(2)} hours remaining for the day)`);
    } else {
      setSuccess(`Updated to ${newHours.toFixed(2)} hours`);
    }

    // Redistribute hours if needed
    redistributeHours(repoPath, commit, newHours);
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

    // Validate all entries before syncing
    for (const [repoPath, repoCommits] of Object.entries(processedCommits)) {
      const repository = repositories.find(repo => repo.path === repoPath);
      if (!repository) {
        setError(`Unable to sync: Repository configuration not found for ${repoPath}`);
        return;
      }

      const preferences = getEffectivePreferences(repository.path);
      if (preferences.enforce8Hours) {
        const totalHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
        if (totalHours > 8) {
          setError(
            `Unable to sync: Total hours for ${repository.path.split('/').pop()} ` +
            `(${totalHours.toFixed(2)}) exceed the 8-hour limit`
          );
          return;
        }
      }

      // Check for zero or negative hours
      const invalidCommit = repoCommits.find(commit => !commit.hours || commit.hours <= 0);
      if (invalidCommit) {
        setError(
          `Unable to sync: Invalid hours (${invalidCommit.hours}) found for commit in ${repository.path.split('/').pop()}`
        );
        return;
      }
    }

    try {
      setIsSyncing(true);
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
      setIsSyncing(false);
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
            disabled={Object.keys(processedCommits).length === 0 || isSyncing}
            startIcon={isSyncing ? <CircularProgress size={20} /> : undefined}
          >
            {isSyncing ? 'Syncing...' : 'Sync to Harvest'}
          </Button>
        </Box>
      </Box>

      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
        onRangeTypeChange={handleRangeTypeChange}
        rangeType={rangeType}
        disabled={isRefreshing || isSyncing}
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
          <List>
            {Object.entries(processedCommits).map(([repoPath, repoCommits]) => {
              const repository = repositories.find(repo => repo.path === repoPath);
              const preferences = repository ? getEffectivePreferences(repository.path) : null;
              const totalHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
              
              return (
                <React.Fragment key={repoPath}>
                  <ListItem>
                    <ListItemText
                      primary={repoPath.split('/').pop()}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {repoCommits.length} commits - Total: {totalHours.toFixed(2)} hours
                          </Typography>
                          {preferences?.enforce8Hours && totalHours > 8 && (
                            <Typography variant="body2" color="error">
                              Warning: Total hours exceed 8-hour limit
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {repoCommits.map((commit) => {
                    const isManuallySet = manualAdjustments.some(
                      adj => adj.repoPath === repoPath && adj.commitHash === commit.hash
                    );
                    const adjustment = manualAdjustments.find(
                      adj => adj.repoPath === repoPath && adj.commitHash === commit.hash
                    );

                    return (
                      <ListItem key={commit.hash} sx={{ pl: 4 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2">
                                {format(new Date(commit.date), 'MMM dd, yyyy HH:mm')}
                              </Typography>
                              <HourEditor
                                hours={commit.hours ?? 0}
                                originalHours={adjustment?.originalHours}
                                isManuallySet={isManuallySet}
                                onHourChange={(hours) => handleHourChange(repoPath, commit, hours)}
                                onReset={() => handleResetHours(repoPath, commit)}
                                validate={(hours) => validateHours(repoPath, hours, commit)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Branch: {commit.branch}
                              </Typography>
                              <Typography variant="body2">
                                {commit.formattedMessage}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </React.Fragment>
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

      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
        open={isSyncing}
      >
        <CircularProgress color="inherit" />
        <Typography>
          Syncing time entries to Harvest...
        </Typography>
      </Backdrop>
    </Box>
  );
}; 