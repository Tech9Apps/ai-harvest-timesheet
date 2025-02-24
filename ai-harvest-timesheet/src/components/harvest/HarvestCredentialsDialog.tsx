import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Link,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { harvestApi } from '../../services/harvestApi';
import { useLoading } from '../../context/LoadingContext';
import { ipcRenderer } from 'electron';

interface HarvestCredentialsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const HarvestCredentialsDialog: React.FC<HarvestCredentialsDialogProps> = ({
  open,
  onClose,
}) => {
  const [accessToken, setAccessToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const { setLoading } = useLoading();

  useEffect(() => {
    if (open) {
      // Load existing credentials when dialog opens
      ipcRenderer.invoke('get-harvest-credentials').then(({ token, accountId }) => {
        setAccessToken(token || '');
        setAccountId(accountId || '');
      });
      setError(null);
      setShowToken(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!accessToken || !accountId) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    try {
      // Set the credentials in the API service
      harvestApi.setCredentials(accessToken, accountId);
      
      // Test the credentials by trying to fetch projects
      await harvestApi.getProjects();

      // If successful, save the credentials in the main process
      ipcRenderer.send('set-harvest-credentials', { token: accessToken, accountId });
      
      // Wait a brief moment for the credentials to be set in the main process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onClose();
    } catch (error) {
      console.error('[HarvestCredentialsDialog] Error saving credentials:', error);
      setError('Invalid credentials. Please check your access token and account ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Only allow closing if we have valid credentials
    const { hasCredentials } = await ipcRenderer.invoke('get-harvest-credentials');
    
    if (hasCredentials) {
      onClose();
    } else {
      setError('Please provide valid credentials before closing');
    }
  };

  const handleToggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>Harvest Credentials Setup</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            To use this application, you need to provide your Harvest credentials. Follow these steps:
          </Typography>
          <Typography component="div" variant="body2" sx={{ mb: 2 }}>
            1. Go to{' '}
            <Link href="https://id.getharvest.com/developers" target="_blank" rel="noopener">
              https://id.getharvest.com/developers
            </Link>
          </Typography>
          <Typography component="div" variant="body2" sx={{ mb: 2 }}>
            2. Click on "Create New Personal Access Token"
          </Typography>
          <Typography component="div" variant="body2" sx={{ mb: 3 }}>
            3. Copy your access token and account ID
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Access Token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          margin="normal"
          error={!!error && !accessToken}
          helperText={error && !accessToken ? 'Access token is required' : ''}
          type={showToken ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle token visibility"
                  onClick={handleToggleTokenVisibility}
                  edge="end"
                >
                  {showToken ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Account ID"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          margin="normal"
          error={!!error && !accountId}
          helperText={error && !accountId ? 'Account ID is required' : ''}
        />

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save Credentials
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 