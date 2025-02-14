import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { DEFAULT_PRESET_PATTERNS, PresetPattern, BranchParsingPreferences } from '../../types/preferences';
import { BranchParsingService, ParseResult } from '../../services/branchParsingService';

interface BranchParsingSettingsProps {
  preferences: BranchParsingPreferences;
  onPreferencesChange: (preferences: Partial<BranchParsingPreferences>) => void;
}

export const BranchParsingSettings: React.FC<BranchParsingSettingsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const [previewResults, setPreviewResults] = useState<ParseResult[]>([]);
  const [customPatternError, setCustomPatternError] = useState<string>('');

  // Update preview results when pattern or template changes
  useEffect(() => {
    const currentPreset = DEFAULT_PRESET_PATTERNS.find(p => p.name === preferences.selectedPreset);
    const samples = currentPreset?.examples || ['feat/PROJ-123-example-branch'];
    
    const results = BranchParsingService.generatePreviews(
      preferences.pattern,
      preferences.messageTemplate,
      samples
    );
    
    setPreviewResults(results);
    
    // Update error state
    const hasError = results.some(result => !result.isValid);
    setCustomPatternError(hasError ? results[0]?.error || 'Invalid pattern' : '');
  }, [preferences.pattern, preferences.messageTemplate]);

  const handlePresetChange = (presetName: string | null) => {
    const preset = DEFAULT_PRESET_PATTERNS.find(p => p.name === presetName);
    onPreferencesChange({
      selectedPreset: presetName,
      pattern: preset?.pattern || preferences.pattern
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Branch Parsing Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure how branch names are parsed to extract ticket numbers and titles.
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Preset Pattern</InputLabel>
        <Select
          value={preferences.selectedPreset || ''}
          onChange={(e) => handlePresetChange(e.target.value)}
          label="Preset Pattern"
        >
          {DEFAULT_PRESET_PATTERNS.map((preset) => (
            <MenuItem key={preset.name} value={preset.name}>
              {preset.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Regex Pattern"
        value={preferences.pattern}
        onChange={(e) => onPreferencesChange({ pattern: e.target.value })}
        error={!!customPatternError}
        helperText={customPatternError || 'Use named capture groups (?<ticket>) and (?<title>)'}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Message Template"
        value={preferences.messageTemplate}
        onChange={(e) => onPreferencesChange({ messageTemplate: e.target.value })}
        helperText="Use ${ticket}, ${title}, and ${message} placeholders"
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle2" gutterBottom>
        Preview
      </Typography>

      {preferences.selectedPreset && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {DEFAULT_PRESET_PATTERNS.find(p => p.name === preferences.selectedPreset)?.description}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ mb: 2, maxHeight: 300, overflow: 'auto' }}>
        <List dense>
          {previewResults.map((result, index) => (
            <ListItem key={index} divider={index < previewResults.length - 1}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" component="span">
                      {result.isValid ? (
                        <>
                          <Chip
                            label={`Ticket: ${result.ticket}`}
                            size="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`Title: ${result.title}`}
                            size="small"
                            color="secondary"
                          />
                        </>
                      ) : (
                        <Chip
                          label="No match"
                          size="small"
                          color="error"
                        />
                      )}
                    </Typography>
                  </Box>
                }
                secondary={
                  result.isValid ? (
                    <Typography variant="body2" color="text.secondary">
                      {result.preview}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error">
                      {result.error}
                    </Typography>
                  )
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}; 