import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material';
import { usePreferences } from '../../context/PreferencesContext';
import { BranchParsingSettings } from './BranchParsingSettings';
import { preferencesService } from '../../services/preferencesService';

interface GlobalPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

const DISTRIBUTION_STRATEGIES = {
  equal: {
    label: 'Equal Distribution',
    description: 'Distribute hours evenly across all commits'
  },
  'commit-size': {
    label: 'Based on Commit Size',
    description: 'Distribute hours based on number of files changed, lines of code, and file types. Additional weight for large file changes.'
  },
  'time-based': {
    label: 'Time-Based Distribution',
    description: 'Higher weight for commits during core working hours (9 AM - 5 PM), medium weight for early morning/evening (6-9 AM, 5-8 PM), and lower weight for late night commits.'
  },
  'impact-analysis': {
    label: 'Impact Analysis',
    description: 'Weight based on file types and locations (core business logic, UI, API, utils, etc.). Higher weight for core functionality and broad-impact changes.'
  }
};

export const GlobalPreferencesDialog: React.FC<GlobalPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const { globalPreferences, updateGlobalPreferences } = usePreferences();

  useEffect(() => {
    if (open) {
      console.log('Dialog opened, debugging preferences...');
      preferencesService.debugPreferences();
    }
  }, [open]);

  // Add logging to check if preferences are loaded correctly
  console.log('Global Preferences:', globalPreferences);

  // Add null check for globalPreferences
  if (!globalPreferences) {
    console.error('Global preferences is null or undefined');
    return null;
  }

  // Add null check for branchParsing
  if (!globalPreferences.branchParsing) {
    console.error('Branch parsing preferences is missing');
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography color="error">
            There was an error loading preferences. Please try again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const handleEnforce8HoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateGlobalPreferences({ enforce8Hours: event.target.checked });
  };

  const handleAutoRedistributeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateGlobalPreferences({ autoRedistributeHours: event.target.checked });
  };

  const handleDistributeAcrossReposChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateGlobalPreferences({ distributeAcrossRepositories: event.target.checked });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Global Time Preferences</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Default Time Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            These settings will apply to all repositories unless overridden in repository settings.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={globalPreferences.enforce8Hours}
                  onChange={(e) => updateGlobalPreferences({ enforce8Hours: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Enforce 8-Hour Day</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically adjust commit hours to total 8 hours per day
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={globalPreferences.autoRedistributeHours}
                  onChange={(e) => updateGlobalPreferences({ autoRedistributeHours: e.target.checked })}
                  disabled={!globalPreferences.enforce8Hours}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Automatic Hour Redistribution</Typography>
                  <Typography variant="caption" color="text.secondary">
                    When manually adjusting hours, automatically redistribute remaining hours across other commits
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={globalPreferences.distributeAcrossRepositories}
                  onChange={(e) => updateGlobalPreferences({ distributeAcrossRepositories: e.target.checked })}
                  disabled={!globalPreferences.enforce8Hours}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Cross-Repository Distribution</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribute 8 hours across all repositories for the day instead of per repository
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Distribution Settings
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Distribution Strategy</InputLabel>
            <Select
              value={globalPreferences.distributionStrategy}
              onChange={(e) => updateGlobalPreferences({ 
                distributionStrategy: e.target.value as keyof typeof DISTRIBUTION_STRATEGIES 
              })}
              label="Distribution Strategy"
            >
              {Object.entries(DISTRIBUTION_STRATEGIES).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {DISTRIBUTION_STRATEGIES[globalPreferences.distributionStrategy].description}
            </Typography>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Minimum Hours per Commit
            </Typography>
            <Slider
              value={globalPreferences.minimumCommitHours}
              onChange={(_, value) => updateGlobalPreferences({ minimumCommitHours: value as number })}
              min={0.25}
              max={2}
              step={0.25}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value} hours`}
              disabled={globalPreferences.distributionStrategy === 'equal'}
            />
            {globalPreferences.distributionStrategy === 'equal' && (
              <Typography variant="caption" color="text.secondary">
                Minimum hours are not applicable with equal distribution
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Maximum Hours per Commit
            </Typography>
            <Slider
              value={globalPreferences.maximumCommitHours}
              onChange={(_, value) => updateGlobalPreferences({ maximumCommitHours: value as number })}
              min={2}
              max={6}
              step={0.5}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value} hours`}
              disabled={globalPreferences.distributionStrategy === 'equal'}
            />
            {globalPreferences.distributionStrategy === 'equal' && (
              <Typography variant="caption" color="text.secondary">
                Maximum hours are not applicable with equal distribution
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <BranchParsingSettings
            preferences={globalPreferences.branchParsing}
            onPreferencesChange={(branchParsing) => updateGlobalPreferences({ 
              branchParsing: { ...globalPreferences.branchParsing, ...branchParsing } 
            })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 