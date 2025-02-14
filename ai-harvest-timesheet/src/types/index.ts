export interface Repository {
  id: string;
  path: string;
  harvestProjectId: string;
  harvestTaskId: string;
  extractTicketNumber: boolean;
  webhookUrl?: string;
  enabled: boolean;
}

export interface HarvestProject {
  id: string;
  name: string;
  client: {
    name: string;
  };
}

export interface HarvestTask {
  id: string;
  name: string;
}

export interface TimeEntry {
  id?: string;
  projectId: string;
  taskId: string;
  spentDate: string;
  hours: number;
  notes: string;
  external_reference?: {
    id: string;
    group_id: string;
    permalink?: string;
  };
}

export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: {
    filename: string;
    changes: number;
    insertions: number;
    deletions: number;
    type: 'source' | 'test' | 'config' | 'other';
  }[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  date: string;
  branch: string;
  formattedMessage: string;
  hours?: number;
  diffStats?: DiffStats;
  ticket?: string;
}

export interface WebhookRequest {
  repositoryName: string;
  branchName: string;
  commits: {
    hash: string;
    message: string;
    date: string;
  }[];
}

export interface WebhookResponse {
  repositoryName: string;
  branchName: string;
  commits: {
    hash: string;
    message: string;
    date: string;
    formattedMessage: string;
    hours?: number;
  }[];
}