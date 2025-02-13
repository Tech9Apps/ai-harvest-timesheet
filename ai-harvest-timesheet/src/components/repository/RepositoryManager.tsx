import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Switch,
  Tooltip,
} from '@mui/material';
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
        enabled: true, // New repositories are enabled by default
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

  const handleToggleEnabled = (repo: Repository) => {
    onRepositoryUpdate({
      ...repo,
      enabled: !repo.enabled,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Repositories
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          sx={{ flex: '0 1 90%' }}
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
          sx={{ height: 'fit-content', mt: 1, minWidth: '15%' }}
        >
          Add Repository
        </Button>
      </Box>

      <List>
        {repositories.map((repo) => (
          <ListItem
            key={repo.id}
            sx={{
              opacity: repo.enabled ? 1 : 0.6,
              transition: 'opacity 0.2s ease-in-out',
              '&:hover': {
                opacity: 1,
              },
              bgcolor: repo.enabled ? 'transparent' : 'action.hover',
              borderLeft: (theme) => 
                `4px solid ${repo.enabled ? theme.palette.success.main : theme.palette.action.disabled}`,
            }}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title={repo.enabled ? 'Disable Repository' : 'Enable Repository'}>
                  <Switch
                    checked={repo.enabled}
                    onChange={() => handleToggleEnabled(repo)}
                    color="success"
                  />
                </Tooltip>
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
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="subtitle1"
                    component="span"
                    sx={{
                      color: repo.enabled ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {repo.path.split('/').pop()}
                  </Typography>
                  {!repo.enabled && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.disabled',
                        bgcolor: 'action.hover',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      Disabled
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Box component="span" sx={{ display: 'block' }}>
                  <Box component="span" sx={{ display: 'block', color: repo.enabled ? 'text.secondary' : 'text.disabled' }}>
                    {repo.path}
                  </Box>
                  {repo.harvestProjectId && repo.harvestTaskId && (
                    <Box component="span" sx={{ color: repo.enabled ? 'success.main' : 'text.disabled', fontSize: '0.875rem' }}>
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