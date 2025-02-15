import { useState, useEffect } from 'react';
import { Container, Box, Alert, Snackbar, Button } from '@mui/material';
import MainLayout from './components/layout/MainLayout';
import { RepositoryManager } from './components/repository/RepositoryManager';
import { TimeEntryPreview } from './components/timeEntry/TimeEntryPreview';
import { HarvestCredentialsDialog } from './components/harvest/HarvestCredentialsDialog';
import { Repository, TimeEntry, CommitInfo } from './types';
import { GitService } from './services/gitService';
import { harvestApi } from './services/harvestApi';
import { storageService } from './services/storageService';
import { LoadingProvider } from './context/LoadingContext';
import { webhookService } from './services/webhookService';
import { PreferencesProvider } from './context/PreferencesContext';
import { GlobalPreferencesDialog } from './components/preferences/GlobalPreferencesDialog';
import { ipcRenderer } from 'electron';

function App() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<{ [repoPath: string]: CommitInfo[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showGlobalPreferences, setShowGlobalPreferences] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleFetchCommits = async (startDate?: Date, endDate?: Date) => {
    console.log('[App] Starting to fetch commits', { 
      repositoryCount: repositories.length,
      enabledCount: repositories.filter(repo => repo.enabled).length 
    });
    
    // Reset commits state before fetching new ones
    setCommits({});
    const newCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    try {
      // First, fetch all commits from enabled repositories only
      for (const repository of repositories.filter(repo => repo.enabled)) {
        console.log('[App] Processing repository:', repository.path);
        const gitService = new GitService(repository);
        const isValid = await gitService.validateRepository();
        
        if (!isValid) {
          console.error('[App] Invalid repository:', repository.path);
          setError(`Invalid repository: ${repository.path}`);
          continue;
        }

        let commits;
        if (startDate && endDate) {
          commits = await gitService.getCommits(startDate, endDate);
        } else {
          commits = await gitService.getTodayCommits();
        }

        console.log('[App] Found commits for repository:', {
          path: repository.path,
          commitCount: commits.length
        });

        if (commits.length > 0) {
          newCommits[repository.path] = commits;
        }
      }

      // Then, process webhooks for enabled repositories that have them configured
      for (const repository of repositories.filter(repo => repo.enabled)) {
        if (repository.webhookUrl && newCommits[repository.path]) {
          const commits = newCommits[repository.path];
          const webhookRequest = {
            repositoryName: repository.path.split('/').pop() || '',
            branchName: commits[0].branch,
            commits: commits.map(({ hash, message, date }) => ({
              hash,
              message,
              date,
            })),
          };

          try {
            const webhookResponse = await webhookService.formatMessages(repository.webhookUrl, webhookRequest);
            
            // Update commit messages with webhook response
            newCommits[repository.path] = commits.map(commit => {
              const webhookCommit = webhookResponse.commits.find(c => c.hash === commit.hash);
              return {
                ...commit,
                formattedMessage: webhookCommit?.formattedMessage || commit.formattedMessage,
                hours: webhookCommit?.hours,
              };
            });
          } catch (error) {
            console.error(`Error processing webhook for repository ${repository.path}:`, error);
            // Keep the original formatted messages if webhook fails
          }
        }
      }

      console.log('[App] Commit fetch completed', {
        repositoriesWithCommits: Object.keys(newCommits).length,
        totalCommits: Object.values(newCommits).reduce((sum, commits) => sum + commits.length, 0)
      });

      setCommits(newCommits);
      if (Object.keys(newCommits).length === 0) {
        setSuccess('No commits found for the selected period');
      } else {
        setSuccess('Commits fetched successfully');
      }
    } catch (error) {
      console.error('[App] Error fetching commits:', error);
      setError('Error fetching commits');
    }
  };

  useEffect(() => {
    async function initialize() {
      console.log('[App] Starting initialization');
      
      try {
        // Load repositories from storage
        const savedRepositories = storageService.getRepositories();
        console.log('[App] Loaded repositories:', {
          count: savedRepositories.length,
          enabled: savedRepositories.filter(r => r.enabled).length
        });
        
        // Load Harvest credentials from main process
        const { token, accountId, hasCredentials } = await ipcRenderer.invoke('get-harvest-credentials');
        console.log('[App] Checked credentials:', { hasCredentials });

        if (token && accountId) {
          console.log('[App] Setting credentials in API service');
          harvestApi.setCredentials(token, accountId);
        }

        // Set repositories first
        setRepositories(savedRepositories);
        
        if (!hasCredentials) {
          console.log('[App] No credentials found, showing dialog');
          setShowCredentialsDialog(true);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('[App] Error during initialization:', error);
        setError('Error initializing application');
      }
    }

    initialize();

    // Listen for tray actions
    const handleTrayAction = (_event: any, action: string) => {
      console.log('[App] Received tray action:', action);
      switch (action) {
        case 'refresh':
          handleFetchCommits();
          break;
        case 'sync':
          // You might want to trigger sync here if needed
          break;
        case 'preferences':
          setShowGlobalPreferences(true);
          break;
      }
    };

    ipcRenderer.on('tray-action', handleTrayAction);

    return () => {
      ipcRenderer.removeListener('tray-action', handleTrayAction);
    };
  }, []);

  // Separate effect to handle fetching commits after repositories are loaded
  useEffect(() => {
    if (repositories.length > 0) {
      console.log('[App] Repositories loaded, fetching commits');
      handleFetchCommits();
    }
  }, [repositories]);

  const handleAddRepository = (repository: Repository) => {
    const updatedRepositories = storageService.addRepository({
      ...repository,
      extractTicketNumber: true,
      enabled: true, // Ensure new repositories are enabled by default
    });
    setRepositories(updatedRepositories);
    setSuccess('Repository added successfully');
    handleFetchCommits();
  };

  const handleUpdateRepository = (updatedRepo: Repository) => {
    const updatedRepositories = storageService.updateRepository(updatedRepo);
    setRepositories(updatedRepositories);

    // If repository is being disabled, remove its commits
    if (!updatedRepo.enabled) {
      setCommits(prevCommits => {
        const newCommits = { ...prevCommits };
        delete newCommits[updatedRepo.path];
        return newCommits;
      });
      setSuccess('Repository disabled');
    } else {
      // If repository is being enabled, fetch its commits
      handleFetchCommits();
      setSuccess('Repository enabled');
    }
  };

  const handleDeleteRepository = (repositoryId: string) => {
    const updatedRepositories = storageService.deleteRepository(repositoryId);
    setRepositories(updatedRepositories);
    setSuccess('Repository removed successfully');
  };

  const handleSync = async (timeEntries: TimeEntry[]) => {
    try {
      // Get the list of enabled repositories
      const enabledRepos = repositories.filter(repo => repo.enabled);
      const enabledRepoPaths = enabledRepos.map(repo => repo.path);

      // Filter time entries to only include those from enabled repositories
      const enabledTimeEntries = timeEntries.filter(entry => {
        // Find the repository this time entry belongs to
        const repo = repositories.find(r => 
          r.harvestProjectId === entry.projectId && 
          r.harvestTaskId === entry.taskId
        );
        return repo && repo.enabled;
      });

      if (enabledTimeEntries.length === 0) {
        setError('No time entries to sync from enabled repositories');
        return;
      }

      for (const entry of enabledTimeEntries) {
        await harvestApi.createTimeEntry(entry);
      }

      setSuccess(`Time entries synced successfully (${enabledTimeEntries.length} entries from enabled repositories)`);
      
      // Only clear commits for enabled repositories
      const updatedCommits = { ...commits };
      enabledRepoPaths.forEach(path => {
        delete updatedCommits[path];
      });
      setCommits(updatedCommits);

      // Trigger a refresh of Harvest hours in the main process
      ipcRenderer.send('refresh-harvest-hours');
    } catch (error) {
      setError('Error syncing time entries');
      console.error('Error syncing time entries:', error);
    }
  };

  const handleCredentialsDialogClose = async () => {
    // Only close the dialog if we have valid credentials
    const { hasCredentials } = await ipcRenderer.invoke('get-harvest-credentials');
    if (hasCredentials) {
      setShowCredentialsDialog(false);
    }
  };

  const handleOpenCredentialsDialog = () => {
    setShowCredentialsDialog(true);
  };

  return (
    <PreferencesProvider>
      <LoadingProvider>
        <MainLayout>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setShowGlobalPreferences(true)}
                size="small"
              >
                Time Preferences
              </Button>
              <Button
                variant="outlined"
                onClick={handleOpenCredentialsDialog}
                size="small"
              >
                Update Harvest Credentials
              </Button>
            </Box>

            <Box sx={{ my: 4 }}>
              <RepositoryManager
                repositories={repositories}
                onRepositoryAdd={handleAddRepository}
                onRepositoryUpdate={handleUpdateRepository}
                onRepositoryDelete={handleDeleteRepository}
              />
            </Box>
            
            <Box sx={{ my: 4 }}>
              <TimeEntryPreview
                commits={commits}
                repositories={repositories}
                onSync={handleSync}
                onRefresh={handleFetchCommits}
              />
            </Box>

            <HarvestCredentialsDialog
              open={showCredentialsDialog}
              onClose={handleCredentialsDialogClose}
            />

            <GlobalPreferencesDialog
              open={showGlobalPreferences}
              onClose={() => setShowGlobalPreferences(false)}
            />

            <Snackbar
              open={!!error}
              autoHideDuration={6000}
              onClose={() => setError(null)}
            >
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Snackbar>

            <Snackbar
              open={!!success}
              autoHideDuration={6000}
              onClose={() => setSuccess(null)}
            >
              <Alert severity="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            </Snackbar>
          </Container>
        </MainLayout>
      </LoadingProvider>
    </PreferencesProvider>
  );
}

export default App; 