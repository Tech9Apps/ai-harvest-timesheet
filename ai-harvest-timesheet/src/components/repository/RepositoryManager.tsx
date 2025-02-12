import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLoading } from '../../context/LoadingContext';
import { Repository } from '../../types';
import { RepositorySettings } from './RepositorySettings';

interface RepositoryManagerProps {
  repositories: Repository[];
  onRepositoryAdd: (repository: Repository) => void;
  onRepositoryUpdate: (repository: Repository) => void;
  onRepositoryDelete: (repositoryId: string) => void;
}

export const RepositoryManager: React.FC<RepositoryManagerProps> = ({
  repositories,
  onRepositoryAdd,
  onRepositoryUpdate,
  onRepositoryDelete,
}) => {
  const [repoPath, setRepoPath] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const { setLoading } = useLoading();

  const handleAddRepository = async () => {
    if (!repoPath) return;

    setLoading(true);
    try {
      const newRepo: Repository = {
        id: crypto.randomUUID(),
        path: repoPath,
        harvestProjectId: '',
        harvestTaskId: '',
        extractTicketNumber: true,
      };

      onRepositoryAdd(newRepo);
      setRepoPath('');
    } catch (error) {
      console.error('Error adding repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = (repo: Repository) => {
    setSelectedRepo(repo);
  };

  const handleCloseSettings = () => {
    setSelectedRepo(null);
  };

  const handleSaveSettings = (updatedRepo: Repository) => {
    onRepositoryUpdate(updatedRepo);
    setSelectedRepo(null);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Repositories
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Repository Path"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          placeholder="Enter repository path"
          helperText={
            <Box component="span" sx={{ display: 'block', '& > p': { m: 0 } }}>
              <Typography variant="caption" paragraph>
                Enter the full path to your Git repository:
              </Typography>
              <Typography variant="caption" color="primary" paragraph>
                macOS/Linux: /Users/username/projects/my-repo
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                After adding, click the ⚙️ settings icon to configure Harvest project and task.
              </Typography>
            </Box>
          }
        />
        <Button
          variant="contained"
          onClick={handleAddRepository}
          disabled={!repoPath}
          sx={{ height: 'fit-content', mt: 1 }}
        >
          Add Repository
        </Button>
      </Box>

      <List>
        {repositories.map((repo) => (
          <ListItem
            key={repo.id}
            secondaryAction={
              <Box>
                <IconButton
                  edge="end"
                  aria-label="settings"
                  onClick={() => handleOpenSettings(repo)}
                  sx={{ mr: 1 }}
                >
                  <SettingsIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => onRepositoryDelete(repo.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={repo.path.split('/').pop()}
              secondary={
                <Box component="span" sx={{ display: 'block' }}>
                  <Box component="span" sx={{ display: 'block' }}>{repo.path}</Box>
                  {repo.harvestProjectId && repo.harvestTaskId && (
                    <Box component="span" sx={{ color: 'success.main', fontSize: '0.875rem' }}>
                      ✓ Harvest settings configured
                    </Box>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {selectedRepo && (
        <RepositorySettings
          open={true}
          repository={selectedRepo}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
        />
      )}
    </Box>
  );
}; 