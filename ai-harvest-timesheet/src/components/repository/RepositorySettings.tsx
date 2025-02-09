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
} from '@mui/material';
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
    });
    onClose();
  };

  return (
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
        />
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
  );
}; 