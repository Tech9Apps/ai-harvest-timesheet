import { useState, useEffect } from 'react';
import { Container, Box, Alert, Snackbar } from '@mui/material';
import MainLayout from './components/layout/MainLayout';
import { RepositoryManager } from './components/repository/RepositoryManager';
import { TimeEntryPreview } from './components/timeEntry/TimeEntryPreview';
import { Repository, TimeEntry, CommitInfo } from './types';
import { GitService } from './services/gitService';
import { harvestApi } from './services/harvestApi';
import { LoadingProvider } from './context/LoadingContext';

function App() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<{ [repoPath: string]: CommitInfo[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load repositories from local storage
    const savedRepositories = localStorage.getItem('repositories');
    if (savedRepositories) {
      setRepositories(JSON.parse(savedRepositories));
    }

    // Load Harvest credentials from environment variables
    const token = import.meta.env.VITE_HARVEST_ACCESS_TOKEN;
    const accountId = import.meta.env.VITE_HARVEST_ACCOUNT_ID;

    if (token && accountId) {
      harvestApi.setCredentials(token, accountId);
    }

    // Initial fetch of commits
    handleFetchCommits();
  }, []);

  useEffect(() => {
    // Save repositories to local storage
    localStorage.setItem('repositories', JSON.stringify(repositories));
  }, [repositories]);

  const handleAddRepository = (repository: Repository) => {
    setRepositories([...repositories, repository]);
    setSuccess('Repository added successfully');
    handleFetchCommits();
  };

  const handleUpdateRepository = (updatedRepo: Repository) => {
    setRepositories(repositories.map(repo => 
      repo.id === updatedRepo.id ? updatedRepo : repo
    ));
    setSuccess('Repository settings updated successfully');
  };

  const handleDeleteRepository = (repositoryId: string) => {
    setRepositories(repositories.filter(repo => repo.id !== repositoryId));
    setSuccess('Repository removed successfully');
  };

  const handleFetchCommits = async () => {
    const newCommits: { [repoPath: string]: CommitInfo[] } = {};
    
    try {
      for (const repository of repositories) {
        const gitService = new GitService(repository.path);
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

  return (
    <LoadingProvider>
      <MainLayout>
        <Container maxWidth="lg">
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