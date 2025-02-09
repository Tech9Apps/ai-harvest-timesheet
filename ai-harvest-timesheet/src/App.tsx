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

function App() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<{ [repoPath: string]: CommitInfo[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);

  useEffect(() => {
    // Load repositories from storage
    const savedRepositories = storageService.getRepositories();
    setRepositories(savedRepositories);

    // Load Harvest credentials from localStorage
    const token = localStorage.getItem('harvest_access_token');
    const accountId = localStorage.getItem('harvest_account_id');

    if (token && accountId) {
      harvestApi.setCredentials(token, accountId);
    } else {
      setShowCredentialsDialog(true);
    }

    // Initial fetch of commits
    handleFetchCommits();
  }, []);

  const handleAddRepository = (repository: Repository) => {
    const updatedRepositories = storageService.addRepository({
      ...repository,
      extractTicketNumber: true, // Default to true for new repositories
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

  const handleFetchCommits = async () => {
    const newCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    try {
      // First, fetch all commits from repositories
      for (const repository of repositories) {
        const gitService = new GitService(repository);
        const isValid = await gitService.validateRepository();
        
        if (!isValid) {
          setError(`Invalid repository: ${repository.path}`);
          continue;
        }

        const todayCommits = await gitService.getTodayCommits();
        if (todayCommits.length > 0) {
          newCommits[repository.path] = todayCommits;
        }
      }

      // Then, process webhooks for repositories that have them configured
      for (const repository of repositories) {
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
        setSuccess('No commits found for today');
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
      for (const entry of timeEntries) {
        await harvestApi.createTimeEntry(entry);
      }
      setSuccess('Time entries synced successfully');
      setCommits({});
    } catch (error) {
      setError('Error syncing time entries');
      console.error('Error syncing time entries:', error);
    }
  };

  const handleCredentialsDialogClose = () => {
    // Only close the dialog if we have valid credentials
    const token = localStorage.getItem('harvest_access_token');
    const accountId = localStorage.getItem('harvest_account_id');
    if (token && accountId) {
      setShowCredentialsDialog(false);
    }
  };

  const handleOpenCredentialsDialog = () => {
    setShowCredentialsDialog(true);
  };

  return (
    <LoadingProvider>
      <MainLayout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
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
  );
}

export default App; 