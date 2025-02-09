import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  TextField,
  IconButton,
  Paper,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Repository, HarvestProject, HarvestTask } from '../../types';
import { harvestApi } from '../../services/harvestApi';
import { useLoading } from '../../context/LoadingContext';

interface RepositorySettingsProps {
  open: boolean;
  repository: Repository;
  onClose: () => void;
  onSave: (updatedRepo: Repository) => void;
}

export const RepositorySettings: React.FC<RepositorySettingsProps> = ({
  open,
  repository,
  onClose,
  onSave,
}) => {
  const [projects, setProjects] = useState<HarvestProject[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, HarvestTask[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState(repository.harvestProjectId);
  const [selectedTaskId, setSelectedTaskId] = useState(repository.harvestTaskId);
  const [extractTicketNumber, setExtractTicketNumber] = useState(repository.extractTicketNumber ?? true);
  const [webhookUrl, setWebhookUrl] = useState(repository.webhookUrl || '');
  const [showWebhookHelp, setShowWebhookHelp] = useState(false);
  const { setLoading } = useLoading();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    // Reset task selection when project changes
    if (selectedProjectId !== repository.harvestProjectId) {
      setSelectedTaskId('');
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { projects: fetchedProjects, tasksByProject: fetchedTasks } = await harvestApi.getProjects();
      setProjects(fetchedProjects);
      setTasksByProject(fetchedTasks);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableTasks = selectedProjectId ? tasksByProject[selectedProjectId] || [] : [];

  const handleSave = () => {
    onSave({
      ...repository,
      harvestProjectId: selectedProjectId,
      harvestTaskId: selectedTaskId,
      extractTicketNumber,
      webhookUrl: webhookUrl || undefined,
    });
    onClose();
  };

  const webhookExample = {
    request: {
      repositoryName: "my-project",
      branchName: "123-feature-branch",
      commits: [
        {
          hash: "abc123",
          message: "Add new feature",
          date: "2024-03-14T10:30:00Z"
        }
      ]
    },
    response: {
      repositoryName: "my-project",
      branchName: "123-feature-branch",
      commits: [
        {
          hash: "abc123",
          message: "Add new feature",
          date: "2024-03-14T10:30:00Z",
          formattedMessage: "PROJ-123 | Feature Branch | Add new feature"
        }
      ]
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Repository Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Repository: {repository.path}
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={selectedProjectId}
              label="Project"
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.client.name} - {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Task</InputLabel>
            <Select
              value={selectedTaskId}
              label="Task"
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={!selectedProjectId || availableTasks.length === 0}
            >
              {availableTasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={extractTicketNumber}
                onChange={(e) => setExtractTicketNumber(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body1">Extract Ticket Numbers</Typography>
                <Typography variant="caption" color="text.secondary">
                  Extract ticket numbers from branch names (e.g., "123-feature-name" → "123 | Feature Name | commit message")
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Custom Webhook URL (Optional)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-webhook-url.com/format"
              helperText={
                <Typography variant="caption" color="text.secondary">
                  Provide a webhook URL to customize commit message formatting. The webhook will receive repository details and commit information.
                </Typography>
              }
            />
            <IconButton 
              onClick={() => setShowWebhookHelp(true)}
              sx={{ mt: 1 }}
              size="small"
              color="primary"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!selectedProjectId || !selectedTaskId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showWebhookHelp} 
        onClose={() => setShowWebhookHelp(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Webhook Format Guide</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            The webhook should accept a POST request with the following format and return the same structure with added formattedMessage for each commit:
          </Typography>

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Request Body:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', mb: 2 }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
              {JSON.stringify(webhookExample.request, null, 2)}
            </pre>
          </Paper>

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Expected Response:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.900' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
              {JSON.stringify(webhookExample.response, null, 2)}
            </pre>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: The webhook should maintain all original fields and add the formattedMessage field to each commit in the response.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWebhookHelp(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 