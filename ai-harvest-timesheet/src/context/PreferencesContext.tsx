import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GlobalPreferences, RepositoryPreferences } from '../types/preferences';
import { preferencesService } from '../services/preferencesService';

interface PreferencesContextType {
  globalPreferences: GlobalPreferences;
  updateGlobalPreferences: (preferences: Partial<GlobalPreferences>) => void;
  getRepositoryPreferences: (repositoryId: string) => RepositoryPreferences;
  updateRepositoryPreferences: (repositoryId: string, preferences: Partial<RepositoryPreferences>) => void;
  resetRepositoryToGlobal: (repositoryId: string) => void;
  getEffectivePreferences: (repositoryId: string) => GlobalPreferences;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [globalPreferences, setGlobalPreferences] = useState<GlobalPreferences>(
    preferencesService.getGlobalPreferences()
  );

  // Cache repository preferences in memory
  const [repositoryPreferencesCache, setRepositoryPreferencesCache] = useState<{
    [repositoryId: string]: RepositoryPreferences;
  }>({});

  const updateGlobalPreferences = useCallback((preferences: Partial<GlobalPreferences>) => {
    const newPreferences = { ...globalPreferences, ...preferences };
    setGlobalPreferences(newPreferences);
    preferencesService.setGlobalPreferences(newPreferences);
  }, [globalPreferences]);

  const getRepositoryPreferences = useCallback((repositoryId: string) => {
    if (!repositoryPreferencesCache[repositoryId]) {
      const preferences = preferencesService.getRepositoryPreferences(repositoryId);
      setRepositoryPreferencesCache(cache => ({
        ...cache,
        [repositoryId]: preferences,
      }));
      return preferences;
    }
    return repositoryPreferencesCache[repositoryId];
  }, [repositoryPreferencesCache]);

  const updateRepositoryPreferences = useCallback((
    repositoryId: string,
    preferences: Partial<RepositoryPreferences>
  ) => {
    const currentPreferences = getRepositoryPreferences(repositoryId);
    const newPreferences = { ...currentPreferences, ...preferences };
    
    setRepositoryPreferencesCache(cache => ({
      ...cache,
      [repositoryId]: newPreferences,
    }));
    
    preferencesService.setRepositoryPreferences(repositoryId, newPreferences);
  }, [getRepositoryPreferences]);

  const resetRepositoryToGlobal = useCallback((repositoryId: string) => {
    preferencesService.resetRepositoryToGlobal(repositoryId);
    setRepositoryPreferencesCache(cache => {
      const newCache = { ...cache };
      delete newCache[repositoryId];
      return newCache;
    });
  }, []);

  const getEffectivePreferences = useCallback((repositoryId: string) => {
    return preferencesService.getEffectivePreferences(repositoryId);
  }, []);

  const value = {
    globalPreferences,
    updateGlobalPreferences,
    getRepositoryPreferences,
    updateRepositoryPreferences,
    resetRepositoryToGlobal,
    getEffectivePreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}; 