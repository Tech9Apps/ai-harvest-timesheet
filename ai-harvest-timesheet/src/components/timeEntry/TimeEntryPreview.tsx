import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
import { format } from 'date-fns';
import { Repository, TimeEntry, CommitInfo } from '../../types';

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
  const calculateTimeEntries = (): TimeEntry[] => {
    const allCommits = Object.values(commits).flat();
    const hoursPerCommit = 8 / allCommits.length;

    return allCommits.map((commit) => {
      const repository = repositories.find(repo => 
        commits[repo.path]?.some(c => c.hash === commit.hash)
      );

      return {
        projectId: repository?.harvestProjectId || '',
        taskId: repository?.harvestTaskId || '',
        spentDate: format(new Date(commit.date), 'yyyy-MM-dd'),
        hours: hoursPerCommit,
        notes: commit.formattedMessage,
      };
    });
  };

  const handleSync = () => {
    const timeEntries = calculateTimeEntries();
    onSync(timeEntries);
  };

  const totalCommits = Object.values(commits).flat().length;
  const hoursPerCommit = totalCommits ? (8 / totalCommits) : 0;

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
            disabled={totalCommits === 0}
          >
            Sync to Harvest
          </Button>
        </Box>
      </Box>

      <Paper elevation={2}>
        <List>
          {Object.entries(commits).map(([repoPath, repoCommits]) => (
            <React.Fragment key={repoPath}>
              <ListItem>
                <ListItemText
                  primary={repoPath.split('/').pop()}
                  secondary={`${repoCommits.length} commits`}
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
                        <Typography variant="subtitle2">
                          {hoursPerCommit.toFixed(2)} hours
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
          ))}
        </List>
      </Paper>
    </Box>
  );
}; 