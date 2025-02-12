import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface RefreshWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RefreshWarningDialog: React.FC<RefreshWarningDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Unsaved Changes
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body1" paragraph>
            You have manually adjusted hours that haven't been synced to Harvest. Refreshing will reset all manual adjustments.
          </Typography>
          <Typography variant="body1" color="warning.main">
            Are you sure you want to continue? This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="warning" variant="contained">
          Refresh Anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 