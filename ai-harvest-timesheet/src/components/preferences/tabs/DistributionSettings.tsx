import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material';
import { GlobalPreferences } from '../../../types/preferences';

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

interface DistributionSettingsProps {
  preferences: GlobalPreferences;
  onPreferencesChange: (preferences: Partial<GlobalPreferences>) => void;
}

export const DistributionSettings: React.FC<DistributionSettingsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Distribution Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure how hours are distributed across commits.
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Distribution Strategy</InputLabel>
        <Select
          value={preferences.distributionStrategy}
          onChange={(e) => onPreferencesChange({ 
            distributionStrategy: e.target.value as keyof typeof DISTRIBUTION_STRATEGIES 
          })}
          label="Distribution Strategy"
        >
          {Object.entries(DISTRIBUTION_STRATEGIES).map(([value, { label }]) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {DISTRIBUTION_STRATEGIES[preferences.distributionStrategy].description}
        </Typography>
      </FormControl>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" gutterBottom>
          Minimum Hours per Commit
        </Typography>
        <Slider
          value={preferences.minimumCommitHours}
          onChange={(_, value) => onPreferencesChange({ minimumCommitHours: value as number })}
          min={0.25}
          max={2}
          step={0.25}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value} hours`}
          disabled={preferences.distributionStrategy === 'equal'}
        />
        {preferences.distributionStrategy === 'equal' && (
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
          value={preferences.maximumCommitHours}
          onChange={(_, value) => onPreferencesChange({ maximumCommitHours: value as number })}
          min={2}
          max={6}
          step={0.5}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value} hours`}
          disabled={preferences.distributionStrategy === 'equal'}
        />
        {preferences.distributionStrategy === 'equal' && (
          <Typography variant="caption" color="text.secondary">
            Maximum hours are not applicable with equal distribution
          </Typography>
        )}
      </Box>
    </Box>
  );
}; 