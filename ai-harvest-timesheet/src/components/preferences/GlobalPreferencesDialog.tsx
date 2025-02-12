import React from 'react';
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
} from '@mui/material';
import { usePreferences } from '../../context/PreferencesContext';

interface GlobalPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalPreferencesDialog: React.FC<GlobalPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const { globalPreferences, updateGlobalPreferences } = usePreferences();

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
                  onChange={handleEnforce8HoursChange}
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
                  onChange={handleAutoRedistributeChange}
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

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={globalPreferences.distributeAcrossRepositories}
                  onChange={handleDistributeAcrossReposChange}
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 