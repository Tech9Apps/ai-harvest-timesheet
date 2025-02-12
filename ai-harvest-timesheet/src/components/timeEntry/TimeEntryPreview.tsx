import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
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
    if (!repository) return { isValid: false, message: 'Repository not found' };

    const preferences = getEffectivePreferences(repository.path);
    if (!preferences.enforce8Hours) return { isValid: true };

    const repoCommits = processedCommits[repoPath] || [];
    const totalHours = repoCommits.reduce((sum, commit) => 
      sum + (commit.hash === currentCommit.hash ? newHours : (commit.hours ?? 0)), 
      0
    );

    return {
      isValid: totalHours <= 8,
      message: totalHours > 8 ? 'Total hours cannot exceed 8 hours per day' : undefined
    };
  };

  const redistributeHours = (repoPath: string, adjustedCommit: CommitInfo, newHours: number) => {
    const repository = repositories.find(repo => repo.path === repoPath);
    if (!repository) return;

    const preferences = getEffectivePreferences(repository.path);
    if (!preferences.enforce8Hours || !preferences.autoRedistributeHours) return;

    const repoCommits = [...(processedCommits[repoPath] || [])];
    const otherCommits = repoCommits.filter(commit => commit.hash !== adjustedCommit.hash);
    const remainingHours = 8 - newHours;
    
    if (remainingHours <= 0 || otherCommits.length === 0) return;

    const totalOtherHours = otherCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
    const ratio = remainingHours / totalOtherHours;

    const updatedCommits = repoCommits.map(commit => {
      if (commit.hash === adjustedCommit.hash) {
        return { ...commit, hours: newHours };
      }
      return {
        ...commit,
        hours: ((commit.hours ?? 0) * ratio)
      };
    });

    setProcessedCommits(prev => ({
      ...prev,
      [repoPath]: updatedCommits
    }));
  };

  const handleHourChange = (repoPath: string, commit: CommitInfo, newHours: number): void => {
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

  const handleRefreshClick = (startDate?: Date, endDate?: Date) => {
    if (manualAdjustments.length > 0) {
      setShowRefreshWarning(true);
      setPendingRefresh({ startDate, endDate });
    } else {
      onRefresh(startDate, endDate);
    }
  };

  const handleRefreshConfirm = () => {
    setShowRefreshWarning(false);
    setManualAdjustments([]);
    if (pendingRefresh) {
      onRefresh(pendingRefresh.startDate, pendingRefresh.endDate);
      setPendingRefresh(null);
    }
  };

  const handleSync = async () => {
    if (Object.keys(processedCommits).length === 0) return;

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
      setSuccess('Time entries successfully synced to Harvest!');
    } catch (error) {
      console.error('Error syncing time entries:', error);
      setError('Failed to sync time entries to Harvest. Please try again.');
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
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={handleSync}
            disabled={Object.keys(processedCommits).length === 0}
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
      />

      <Paper elevation={2}>
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
      </Paper>

      <RefreshWarningDialog
        open={showRefreshWarning}
        onClose={() => setShowRefreshWarning(false)}
        onConfirm={handleRefreshConfirm}
      />
    </Box>
  );
}; 