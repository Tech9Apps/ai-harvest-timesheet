import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import { formatHours } from '../../utils/timeUtils';

interface HourEditorProps {
  hours: number;
  originalHours?: number;
  isManuallySet: boolean;
  onHourChange: (hours: number) => void;
  onReset?: () => void;
  validate?: (hours: number) => { isValid: boolean; message?: string };
  disabled?: boolean;
}

export const HourEditor: React.FC<HourEditorProps> = ({
  hours,
  originalHours,
  isManuallySet,
  onHourChange,
  onReset,
  validate,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(hours.toString());
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isEditing) {
      setEditValue(hours.toString());
    }
  }, [hours, isEditing]);

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true);
      setEditValue(hours.toString());
      setError(undefined);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(undefined);
  };

  const handleSave = () => {
    const newHours = parseFloat(editValue);
    
    if (isNaN(newHours) || newHours < 0) {
      setError('Please enter a valid number');
      return;
    }

    if (validate) {
      const validation = validate(newHours);
      if (!validation.isValid) {
        setError(validation.message);
        return;
      }
    }

    onHourChange(newHours);
    setIsEditing(false);
    setError(undefined);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isEditing ? (
        <>
          <TextField
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            error={!!error}
            helperText={error}
            autoFocus
            inputProps={{
              type: 'number',
              step: '0.25',
              min: '0',
              style: { width: '80px' },
            }}
            sx={{ width: '100px' }}
          />
          <IconButton size="small" onClick={handleSave} color="primary">
            <CheckIcon />
          </IconButton>
          <IconButton size="small" onClick={handleCancel}>
            <CloseIcon />
          </IconButton>
        </>
      ) : (
        <>
          <Tooltip 
            title={
              isManuallySet && originalHours !== undefined
                ? `Original: ${originalHours.toFixed(2)} hours`
                : disabled
                ? 'Hour editing is disabled'
                : 'Click to edit hours'
            }
          >
            <Box
              onClick={handleStartEdit}
              sx={{
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
              }}
            >
              <Stack spacing={0}>
                <Typography
                  variant="body1"
                  sx={{
                    color: isManuallySet ? 'primary.main' : 'text.primary',
                    fontWeight: isManuallySet ? 500 : 400,
                    fontSize: '1rem',
                  }}
                >
                  {formatHours(hours)}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  mt: '2px !important'
                }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                    }}
                  >
                    {hours.toFixed(2)} hours
                  </Typography>
                  {!disabled && <EditIcon fontSize="small" sx={{ opacity: 0.5, fontSize: '0.9rem' }} />}
                  {isManuallySet && onReset && (
                    <Tooltip title="Reset to auto-calculated hours">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onReset();
                        }}
                        sx={{ 
                          p: 0.5,
                          ml: -0.5
                        }}
                      >
                        <RestoreIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Stack>
            </Box>
          </Tooltip>
        </>
      )}
    </Box>
  );
}; 