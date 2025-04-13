import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { startOfDay, endOfDay, isAfter, isBefore, isEqual } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onRangeTypeChange: (rangeType: 'today' | 'custom') => void;
  rangeType: 'today' | 'custom';
  disabled?: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  onRangeTypeChange,
  rangeType,
  disabled = false,
}) => {
  const handleRangeTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newRangeType: 'today' | 'custom' | null
  ) => {
    if (newRangeType) {
      onRangeTypeChange(newRangeType);
      if (newRangeType === 'today') {
        const today = new Date();
        const newStartDate = startOfDay(today);
        const newEndDate = endOfDay(today);
        onDateRangeChange(newStartDate, newEndDate);
      }
    }
  };

  const handleStartDateChange = (newValue: Date | null) => {
    if (!newValue) return;

    const newStartDate = startOfDay(newValue);
    let newEndDate = endDate;

    // If the new start date is after the current end date
    // or if they're the same day but end date isn't at end of day
    if (isAfter(newStartDate, endDate) || 
        (isEqual(newStartDate, startOfDay(endDate)) && endDate.getHours() !== 23)) {
      newEndDate = endOfDay(newValue);
    }

    onDateRangeChange(newStartDate, newEndDate);
  };

  const handleEndDateChange = (newValue: Date | null) => {
    if (!newValue) return;

    const newEndDate = endOfDay(newValue);
    let newStartDate = startDate;

    // If the new end date is before the current start date
    // or if they're the same day but start date isn't at start of day
    if (isBefore(newEndDate, startDate) || 
        (isEqual(endOfDay(startDate), newEndDate) && startDate.getHours() !== 0)) {
      newStartDate = startOfDay(newValue);
    }

    onDateRangeChange(newStartDate, newEndDate);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <ToggleButtonGroup
          value={rangeType}
          exclusive
          onChange={handleRangeTypeChange}
          size="small"
          disabled={disabled}
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
              onChange={handleStartDateChange}
              slotProps={{
                textField: {
                  size: 'small',
                  disabled: disabled,
                },
              }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate}
              slotProps={{
                textField: {
                  size: 'small',
                  disabled: disabled,
                },
              }}
            />
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}; 