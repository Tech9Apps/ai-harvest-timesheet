import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfDay, endOfDay } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onRangeTypeChange: (rangeType: 'today' | 'custom') => void;
  rangeType: 'today' | 'custom';
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  onRangeTypeChange,
  rangeType,
}) => {
  const handleRangeTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newRangeType: 'today' | 'custom' | null
  ) => {
    if (newRangeType) {
      onRangeTypeChange(newRangeType);
      if (newRangeType === 'today') {
        const today = new Date();
        onDateRangeChange(startOfDay(today), endOfDay(today));
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          value={rangeType}
          exclusive
          onChange={handleRangeTypeChange}
          size="small"
        >
          <ToggleButton value="today">
            Today
          </ToggleButton>
          <ToggleButton value="custom">
            Custom Range
          </ToggleButton>
        </ToggleButtonGroup>

        {rangeType === 'custom' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => {
                if (newValue) {
                  onDateRangeChange(startOfDay(newValue), endDate);
                }
              }}
              slotProps={{
                textField: {
                  size: 'small',
                },
              }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => {
                if (newValue) {
                  onDateRangeChange(startDate, endOfDay(newValue));
                }
              }}
              minDate={startDate}
              slotProps={{
                textField: {
                  size: 'small',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}; 