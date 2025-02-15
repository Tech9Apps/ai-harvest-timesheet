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

  useEffect(() => {
    // Load repositories from storage
    const savedRepositories = storageService.getRepositories();
    setRepositories(savedRepositories);

    // Load Harvest credentials from main process
    ipcRenderer.invoke('get-harvest-credentials').then(({ token, accountId, hasCredentials }) => {
      if (token && accountId) {
        harvestApi.setCredentials(token, accountId);
      }
      
      if (!hasCredentials) {
        setShowCredentialsDialog(true);
      }
    });

    // Initial fetch of commits
    handleFetchCommits();
  }, []);

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
    setSuccess('Repository settings updated successfully');
    handleFetchCommits(); // Refresh commits to update formatting
  };

  const handleDeleteRepository = (repositoryId: string) => {
    const updatedRepositories = storageService.deleteRepository(repositoryId);
    setRepositories(updatedRepositories);
    setSuccess('Repository removed successfully');
  };

  const handleFetchCommits = async (startDate?: Date, endDate?: Date) => {
    const newCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    try {
      // First, fetch all commits from enabled repositories only
      for (const repository of repositories.filter(repo => repo.enabled)) {
        const gitService = new GitService(repository);
        const isValid = await gitService.validateRepository();
        
        if (!isValid) {
          setError(`Invalid repository: ${repository.path}`);
          continue;
        }

        let commits;
        if (startDate && endDate) {
          commits = await gitService.getCommits(startDate, endDate);
        } else {
          commits = await gitService.getTodayCommits();
        }

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

      setCommits(newCommits);
      if (Object.keys(newCommits).length === 0) {
        setSuccess('No commits found for the selected period');
      } else {
        setSuccess('Commits fetched successfully');
      }
    } catch (error) {
      setError('Error fetching commits');
      console.error('Error fetching commits:', error);
    }
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