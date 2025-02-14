import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import { GlobalPreferences } from '../../../types/preferences';

interface ExternalIssueSettingsProps {
  preferences: GlobalPreferences;
  onPreferencesChange: (preferences: Partial<GlobalPreferences>) => void;
}

export const ExternalIssueSettings: React.FC<ExternalIssueSettingsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const handleToggleEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPreferencesChange({
      externalIssue: {
        ...preferences.externalIssue,
        enabled: event.target.checked,
      },
    });
  };

  const handleTypeChange = (value: 'jira' | 'github' | 'none') => {
    onPreferencesChange({
      externalIssue: {
        ...preferences.externalIssue,
        issueTracker: {
          ...preferences.externalIssue.issueTracker,
          type: value,
          baseUrl: '', // Reset URL when type changes
        },
      },
    });
  };

  const handleBaseUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value.trim();
    onPreferencesChange({
      externalIssue: {
        ...preferences.externalIssue,
        issueTracker: {
          ...preferences.externalIssue.issueTracker,
          baseUrl: url,
        },
      },
    });
  };

  const validateUrl = (url: string): string | null => {
    if (!url) return null;
    try {
      new URL(url);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      if (url.endsWith('/')) {
        return 'URL should not end with a trailing slash';
      }
      if (preferences.externalIssue.issueTracker.type === 'github' && !url.startsWith('https://')) {
        return 'GitHub URLs must use HTTPS';
      }
      return null;
    } catch {
      return 'Invalid URL format';
    }
  };

  const urlError = validateUrl(preferences.externalIssue.issueTracker.baseUrl);

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        External Issue Tracking
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Link time entries to external issue tracking systems like Jira or GitHub.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={preferences.externalIssue.enabled}
            onChange={handleToggleEnabled}
          />
        }
        label="Enable External Issue Links"
      />

      {preferences.externalIssue.enabled && (
        <Box sx={{ mt: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Issue Tracker</InputLabel>
            <Select
              value={preferences.externalIssue.issueTracker.type}
              onChange={(e) => handleTypeChange(e.target.value as 'jira' | 'github' | 'none')}
              label="Issue Tracker"
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="jira">Jira</MenuItem>
              <MenuItem value="github">GitHub</MenuItem>
            </Select>
          </FormControl>

          {preferences.externalIssue.issueTracker.type !== 'none' && (
            <>
              <TextField
                fullWidth
                label="Base URL"
                value={preferences.externalIssue.issueTracker.baseUrl}
                onChange={handleBaseUrlChange}
                error={!!urlError}
                helperText={
                  urlError ||
                  (preferences.externalIssue.issueTracker.type === 'jira'
                    ? 'Example: https://your-company.atlassian.net (without trailing slash). The system will automatically append /browse/PROJ-123 to create ticket links.'
                    : 'Example: https://github.com/org/repo (without trailing slash). The system will automatically append /issues/number to create issue links.')
                }
                sx={{ mb: 2 }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                {preferences.externalIssue.issueTracker.type === 'jira' ? (
                  <>
                    Jira ticket numbers will be extracted from branch names using the current branch parsing pattern.
                    Make sure your pattern includes a ticket capture group.
                  </>
                ) : (
                  <>
                    GitHub issue numbers will be extracted from branch names using the current branch parsing pattern.
                    Make sure your pattern includes a ticket capture group.
                  </>
                )}
              </Alert>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}; 