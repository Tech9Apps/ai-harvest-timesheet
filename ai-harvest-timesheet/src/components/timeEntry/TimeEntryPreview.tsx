import React, { useContext, useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
import { format } from 'date-fns';
import { Repository, TimeEntry, CommitInfo } from '../../types';
import { useLoading } from '../../context/LoadingContext';

interface TimeEntryPreviewProps {
  commits: { [repoPath: string]: CommitInfo[] };
  repositories: Repository[];
  onSync: (timeEntries: TimeEntry[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const TimeEntryPreview: React.FC<TimeEntryPreviewProps> = ({
  commits,
  repositories,
  onSync,
  onRefresh,
}) => {
  const { setLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processedCommits, setProcessedCommits] = useState<{ [repoPath: string]: CommitInfo[] }>({});

  useEffect(() => {
    // Process commits when they change
    const newProcessedCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    for (const [repoPath, repoCommits] of Object.entries(commits)) {
      console.log(`Processing ${repoPath}:`, repoCommits);
      const hasCustomHours = repoCommits.some(commit => {
        console.log(`Commit ${commit.hash} hours:`, commit.hours);
        return commit.hours !== undefined;
      });
      
      if (hasCustomHours) {
        console.log(`${repoPath} has custom hours, keeping original commits`);
        newProcessedCommits[repoPath] = repoCommits;
      } else {
        console.log(`${repoPath} has no custom hours, calculating default distribution`);
        const hoursPerCommit = 8 / repoCommits.length;
        newProcessedCommits[repoPath] = repoCommits.map(commit => ({
          ...commit,
          hours: hoursPerCommit,
        }));
      }
    }
    
    console.log('Final processed commits:', newProcessedCommits);
    setProcessedCommits(newProcessedCommits);
  }, [commits]);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Time Entries Preview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={onRefresh}>
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

      <Paper elevation={2}>
        <List>
          {Object.entries(processedCommits).map(([repoPath, repoCommits]) => {
            const hasCustomHours = repoCommits.some(commit => commit.hours !== undefined);
            const totalHours = repoCommits.reduce((sum, commit) => sum + (commit.hours ?? 0), 0);
            
            return (
              <React.Fragment key={repoPath}>
                <ListItem>
                  <ListItemText
                    primary={repoPath.split('/').pop()}
                    secondary={
                      <Typography variant="body2">
                        {repoCommits.length} commits{hasCustomHours ? ' (Custom hours)' : ''} - Total: {totalHours.toFixed(2)} hours
                      </Typography>
                    }
                  />
                </ListItem>
                {repoCommits.map((commit) => (
                  <ListItem key={commit.hash} sx={{ pl: 4 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">
                            {format(new Date(commit.date), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: commit.hours !== undefined ? 'primary.main' : 'inherit'
                            }}
                          >
                            {(commit.hours ?? 0).toFixed(2)} hours
                          </Typography>
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
                ))}
              </React.Fragment>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}; 