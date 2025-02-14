import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { usePreferences } from '../../context/PreferencesContext';
import { preferencesService } from '../../services/preferencesService';
import { GeneralSettings } from './tabs/GeneralSettings';
import { DistributionSettings } from './tabs/DistributionSettings';
import { BranchParsingSettings } from './BranchParsingSettings';
import { ExternalIssueSettings } from './tabs/ExternalIssueSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preferences-tabpanel-${index}`}
      aria-labelledby={`preferences-tab-${index}`}
      {...other}
      style={{ height: '500px', overflowY: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `preferences-tab-${index}`,
    'aria-controls': `preferences-tabpanel-${index}`,
  };
}

interface GlobalPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalPreferencesDialog: React.FC<GlobalPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const { globalPreferences, updateGlobalPreferences } = usePreferences();

  useEffect(() => {
    if (open) {
      console.log('Dialog opened, debugging preferences...');
      preferencesService.debugPreferences();
    }
  }, [open]);

  if (!globalPreferences || !globalPreferences.branchParsing) {
    console.error('Global preferences or branch parsing preferences is missing');
    return null;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>Preferences</DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="preferences tabs"
          variant="fullWidth"
        >
          <Tab label="General" {...a11yProps(0)} />
          <Tab label="Distribution" {...a11yProps(1)} />
          <Tab label="Branch Parsing" {...a11yProps(2)} />
          <Tab label="External Issues" {...a11yProps(3)} />
        </Tabs>
      </Box>
      <DialogContent sx={{ p: 0 }}>
        <TabPanel value={tabValue} index={0}>
          <GeneralSettings 
            preferences={globalPreferences}
            onPreferencesChange={updateGlobalPreferences}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <DistributionSettings 
            preferences={globalPreferences}
            onPreferencesChange={updateGlobalPreferences}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <BranchParsingSettings
            preferences={globalPreferences.branchParsing}
            onPreferencesChange={(branchParsing) => updateGlobalPreferences({ 
              branchParsing: { ...globalPreferences.branchParsing, ...branchParsing } 
            })}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <ExternalIssueSettings
            preferences={globalPreferences}
            onPreferencesChange={updateGlobalPreferences}
          />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}; 