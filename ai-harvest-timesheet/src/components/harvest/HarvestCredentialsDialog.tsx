import React, { useState } from 'react';
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
} from '@mui/material';
import { harvestApi } from '../../services/harvestApi';
import { useLoading } from '../../context/LoadingContext';

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
  const { setLoading } = useLoading();

  const handleSave = async () => {
    if (!accessToken || !accountId) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    try {
      // Set the credentials
      harvestApi.setCredentials(accessToken, accountId);
      
      // Test the credentials by trying to fetch projects
      await harvestApi.getProjects();

      // If successful, save the credentials
      localStorage.setItem('harvest_access_token', accessToken);
      localStorage.setItem('harvest_account_id', accountId);
      
      onClose();
    } catch (error) {
      setError('Invalid credentials. Please check your access token and account ID.');
    } finally {
      setLoading(false);
    }
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
        <Button onClick={handleSave} variant="contained">
          Save Credentials
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 