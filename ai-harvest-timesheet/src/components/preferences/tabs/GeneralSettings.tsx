import React, { useState } from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { GlobalPreferences } from '../../../types/preferences';

interface GeneralSettingsProps {
  preferences: GlobalPreferences;
  onPreferencesChange: (preferences: Partial<GlobalPreferences>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const [hoursError, setHoursError] = useState<string | null>(null);

  const handleHoursChange = (value: string) => {
    const hours = parseFloat(value);
    if (isNaN(hours)) {
      setHoursError('Please enter a valid number');
      return;
    }
    if (hours < 1) {
      setHoursError('Hours must be at least 1');
      return;
    }
    if (hours > 20) {
      setHoursError('Hours cannot exceed 20');
      return;
    }
    setHoursError(null);
    onPreferencesChange({ customHoursValue: hours });
  };

  return (
    <Box>
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
              checked={preferences.customEnforceHours}
              onChange={(e) => onPreferencesChange({ customEnforceHours: e.target.checked })}
            />
          }
          label={
            <Box>
              <Typography variant="body1">Enforce Daily Hours</Typography>
              <Typography variant="caption" color="text.secondary">
                Automatically adjust commit hours to total the specified daily hours
              </Typography>
            </Box>
          }
        />
        
        <Box sx={{ mt: 2, ml: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Daily Hours"
              type="number"
              value={preferences.customHoursValue}
              onChange={(e) => handleHoursChange(e.target.value)}
              disabled={!preferences.customEnforceHours}
              error={!!hoursError}
              helperText={hoursError}
              InputProps={{
                inputProps: { min: 1, max: 20, step: 0.5 },
                endAdornment: <InputAdornment position="end">hours</InputAdornment>,
              }}
              sx={{ width: '200px' }}
            />
            <Tooltip title="Reset to default (8 hours)">
              <span>
                <IconButton
                  onClick={() => handleHoursChange('8')}
                  disabled={!preferences.customEnforceHours}
                  size="small"
                >
                  <RestartAltIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.autoRedistributeHours}
              onChange={(e) => onPreferencesChange({ autoRedistributeHours: e.target.checked })}
              disabled={!preferences.customEnforceHours}
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

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.distributeAcrossRepositories}
              onChange={(e) => onPreferencesChange({ distributeAcrossRepositories: e.target.checked })}
              disabled={!preferences.customEnforceHours}
            />
          }
          label={
            <Box>
              <Typography variant="body1">Cross-Repository Distribution</Typography>
              <Typography variant="caption" color="text.secondary">
                Distribute daily hours across all repositories for the day instead of per repository
              </Typography>
            </Box>
          }
        />
      </Box>
    </Box>
  );
}; 