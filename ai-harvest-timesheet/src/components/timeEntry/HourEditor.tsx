import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import { formatHours, decimalToHoursAndMinutes, hoursAndMinutesToDecimal } from '../../utils/timeUtils';

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
  const { hours: wholeHours, minutes } = decimalToHoursAndMinutes(hours);
  const [editHours, setEditHours] = useState(wholeHours.toString());
  const [editMinutes, setEditMinutes] = useState(minutes.toString());
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isEditing) {
      const { hours: h, minutes: m } = decimalToHoursAndMinutes(hours);
      setEditHours(h.toString());
      setEditMinutes(m.toString());
    }
  }, [hours, isEditing]);

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true);
      const { hours: h, minutes: m } = decimalToHoursAndMinutes(hours);
      setEditHours(h.toString());
      setEditMinutes(m.toString());
      setError(undefined);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(undefined);
  };

  const handleSave = () => {
    const h = parseInt(editHours, 10);
    const m = parseInt(editMinutes, 10);
    
    if (isNaN(h) || h < 0 || isNaN(m) || m < 0) {
      setError('Please enter valid numbers');
      return;
    }

    if (m >= 60) {
      setError('Minutes must be less than 60');
      return;
    }

    const newHours = hoursAndMinutesToDecimal(h, m);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap', height: '40px' }}>
        {isEditing ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                onKeyDown={handleKeyPress}
                error={!!error}
                label="Hours"
                autoFocus
                inputProps={{
                  type: 'number',
                  min: '0',
                  style: { width: '60px' },
                }}
                sx={{ width: '80px' }}
              />
              <TextField
                size="small"
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
                onKeyDown={handleKeyPress}
                error={!!error}
                label="Minutes"
                inputProps={{
                  type: 'number',
                  min: '0',
                  max: '59',
                  style: { width: '60px' },
                }}
                sx={{ width: '80px' }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton size="small" onClick={handleSave} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton size="small" onClick={handleCancel}>
                <CloseIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
              <Tooltip 
                title={
                  isManuallySet && originalHours !== undefined
                    ? `Original: ${formatHours(originalHours)}`
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
                    alignItems: 'center',
                    gap: 1,
                    height: '100%',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: isManuallySet ? 'primary.main' : 'text.primary',
                      fontWeight: isManuallySet ? 500 : 400,
                      fontSize: '1rem',
                      lineHeight: '40px',
                    }}
                  >
                    {formatHours(hours)}
                  </Typography>
                  {!disabled && (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <EditIcon fontSize="small" sx={{ opacity: 0.5, fontSize: '0.9rem' }} />
                    </Box>
                  )}
                </Box>
              </Tooltip>
              {isManuallySet && onReset && (
                <Tooltip title="Reset to auto-calculated hours">
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onReset();
                    }}
                  >
                    <RestoreIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </>
        )}
      </Box>
      {isEditing && error && (
        <Typography variant="caption" color="error" sx={{ pl: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}; 