import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { usePreferences } from '../../context/PreferencesContext';
import { ipcRenderer } from 'electron';

interface NotificationSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationSettingsDialog: React.FC<NotificationSettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const { preferences, updatePreferences } = usePreferences();

  const handleReminderTimeChange = (time: Date | null) => {
    if (time) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      updatePreferences({
        notifications: {
          ...(preferences.notifications || { enableDailyReminder: true }),
          reminderTime: `${hours}:${minutes}`
        }
      });
    }
  };

  const handleEnableChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updatePreferences({
      notifications: {
        ...(preferences.notifications || { reminderTime: "17:00" }),
        enableDailyReminder: event.target.checked
      }
    });
  };

  const handleTestNotification = () => {
    ipcRenderer.send('test-notification');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Notification Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure daily time logging reminders. Notifications will be shown on weekdays only.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={preferences.notifications?.enableDailyReminder ?? true}
                onChange={handleEnableChange}
              />
            }
            label="Enable Daily Reminder"
          />

          <Box sx={{ mt: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Reminder Time"
                value={(() => {
                  const timeStr = preferences.notifications?.reminderTime || "17:00";
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes);
                  return date;
                })()}
                onChange={handleReminderTimeChange}
                disabled={!preferences.notifications?.enableDailyReminder}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Set the time when you would like to receive the daily reminder
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={handleTestNotification}
              disabled={!preferences.notifications?.enableDailyReminder}
            >
              Test Notification
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Send a test notification to verify your settings
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 