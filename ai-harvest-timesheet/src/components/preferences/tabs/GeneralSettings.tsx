import React from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
} from '@mui/material';
import { GlobalPreferences } from '../../../types/preferences';

interface GeneralSettingsProps {
  preferences: GlobalPreferences;
  onPreferencesChange: (preferences: Partial<GlobalPreferences>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
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
              checked={preferences.enforce8Hours}
              onChange={(e) => onPreferencesChange({ enforce8Hours: e.target.checked })}
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
              checked={preferences.autoRedistributeHours}
              onChange={(e) => onPreferencesChange({ autoRedistributeHours: e.target.checked })}
              disabled={!preferences.enforce8Hours}
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
              checked={preferences.distributeAcrossRepositories}
              onChange={(e) => onPreferencesChange({ distributeAcrossRepositories: e.target.checked })}
              disabled={!preferences.enforce8Hours}
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
    </Box>
  );
}; 